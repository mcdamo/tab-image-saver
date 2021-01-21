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
        // workaround: manually set a version number
        // so following rules can be triggered
        // prev = "2.1.1";
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
          await browser.storage.local.set({ pathRules: rules });
        }
        if (oldOpts.action && oldOpts.action === "current") {
          await browser.storage.local.set({ action: "active" });
        }
        // delete converted options
        await browser.storage.local.remove([
          "altIsFilename",
          "altIsFilenameExt",
        ]);
      }
      if (ver >= "2.4.1" && prev < "2.4.1") {
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
      }
      if (ver >= "3.0.0" && prev < "3.0.0") {
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
            url:
              "https://github.com/mcdamo/tab-image-saver/blob/master/CHANGES-3.0.md",
          });
        }
      }
      await browser.storage.local.set({ version: ver });
      console.log(`Updated to ${ver}`); /* RemoveLogging:skip */
    }
  },
};

export default Version;
