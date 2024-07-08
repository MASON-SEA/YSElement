const use_ref = () => {
  let ref = {
    current: null,
  };

  return ref;
};

let AFTER_MOUNT_QUEUE = [];
const use_effect = (func: Function) => {
  AFTER_MOUNT_QUEUE.push(func);
};

const clear_effect = (after_mount_queue: Function[]) => {
  AFTER_MOUNT_QUEUE = after_mount_queue;
};

const call_after_mount = (after_mount_queue: Function[]) => {
  let after_destroy_queue: Function[] = [];
  after_mount_queue.forEach((func) => {
    const remove_effect = func();
    if (typeof remove_effect === "function") {
      after_destroy_queue.push(remove_effect);
    }
  });
  return after_destroy_queue;
};

const call_after_destroy = (after_destroy_queue: Function[]) => {
  after_destroy_queue.forEach((func) => {
    func();
  });
};

export {
  use_ref,
  use_effect,
  clear_effect,
  call_after_mount,
  call_after_destroy,
};
