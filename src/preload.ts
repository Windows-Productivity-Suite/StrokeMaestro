const fs = require("fs");
const path = require("path");
window.addEventListener("DOMContentLoaded", () => {
  //--------------
  // Globals
  //--------------
  const recordKey = require("globalkey"); // For recording the keystrokes
  const globalkey = require("globalkey"); // For listening to global key strokes
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
  let listeningForOthers: Boolean = false;
  const listenKeyStoke = (id: string) => {
    if (listeningForOthers) {
      return;
    }
    listeningForOthers = true;
    const elem: HTMLDivElement = keybindingDOMList[+id];
    const keyNode = Array.from(elem.children).filter(
      (node) => node.id === "keys"
    )[0];
    const appName: string = (elem.children[0].children[0] as HTMLSelectElement)
      .value;
    let upInIteration: string[] = [];
    let keyCombination: string[] = [];
    let time: number = 0;
    recordKey.start(
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
            div.classList.add(..."inline block fixed key".split(" "));
            keyNode.appendChild(div);
            keyCombination.push(key);
          }
        }
        //refresh keyCombinationMap
        keyBindingsMap.set(appName, keyCombination.join("+"));
      },
      (keys: string[]) => {
        if (keys.includes("Escape")) {
          elem.remove();
          keyBindingsMap.delete(appName);
          refreshConfig();
          listeningForOthers = false;
          recordKey.stop();
          return;
        }
        keys.forEach((key) => {
          if (upInIteration.includes(key)) {
            upInIteration.splice(upInIteration.indexOf(key), 1);
          }
        });
        if (upInIteration.length === 0) {
          refreshConfig();
          listeningForOthers = false;
          recordKey.stop();
        }
      }
    );
  };

  //Add a key value pair to the list
  const addItem = (
    appName: string = "AppName",
    keys: string[] = ["Click to set keybindings"]
  ) => {
    const divClassList: string = "block px-20 py-10 no-click";
    const ddClassList: string = "inline wrapper block fixed";
    const dtClassList: string = "inline block accent fixed wrapper";
    const selectClassList: string = "block accent drop-down";
    const keyNodeClassList: string = "inline block fixed key";
    const createOptions = (select: HTMLSelectElement, appName: string) => {
      const option = document.createElement("option");
      option.value = appName;
      option.textContent = appName;
      option.setAttribute("selected", "");
      select.add(option);
    };
    //Div element
    const div: HTMLDivElement = document.createElement("div");
    div.classList.add(...divClassList.split(" "));

    //Dt element
    const dt = document.createElement("dt");
    dt.classList.add(...dtClassList.split(" "));

    //Select element
    const select = document.createElement("select");
    select.classList.add(...selectClassList.split(" "));
    createOptions(select, appName);
    dt.appendChild(select);

    //DD element
    const dd = document.createElement("dd");
    dd.id = "keys";
    dd.classList.add(...ddClassList.split(" "));
    for (let key of keys) {
      const keyNode = document.createElement("div");
      keyNode.classList.add(...keyNodeClassList.split(" "));
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
  const strokeActions = (windowName: string) => {
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
  };

  //-----------------
  //   App Body
  //-----------------
  loadConfig();
  renderCombinations();
  document.getElementById("button").addEventListener("click", () => addItem());
  let keyCombination: string[] = [];
  const isCombination = (keys: string[]): Boolean | string => {
    let res: Boolean | string = false;
    keyBindingsMap.forEach((value: string, key: string) => {
      if (value === keys.join("+")) {
        res = key;
      }
    });
    return res;
  };
  globalkey.start(
    (keys: string[]) => {
      if (!listeningForOthers) {
        keyCombination.push(...keys);
        keyCombination = [...new Set(keyCombination)];
        const res: Boolean | string = isCombination(keyCombination);
        if (typeof res === "string") {
          strokeActions(res);
        }
      }
    },
    (keys: string[]) => {
      if (!listeningForOthers) {
        keys.forEach((key: string) => {
          if (keyCombination.includes(key)) {
            keyCombination.splice(keyCombination.indexOf(key), 1);
          }
        });
      }
    }
  );
});
