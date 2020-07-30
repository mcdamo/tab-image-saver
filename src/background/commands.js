import Constants from "./constants";

const Commands = {
  COMMANDS: {
    [Constants.SHORTCUT_TYPE.DEFAULT_ACTION]: (App) =>
      App.handleBrowserAction(),

    [Constants.SHORTCUT_TYPE.ACTIVE_ACTION]: (App) =>
      App.handleCommandAction(Constants.SHORTCUT_TYPE.ACTIVE_ACTION),

    [Constants.SHORTCUT_TYPE.LEFT_ACTION]: (App) =>
      App.handleCommandAction(Constants.SHORTCUT_TYPE.LEFT_ACTION),

    [Constants.SHORTCUT_TYPE.RIGHT_ACTION]: (App) =>
      App.handleCommandAction(Constants.SHORTCUT_TYPE.RIGHT_ACTION),

    [Constants.SHORTCUT_TYPE.ALL_ACTION]: (App) =>
      App.handleCommandAction(Constants.SHORTCUT_TYPE.ALL_ACTION),
  },

  // set shortcut key, reset if key is empty
  // throw if setting failed
  setCommand: async (command, key) => {
    if (key === "" || key === null || key === undefined) {
      console.debug("Shortcut reset", command);
      await browser.commands.reset(command);
      return key;
    }
    try {
      await browser.commands.update({
        name: command,
        shortcut: key,
      });
    } catch (err) {
      console.error(
        `Unable to use shortcut: ${key}`,
        err
      ); /* RemoveLogging:skip */
      throw new Error(`Unable to use shortcut: ${key}`);
    }
    console.log("Shortcut updated", key);
    return key;
  },

  setBrowserAction: async (key) =>
    await Commands.setCommand(Constants.SHORTCUT_TYPE.DEFAULT_ACTION, key),

  // throw if command not found
  handleCommand: (command, App) => {
    if (Object.prototype.hasOwnProperty.call(Commands.COMMANDS, command)) {
      return Commands.COMMANDS[command](App);
    }
    throw new Error(`Undefined command: ${command}`);
  },

  callback: (command) => {
    Commands.handleCommand(command, Commands.App);
  },

  init: (App) => {
    Commands.App = App;
    if (!browser.commands.onCommand.hasListener(Commands.callback)) {
      browser.commands.onCommand.addListener(Commands.callback);
    }
  },
};

export default Commands;
