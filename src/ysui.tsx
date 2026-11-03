import {
  begin_hooks,
  end_hooks,
  call_after_mount,
  call_after_destroy,
} from "./hooks";
import { Cache } from "./cache/index";
import { keyed } from "./utils/keyed";

type Child = Node | string | number | boolean | null | undefined | Child[];

const flatten = (children: Child[]): Node[] => {
  const out: Node[] = [];
  const walk = (list: Child[]) => {
    list.forEach((c) => {
      if (c == null || c === false || c === true) return;
      if (Array.isArray(c)) {
        walk(c);
        return;
      }
      if (typeof c === "string" || typeof c === "number") {
        out.push(document.createTextNode(String(c)));
        return;
      }
      out.push(c as Node);
    });
  };
  walk(children);
  return out;
};

const createElement = (
  type: string | Function,
  config: Record<string, any> | null,
  ...children: Child[]
) => {
  const kids = flatten(children);

  const set_ref = (dom: any) => {
    let ref = config?.["ref"];
    if (ref && Object.prototype.hasOwnProperty.call(ref, "current")) {
      ref.current = dom;
    }
  };

  const set_config = (dom: any) => {
    if (!config) return;
    Object.keys(config).forEach((key) => {
      if (key === "key" || key === "children") return;
      let value = config[key];
      if (key == "style") {
        if (typeof value === "string") {
          dom.style.cssText = value;
        } else if (value && typeof value === "object") {
          Object.assign(dom.style, value);
        }
      } else if (key.startsWith("on") && typeof value === "function") {
        let event_name = key.replace(/^on/, "");
        event_name = event_name[0].toLocaleLowerCase() + event_name.slice(1);
        dom.addEventListener(event_name, value);
      } else if (key == "ref") {
        set_ref(dom);
      } else {
        if (
          typeof value == "string" ||
          typeof value == "number" ||
          typeof value == "boolean"
        ) {
          if (typeof value === "boolean") {
            if (value) dom.setAttribute(key, "");
            else dom.removeAttribute(key);
          } else {
            dom.setAttribute(key, String(value));
          }
        }
        dom[key] = value;
      }
    });
  };

  let dom: any = null;

  if (typeof type == "string") {
    dom = document.createElement(type);
    set_config(dom);
    if (config?.key !== undefined) {
      dom.__ysKey = config.key;
    }
    dom.append(...kids);
  } else if (type == createFragment) {
    const fragment = document.createDocumentFragment();
    fragment.append(...kids);
    dom = fragment;
  } else if (typeof type == "function") {
    // Function components: no forced <ysui-cache> wrapper (P1).
    // Optional: config.shadow === true wraps in ysui-cache for isolation.
    config = config || {};
    begin_hooks();
    let component: any;
    try {
      component = type(config);
    } finally {
      var after_mount_queue = end_hooks();
    }

    const attachLifecycle = (host: EventTarget & { addEventListener: Function }) => {
      const after_destroy_queue = call_after_mount(after_mount_queue);
      host.addEventListener("disconnected", () => {
        call_after_destroy(after_destroy_queue);
      });
    };

    const useShadow = config.shadow === true;

    if (useShadow) {
      dom = document.createElement("ysui-cache");
      if (config.hasOwnProperty("ui_name")) {
        dom.setAttribute("ui_name", config["ui_name"]);
      }
      if (config.hasOwnProperty("ref")) {
        set_ref(dom);
      }
      if (config.key !== undefined) {
        dom.__ysKey = config.key;
      }

      const apply = (res: any) => {
        if (res) {
          if (kids.length) res.append?.(...kids);
          dom.append(res);
        } else if (kids.length) {
          dom.append(...kids);
        }
        attachLifecycle(dom);
      };

      if (component?.constructor?.name == "Promise") {
        dom.promise = Promise.resolve(component).then(apply);
      } else {
        apply(component);
      }
    } else {
      // Prefer returning the component root directly (HTMLElement / Fragment / Node)
      const finish = (res: any) => {
        if (res == null) {
          const frag = document.createDocumentFragment();
          frag.append(...kids);
          // Synthetic host for lifecycle: first element child or a marker comment
          const host =
            (frag.firstElementChild as any) ||
            (() => {
              const marker = document.createComment("ysui-fn");
              frag.prepend(marker);
              return marker;
            })();
          // disconnected won't fire on comment; attach to first element if any
          if (host instanceof HTMLElement) {
            attachLifecycle(host);
          }
          return frag;
        }

        if (kids.length && res.append) {
          res.append(...kids);
        }

        if (config.key !== undefined && res && typeof res === "object") {
          (res as any).__ysKey = config.key;
        }
        if (config.hasOwnProperty("ref")) {
          set_ref(res);
        }
        if (res instanceof HTMLElement) {
          attachLifecycle(res);
        }
        return res;
      };

      if (component?.constructor?.name == "Promise") {
        // Async without shadow: placeholder span, replace when ready
        const placeholder = document.createElement("span");
        placeholder.setAttribute("data-ysui-async", "");
        if (config.key !== undefined) (placeholder as any).__ysKey = config.key;
        (placeholder as any).promise = Promise.resolve(component).then((res) => {
          const node = finish(res);
          placeholder.replaceWith(node);
          return node;
        });
        dom = placeholder;
      } else {
        dom = finish(component);
      }
    }
  }

  return dom;
};

const createFragment = (_props?: any, ..._children: Child[]) => {
  return document.createDocumentFragment();
};

export default {
  createElement,
  createFragment,
  Cache,
  keyed,
};
