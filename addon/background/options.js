/* globals Commands ACTION CONFLICT_ACTION FILTER Global */

// import for testing
if (typeof module !== "undefined") {
  const c = require("background/constants");
  window.ACTION = c.ACTION;
  window.CONFLICT_ACTION = c.CONFLICT_ACTION;
  window.FILTER = c.FILTER;
  const m = require("background/commands");
  window.Commands = m.Commands;
}

const T = {
  BOOL: "BOOL",
  RADIO: "RADIO",
  VALUE: "VALUE"
};

const Options = {
  loaded: false,
  OPTIONS: {}, // loaded at runtime
  OPTION_TYPES: T,
  OPTION_KEYS: [
    {
      name: "action",
      type: T.RADIO,
      default: ACTION.ACTIVE,
      values: Object.values(ACTION)
    },
    {
      name: "activeTab",
      type: T.BOOL,
      default: false
    },
    {
      name: "closeTab",
      type: T.BOOL,
      default: false
    },
    {
      name: "conflictAction",
      type: T.RADIO,
      default: CONFLICT_ACTION.UNIQUIFY,
      values: Object.values(CONFLICT_ACTION)
    },
    {
      name: "downloadAsync",
      type: T.BOOL,
      default: false
    },
    {
      name: "downloadNum",
      type: T.VALUE,
      default: "6",
      regex: "^[1-9][0-9]*$" // integer >= 1
    },
    {
      name: "downloadPath",
      type: T.VALUE,
      onLoad: {function: (v) => Global.sanitizePath(v)}, // App
      onSave: {function: (v) => Global.sanitizePath(v)}, // UI
      default: ""
    },
    {
      name: "downloadPrivate",
      type: T.BOOL,
      default: false
    },
    {
      name: "filter",
      type: T.RADIO,
      default: FILTER.MAX,
      values: Object.values(FILTER)
    },
    {
      name: "ignoreDiscardedTab",
      type: T.BOOL,
      default: false
    },
    {
      name: "minHeight",
      type: T.VALUE,
      default: "100",
      regex: "^[1-9][0-9]*$" // integer >= 1
    },
    {
      name: "minWidth",
      type: T.VALUE,
      default: "100",
      regex: "^[1-9][0-9]*$" // integer >= 1
    },
    {
      name: "notifyEnded",
      type: T.BOOL,
      default: true
    },
    {
      name: "pathRules",
      type: T.VALUE,
      onLoad: {function: (v) => Options.onLoadRules(v)}, // App
      onSave: {function: (v) => Options.onSaveRules(v)}, // UI
      default: "<name><ext>\n<xName><xExt|xMimeExt>\n<host>/img_<###index><ext|xExt|xMimeExt|.jpg>"
    },
    {
      name: "removeEnded",
      type: T.BOOL,
      default: false
    },
    {
      name: "shortcut",
      type: T.VALUE,
      // onLoad/onSave wrap in object so that the property name is included in sendMessage
      onLoad: {function: (v) => Commands.setBrowserAction(v)}, // App
      onSave: {function: (v) => Commands.setBrowserAction(v)}, // UI
      default: ""
    }
  ],

  // param multi-line string
  // return array of rules
  // throw if empty string
  onLoadRules: (str) => {
    const arr = str.split("\n").reduce(
      (acc, val) => {
        const s = val.trim();
        if (s.length > 0) {
          acc.push(s);
        }
        return acc;
      },
      []
    );
    if (!arr || arr.length === 0) {
      throw new Error("Empty ruleset");
    }
    return arr;
  },

  // param multi-line string
  // return multi-line trimmed string
  // throw if empty string
  onSaveRules: (str) => Options.onLoadRules(str).join("\n"),

  // global
  init: () => {
    const defaults = Options.OPTION_KEYS.reduce(
      (acc, optionType) =>
        Object.assign(acc, {[optionType.name]: optionType.default}),
      {}
    );
    Options.setOptions(defaults);
  },

  getKeys: () =>
    Options.OPTION_KEYS.reduce(
      (acc, val) => acc.concat([val.name]),
      []
    ),

  getOptionMeta: (name) => Options.OPTION_KEYS.reduce(
    (acc, val) => {
      if (val.name === name) {
        return val;
      }
      return acc;
    }),

  setOption: (name, value) => {
    // if (value == undefined) { // TODO test more general 'value == null' ?
    Options.OPTIONS[name] = value;
    // }
  },

  getOptions: async () => {
    if (!Options.loaded) {
      return await Options.loadOptions();
    }
    return Options.OPTIONS;
  },

  handleStorageChanged: (changes, area) => {
    if (area !== "local") {
      return Options.OPTIONS;
    }
    const keys = Options.getKeys();
    const loadedOptions = Object.keys(changes)
      .filter((k) => keys.includes(k)) // ignore stored items that are not options
      .reduce(
        (acc, val) => Object.assign(acc, {[val]: changes[val].newValue}),
        {}
      );
    return Options.setOptions(loadedOptions);
  },

  setOptions: (loadedOptions) => {
    console.debug("loadedOptions", loadedOptions);
    const localKeys = Object.keys(loadedOptions);
    localKeys.forEach((k) => {
      const optionType = Options.OPTION_KEYS.find(
        (ok) => ok.name === k
      );
      if (optionType === undefined) {
        console.warn("Failed loading option:", k);
        return;
      }
      const fn = (optionType.onLoad) ? optionType.onLoad.function : ((x) => x);
      Options.setOption(k, fn(loadedOptions[k]));
    });
    return Options.OPTIONS;
  },

  loadOptions: async () => {
    const loadedOptions = await browser.storage.local.get(Options.getKeys());
    Options.loaded = true;
    return Options.setOptions(loadedOptions);
  }
};

Options.init();
// Options.loadOptions();

// Export for testing
if (typeof module !== "undefined") {
  module.exports = {T, Options};
}
