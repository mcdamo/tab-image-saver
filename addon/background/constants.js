// options.action
const ACTION = {
  ACTIVE: "active",
  LEFT: "left",
  RIGHT: "right",
  ALL: "all"
};

// options.conflictAction
const CONFLICT_ACTION = {
  UNIQUIFY: "uniquify",
  OVERWRITE: "overwrite"
  // PROMPT: "prompt"
};

// options.filter
const FILTER = {
  MAX: "max",
  ALL: "all",
  DIRECT: "direct"
};

const MESSAGE_TYPES = {
  OK: "OK",
  CANCEL: "CANCEL",
  ERROR: "ERROR",
  OPTIONS: "OPTIONS",
  OPTIONS_SCHEMA: "OPTIONS_SCHEMA",
  OPTIONS_ONLOAD: "OPTIONS_ONLOAD",
  OPTIONS_ONSAVE: "OPTIONS_ONSAVE"
};

// Export for testing eslint
if (typeof module !== "undefined") {
  module.exports = {
    ACTION,
    CONFLICT_ACTION,
    FILTER,
    MESSAGE_TYPES
  };
}
