const fs = require("fs");
const path = require("path");
window.addEventListener("DOMContentLoaded", () => {
  //--------------
  // Globals
  //--------------
  const globalkey = require("globalkey");
  const activeWindows = require("node-process-windows");
  const keyBindingsMap: Map<string, string> = new Map();
  const list = document.getElementById("keybindings");
  const keybindingDOMList: HTMLDivElement[] = [];

  //--------------
  // Utils methods
  //--------------
  //Load previous config
  const loadConfig = () => {
    const config: Array<[string, string]> = JSON.parse(
      fs.readFileSync(path.resolve(process.cwd(), "./storage.json"), {
        encoding: "utf-8",
      })
    ).keybindings;
    for (let keybinding of config) {
      keyBindingsMap.set(keybinding[0], keybinding[1]);
    }
  };

  //Refresh config
  const refreshConfig = () => {
    fs.writeFileSync(
      path.resolve(process.cwd(), "./storage.json"),
      JSON.stringify(
        {
          keybindings: Array.from(keyBindingsMap.entries()),
        },
        null,
        2
      )
    );
  };

  //Listen to keystrokes
  const listenKeyStoke = (id: string) => {
    const elem: HTMLDivElement = keybindingDOMList[+id];
    const keyNode = Array.from(elem.children).filter(
      (node) => node.id === "keys"
    )[0];
    const appName = elem.children[0].textContent;
    let upInIteration: string[] = [];
    let keyCombination: string[] = [];
    let time: number = 0;
    globalkey.start(
      (keys: string[]) => {
        time++;
        if (time === 1) {
          keyNode.textContent = "";
        }
        upInIteration.push(...keys);
        upInIteration = [...new Set(upInIteration)];
        //rerender keys
        for (let key of keys) {
          if (!keyCombination.includes(key)) {
            const div = document.createElement("div");
            div.textContent = key;
            div.classList.add(..."inline block fixed".split(" "));
            keyNode.appendChild(div);
            keyCombination.push(key);
          }
        }
        //refresh keyCombinationMap and storage.json
        keyBindingsMap.set(appName, keyCombination.join("+"));
        refreshConfig();
      },
      (keys: string[]) => {
        keys.forEach((key) => {
          if (upInIteration.includes(key)) {
            upInIteration.splice(upInIteration.indexOf(key), 1);
          }
        });
        if (upInIteration.length === 0) {
          globalkey.stop();
        }
      }
    );
  };

  //Add a key value pair to the list
  const addItem = (
    appName: string = "AppName",
    keys: string[] = ["Click to set keybindings"]
  ) => {
    const div: HTMLDivElement = document.createElement("div");
    div.classList.add(..."block px-20 py-10 no-click".split(" "));
    const dt = document.createElement("dt");
    dt.textContent = appName;
    dt.classList.add(..."inline block accent fixed".split(" "));
    const dd = document.createElement("dd");
    dd.classList.add(..."inline wrapper block fixed".split(" "));
    dd.id = "keys";
    for (let key of keys) {
      const keyNode = document.createElement("div");
      keyNode.classList.add(..."inline block fixed".split(" "));
      keyNode.textContent = key;
      dd.appendChild(keyNode);
    }
    div.id = keybindingDOMList.length.toString();
    div.addEventListener("click", function () {
      listenKeyStoke(this.id);
    });
    div.appendChild(dt);
    div.appendChild(dd);
    list.appendChild(div);
    keybindingDOMList.push(div);
  };

  //Render loaded combinations from config.
  const renderCombinations = () => {
    keyBindingsMap.forEach((value: string, key: string) =>
      addItem(key, value.split("+"))
    );
  };

  //TO-DO
  const strokeActions = (keys: string[]) => {
    if (keys[0] && keys[1]) {
      const windowName = keyBindingsMap.get(keys.reverse().join("+"));
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

  //-----------------
  //   App Body
  //-----------------
  loadConfig();
  renderCombinations();
  document.getElementById("button").addEventListener("click", () => addItem());
});
