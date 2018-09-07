/* globals Options */

// Import for testing
if (typeof module !== "undefined") {
  const o = require("background/options");
  window.Options = o.Options;
}

const Version = {
  VERSION: undefined,

  update: async (ver) => {
    let prev = Version.VERSION;
    if (prev !== ver) {
      console.debug(`Update ${prev} => ${ver}`);
      // do updates from oldest to most recent
      if (prev === undefined) {
        // workaround: manually set a version number
        // so following rules can be triggered
        prev = "2.1.1";
        console.debug(`Update part ${prev} => 2.2.0`);
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
          await browser.storage.local.set({pathRules: rules});
        }
        if (oldOpts.action === "current") {
          await browser.storage.local.set({action: "active"});
        }
        // delete converted options
        await browser.storage.local.remove(["altIsFilename", "altIsFilenameExt"]);
      }
      /*
      if (prev <= "2.2.0") {

      }
      */
    }
    await browser.storage.local.set({version: ver});
    Version.VERSION = ver;
  },

  init: async () => {
    const loadedOptions = await browser.storage.local.get("version");
    Version.VERSION = loadedOptions.version;
    console.log("Version.init", Version.VERSION);
    return Version.VERSION;
  }
};

Version.init();

// Export for testing
if (typeof module !== "undefined") {
  module.exports = {Version};
}
