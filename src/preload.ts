window.addEventListener("DOMContentLoaded", () => {
  const globalkey = require("globalkey");
  const activeWindows = require("node-process-windows");
  const replaceText = (selector: string, text: string) => {
    const element = document.getElementById(selector);
    if (element) {
      element.innerText = text;
    }
  };

  for (const type of ["chrome", "node", "electron"]) {
    replaceText(
      `${type}-version`,
      process.versions[type as keyof NodeJS.ProcessVersions]
    );
  }
  const keyCombinationMap: Map<string, string> = new Map();
  keyCombinationMap.set("LAlt+Key1", "Microsoft Teams");
  const strokeActions = (keys: string[]) => {
    if (keys[0] && keys[1]) {
      const windowName = keyCombinationMap.get(keys.reverse().join("+"));
      if (windowName) {
        activeWindows.getProcesses((err: string, processes: Object[]) => {
          if (err) console.error(err);
          let process = processes.filter(
            (process) =>
              //@ts-ignore
              process.mainWindowTitle
                .toLowerCase()
                .indexOf(windowName.toLowerCase()) >= 0
          );
          if (process[0]) activeWindows.focusWindow(process[0]);
        });
      }
    }
  };
  globalkey.start(
    (keys: string[]) => {
      strokeActions(keys);
    },
    (keys: string[]) => {
      replaceText("curr-keys", keys.join());
      strokeActions(keys);
    }
  );
});
