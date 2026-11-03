<div align="center">

## YSElement

### YSElement 快速搭建 web components 的库

</div>

<p align="center">
  <a href="https://www.npmjs.com/package/yselement">
    <img src="https://img.shields.io/npm/dt/yselement.svg" alt="Total Downloads"></a>
  <a href="https://www.npmjs.com/package/yselement">
    <img src="https://img.shields.io/npm/v/yselement.svg" alt="Published on NPM">
  </a>
  <a href="https://github.com/MASON-SEA/yselement">
    <img src="https://img.shields.io/github/contributors/mason-sea/yselement" alt="contributors">
  </a>
  <a href="https://github.com/MASON-SEA/yselement/blob/main/LICENSE">
    <img src="https://img.shields.io/npm/l/yselement.svg" alt="License">
  </a>
</p>

## Install

```bash
npm install yselement
```

## 1.2.0 性能相关变更

- **批更新**：属性变更经 `queueMicrotask` 合并为一次 `update`/`render`
- **`is_update` 默认修正**：未写时默认会更新
- **Object/Array**：改为引用比较，不再强制脏
- **`reflect`**：默认不把 property 同步到 attribute；需要时在 properties 里设 `reflect: true`
- **`import_css`**：优先 `adoptedStyleSheets`，同实例只挂一次
- **`string_to_dom`**：缓存 `<template>` + `cloneNode`
- **函数组件**：默认不再包 `<ysui-cache>`；需要 Shadow 时传 `shadow: true`
- **hooks**：按组件渲染上下文入栈，不再用模块全局队列
- **`keyed` / `YSUI.keyed` / `element.keyed`**：列表按 key 复用节点

```ts
import { YSElement, YSUI, custom_element, keyed } from "yselement";
```
