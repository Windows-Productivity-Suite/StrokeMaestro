const fs = require("fs");
const path = require("path");

window.addEventListener("DOMContentLoaded", () => {
  //--------------
  // Global initializations
  //--------------
  const recordKey = require("globalkey"); // For recording the keystrokes
  const globalkey = require("globalkey"); // For listening to global key strokes
  const activeWindows = require("node-process-windows");
  const installedSoftware = require("fetch-installed-software");
  const keyBindingsMap: Map<string, string> = new Map();
  const list = document.getElementById("keybindings");
  const keybindingDOMList: HTMLDivElement[] = [];

  //--------------
  // Utils methods
  //--------------

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

  let prevValue: string = "";
  function prevCallback() {
    prevValue = this.value;
  }
  function selectCallback() {
    const bindings = keyBindingsMap.get(prevValue);
    keyBindingsMap.delete(prevValue);
    if (this.value !== "None") {
      keyBindingsMap.set(this.value, bindings);
      refreshConfig();
    }
  }

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
    //@ts-ignore
    const selectElement: HTMLSelectElement = elem.children[0].children[0];
    let appName: string = selectElement.value;
    function localSelectCallback() {
      appName = this.value;
    }
    if (appName === "None") {
      selectElement.removeEventListener("change", selectCallback);
      selectElement.addEventListener("change", localSelectCallback);
    }
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
        if (appName !== "None")
          keyBindingsMap.set(appName, keyCombination.join("+"));
      },
      (keys: string[]) => {
        if (keys.includes("Escape") && appName !== "None") {
          elem.remove();
          keyBindingsMap.delete(appName);
          refreshConfig();
          selectElement.removeEventListener("change", localSelectCallback);
          selectElement.addEventListener("change", selectCallback);
          listeningForOthers = false;
          recordKey.stop();
          return;
        }
        keys.forEach((key) => {
          if (upInIteration.includes(key)) {
            upInIteration.splice(upInIteration.indexOf(key), 1);
          }
        });
        if (upInIteration.length === 0 && appName !== "None") {
          refreshConfig();
          listeningForOthers = false;
          selectElement.removeEventListener("change", localSelectCallback);
          selectElement.addEventListener("change", selectCallback);
          recordKey.stop();
        }
      }
    );
  };

  // Fetch installed softwares
  const getInstalledSoftwares = (): string[] => {
    const contents = installedSoftware
      .getAllInstalledSoftwareSync()
      .filter((software: Object) =>
        //@ts-ignore
        software.DisplayName ? true : false
      )
      //@ts-ignore
      .map((software: Object) => software.DisplayName);
    return contents;
  };

  //Add a key value pair to the list
  const softwares: string[] = getInstalledSoftwares();
  const addItem = (
    appName: string = "AppName",
    keys: string[] = ["Click to set keybindings"]
  ) => {
    const divClassList: string = "block px-20 py-10 no-click";
    const ddClassList: string = "inline wrapper block fixed";
    const dtClassList: string = "inline block accent fixed wrapper";
    const selectClassList: string = "block accent drop-down";
    const keyNodeClassList: string = "inline block fixed key";
    const createOptions = (select: HTMLSelectElement) => {
      const localCopy = [...softwares];
      if (appName === "AppName") {
        localCopy.unshift("None");
      }
      for (let software of localCopy) {
        const option = document.createElement("option");
        option.value = software.trim();
        option.textContent = software.trim();
        if (software === appName) option.setAttribute("selected", "");
        select.add(option);
      }
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
    select.addEventListener("change", selectCallback);
    select.addEventListener("focus", prevCallback);
    createOptions(select);
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

  // Activate the window
  const strokeAction = (windowName: string) => {
    if (windowName) {
      alert("Stroking:" + windowName);
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
      if (keys.join("+") === value) {
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
          strokeAction(res);
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
