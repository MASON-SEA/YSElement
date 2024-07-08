interface Iproperty {
    type: string[] | object;
    default: string | number | boolean | object | any[];
    is_update?: boolean;//是否需要更新 默认更新
    get?(): any;
}

interface Iproperties {
    [key: string] : Iproperty;
}

class YSElement extends HTMLElement {
    //需要监听的属性
    static properties: Iproperties = {};
    is_init: boolean = false;
    update_arr: string[] = [];
    is_connected: boolean = false;

    constructor() {
        super();
        this.attachShadow( {mode: 'open'});
    }

    //获取属性描述
    protected static getPropertyDescriptor(
        name: string
    ) {
        const custom_get = this.properties[name].get;
        let {type, is_update} = this.properties[name];
        is_update = is_update === undefined ? true : false;
        const type_name = type['name'];
        /**
         * @description 枚举类型进行防错判断
         * 1. 根据是否有type 判断是否有type --- type: enum boolean string number
         * 2. 若是枚举 看是否在枚举中
         * 3. 不在枚举 则取默认值
         */
        const init_default = (name, value) => {
            let _value,is_equal = true;
            const default_value = this.properties[name]['default'];

            const return_default_value = () => {
                is_equal = false;
                return default_value;
            };

            if(type_name == 'String') {
                //判断是否是undefined null
                const is_string = (value) => {
                    const _v = new String(value);
                    return _v != 'null' && _v != 'undefined';
                };
                _value = is_string(value) ? new String(value).toString() : return_default_value();
            }else if(type_name == 'Boolean') {
                //判断是否是true或false
                const is_boolean = (value) => {
                    const _v = new String(value);
                    return _v == 'true' || _v == 'false' || _v == '1' || _v == '0';
                };
                _value = is_boolean(value) ? eval(value) ? true : false
                    : return_default_value();
            }else if(type_name == 'Number') {
                //判断是否是数字
                const is_number = (value) => {
                    const _v = Number(value);
                    return !isNaN(_v);
                };
                _value = is_number(value) ? Number(value) : return_default_value();
            }else if(type_name == 'Object' || type_name == 'Array'){
                //判断是否是undefined null
                const is_object_or_arr = (value) => {
                    const _v = new String(value);
                    return _v != 'null' && _v != 'undefined';
                };
                _value = is_object_or_arr(value) ? value : return_default_value();
            }else {
                _value = (type as string[]).indexOf(value) != -1 ? value : return_default_value();
            }

            return [_value, is_equal];
        };
        const key = Symbol();
        const {get,  set} = Object.getOwnPropertyDescriptor(this.prototype, name) || {
            get() {
                let _value = undefined;
                /**
                 * 当自定义get存在, 且更新的不是自己, 且不是初始化
                 * 的时候取ui来显示值
                 */
                if(custom_get && this.update_arr.indexOf(name) == -1 && this.is_connected) {
                    _value = custom_get.call(this);
                }else {
                    _value = this[key];
                }
                const [value, is_equal] = init_default(name, _value);

                return value;
            },
            set(value: string | number) {
                this[key] = value;
            }
        };
        return {
            get(this: YSElement) {
                return get.call(this);
            },
            set(this: YSElement, newValue: unknown) {
                const old_value = get.call(this);

                const [new_value, is_equal] = init_default(name, newValue);

                //若是设置是一个错误的值那就不往下执行
                if(!is_equal) {
                    console.warn(`${newValue}不属于${this.constructor.name}组件中${name}属性的可选值`);
                    return;
                }

                set.call(this, new_value);


                //若是不相同则触发更新
                if((old_value !== new_value || type_name == 'Object' || type_name == 'Array') &&  this.is_init && this.is_connected)  {
                    if(typeof new_value == "string" || typeof new_value == "number") {
                        //在初始化完成之前不能设值，否者第一次渲染会触发多次渲染
                        this.setAttribute(name, new_value.toString());
                    }
                    //是否需要更新
                    if(is_update) {
                        this._update(name, old_value, new_value);
                    }
                }
            }
        }
    }

    //断开连接回调 给组件添加disconnected事件会触发
    disconnectedCallback() {
        const event = new CustomEvent('disconnected');
        this.dispatchEvent(event)
    }

    //region 属性监测
    static get observedAttributes() {
        const properties = Object.keys(this.properties);

        for (let i = 0; i < properties.length; i++) {
            const name = properties[i];
            const descriptor = this.getPropertyDescriptor(name);
            Object.defineProperty(this.prototype, name, descriptor)
        }
        return properties
    }

    attributeChangedCallback(name: string, oldValue, newValue) {
        //若不相同则触发更新
        if(oldValue != newValue){
            this[name] = newValue;
        }
    }

    //初始化property state -> property
    init_property() {
        for (let i = 0; i < this.attributes.length; i++) {
            const attribute = this.attributes[i];
            const { name, value } = attribute;
            this[name] = value;
        }
    }

    connectedCallback() {
        //已经连接过，重新连接不再重新初始化渲染
        if(this.is_connected) return;
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

    _update(name, oldValue, newValue) {
        this.update_arr.push(name);
        //给有get的属性存储值 -- 效果: render不需要考虑渲染位置
        this.custom_get_value();
        this.update(name, oldValue, newValue);
        this.update_arr.length = 0;
    }
    //endregion

    //region 需要重写的方法
    //更新方法
    update(name, oldValue, newValue) {
        this.render()
    }

    //渲染方法
    render() {}

    //初始化
    init() {}

    //连接之后
    after_connected() {

    }
    //endregion

    //region 直接调用的方法
    /**
     * @description 设置参数
     * @param params
     * @param is_init 设为false时不触发update 一次性render
     */
    set_ui(params: object, is_init: boolean = false) {
        //需要设置到attributes上的属性
        const attributes = ['ui_name'];

        this.is_init = this.is_connected ? is_init : true;
        Object.keys(params).forEach(key => {
            //若是一次性更新,需要设置更新的数组,防止获取ui显示的值
            if(!this.is_init) {
                this.update_arr.push(key)
            }

            this[key] = params[key];
            if(attributes.indexOf(key) != -1) {
                this.setAttribute(key, params[key]);
            }
        });

        if(!this.is_init && this.is_connected) {
            //给有get的属性存储值 -- 效果: render不需要考虑渲染位置
            this.custom_get_value();
            this.render();
            this.is_init = true;
            this.update_arr.length = 0;
        }
    }

    //给有get的属性存储值 -- 效果: render不需要考虑渲染位置
    custom_get_value() {
        this.is_init = false;
        const properties = this.constructor['properties'];
        Object.keys(properties).forEach(key => {
            const property = properties[key];
            if(property.get && this.update_arr.indexOf(key) == -1) {
                this[key] = this[key];
                //需要设置更新的数组,防止获取ui显示的值,断开与ui的联系
                this.update_arr.push(key);
            }
        });
        this.is_init = true;
    }

    /**
     * @description 把模板字符串转为dom
     * @param dom_string
     */
    string_to_dom(dom_string: string): DocumentFragment {
        const parser = new DOMParser();
        const doc = parser.parseFromString(dom_string, 'text/html');
        const fragment = document.createDocumentFragment();
        fragment.append(...doc.body.children);
        return fragment;
    }

    /**
     * @description 生成css连接
     * @param cssContent 地址
     */
    import_css(cssContent: string) {
        const style = document.createElement('style');
        style.type = 'text/css';
        style.innerHTML = cssContent;
        this.shadowRoot.append(style);
    }
    //endregion
}

export default YSElement