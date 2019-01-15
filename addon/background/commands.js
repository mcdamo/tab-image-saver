/* globals App */

const SHORTCUT_TYPES = {BROWSER_ACTION: "_execute_browser_action"};

const Commands = {
  COMMANDS: {[SHORTCUT_TYPES.BROWSER_ACTION]: () => App.handleBrowserAction()},

  // set shortcut key, reset if key is empty
  // throw if setting failed
  setCommand: async (command, key) => {
    if (key === "" || key === null || key === undefined) {
      console.debug("Shortcut reset");
      await browser.commands.reset(command);
      return key;
    }
    try {
      await browser.commands.update({
        name: command,
        shortcut: key
      });
    } catch (err) {
      console.error(`Unable to use shortcut: ${key}`, err); /* RemoveLogging:skip */
      throw new Error(`Unable to use shortcut: ${key}`);
    }
    console.log("Shortcut updated", key);
    return key;
  },

  setBrowserAction: async (key) => await Commands.setCommand(SHORTCUT_TYPES.BROWSER_ACTION, key),

  // throw if command not found
  handleCommand: (command) => {
    if (Object.prototype.hasOwnProperty.call(Commands.COMMANDS, command)) {
      return Commands.COMMANDS[command]();
    }
    throw new Error(`Undefined command: ${command}`);
  }
};

browser.commands.onCommand.addListener(Commands.handleCommand);

// Export for testing
if (typeof module !== "undefined") {
  module.exports = {SHORTCUT_TYPES, Commands};
}
