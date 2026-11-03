type EffectFn = () => void | (() => void);

/** Per-render-context effect queue (not module-global). */
const contextStack: EffectFn[][] = [];

const use_ref = <T = any>(initial: T | null = null) => {
  return { current: initial as T | null };
};

/** Push effects onto the active function-component context. */
const use_effect = (func: EffectFn) => {
  const ctx = contextStack[contextStack.length - 1];
  if (!ctx) {
    console.warn("use_effect called outside a function component render");
    return;
  }
  ctx.push(func);
};

const begin_hooks = (): EffectFn[] => {
  const queue: EffectFn[] = [];
  contextStack.push(queue);
  return queue;
};

const end_hooks = (): EffectFn[] => {
  return contextStack.pop() || [];
};

const call_after_mount = (after_mount_queue: EffectFn[]) => {
  const after_destroy_queue: Array<() => void> = [];
  after_mount_queue.forEach((func) => {
    const remove_effect = func();
    if (typeof remove_effect === "function") {
      after_destroy_queue.push(remove_effect);
    }
  });
  return after_destroy_queue;
};

const call_after_destroy = (after_destroy_queue: Array<() => void>) => {
  after_destroy_queue.forEach((func) => {
    func();
  });
};

export {
  use_ref,
  use_effect,
  begin_hooks,
  end_hooks,
  call_after_mount,
  call_after_destroy,
};
