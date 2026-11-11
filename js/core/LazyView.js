/**
 * A screen whose code is downloaded the first time it is opened. The router and the shell only need its name, title
 * and layout, so the login screen does not have to download the code of every other screen first.
 */
export function lazyView({ name, title, layout }, load, exportName) {
  let module = null;
  return {
    name,
    title,
    layout,
    async render(...args) {
      module ||= await load();
      return module[exportName].render(...args);
    },
    preload() {
      if (!module) load().then((m) => { module = m; }).catch(() => {});
    },
  };
}
