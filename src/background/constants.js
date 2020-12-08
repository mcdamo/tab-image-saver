const Constants = {
  // options.action
  ACTION: {
    ACTIVE: "active",
    LEFT: "left",
    RIGHT: "right",
    ALL: "all",
    TEST: "test",
    CANCEL: "cancel",
  },

  // options.browserAction
  BROWSER_ACTION: {
    DOWNLOAD: "download",
    POPUP: "popup",
  },

  COLOR: {
    BADGE_BG: "#ffffffff", // white
    BADGE_DEFAULT: "#8b67b3d0", // purple
    BADGE_ERROR: "#d3290fd0", // red
    BADGE_OK: "#579900d0", // green
    BADGE_WARN: "#cc9a23d0", // yellow
    BADGE_BUSY: "#486fe3d0", // blue
  },

  // options.conflictAction
  CONFLICT_ACTION: {
    UNIQUIFY: "uniquify",
    OVERWRITE: "overwrite",
    // PROMPT: "prompt"
  },

  // options.filter
  FILTER: {
    MAX: "max",
    ALL: "all",
    DIRECT: "direct",
  },

  MESSAGE_TYPE: {
    CANCEL: "CANCEL",
    ERROR: "ERROR",
    TAB_OPTIONS: "TAB_OPTIONS",
    RUN_ACTION: "RUN_ACTION",
    COMMAND_OPTIONS: "COMMAND_OPTIONS",
    COMMAND_DOWNLOADS: "COMMAND_DOWNLOADS",
    COMMAND_SIDEBAR: "COMMAND_SIDEBAR",
    RUNTIME_LAST: "RUNTIME_LAST",
    //OPTIONS_ACTION: "OPTIONS_ACTION",
    OPTIONS_SCHEMAS: "OPTIONS_SCHEMAS",
    OPTIONS_OPTION_SAVE: "OPTIONS_OPTION_SAVE",
    OPTIONS_RULESET_CREATE: "OPTIONS_RULESET_CREATE",
    OPTIONS_RULESET_DELETE: "OPTIONS_RULESET_DELETE",
    OPTIONS_RULESET_OPTION_SAVE: "OPTIONS_RULESET_OPTION_SAVE",
    OPTIONS_ONSAVERULES: "OPTIONS_ONSAVERULES",
    OPTIONS_DOMAIN_ONSAVERULES: "OPTIONS_DOMAIN_ONSAVERULES",
    OPTIONS_DOMAIN_RULEMATCH: "OPTIONS_DOMAIN_RULEMATCH",
  },

  SHORTCUT_TYPE: {},
};

Constants.SHORTCUT_TYPE = {
  DEFAULT_ACTION: "default",
  ACTIVE_ACTION: Constants.ACTION.ACTIVE,
  LEFT_ACTION: Constants.ACTION.LEFT,
  RIGHT_ACTION: Constants.ACTION.RIGHT,
  ALL_ACTION: Constants.ACTION.ALL,
  TEST_ACTION: Constants.ACTION.TEST,
};

export default Constants;
