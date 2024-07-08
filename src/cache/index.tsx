import {YSUI, YSElement} from "../index";
import {custom_element} from "../decorators.js";
import style from "./index.less?inline";

@custom_element('ysui-cache')
export class Cache extends YSElement {
    init() {
        console.log(style);
        this.import_css(style);
    }

    append(...dom) {
        this.shadowRoot.append(...dom);
    }

    querySelector(selector: string) {
        return this.shadowRoot.querySelector(selector);
    }
}