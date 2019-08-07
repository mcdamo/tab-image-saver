"use strict";
/* globals expect */
import Options, { T } from "background/options";

describe("options.js", function () {
  let {
    cache,
    keys,
    onloadStub,
    onsaveStub,
    origOptSchema,
    origOpts,
    storage,
  } = {};
  before(async function () {
    onloadStub = sinon.stub().returnsArg(0);
    onsaveStub = sinon.stub().returnsArg(0);
    origOptSchema = Options.OPTION_SCHEMA;
    origOpts = Options.OPTIONS;
    Options.OPTION_SCHEMA = {
      myradio: { type: "RADIO", default: "radiodefault" },
      mycheckbox: { type: "BOOL", default: false },
      mytext: { type: "VALUE", default: "textdefault" },
      myshortcut: {
        type: "VALUE",
        default: "x",
        onload: { function: onloadStub },
        onsave: { function: onsaveStub },
      },
    };
    Options.OPTIONS = {};
    cache = {
      myradio: "radiodefault",
      mycheckbox: false,
      mytext: "textdefault",
      myshortcut: "x",
    };
    storage = {
      myradio: "radio",
      mycheckbox: true,
      mytext: "text",
      myshortcut: "x",
    };
    keys = Object.keys(storage);
    await Options.init();
  });
  after(function () {
    Options.OPTION_SCHEMA = origOptSchema; // TODO use sandbox
    Options.OPTIONS = origOpts; // TODO use sandbox
  });

  describe("init", function () {
    before(function () {
      //onLoadStub.resetHistory();
      //onSaveStub.resetHistory();
    });
    it("should populate option defaults", function () {
      //expect(Options.cache).to.have.property("action").that.equals("current");
      expect(Options.OPTIONS).to.deep.equal(cache);
      expect(onloadStub).to.be.calledOnce;
      expect(onsaveStub).to.not.be.called;
    });
  });
  describe("getKeys", function () {
    it("should return array of option names", function () {
      expect(Options.getKeys()).to.be.an("array").that.deep.equal(keys);
    });
  });
  describe("getOptionMeta", function () {
    it("should return object for default option", function () {
      expect(Options.getOptionMeta("myradio")).to.deep.equal({
        type: T.RADIO,
        default: "radiodefault",
      });
    });
  });
  describe("setOption", function () {
    it("should update the cached options", function () {
      //expect(() => { Options.setOption("action", "test")}).to.change(Options.cache);
      //expect(Options.setOption.bind("action", "test")).to.change(Options.cache);
      Options.OPTIONS.testkey = "testval";
      Options.setOption("testkey", "newval");
      expect(Options.OPTIONS.testkey).to.equal("newval");
      delete Options.OPTIONS.testkey; // TODO use sandbox
    });
  });
  describe("loadOptions", function () {
    before(async function () {
      //await browser.storage.local.clear(); // clear() is not faked
      await browser.storage.local.set(storage);
    });
    beforeEach(function () {
      onloadStub.resetHistory();
      onsaveStub.resetHistory();
    });
    after(async function () {
      await browser.storage.local.remove(Object.keys(storage)); // TODO use sandbox
    });
    afterEach(function () {
      onloadStub.resetHistory();
      onsaveStub.resetHistory();
    });
    describe("loadOptions", function () {
      it("should load options from local storage", async function () {
        await expect(Options.loadOptions()).to.eventually.become(storage);
        expect(onloadStub).to.be.calledOnce;
        expect(onsaveStub).to.not.be.called;
      });
    });
  });
  describe("onLoadRules", function () {
    it("should throw for empty rules", function () {
      expect(() => Options.onLoadRules([])).to.throw(Error);
      expect(() => Options.onLoadRules(`  \n\n`)).to.throw(Error);
    });
  });

  describe("onSaveRules", function () {
    it("should trim strings in array", function () {
      expect(Options.onSaveRules([` line1 \n`, `\n line2 \n `])).to.deep.equal([
        "line1",
        "line2",
      ]);
    });

    it("should throw for empty rules", function () {
      expect(() => Options.onSaveRules("")).to.throw(Error);
      expect(() => Options.onSaveRules(`  \n\n`)).to.throw(Error);
    });
  });

  describe("domainRuleMatch", function () {
    const location = new URL("https://sub.example.com/page.html");
    it("should match simple domains", function () {
      expect(
        Options.domainRuleMatch(location, "example.com/"),
        "example.com/"
      ).to.equal(true);
      expect(
        Options.domainRuleMatch(location, "example.co"),
        "example.co"
      ).to.equal(true);
      expect(
        Options.domainRuleMatch(location, "example.co/"),
        "example.co/"
      ).to.equal(false);
      expect(
        Options.domainRuleMatch(location, "ample.com/"),
        "ample.com/"
      ).to.equal(true);
      expect(
        Options.domainRuleMatch(location, "e*e.com/"),
        "e*e.com/"
      ).to.equal(true);
      expect(
        Options.domainRuleMatch(location, "/page.html"),
        "/page.html"
      ).to.equal(true);
    });
    it("should match wildcard domains", function () {
      expect(
        Options.domainRuleMatch(location, "*.example.com"),
        "*.example.com"
      ).to.equal(true);
      expect(
        Options.domainRuleMatch(location, "example.co*/"),
        "example.co*/"
      ).to.equal(true);
    });
    it("should match regex domains", function () {
      expect(
        Options.domainRuleMatch(location, "#://[a-z]+\\.example\\.com/#"),
        "1"
      ).to.equal(true);
      expect(
        Options.domainRuleMatch(location, "#//[a-z]+\\.example\\.[^/]{3}/#"),
        "2"
      ).to.equal(true);
      expect(
        Options.domainRuleMatch(location, "#://example\\.com/$#"),
        "3"
      ).to.equal(false);
    });
  });

  // TODO: getTabOptions()
});
