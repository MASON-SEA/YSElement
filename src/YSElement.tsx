import { keyed as keyedReconcile } from "./utils/keyed";

interface Iproperty {
  type: string[] | Function;
  default: string | number | boolean | object | any[];
  /** Whether a change schedules an update. Default true. */
  is_update?: boolean;
  /** Reflect property to attribute. Default false (internal state stays off DOM). */
  reflect?: boolean;
  get?(): any;
}

interface Iproperties {
  [key: string]: Iproperty;
}

interface ChangedDetail {
  name: string;
  oldValue: unknown;
  newValue: unknown;
}

const templateCache = new Map<string, HTMLTemplateElement>();

class YSElement extends HTMLElement {
  static properties: Iproperties = {};

  is_init: boolean = false;
  update_arr: string[] = [];
  is_connected: boolean = false;

  /** Dirty property names waiting for a batched update. */
  private _dirty = new Set<string>();
  private _changed: ChangedDetail[] = [];
  private _updateQueued = false;
  /** Guard against attributeChangedCallback re-entry while reflecting. */
  private _reflecting = false;
  private _hasAdoptedSheet = false;

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  protected static getPropertyDescriptor(name: string) {
    const custom_get = this.properties[name].get;
    let { type, is_update, reflect } = this.properties[name];
    // Default: update on change
    const shouldUpdate = is_update !== false;
    const shouldReflect = reflect === true;
    const type_name = (type as any)?.name;

    const init_default = (propName: string, value: unknown) => {
      let _value: any;
      let is_equal = true;
      const default_value = this.properties[propName]["default"];

      const return_default_value = () => {
        is_equal = false;
        return default_value;
      };

      if (type_name == "String") {
        const is_string = (v: unknown) => {
          const _v = new String(v);
          return _v != "null" && _v != "undefined";
        };
        _value = is_string(value) ? new String(value).toString() : return_default_value();
      } else if (type_name == "Boolean") {
        const is_boolean = (v: unknown) => {
          const _v = new String(v);
          return _v == "true" || _v == "false" || _v == "1" || _v == "0";
        };
        if (is_boolean(value)) {
          const s = String(value);
          _value = s === "true" || s === "1";
        } else {
          _value = return_default_value();
        }
      } else if (type_name == "Number") {
        const is_number = (v: unknown) => {
          const _v = Number(v);
          return !isNaN(_v);
        };
        _value = is_number(value) ? Number(value) : return_default_value();
      } else if (type_name == "Object" || type_name == "Array") {
        const is_object_or_arr = (v: unknown) => {
          const _v = new String(v);
          return _v != "null" && _v != "undefined";
        };
        _value = is_object_or_arr(value) ? value : return_default_value();
      } else {
        _value =
          (type as string[]).indexOf(value as string) != -1
            ? value
            : return_default_value();
      }

      return [_value, is_equal] as const;
    };

    const key = Symbol();
    const { get, set } = Object.getOwnPropertyDescriptor(this.prototype, name) || {
      get() {
        let _value = undefined;
        if (custom_get && this.update_arr.indexOf(name) == -1 && this.is_connected) {
          _value = custom_get.call(this);
        } else {
          _value = this[key];
        }
        const [value] = init_default(name, _value);
        return value;
      },
      set(value: string | number) {
        this[key] = value;
      },
    };

    return {
      get(this: YSElement) {
        return get.call(this);
      },
      set(this: YSElement, newValue: unknown) {
        const old_value = get.call(this);
        const [new_value, is_equal] = init_default(name, newValue);

        if (!is_equal) {
          console.warn(
            `${newValue}不属于${this.constructor.name}组件中${name}属性的可选值`
          );
          return;
        }

        // Reference equality for all types including Object/Array (no forced dirty)
        if (Object.is(old_value, new_value)) {
          set.call(this, new_value);
          return;
        }

        set.call(this, new_value);

        if (this.is_init && this.is_connected) {
          if (
            shouldReflect &&
            (typeof new_value == "string" || typeof new_value == "number")
          ) {
            this._reflecting = true;
            try {
              this.setAttribute(name, new_value.toString());
            } finally {
              this._reflecting = false;
            }
          }

          if (shouldUpdate) {
            this._requestUpdate(name, old_value, new_value);
          }
        }
      },
    };
  }

  disconnectedCallback() {
    const event = new CustomEvent("disconnected");
    this.dispatchEvent(event);
  }

  static get observedAttributes() {
    const properties = Object.keys(this.properties);

    for (let i = 0; i < properties.length; i++) {
      const name = properties[i];
      const descriptor = this.getPropertyDescriptor(name);
      Object.defineProperty(this.prototype, name, descriptor);
    }

    return properties;
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null) {
    if (this._reflecting) return;
    if (oldValue != newValue) {
      this[name] = newValue;
    }
  }

