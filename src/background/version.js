import Options from "./options";

const Version = {
  update: async (ver, prev) => {
    if (prev === undefined) {
      await browser.storage.local.set({ version: ver });
      console.log(`Installed ${ver}`); /* RemoveLogging:skip */
    } else if (prev !== ver) {
      console.log(`Update ${prev} => ${ver}`); /* RemoveLogging:skip */
      // do updates from oldest to most recent
      if (ver >= "2.2.0" && prev < "2.2.0") {
        await Version.update_2_2_0(prev);
      }
      if (ver >= "2.4.1" && prev < "2.4.1") {
        await Version.update_2_4_1(prev);
      }
      if (ver >= "3.0.0" && prev < "3.0.0") {
        await Version.update_3_0_0(prev);
      }
      if (ver >= "4.0.0" && prev < "4.0.0") {
        await Version.update_4_0_0(prev);
      }
      await browser.storage.local.set({ version: ver });
      console.log(`Updated to ${ver}`); /* RemoveLogging:skip */
    }
  },

  update_2_2_0: async (prev) => {
    // workaround: manually set a version number
    // so following rules can be triggered
    // prev = "2.1.1";
    const set = {};
    console.debug(`Update part ${prev} => 2.2.0`); /* RemoveLogging:skip */
    const keys = ["action", "altIsFilename", "altIsFilenameExt"];
    const oldOpts = await browser.storage.local.get(keys);
    if (oldOpts.altIsFilename) {
      // create rule for altIsFilename
      const ext = oldOpts.altIsFilenameExt || ".jpg";
      const rule = `<alt>${ext}`;
      const def = Options.getOptionMeta("pathRules").default;
      // prepend default with new rule
      const rules = `${rule}\n${def}`;
      console.debug("Updated rules", rules);
      set.pathRules = rules;
    }
    if (oldOpts.action && oldOpts.action === "current") {
      set.action = "active";
    }
    await browser.storage.local.set(set);
    // delete converted options
    await browser.storage.local.remove(["altIsFilename", "altIsFilenameExt"]);
  },

  update_2_4_1: async (prev) => {
    // removeEnded option is renamed to downloadPrivate to align with option label
    // and removeEnded option is reused for its original purpose as a new option
    console.debug(`Update part ${prev} => 2.4.1`); /* RemoveLogging:skip */
    const keys = ["removeEnded"];
    const oldOpts = await browser.storage.local.get(keys);
    if (oldOpts.removeEnded) {
      await browser.storage.local.set({
        removeEnded: false,
        downloadPrivate: true,
      });
    }
  },

  update_3_0_0: async (prev) => {
    // convert pathRules to array
    // "ext" rules no longer include period:
    // update rules place a period before the extension
    console.debug(`Update part ${prev} => 3.0.0`); /* RemoveLogging:skip */
    const keys = ["pathRules"];
    const oldOpts = await browser.storage.local.get(keys);
    if (oldOpts.pathRules && !Array.isArray(oldOpts.pathRules)) {
      const rules = oldOpts.pathRules.split("\n").map((rule) => {
        const newRule = rule
          // "<ext|...|.jpg>" ==> "<ext|...|jpg>"
          .replace(/(<(ext|xExt|xMimeExt)[^>]+\|)\.(\w+)/gi, "$1$3")
          // "<ext..." ==> ".<ext..."
          .replace(/(<ext|<xExt|<xMimeExt)/gi, ".$&");
        return newRule;
      });
      await browser.storage.local.set({ pathRules: rules });
    }
    if (prev !== undefined) {
      // open readme page for v3.0
      await browser.windows.create({
        url: "https://github.com/mcdamo/tab-image-saver/blob/master/CHANGES-3.0.md",
      });
    }
  },
  update_4_0_0: async (prev) => {
    // convert pathRules to expressions
    console.debug(`Update part ${prev} => 4.0.0`); /* RemoveLogging:skip */
    const set = {};
    let keys = ["pathRules", "rulesetIndex"];
    let oldOpts = await browser.storage.local.get(keys);
    if (oldOpts.pathRules) {
      set._legacy_template = true;
    }
    if (oldOpts.rulesetIndex) {
      // rename rulesetIndex key => id
      const rulesetIndex = oldOpts.rulesetIndex.map((idx) => {
        const { key, ...rest } = idx;
        rest.id = key;
        return rest;
      });
      set.rulesetIndex = rulesetIndex;

      keys = rulesetIndex.reduce((acc, val) => {
        acc.push(`ruleset_${val.id}`);
        return acc;
      }, []);
      const oldRulesets = await browser.storage.local.get(keys);
      console.log(oldRulesets);
      for (const [rulesetKey, oldRuleset] of Object.entries(oldRulesets)) {
        if (oldRuleset.pathRules) {
          set[rulesetKey] = { ...oldRuleset, _legacy_template: true };
        }
      }
    }
    await browser.storage.local.set(set);
    if (prev !== undefined) {
      // open readme page for v4.0
      await browser.windows.create({
        url: "https://github.com/mcdamo/tab-image-saver/blob/master/CHANGES-4.0.md",
      });
    }
  },

  updateLegacyTemplates: async () => {
    let keys = ["pathRules", "rulesetIndex", "_legacy_template"];
    const set = {};
    const obj = {
      alt: "",
      ext: "",
      hostname: "",
      host: "",
      index: "",
      name: "",
      path: "",
      tabtitle: "",
      tabhost: "",
      tabpath: "",
      tabfile: "",
      tabext: "",
      xname: "",
      xext: "",
      xmimeext: "",
    };
    let oldOpts = await browser.storage.local.get(keys);
    if (oldOpts._legacy_template) {
      if (oldOpts.pathRules) {
        const rules = oldOpts.pathRules.map((rule) =>
          Version._legacy_template(rule, obj)
        );
        set.pathRules = rules;
      }
      await browser.storage.local.remove("_legacy_template");
    }
    if (oldOpts.rulesetIndex) {
      keys = oldOpts.rulesetIndex.reduce((acc, val) => {
        acc.push(`ruleset_${val.id}`);
        return acc;
      }, []);
      const oldRulesets = await browser.storage.local.get(keys);
      for (const [rulesetKey, oldRuleset] of Object.entries(oldRulesets)) {
        if (oldRuleset._legacy_template && oldRuleset.pathRules) {
          const rules = oldRuleset.pathRules.map((rule) =>
            Version._legacy_template(rule, obj)
          );
          delete oldRuleset._legacy_template;
          set[rulesetKey] = { ...oldRuleset, pathRules: rules };
        }
      }
    }
    await browser.storage.local.set(set);
  },

  /**
   * code: "|command|param|..."
   * eg.   "|replace|pattern|newSubstr[|regexp flags]"
   *
   * @param {*} string
   * @param {*} obj
   * @returns
   */
  _legacy_templateCode: (input, code, wrap = false) => {
    if (code === undefined) {
      return input;
    }
    let delim = code.substr(1, 1);
    let aCode = code.substr(2).slice(0, -1).split(delim); // remove 2 leading and 1 trailing characters and split
    switch (aCode[0].toLowerCase()) {
      case "replace": {
        let rMod = "";
        if (aCode.length > 3) {
          rMod = aCode[3]; // optional regex modifier
        }
        let regex = aCode[1];
        let newStr = aCode[2] !== undefined ? aCode[2] : "";
        // return input.replace(regex, newStr);
        let vars = wrap ? `(${input})` : input;
        return `${vars}.replace(/${regex}/${rMod}, "${newStr}")`;
      }
      default: {
        console.warn(
          "Ignoring invalid templateCode",
          code
        ); /* RemoveLogging:skip */
        return input;
      }
    }
  },

  /**
   * string contains varnames in angled brackets
   * optional pipe to define 'or'
   * optional #'s to define zero padding
   * vars defined in obj
   * <var1|var2> => var1 || var2
   * <###index> => 000
   *
   * @param {*} string
   * @param {*} obj
   * @returns
   */
  _legacy_template: (string, obj) => {
    let s = string;
    // greedy match <.> with optional templateCode
    const r = /<([^>]+)>("[^"\\]*(?:\\.[^"\\]*)*")?/g;
    s = s.replace(r, (match, p, globalCode) => {
      // match #key with optional templateCode, repeating separated by pipe '|'
      const rPipe =
        /([#]*)([^"|]+)("[^"\\]*(?:\\.[^"\\]*)*")?(?:\|([#]*)([^"|]+)("[^"\\]*(?:\\.[^"\\]*)*")?)?/g;
      const varsArray = [...p.matchAll(rPipe)]; // target Firefox-67
      const ors = [];
      for (let h = 0; h < varsArray.length; h++) {
        let vars = varsArray[h];
        for (let i = 1; i < vars.length; i += 3) {
          const pad = vars[i];
          const key = vars[i + 1];
          if (key === undefined) {
            continue;
          }
          const localCode = vars[i + 2];
          const lkey = key.toLowerCase();
          if (!Object.prototype.hasOwnProperty.call(obj, lkey)) {
            // treat as a string
            ors.push(`"${key}"`);
          }
          if (obj[lkey] !== undefined) {
            let ret = key;
            if (pad.length > 0) {
              ret += `.padStart(${pad.length},0)`;
            }
            if (localCode !== undefined) {
              console.log("local", localCode);
              ret = Version._legacy_templateCode(ret, localCode);
            }
            ors.push(ret);
          }
        }
      }
      let ret = "";
      if (ors.length > 0) {
        ret = ors.join("||");
        if (globalCode !== undefined) {
          console.log("global", globalCode);
          ret = Version._legacy_templateCode(ret, globalCode, true);
        }
        ret = `\${${ret}}`;
      }
      return ret;
    });
    // return original string if no template is defined
    return s;
  },
};

export default Version;
