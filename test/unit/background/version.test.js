"use strict";
import {Version} from 'background/version';
//import {Options} from 'background/options';

describe("version.js", () => {
  describe("init", () => {
    var storage;
    before(async () => {
      storage = {
        version: "1.2.3",
      }
      // await browser.storage.local.clear(); // not faked
      await browser.storage.local.set(storage);
    });
    after(async () => {
      await browser.storage.local.remove(Object.keys(storage)); // TODO use sandbox
    });
    it("should get previous version from storage", async () => {
      await expect(Version.init()).to.eventually.become(storage.version);
    });
  });

  describe("update", () => {
    it("should upgrade from 2.1.1, altIsFilename to pathRules and action=current to action=active", async () => {
      var storage = {
        //version: undefined,
        action: "current",
        altIsFilename: true,
        altIsFilenameExt: ".jpg",
      };
      var newVer = "2.2.0";
      await browser.storage.local.set(storage);
      Version.VERSION = undefined;
      await Version.update(newVer);
      const def = Options.getOptionMeta("pathRules").default;
      const opts = {
      version: newVer,
      action: "active",
      pathRules: `<alt>.jpg\n${def}`,
      };
      
      await expect(browser.storage.local.get())
        .to.eventually.become(opts)
        .and.to.have.property("version").to.equal(newVer);
      // TODO cleanup
      await browser.storage.local.remove(Object.keys(opts));
    });

    it("should always update version number", async () => {
      var newVer = "x.y.z";
      await Version.update(newVer);
      await expect(browser.storage.local.get("version")).to.eventually.become({version: newVer});
      // TODO cleanup
      await browser.storage.local.remove("version");
    });
  });

});