  init_property() {
    for (let i = 0; i < this.attributes.length; i++) {
      const attribute = this.attributes[i];
      const { name, value } = attribute;
      this[name] = value;
    }
  }

  connectedCallback() {
    if (this.is_connected) return;
    this._init();
    this.is_connected = true;
    this.after_connected();
  }

  _init() {
    this.init_property();
    this.init();
    this.render();
    this.is_init = true;
  }

  /** Schedule a batched microtask update (Lit-style requestUpdate). */
  private _requestUpdate(name: string, oldValue: unknown, newValue: unknown) {
    this._dirty.add(name);
    this._changed.push({ name, oldValue, newValue });
    this.update_arr.push(name);

    if (this._updateQueued) return;
    this._updateQueued = true;

    queueMicrotask(() => {
      this._flushUpdate();
    });
  }

  private _flushUpdate() {
    this._updateQueued = false;
    if (!this.is_connected || !this.is_init) {
      this._dirty.clear();
      this._changed.length = 0;
      this.update_arr.length = 0;
      return;
    }

    const changed = this._changed.slice();
    this.custom_get_value();

    // One microtask, but call update per property so subclasses with
    // targeted handlers (e.g. YSUI) keep working.
    for (const c of changed) {
      this.update(c.name, c.oldValue, c.newValue);
    }

    this._dirty.clear();
    this._changed.length = 0;
    this.update_arr.length = 0;
  }

  /** Force an immediate flush (useful after set_ui with defer). */
  flush_update() {
    if (this._updateQueued || this._dirty.size > 0) {
      this._flushUpdate();
    }
  }

  update(name: string, oldValue: unknown, newValue: unknown) {
    this.render();
  }

  render() {}

  init() {}

  after_connected() {}

  /**
   * Set multiple properties in one go.
   * Always batches into a single microtask update when connected.
   */
  set_ui(params: object, is_init: boolean = false) {
    const attributes = ["ui_name"];

    // Pause per-property scheduling; we'll request once at the end
    const wasInit = this.is_init;
    this.is_init = this.is_connected ? is_init : true;

    Object.keys(params).forEach((key) => {
      if (!this.is_init) {
        this.update_arr.push(key);
      }
      this[key] = params[key];
      if (attributes.indexOf(key) != -1) {
        this._reflecting = true;
        try {
          this.setAttribute(key, params[key]);
        } finally {
          this._reflecting = false;
        }
      }
    });

    if (!this.is_init && this.is_connected) {
      this.custom_get_value();
      // Single render for the batch
      this.render();
      this.is_init = true;
      this.update_arr.length = 0;
      this._dirty.clear();
      this._changed.length = 0;
      this._updateQueued = false;
    } else {
      this.is_init = wasInit || this.is_init;
    }
  }

  custom_get_value() {
    this.is_init = false;
    const properties = this.constructor["properties"];
    Object.keys(properties).forEach((key) => {
      const property = properties[key];
      if (property.get && this.update_arr.indexOf(key) == -1) {
        this[key] = this[key];
        this.update_arr.push(key);
      }
    });
    this.is_init = true;
  }

  /**
   * Parse HTML with a cached <template> (avoids DOMParser every time).
   */
  string_to_dom(dom_string: string): DocumentFragment {
    let tpl = templateCache.get(dom_string);
    if (!tpl) {
      tpl = document.createElement("template");
      tpl.innerHTML = dom_string;
      templateCache.set(dom_string, tpl);
    }
    return tpl.content.cloneNode(true) as DocumentFragment;
  }

  /** Clear the shared template cache (tests / HMR). */
  static clear_template_cache() {
    templateCache.clear();
  }

  /**
   * Attach CSS once via adoptedStyleSheets when supported;
   * falls back to a single <style> tag.
   */
  import_css(cssContent: string) {
    if (!this.shadowRoot) return;

    if (typeof CSSStyleSheet !== "undefined" && "adoptedStyleSheets" in this.shadowRoot) {
      if (this._hasAdoptedSheet) return;
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(cssContent);
      this.shadowRoot.adoptedStyleSheets = [
        ...this.shadowRoot.adoptedStyleSheets,
        sheet,
      ];
      this._hasAdoptedSheet = true;
      return;
    }

    if (this.shadowRoot.querySelector("style[data-ys-css]")) return;
    const style = document.createElement("style");
    style.setAttribute("data-ys-css", "");
    style.textContent = cssContent;
    this.shadowRoot.append(style);
  }

  keyed(
    parent: ParentNode,
    items: any[],
    getKey: (item: any, index: number) => string | number,
    create: (item: any, index: number) => Node,
    update?: (node: Node, item: any, index: number) => void
  ) {
    keyedReconcile(parent, items, getKey, create, update);
  }
}

export default YSElement;
