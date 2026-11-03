import YSElement from "../YSElement";
import { custom_element } from "../decorators";
import style from "./index.less?inline";

@custom_element("ysui-cache")
export class Cache extends YSElement {
  init() {
    this.import_css(style);
  }

  append(...dom: any[]) {
    this.shadowRoot?.append(...dom);
  }

  querySelector(selector: string) {
    return this.shadowRoot?.querySelector(selector) ?? null;
  }
}
