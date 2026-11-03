/**
 * Keyed list reconciliation: reuse nodes by key, update in place, drop leftovers.
 */
export function keyed(
  parent: ParentNode,
  items: any[],
  getKey: (item: any, index: number) => string | number,
  create: (item: any, index: number) => Node,
  update?: (node: Node, item: any, index: number) => void
) {
  const existing = new Map<string | number, Node>();
  Array.from(parent.childNodes).forEach((node) => {
    const key = (node as any).__ysKey;
    if (key !== undefined) existing.set(key, node);
  });

  const frag = document.createDocumentFragment();

  items.forEach((item, index) => {
    const key = getKey(item, index);
    let node = existing.get(key);
    if (node) {
      update?.(node, item, index);
      existing.delete(key);
    } else {
      node = create(item, index);
      (node as any).__ysKey = key;
    }
    frag.append(node!);
  });

  existing.forEach((node) => {
    node.parentNode?.removeChild(node);
  });

  parent.replaceChildren(frag);
}
