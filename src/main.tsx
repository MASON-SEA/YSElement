import { YSUI } from "./index";
import "./cache";

document.querySelector<HTMLDivElement>("#app")!.append(
  <div>
    <ysui-cache>123456</ysui-cache>
  </div>
);
