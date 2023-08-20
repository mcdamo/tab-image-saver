"use strict";
/* globals expect */
import Version from "background/version";
import Options from "background/options";

describe("version.js", function () {
  let storage;
  beforeEach(async function () {
    storage = {
      version: "1.2.3",
    };
    await browser.storage.local.set(storage);
  });
  afterEach(async function () {
    await browser.storage.local.clear();
  });

  //describe("init", function () {
  //});

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
    it("should upgrade to 2.2.0, altIsFilename to pathRules and action=current to action=active", async function () {
      let storage = {
        version: "2.1.0",
        action: "current",
        altIsFilename: true,
        altIsFilenameExt: ".jpg",
        pathRules: "<name>.<ext>",
      };
      let newVer = "2.2.0";
      await browser.storage.local.set(storage);
      await Version.update(newVer, storage.version);
      const def = Options.getOptionMeta("pathRules").default;
      const opts = {
        version: newVer,
        action: "active",
        pathRules: `<alt>.jpg\n${def}`,
      };
      await expect(browser.storage.local.get()).to.eventually.become(opts);
      //.and.to.have.property("version").to.equal(newVer);
    });

    it("should upgrade to 3.0.0, pathRules to array and take period out of ext", async function () {
      let storage = {
        version: "2.5.6",
        pathRules:
          '<name><ext>\n<xName><xExt|xMimeExt>\n<host>/img_<###index><ext|xExt|xMimeExt|.jpg>\n<tabTitle"#replace#/#_#g">/<name><ext>',
      };
      let newVer = "3.0.0";
      await browser.storage.local.set(storage);
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
    });

    it("should upgrade to 4.0.0", async function () {
      let storage = {
        version: "3.0.0",
        rulesetIndex: [{ key: 0 }, { key: 1 }],
        ruleset_0: {},
        ruleset_1: {},
      };
      let newVer = "4.0.0";
      await browser.storage.local.set(storage);
      await Version.update(newVer, storage.version);
      const opts = {
        version: newVer,
        rulesetIndex: [{ id: 0 }, { id: 1 }],
        ruleset_0: {},
        ruleset_1: {},
      };
      console.log("became", await browser.storage.local.get());
      await expect(browser.storage.local.get()).to.eventually.become(opts);
      //.and.to.have.property("version").to.equal(newVer);
    });

    it("should always update version number", async function () {
      let newVer = "x.y.z";
      await Version.update(newVer);
      await expect(browser.storage.local.get("version")).to.eventually.become({
        version: newVer,
      });
    });
  });

  describe("_legacy_template", function () {
    it("should replace all variables", function () {
      expect(
        Version._legacy_template("<var1><var2>", { var1: "", var2: "" })
      ).to.equal("${var1}${var2}");
    });
    it("should replace variables using lower-case naming", function () {
      expect(Version._legacy_template("<VarA>", { vara: "" })).to.equal(
        "${VarA}"
      );
    });
    it("should replace conditional variable", function () {
      expect(
        Version._legacy_template("<var1|var2>", { var1: "", var2: "" })
      ).to.equal("${var1||var2}");
    });
    it("should replace conditional variables in order", function () {
      expect(
        Version._legacy_template("<var1|var2|var3>", {
          var1: "",
          var2: "",
          var3: "",
        })
      ).to.equal("${var1||var2||var3}");
    });
    it("should replace conditional constant", function () {
      expect(Version._legacy_template("<var1|.ext>", { var1: "" })).to.equal(
        '${var1||".ext"}'
      );
    });
    it("should zero-pad number", function () {
      expect(Version._legacy_template("<####var1>", { var1: "" })).to.equal(
        "${var1.padStart(4,0)}"
      );
    });
    it("should handle undefined variables", function () {
      expect(
        Version._legacy_template("<var1>,<var2>", { var1: "", var2: "" }),
        "var1,var2"
      ).to.equal("${var1},${var2}");
      expect(
        Version._legacy_template("<var1|var2>", { var1: "", var2: "" }),
        "var1|var2"
      ).to.equal("${var1||var2}");
    });
    it("should replace outer regex", function () {
      expect(
        Version._legacy_template('<var1|var2>"/replace/\\s*\\|.*//"', {
          var1: "",
          var2: "",
        })
      ).to.equal('${(var1||var2).replace(/\\s*\\|.*/, "")}');
    });
    it("should replace inner regex", function () {
      expect(
        Version._legacy_template(
          '<var1"/replace/.*/"|var2"/replace/([a-z]+)/_$1_/g">',
          { var1: "", var2: "" }
        )
      ).to.equal(
        '${var1.replace(/.*/, "")||var2.replace(/([a-z]+)/g, "_$1_")}'
      );
    });
    it("should replace inner regex with escaped quotation marks", function () {
      expect(
        Version._legacy_template(
          '<var1|var2"/replace/\\"([a-z]+)\\"/_$1_/g">',
          {
            var1: "",
            var2: "",
          }
        )
      ).to.equal('${var1||var2.replace(/\\"([a-z]+)\\"/g, "_$1_")}');
    });
    it("should replace inner & outer regex", function () {
      expect(
        Version._legacy_template(
          '<var1|var2"/replace/([a-z]+)/_$1_/g">"/replace/\\s*\\|.*//"',
          { var1: "", var2: "" }
        )
      ).to.equal(
        '${(var1||var2.replace(/([a-z]+)/g, "_$1_")).replace(/\\s*\\|.*/, "")}'
      );
    });
  });
});
