let App = {
  commandName: "_execute_browser_action",

  // Update the UI: set the value of the shortcut textbox from the default command
  async updateUI() {
    let commands = await browser.commands.getAll();
    for (let command of commands) {
      if (command.name === App.commandName) {
        document.querySelector("#shortcut").value = command.shortcut;
      }
    }
  },

  // Reset the shortcut and update the textbox.
  async resetShortcut() {
    await browser.commands.reset(App.commandName);
    await browser.storage.local.remove("shortcut");
    App.updateUI();
    console.log("shortcut reset");
  },

  // Update the shortcut based on the value in the textbox and save to storage
  async updateShortcut(save = true) {
    let shortcut = document.querySelector("#shortcut").value;
    if (shortcut === "") {
      App.resetShortcut();
      return true;
    }
    try {
      await browser.commands.update({
        name: App.commandName,
        shortcut
      });
      console.log("shortcut updated:", shortcut);
    } catch (err) {
      console.error(`Unable to use shortcut: ${shortcut}`, err);
      // reload previous value
      App.updateUI();
      return false;
    }
    if (save) {
      // save shortcut to options
      await browser.storage.local.set({shortcut});
      console.log("shortcut saved:", shortcut);
    }
    return true;
  },

  async saveOptions() {
    let options = {
      // radio
      action: document.querySelector("input[name=action]:checked").value,
      filter: document.querySelector("input[name=filter]:checked").value,
      conflictAction: document.querySelector("input[name=conflictAction]:checked").value,
      // checkbox
      activeTab: document.querySelector("#activeTab").checked,
      closeTab: document.querySelector("#closeTab").checked,
      notifyEnded: document.querySelector("#notifyEnded").checked,
      removeEnded: document.querySelector("#removeEnded").checked,
      altIsFilename: document.querySelector("#altIsFilename").checked,
      // text
      downloadPath: document.querySelector("#downloadPath").value.replace(/^[/\\]+|[/\\]+$/g, ""), // remove leading and trailing slashes
      minWidth: document.querySelector("#minWidth").value,
      minHeight: document.querySelector("#minHeight").value,
      altFilenameExt: document.querySelector("#altFilenameExt").value
      // shortcut is saved independently
    };
    await browser.storage.local.set(options);
    console.log("options saved:", options);
  },

  async loadOptions() {
    let result = await browser.storage.local.get();
    console.log("options loaded:", result);
    // radio
    if (result.action === undefined) {
      result.action = "current";
    }
    document.querySelector(`#action_${result.action}`).checked = true;
    if (result.filter === undefined) {
      result.filter = "max";
    }
    document.querySelector(`#filter_${result.filter}`).checked = true;
    if (result.conflictAction === undefined) {
      result.conflictAction = "uniquify";
    }
    // checkbox
    document.querySelector(`#conflictAction_${result.conflictAction}`).checked = true;
    document.querySelector("#activeTab").checked = result.activeTab;
    document.querySelector("#closeTab").checked = result.closeTab;
    if (result.notifyEnded === undefined) {
      result.notifyEnded = true;
    }
    document.querySelector("#notifyEnded").checked = result.notifyEnded;
    document.querySelector("#removeEnded").checked = result.removeEnded;
    document.querySelector("#altIsFilename").checked = result.altIsFilename;
    // text
    document.querySelector("#downloadPath").value = result.downloadPath || "";
    document.querySelector("#altFilenameExt").value = result.altFilenameExt || "";
    document.querySelector("#minWidth").value = result.minWidth || "100";
    document.querySelector("#minHeight").value = result.minHeight || "100";

    if (result.shortcut === undefined) {
      // if no shortcut saved, load default from addon
      App.updateUI();
    } else {
      // update saved shortcut to commands
      document.querySelector("#shortcut").value = result.shortcut;
      App.updateShortcut(false);
    }
  }
};

// Handle update and reset button clicks
document.querySelector("#updateShortcut").addEventListener("click", App.updateShortcut);
document.querySelector("#resetShortcut").addEventListener("click", App.resetShortcut);
document.addEventListener("DOMContentLoaded", App.loadOptions);
document.querySelector("#options").addEventListener("change", App.saveOptions);
