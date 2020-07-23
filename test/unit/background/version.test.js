"use strict";
/* globals expect */
import Version from "background/version";
import Options from "background/options";

describe("version.js", function () {
  describe("init", function () {
    let storage;
    before(async function () {
      storage = {
        version: "1.2.3",
      };
      // await browser.storage.local.clear(); // not faked
      await browser.storage.local.set(storage);
    });
    after(async function () {
      await browser.storage.local.remove(Object.keys(storage)); // TODO use sandbox
    });
    /*
    // no longer required
    it("should get previous version from storage", async () => {
      await expect(Version.init()).to.eventually.become(storage.version);
    });
    */
  });

  describe("update", function () {
    let { windowsOrig, windowsStub } = {};
    before(function () {
      // stub functions used in updates
      windowsOrig = browser.windows;
      browser.windows = { create: "" };
      windowsStub = sinon.stub(browser.windows, "create").resolves(true);
      browser.windows = {
        create: windowsStub,
      };
    });
    after(function () {
      browser.windows = windowsOrig;
      sinon.restore();
    });
    it("should upgrade from 2.1.1, altIsFilename to pathRules and action=current to action=active", async function () {
      let storage = {
        //version: undefined,
        action: "current",
        altIsFilename: true,
        altIsFilenameExt: ".jpg",
      };
      let newVer = "2.2.0";
      await browser.storage.local.set(storage);
      Version.VERSION = undefined;
      await Version.update(newVer);
      const def = Options.getOptionMeta("pathRules").default;
      const opts = {
        version: newVer,
        action: "active",
        pathRules: `<alt>.jpg\n${def}`,
      };

      await expect(browser.storage.local.get()).to.eventually.become(opts);
      //.and.to.have.property("version").to.equal(newVer);
      // TODO cleanup
      await browser.storage.local.remove(Object.keys(opts));
    });

    it("should upgrade from 2.5.6, pathRules to array and take period out of ext", async function () {
      let storage = {
        version: "2.5.6",
        pathRules:
          '<name><ext>\n<xName><xExt|xMimeExt>\n<host>/img_<###index><ext|xExt|xMimeExt|.jpg>\n<tabTitle"#replace#/#_#g">/<name><ext>',
      };
      let newVer = "3.0.0";
      await browser.storage.local.set(storage);
      Version.VERSION = undefined;
      await Version.update(newVer, storage.version);
      const opts = {
        version: newVer,
        pathRules: [
          "<name>.<ext>",
          "<xName>.<xExt|xMimeExt>",
          "<host>/img_<###index>.<ext|xExt|xMimeExt|jpg>",
          '<tabTitle"#replace#/#_#g">/<name>.<ext>',
        ],
      };
      console.log("became", await browser.storage.local.get());
      await expect(browser.storage.local.get()).to.eventually.become(opts);
      //.and.to.have.property("version").to.equal(newVer);
      // TODO cleanup
      await browser.storage.local.remove(Object.keys(opts));
    });

    it("should always update version number", async function () {
      let newVer = "x.y.z";
      await Version.update(newVer);
      await expect(browser.storage.local.get("version")).to.eventually.become({
        version: newVer,
      });
      // TODO cleanup
      await browser.storage.local.remove("version");
    });
  });
});
