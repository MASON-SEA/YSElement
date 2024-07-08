//生成自定义元素修饰器
const custom_element = (tag_name: string) => (class_or_target, context?) => {
    //兼容新的修饰器
    if (context !== undefined) {
        context.addInitializer(() => {
            customElements.define(tag_name, class_or_target);
        });
    } else {
        customElements.define(tag_name, class_or_target);
    }
};

//生成节流方法修饰器
const throttle = (delay) => (target: any, key: string, descriptor: PropertyDescriptor) => {
    let lastExecTime = 0;
    let org_func = descriptor.value;
    descriptor.value = function(...args) {
        const currentTime = Date.now();
        if (currentTime - lastExecTime >= delay) {
            org_func.apply(this, args);
            lastExecTime = currentTime;
        }
    };
};

//生成防抖方法修饰器
const debounce = (delay) => (target: any, key: string, descriptor: PropertyDescriptor) => {
    let timeoutId;
    let org_func = descriptor.value;
    descriptor.value = function(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            org_func.apply(this, args);
        }, delay);
    };
};

export {
    custom_element,
    throttle,
    debounce
}