import Constants from "./constants";
import Global from "./global";
import Commands from "./commands";
import Common from "./common";

const T = {
  BOOL: "BOOL",
  RADIO: "RADIO",
  VALUE: "VALUE",
  ARRAY: "ARRAY",
};

const Options = {
  loaded: false,
  ALLOW_DOWNLOAD_PRIVATE: false,
  OPTIONS: {}, // options with defaults loaded at runtime
  OPTIONS_RULESETS: {}, // rulesets with defaults + with inherit applied - used by Background
  RULESETS: {}, // rulesets with defaults loaded at runtime - used by Options.
  RULESET_DEFAULTS: {}, // singular set of ruleset defaults loaded at runtime
  OPTION_TYPES: T,
  OPTION_SCHEMA: {
    action: {
      type: T.RADIO,
      default: Constants.ACTION.ACTIVE,
      values: Object.values(Constants.ACTION),
      onsave: { function: (v) => Options.saveAction(v) },
    },
    activeTab: {
      type: T.BOOL,
      default: false,
    },
    browserAction: {
      type: T.RADIO,
      onload: { function: (v) => Options.loadBrowserAction(v) },
      onsave: { function: (v) => Options.saveBrowserAction(v) },
      default: Constants.BROWSER_ACTION.POPUP,
      values: Object.values(Constants.BROWSER_ACTION),
    },
    closeTab: {
      type: T.BOOL,
      default: false,
    },
    conflictAction: {
      type: T.RADIO,
      default: Constants.CONFLICT_ACTION.UNIQUIFY,
      values: Object.values(Constants.CONFLICT_ACTION),
    },
    downloadAsync: {
      type: T.BOOL,
      default: false,
    },
    downloadNum: {
      type: T.VALUE,
      default: 6,
      regex: "^[1-9][0-9]*$", // integer >= 1
      onload: { function: (v) => parseInt(v, 10) },
      onsave: { function: (v) => parseInt(v, 10) },
    },
    downloadPath: {
      type: T.VALUE,
      onload: { function: (v) => Global.sanitizePath(v) }, // App
      onsave: { function: (v) => Global.sanitizePath(v) }, // UI
      default: "",
    },
    downloadPrivate: {
      type: T.BOOL,
      onload: { function: (v) => (Options.ALLOW_DOWNLOAD_PRIVATE ? v : false) },
      onsave: { function: (v) => (Options.ALLOW_DOWNLOAD_PRIVATE ? v : false) },
      default: false,
    },
    filter: {
      type: T.RADIO,
      default: Constants.FILTER.MAX,
      values: Object.values(Constants.FILTER),
    },
    ignoreDiscardedTab: {
      type: T.BOOL,
      default: false,
    },
    indexIncrement: {
      type: T.VALUE,
      default: 1,
      regex: "^-?[1-9][0-9]*$", // integer
      onload: { function: (v) => parseInt(v, 10) },
      onsave: { function: (v) => parseInt(v, 10) },
    },
    indexMethod: {
      type: T.RADIO,
      default: Constants.INDEX_METHOD.RUNTIME,
      values: Object.values(Constants.INDEX_METHOD),
    },
    indexStart: {
      type: T.VALUE,
      default: 1,
      regex: "^[0-9][0-9]*$", // integer >= 0
      onload: { function: (v) => parseInt(v, 10) },
      onsave: { function: (v) => parseInt(v, 10) },
    },
    minHeight: {
      type: T.VALUE,
      default: 100,
      regex: "^[1-9][0-9]*$", // integer >= 1
      onload: { function: (v) => parseInt(v, 10) },
      onsave: { function: (v) => parseInt(v, 10) },
    },
    minWidth: {
      type: T.VALUE,
      default: 100,
      regex: "^[1-9][0-9]*$", // integer >= 1
      onload: { function: (v) => parseInt(v, 10) },
      onsave: { function: (v) => parseInt(v, 10) },
    },
    notifyEnded: {
      type: T.BOOL,
      default: true,
    },
    pathRules: {
      type: T.ARRAY,
      onsave: { function: (v) => Options.onSaveRules(v) }, // UI
      default: [
        "${name}.${ext}",
        "${xName}.${xExt||xMimeExt}",
        "${host}/img_${index.padStart(3,0)}.${ext||xExt||xMimeExt||'jpg'}",
      ],
    },
    removeEnded: {
      type: T.BOOL,
      default: false,
    },
    rulesetIndex: {
      type: T.ARRAY,
      default: [],
    },
    shortcut: {
      type: T.VALUE,
      shortcut: true,
      // onLoad/onSave wrap in object so that the property name is included in sendMessage
      onload: {
        function: async (v) =>
          await Options.loadShortcut(Constants.SHORTCUT_TYPE.DEFAULT_ACTION, v),
      }, // App
      onsave: {
        function: async (v) =>
          await Options.setShortcut(Constants.SHORTCUT_TYPE.DEFAULT_ACTION, v),
      }, // UI
      default: "",
    },
    shortcutActive: {
      type: T.VALUE,
      shortcut: true,
      // onLoad/onSave wrap in object so that the property name is included in sendMessage
      onload: {
        function: async (v) =>
          await Options.loadShortcut(Constants.SHORTCUT_TYPE.ACTIVE_ACTION, v),
      }, // App
      onsave: {
        function: async (v) =>
          await Options.setShortcut(Constants.SHORTCUT_TYPE.ACTIVE_ACTION, v),
      }, // UI
      default: "",
    },
    shortcutLeft: {
      type: T.VALUE,
      shortcut: true,
      // onLoad/onSave wrap in object so that the property name is included in sendMessage
      onload: {
        function: async (v) =>
          await Options.loadShortcut(Constants.SHORTCUT_TYPE.LEFT_ACTION, v),
      }, // App
      onsave: {
        function: async (v) =>
          await Options.setShortcut(Constants.SHORTCUT_TYPE.LEFT_ACTION, v),
      }, // UI
      default: "",
    },
    shortcutRight: {
      type: T.VALUE,
      shortcut: true,
      // onLoad/onSave wrap in object so that the property name is included in sendMessage
      onload: {
        function: async (v) =>
          await Options.loadShortcut(Constants.SHORTCUT_TYPE.RIGHT_ACTION, v),
      }, // App
      onsave: {
        function: async (v) =>
          await Options.setShortcut(Constants.SHORTCUT_TYPE.RIGHT_ACTION, v),
      }, // UI
      default: "",
    },
    shortcutAll: {
      type: T.VALUE,
      shortcut: true,
      // onLoad/onSave wrap in object so that the property name is included in sendMessage
      onload: {
        function: async (v) =>
          await Options.loadShortcut(Constants.SHORTCUT_TYPE.ALL_ACTION, v),
      }, // App
      onsave: {
        function: async (v) =>
          await Options.setShortcut(Constants.SHORTCUT_TYPE.ALL_ACTION, v),
      }, // UI
      default: "",
    },
    _legacy_template: {
      type: T.BOOL,
      default: false,
    },
  },
  OPTION_RULESET_SCHEMA: {
    closeTab: {
      type: T.BOOL,
      default: false,
    },
    conflictActionInherit: {
      inherit: ["conflictAction"],
      type: T.BOOL,
      default: true,
    },
    conflictAction: {
      type: T.RADIO,
      default: Constants.CONFLICT_ACTION.UNIQUIFY,
      values: Object.values(Constants.CONFLICT_ACTION),
    },
    domainRules: {
      type: T.ARRAY,
      onsave: { function: (v) => Options.onSaveDomainRules(v) }, // UI
      default: [],
    },
    downloadCompleteInherit: {
      inherit: ["closeTab", "removeEnded"],
      type: T.BOOL,
      default: true,
    },
    downloadAdvancedInherit: {
      inherit: ["downloadPrivate"],
      type: T.BOOL,
      default: true,
    },
    downloadPathInherit: {
      inherit: ["downloadPath"],
      type: T.BOOL,
      default: true,
    },
    downloadPath: {
      type: T.VALUE,
      onload: { function: (v) => Global.sanitizePath(v) }, // App
      onsave: { function: (v) => Global.sanitizePath(v) }, // UI
      default: "",
    },
    downloadPrivate: {
      type: T.BOOL,
      onload: { function: (v) => (Options.ALLOW_DOWNLOAD_PRIVATE ? v : false) },
      onsave: { function: (v) => (Options.ALLOW_DOWNLOAD_PRIVATE ? v : false) },
      default: false,
    },
    filter: {
      type: T.RADIO,
      default: Constants.FILTER.MAX,
      values: Object.values(Constants.FILTER),
    },
    filterInherit: {
      inherit: ["filter", "minHeight", "minWidth"],
      type: T.BOOL,
      default: true,
    },
    indexingInherit: {
      inherit: ["indexIncrement", "indexMethod", "indexStart"],
      type: T.BOOL,
      default: true,
    },
    indexIncrement: {
      type: T.VALUE,
      default: 1,
      regex: "^-?[1-9][0-9]*$", // integer
      onload: { function: (v) => parseInt(v, 10) },
      onsave: { function: (v) => parseInt(v, 10) },
    },
    indexMethod: {
      type: T.RADIO,
      default: Constants.INDEX_METHOD.RUNTIME,
      values: Object.values(Constants.INDEX_METHOD),
    },
    indexStart: {
      type: T.VALUE,
      default: 1,
      regex: "^[0-9][0-9]*$", // integer >= 0
      onload: { function: (v) => parseInt(v, 10) },
      onsave: { function: (v) => parseInt(v, 10) },
    },
    minHeight: {
      type: T.VALUE,
      default: 100,
      regex: "^[1-9][0-9]*$", // integer >= 1
      onload: { function: (v) => parseInt(v, 10) },
      onsave: { function: (v) => parseInt(v, 10) },
    },
    minWidth: {
      type: T.VALUE,
      default: 100,
      regex: "^[1-9][0-9]*$", // integer >= 1
      onload: { function: (v) => parseInt(v, 10) },
      onsave: { function: (v) => parseInt(v, 10) },
    },
    rulesetName: {
      type: T.VALUE,
      default: "",
    },
    pathRulesInherit: {
      inherit: ["pathRules"],
      type: T.BOOL,
      default: true,
    },
    pathRules: {
      type: T.ARRAY,
      onsave: { function: (v) => Options.onSaveRules(v) }, // UI
      default: [
        "${name}.${ext}",
        "${xName}.${xExt||xMimeExt}",
        "${host}/img_${index.padStart(3,0)}.${ext||xExt||xMimeExt||'jpg'}",
      ],
    },
    removeEnded: {
      type: T.BOOL,
      default: false,
    },
    _legacy_template: {
      type: T.BOOL,
      default: false,
    },
  },

  // load array and trim empty elements
  arrayTrim: (rules) => {
    const arr = rules.reduce((acc, val) => {
      const s = val.trim();
      if (s.length > 0) {
        acc.push(s);
      }
      return acc;
    }, []);
    return arr;
  },

  // return array of rules
  onSaveRules: (rules) => {
    const arr = Options.arrayTrim(rules);
    return arr;
  },

  // return array of rules
  onSaveDomainRules: (rules) => {
    const arr = Options.arrayTrim(rules);
    return arr;
  },

  getKeys: () => Object.keys(Options.OPTION_SCHEMA),

  getOptionSchema: () => Options.OPTION_SCHEMA,

  getOptionRulesetSchema: () => Options.OPTION_RULESET_SCHEMA,

  getOptionMeta: (name) => Options.OPTION_SCHEMA[name],

  getRulesetOptionMeta: (name) => Options.OPTION_RULESET_SCHEMA[name],

  setOption: (name, value) => {
    Options.OPTIONS[name] = value;
  },

  getRulesetKeyFromId: (id) => Common.getRulesetKeyFromId(id),

  getRulesetKeyFromIndex: (index) =>
    Options.getRulesetKeyFromId(Options.OPTIONS.rulesetIndex[index].id),

  // test rule against url
  //
  // rule:
  //   use '*' as simple wildcard
  //   wrap rule in #...# to treat as regexp
  domainRuleMatch: (url, rule) => {
    console.debug({ url, rule });
    if (!rule || rule.length === 0) {
      return false;
    }
    const location = new URL(url);
    const host = location.host;
    const loc = location.href;
    // test for regex in format: #...#
    if (rule.length >= 3 && rule[0] === "#" && rule[rule.length - 1] === "#") {
      const regex = new RegExp(rule.substring(1, rule.length - 1)); // slashes are automatically escaped
      if (loc.match(regex)) {
        console.debug("domain regex matches", regex);
        return true;
      }
    }
    // WILDCARD matching
    // escape all RegExp characters in provided rule
    // escape method adapted from MDN RegExp docs (removed '*')
    // expand '*' wildcard to regex and evaluate
    const regex = new RegExp(
      // $& means the whole matched string
      rule.replace(/[.+\-?^${}()|[\]\\]/g, "\\$&").replace(/[*]/g, ".*")
    );
    if (loc.match(regex)) {
      console.debug("domain wildcard matches", regex);
      return true;
    }
    return false;
  },

  // get options in content script
  // url from location.href
  // inherit options are evaluated
  // other rulesets are not returned
  getTabOptions: async (url = null) => {
    console.log("getTabOptions", url);
    if (!Options.loaded) {
      await Options.loadOptions();
    }
    if (url) {
      // check for matching ruleset
      console.debug("rulesets", Options.OPTIONS_RULESETS);
      const match = Object.entries(Options.OPTIONS_RULESETS).find(
        ([key, r]) => {
          if (!("domainRules" in r)) {
            return false;
          }
          if (r.domainRules.find((val) => Options.domainRuleMatch(url, val))) {
            return true;
          }
          return false;
        }
      );
      if (match) {
        const [key, ruleset] = match;
        console.info(`matched ruleset ${key}`, ruleset);
        return ruleset;
      }
    }
    return Options.OPTIONS;
  },

  getRulesetKeyOption: ({ rulesetKey, name }) =>
    Options.OPTIONS_RULESETS[rulesetKey][name],

  setOptions: async (loadedOptions) => {
    console.debug("setOptions", loadedOptions);
    const localKeys = Object.keys(loadedOptions);
    for (const k of localKeys) {
      const optionType = Options.OPTION_SCHEMA[k];
      if (optionType === undefined) {
        console.warn("Failed loading option:", k);
        continue;
      }
      const fn = optionType.onload ? optionType.onload.function : (x) => x;
      const val = await fn(loadedOptions[k]);
      Options.setOption(k, val);
    }
    console.debug("setOptions ret", Options.OPTIONS);
    return Options.OPTIONS;
  },

  loadOptions: async () => {
    console.log("loadOptions");
    console.log("ALLOW_DOWNLOAD_PRIVATE", Options.ALLOW_DOWNLOAD_PRIVATE);
    const keys = Options.getKeys();
    const loadedOptions = await browser.storage.local.get(keys);
    await Options.setOptions(loadedOptions);
    if (
      Options.OPTIONS.rulesetIndex &&
      Options.OPTIONS.rulesetIndex.length > 0
    ) {
      for (let i = 0; i < Options.OPTIONS.rulesetIndex.length; i++) {
        await Options.loadRuleset(Options.getRulesetKeyFromIndex(i));
      }
    }
    Options.loaded = true;
    console.log("loadOptions:end");
    return Options.OPTIONS;
  },

  // process schema defaults on ruleset
  loadRuleset: async (rulesetKey) => {
    const loaded = await browser.storage.local.get([rulesetKey]);
    console.log("loadRuleset", loaded);
    return await Options.setRuleset(rulesetKey, loaded[rulesetKey]);
  },

  setRuleset: async (rulesetKey, loaded) => {
    console.log("setRuleset loaded", loaded);
    console.log("setRuleset defaults", Options.RULESET_DEFAULTS);
    // merge ruleset defaults with new 'loaded' options
    const options = {
      ...JSON.parse(JSON.stringify(Options.RULESET_DEFAULTS)), // deep clone
      ...loaded,
    };
    const localKeys = Object.keys(loaded);
    for (const k of localKeys) {
      const optionType = Options.OPTION_RULESET_SCHEMA[k];
      if (optionType === undefined) {
        console.warn("Failed loading option:", k);
        continue;
      }
      // process onload.function for all rulesets
      const fn = optionType.onload ? optionType.onload.function : (x) => x;
      const val = await fn(options[k]);
      options[k] = val;
    }
    console.log("setRuleset options", options);
    Options.RULESETS[rulesetKey] = options;
    Options.setRulesetInherited(rulesetKey, loaded);
    return options;
  },

  // set the ruleset cache with inherited options
  // this cache is used by the background process
  setRulesetInherited: (rulesetKey, loaded) => {
    const optionsInherit = JSON.parse(JSON.stringify(Options.OPTIONS)); // deep clone
    const localKeys = Object.keys(loaded);
    for (const k of localKeys) {
      const optionType = Options.OPTION_RULESET_SCHEMA[k];
      if (optionType === undefined) {
        console.warn("Failed loading option:", k);
        continue;
      }
      if (optionType.inherit) {
        // include 'inherit*' key in options
        optionsInherit[k] = loaded[k];
        if (!loaded[k]) {
          console.log("overriding inherit for", k);
          for (const childName of optionType.inherit) {
            // use ruleset-default if option has not been saved
            optionsInherit[childName] =
              childName in loaded
                ? loaded[childName]
                : Options.RULESET_DEFAULTS[childName];
          }
        }
      }
    }
    // manually copy some settings to the inherit options
    optionsInherit.domainRules = loaded.domainRules || []; // options.domainRules;
    optionsInherit.rulesetName = loaded.rulesetName;
    optionsInherit.rulesetKey = rulesetKey;
    console.log("setRuleset inherit", optionsInherit);
    Options.OPTIONS_RULESETS[rulesetKey] = optionsInherit;
  },

  // update the inherited ruleset cache for all rulesets
  setRulesetsInherited: () => {
    let rulesetKey;
    if (
      Options.OPTIONS.rulesetIndex &&
      Options.OPTIONS.rulesetIndex.length > 0
    ) {
      for (let i = 0; i < Options.OPTIONS.rulesetIndex.length; i++) {
        rulesetKey = Options.getRulesetKeyFromIndex(i);
        Options.setRulesetInherited(rulesetKey, Options.RULESETS[rulesetKey]);
      }
    }
  },

  // use id instead of index to prevent accidents.
  deleteRuleset: async (id) => {
    let rulesetIndex = Options.OPTIONS.rulesetIndex;
    let index = rulesetIndex.findIndex((_) => _.id === id);
    const rulesetKey = Options.getRulesetKeyFromId(id);
    rulesetIndex.splice(index, 1);
    rulesetIndex = await Options.saveOption("rulesetIndex", rulesetIndex);
    await browser.storage.local.remove([rulesetKey]);
    delete Options.RULESETS[rulesetKey];
    delete Options.OPTIONS_RULESETS[rulesetKey];
    Options.OPTIONS.rulesetIndex = rulesetIndex;
    return rulesetIndex;
  },

  /**
   *
   * @param {string} name
   * @param {string} value
   * @param {integer} id numerical ruleset id
   * @returns {string} value
   */
  saveRulesetOption: async (name, value, id) => {
    console.log("saveRulesetOption", Options.RULESET_DEFAULTS);
    const rulesetKey = Options.getRulesetKeyFromId(id);
    return await Options.saveRulesetKeyOption({ name, value, rulesetKey });
  },

  /**
   *
   * @param {string} name
   * @param {string} value
   * @param {string} rulesetKey eg. 'ruleset_0'
   * @returns {string} value
   */
  saveRulesetKeyOption: async ({ name, value, rulesetKey }) => {
    // get sparse ruleset from storage
    const ruleset = (await browser.storage.local.get(rulesetKey))[rulesetKey];
    console.log("saveRulesetOption:load", ruleset, name);
    const opt = Options.getRulesetOptionMeta(name);
    console.log("opt", opt);
    const newValue = opt.onsave ? await opt.onsave.function(value) : value;
    ruleset[name] = newValue;
    await browser.storage.local.set({ [rulesetKey]: ruleset });
    console.log("opt", opt);
    // run onload functions
    // update OPTIONS_RULESETS with inherit rules
    // TODO set only the changed option, not the entire ruleset.
    await Options.setRuleset(rulesetKey, ruleset);
    return newValue;
  },

  saveOption: async (name, value) => {
    console.log("saveOption", name, value);
    const opt = Options.getOptionMeta(name);
    const newValue = opt.onsave ? await opt.onsave.function(value) : value;
    const options = { [name]: newValue };
    await browser.storage.local.set(options);
    await Options.setOptions(options); // this runs onload functions
    // update inherited ruleset cache when any Global option is changed
    Options.setRulesetsInherited();
    return newValue;
  },

  loadShortcut: async (name, key) => await Commands.setCommand(name, key),

  setShortcut: async (name, key) => {
    console.log("key", key);
    // check for conflicting shortcuts
    if (
      key &&
      Object.entries(Options.OPTION_SCHEMA).find(
        ([optionName, option]) =>
          option.shortcut &&
          optionName !== name &&
          Options.OPTIONS[optionName] === key
      )
    ) {
      console.log("shortcut conflict, throwing error");
      throw new Error("shortcut conflict");
    }
    return await Commands.setCommand(name, key);
  },

  loadBrowserAction: async (value) => {
    let popup = "";
    if (value === Constants.BROWSER_ACTION.POPUP) {
      popup = browser.runtime.getURL("popup.html");
    }
    console.log("loadBrowserAction", value, popup);
    await browser.browserAction.setPopup({ popup });
    return value;
  },

  saveBrowserAction: async (value) => {
    await Options.setTitle({ browserAction: value });
    return value;
  },

  saveAction: async (value) => {
    await Options.setTitle({ action: value });
    return value;
  },

  createRuleset: async () => {
    const rulesetIndex = Options.OPTIONS.rulesetIndex;
    // find next unused key
    const ids = rulesetIndex.map((o) => o.id);
    const id = Global.findNextSequence(ids);
    const rulesetKey = Options.getRulesetKeyFromId(id);
    // generate name
    const rulesetName = browser.i18n.getMessage(
      "options_rulesets_ruleset_name_default",
      id + 1
    );
    rulesetIndex.push({ id });
    let ruleset = { rulesetName };
    console.log("createRuleset", ruleset);
    await browser.storage.local.set({
      rulesetIndex,
      [rulesetKey]: ruleset,
    });
    Options.OPTIONS.rulesetIndex = rulesetIndex;
    ruleset = await Options.setRuleset(rulesetKey, ruleset);
    return { rulesetIndex, rulesets: Options.RULESETS };
  },

  // this placeholder function is overwritten by App.setTitle
  setTitle: () => {},

  init: async (App) => {
    if (App) {
      Commands.init(App);
      Options.setTitle = App.setTitle;
    }
    // set default options
    console.log("Options.init");
    const defaults = Object.entries(Options.OPTION_SCHEMA).reduce(
      (acc, [optionName, option]) => {
        acc[optionName] = JSON.parse(JSON.stringify(option.default)); // deep clone
        return acc;
      },
      {}
    );
    await Options.setOptions(defaults);
    // set ruleset defaults to be reused for each ruleset loaded
    Options.RULESET_DEFAULTS = Object.entries(
      Options.OPTION_RULESET_SCHEMA
    ).reduce((acc, [optionName, option]) => {
      acc[optionName] = JSON.parse(JSON.stringify(option.default)); // deep clone
      return acc;
    }, {});
    Options.ALLOW_DOWNLOAD_PRIVATE =
      await browser.extension.isAllowedIncognitoAccess();
  },
};

export default Options;
export { T };
