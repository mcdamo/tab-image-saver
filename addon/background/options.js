/* globals Commands ACTION CONFLICT_ACTION FILTER */

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
      name: "altIsFilename",
      type: T.BOOL,
      default: false
    },
    {
      name: "altIsFilenameExt",
      type: T.VALUE,
      default: ""
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
      name: "downloadPath",
      type: T.VALUE,
      default: ""
      // TODO onLoad/onSave add/remove slashes?
    },
    {
      name: "filter",
      type: T.RADIO,
      default: FILTER.MAX,
      values: Object.values(FILTER)
    },
    {
      name: "minHeight",
      type: T.VALUE,
      default: "100"
    },
    {
      name: "minWidth",
      type: T.VALUE,
      default: "100"
    },
    {
      name: "notifyEnded",
      type: T.BOOL,
      default: true
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
      onLoad: {function: v => Commands.setBrowserAction(v)},
      onSave: {function: v => Commands.setBrowserAction(v)},
      default: ""
    }
  ],

  // global
  init: () => {
    Options.OPTIONS = Options.OPTION_KEYS.reduce(
      (acc, val) => Object.assign(acc, {[val.name]: val.default}),
      {}
    );
  },

  getKeys: () =>
    Options.OPTION_KEYS.reduce(
      (acc, val) => acc.concat([val.name]),
      []
    ),

  getOptionMeta: name => Options.OPTION_KEYS.reduce(
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

  storageChangeHandler: (changes, area) => {
    if (area !== "local") {
      return Options.OPTIONS;
    }
    const loadedOptions = Object.keys(changes).reduce(
      (acc, val) => Object.assign(acc, {[val]: changes[val].newValue}),
      {}
    );
    return Options.setOptions(loadedOptions);
  },

  setOptions: loadedOptions => {
    console.log("loadedOptions", loadedOptions);
    const localKeys = Object.keys(loadedOptions);
    localKeys.forEach(k => {
      const optionType = Options.OPTION_KEYS.find(
        ok => ok.name === k
      );
      const fn = (optionType.onLoad) ? optionType.onLoad.function : (x => x);
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
