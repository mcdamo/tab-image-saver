"use strict";
//import {ACTION} from 'background/constants';
import {T, Options} from 'background/options';

describe("options.js", () => {
  var onLoadStub, onSaveStub, cache, keys, storage, origOpts;
  before(() => {
    onLoadStub = sinon.stub().returnsArg(0);
    onSaveStub = sinon.stub().returnsArg(0);
    origOpts = Options.OPTION_KEYS;
    Options.OPTION_KEYS = [
      {name: "myradio", type: "RADIO", default: "radiodefault"},
      {name: "mycheckbox", type: "BOOL", default: false},
      {name: "mytext", type: "VALUE", default: "textdefault"},
      {name: "shortcut", type: "VALUE", default: "x", onLoad: {function: onLoadStub}, onSave: {function: onSaveStub} },
    ];
    cache = {
      myradio: "radiodefault",
      mycheckbox: false,
      mytext: "textdefault",
      shortcut: "x",
    };
    storage = {
      myradio: "radio",
      mycheckbox: true,
      mytext: "text",
      shortcut: "x",
    };
    keys = Object.keys(storage);
    Options.init();
  });
  after(() => {
    Options.OPTION_KEYS = origOpts; // TODO use sandbox
  });

  describe("init", () => {
    it("should populate cache with option defaults", () => {
      //expect(Options.cache).to.have.property("action").that.equals("current");
      expect(Options.OPTIONS).to.deep.equal(cache);
    });
  });
  describe("getKeys", () => {
    it("should return array of option names", () => {
      expect(Options.getKeys()).to.be.an("array").that.deep.equal(keys);
    });
  });
  describe("getOptionMeta", () => {
    it("should return object for default option", () => {
      expect(Options.getOptionMeta("myradio")).to.deep.equal({name: "myradio", type: T.RADIO, default: "radiodefault"});
    });
  });
  describe("setOption", () => {
    it("should update the cached options", () => {
      //expect(() => { Options.setOption("action", "test")}).to.change(Options.cache);
      //expect(Options.setOption.bind("action", "test")).to.change(Options.cache);
      Options.OPTIONS["testkey"] = "testval";
      Options.setOption("testkey", "newval");
      expect(Options.OPTIONS["testkey"]).to.equal("newval");
      delete Options.OPTIONS["testkey"]; // TODO use sandbox
    });
  });
  describe("loadOptions", () => {
    before(async () => {
      //await browser.storage.local.clear(); // clear() is not faked
      await browser.storage.local.set(storage);
    });
    after(async () => {
      await browser.storage.local.remove(Object.keys(storage)); // TODO use sandbox
    });
    it("should load options from local storage", async () => {
/*
      browser.storage.local.get.resetHistory();
      const opt = await Options.loadOptions();
      expect(browser.storage.local.get).to.be.calledOnce;
      //expect(opt).to.be.an("object");
      //expect(opt).to.have.property("action").that.equals("current");
      console.log(opt);
      expect(opt).to.deep.equal(cache);
      return;
*/
      await expect(Options.loadOptions()).to.eventually.become(storage);
    });
    it("should call onLoad function", () => {
      expect(onLoadStub).to.be.calledOnce;
    });
    it("should not call onSave function", () => {
      expect(onSaveStub).to.not.be.called;
    });
  });
  describe("onLoadRules", () => {
    it("should trim and omit empty lines", () => {
      expect(Options.onLoadRules(` line1 \n\n line2 \n `))
        .to.deep.equal(["line1", "line2"]);
    });

    it("should throw for empty rules", () => {
      expect(() => Options.onLoadRules("")).to.throw(Error);
      expect(() => Options.onLoadRules(`  \n\n`)).to.throw(Error);
    });
  });

  describe("onSaveRules", () => {
    it("should trim and omit empty lines", () => {
      expect(Options.onSaveRules(` line1 \n\n line2 \n `))
        .to.equal("line1\nline2");
    });

    it("should throw for empty rules", () => {
      expect(() => Options.onSaveRules("")).to.throw(Error);
      expect(() => Options.onSaveRules(`  \n\n`)).to.throw(Error);
    });
  });



});
