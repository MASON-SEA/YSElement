import {YSElement} from "./index";
import {Cache} from "./cache/index";
import {call_after_mount, call_after_destroy, clear_effect} from "./hooks";

const createElement = (type: string | Function, config: object | null, ...children: HTMLElement[] | YSElement[]) => {

    const set_ref = () => {
        let ref = config['ref'];
        if (ref && ref.hasOwnProperty('current')) {
            ref.current = dom;
        }
    };

    const set_config = () => {
        Object.keys(config).forEach(key => {
            let value = config[key];
            // let params = {};
            if (key == 'style') {
                dom.style.cssText = value;
            } else if (key.startsWith('on')) {
                let event_name = key.replace('on', '');
                event_name = event_name[0].toLocaleLowerCase() + event_name.slice(1);
                dom.addEventListener(event_name, value);
            } else if (key == 'ref') {
                set_ref();
            } else {
                // if(dom['set_ui']) {
                //     params[key] = value;
                // }else {
                //     dom[key] = value;
                //     dom.setAttribute(key, value);
                // }

                if (typeof value == 'string' || typeof value == 'number' || typeof  value == 'boolean') {
                    dom.setAttribute(key, value);
                }

                dom[key] = value;
            }
            // if(Object.keys(params).length > 0) {
            //     dom['set_ui'](params);
            // }
        });
    };

    let dom = null;
    if (typeof type == 'string') {
        dom = document.createElement(type);
        config && set_config();
        dom.append(...children.flat());
    }else if(type == createFragment) {
        let component = type(config);
        component.append(...children.flat());
        dom = component;
    }else if (typeof type == 'function') {

        const call_after = () => {
            const after_destroy_queue = call_after_mount(after_mount_queue);
            dom.addEventListener('disconnected', () => {
                call_after_destroy(after_destroy_queue);
            })
        };

        config = config || {};
        let after_mount_queue = [];
        clear_effect(after_mount_queue);
        let component = type(config);
        dom = document.createElement('orui-cache');

        //方法组件可要可不要 下面两个方法 暂时未想到应用场景
        //设置ui_name
        if (config.hasOwnProperty('ui_name')) {
            dom.setAttribute('ui_name', config['ui_name']);
        }

        //设置ref
        if (config.hasOwnProperty('ref')) {
            set_ref();
        }

        if (component?.constructor?.name == 'Promise') {
            dom.promise = Promise.resolve(component).then(res => {
                res.append(...children.flat());
                dom.append(res);
                call_after();
            });
        } else {
            component?.append(...children.flat());
            component && dom.append(component);
            call_after();
        }
    }

    return dom
};

const createFragment = (...args) => {
    const fragment = document.createDocumentFragment();
    return fragment
};

export default {
    createElement,
    createFragment
}