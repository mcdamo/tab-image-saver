"use strict";
import {MESSAGE_TYPES} from 'background/constants';
import {OptionsUI} from 'options/options-ui';

describe("options-ui.js", () => {
  var documentStub, schema;
  before(() => {
    schema = {
      types: {
        BOOL: "BOOL",
        RADIO: "RADIO",
        VALUE: "VALUE",
      },
      keys: [
        {name: "myradio", type: "RADIO", default: "radiodefault", values: ["radiodefault", "radioval"]},
        {name: "mycheckbox", type: "BOOL", default: false},
        {name: "mytext", type: "VALUE", default: "textdefault"},
        {name: "mytextnum", type: "VALUE", default: "100", regex: "^[1-9][0-9]*$"},
        {name: "myshortcut", type: "VALUE", default: "x", onLoad: {function: undefined}, onSave: {function: undefined} },
     ],
    };
  });
/*
  // TODO functional test
    it("should restore options on load", () => {
      expect(restoreOptions).to.be.calledOnce;
    });OPTIONS_
*/
  describe("getOptionsSchema", () => {
    before(() => {
      browser.runtime.sendMessage
        .withArgs({type: MESSAGE_TYPES.OPTIONS_SCHEMA})
        .resolves({body: schema});
    });
    after(() => {
      browser.runtime.sendMessage.reset();
    });
    it("should sendMessage and return body", () => {
      return expect(OptionsUI.getOptionsSchema()).to.eventually.become(schema);
    });
  });
  describe("onSaveOption", () => {
    var onSaveErBody, onSaveOkBody;
    before(() => {
      onSaveErBody = {
        name: "shortcut",
        value: "x"
      };
      onSaveOkBody = {
        name: "test",
        value: "x"
      };
      browser.runtime.sendMessage.resolves({type: MESSAGE_TYPES.ERROR});
      browser.runtime.sendMessage
        .withArgs({type: MESSAGE_TYPES.OPTIONS_ONSAVE, body: onSaveOkBody})
        .resolves({type: MESSAGE_TYPES.OPTIONS_ONSAVE, body: onSaveOkBody});
    });
    after(() => {
      browser.runtime.sendMessage.reset();
    });
    it("should return value for valid shortcut", async () => {
      const o = onSaveOkBody;
      await expect(OptionsUI.onSaveOption(o)).to.eventually.become(o.value);
    });
    it("should throw Error for invalid shortcut", async () => {
      const o = onSaveErBody;
      await expect(OptionsUI.onSaveOption(o)).to.eventually.be.rejected
        .and.be.an.instanceOf(Error);
    });
  });
  describe("saveOptions + restoreOptionsHandler", () => {
    var qsStub;
    before(() => {
      browser.runtime.sendMessage
        .withArgs({type: MESSAGE_TYPES.OPTIONS_SCHEMA})
        .resolves({body: schema});
      qsStub = sinon.stub(document, "querySelector").returns({});
    });
    beforeEach(() => {
      qsStub
        .withArgs("[name=mycheckbox]")
          .returns({checked: true})
        .withArgs("[name=myradio]:checked")
          .returns({value: "radioval"})
        .withArgs("[name=mytext]")
          .returns({value: "textval"})
        .withArgs("[name=mytextnum]")
          .returns({value: "100"})
        .withArgs("[name=myshortcut]")
          .returns({value: "shortcutval"});
    });
    after(() => {
      browser.runtime.sendMessage.reset();
      document.querySelector.restore();
    });
    describe("saveOptions", () => {
      var onSaveSpy;
      before(() => {
        onSaveSpy = sinon.spy(OptionsUI, "onSaveOption");
      });
      beforeEach(() => {
        onSaveSpy.resetHistory();
        browser.storage.local.set.resetHistory();
      });
      it("should update local storage and call 'onsave' with default values", async () => {
        await OptionsUI.saveOptions();
        expect(browser.storage.local.set).to.be.calledWith({
          mycheckbox: true, myradio: "radioval", mytext: "textval", mytextnum: "100", myshortcut: "x"
        });
        expect(onSaveSpy).to.be.calledOnce;
      });
      it("should revert to default if regex validation fails", async () => {
        qsStub.withArgs("[name=mytextnum]").returns({value: "invalid"});
        await OptionsUI.saveOptions();
        expect(browser.storage.local.set).to.be.calledWith({
          mycheckbox: true, myradio: "radioval", mytext: "textval", mytextnum: "100", myshortcut: "x"
        });
        expect(onSaveSpy).to.be.calledOnce;
      });
      it("should revert to default if invalid radio option selected", async () => {
        qsStub.withArgs("[name=myradio]:checked").returns({value: "invalid"});
        await OptionsUI.saveOptions();
        expect(browser.storage.local.set).to.be.calledWith({
          mycheckbox: true, myradio: "radiodefault", mytext: "textval", mytextnum: "100", myshortcut: "x"
        });
        expect(onSaveSpy).to.be.calledOnce;
      });
      it("should skip option that does not have a DOM element", async () => {
        qsStub.withArgs("[name=myshortcut]").returns(undefined);
        await OptionsUI.saveOptions();
        expect(browser.storage.local.set).to.be.calledWith({
          mycheckbox: true, myradio: "radioval", mytext: "textval", mytextnum: "100"
        });
        expect(onSaveSpy).to.not.be.called;
      });
    });
    describe("restoreOptionsHandler", () => {
      beforeEach(() => {
        browser.storage.local.get.resetHistory();
      });
      it("should get keys from schema and get local storage", async () => {
        // get keys from schema and call local storage
        await OptionsUI.restoreOptionsHandler();
        expect(browser.storage.local.get).to.be.calledWith([
          // Note: the order of these elements will be the same as in the schema
          "myradio", "mycheckbox", "mytext", "mytextnum", "myshortcut"
        ]);
      });
    });
  });

  describe("restoreOptions", () => {
    var stub, stubCheckbox, stubRadio, stubText;
    before(() => {
      stub = sinon.stub(document, "querySelector").returns({}); // ignore other undefined options
    });
    beforeEach(() => {
      stubCheckbox = {};
      stubRadio = {};
      stubText = {};
      stub.withArgs(`[name=mycheckbox]`).returns(stubCheckbox);
      stub.withArgs(`[name=myradio][value=radiodefault]`).returns(stubRadio);
      stub.withArgs(`[name=myradio][value=radioval]`).returns(stubRadio);
      stub.withArgs(`[name=mytext]`).returns(stubText);
    });
    afterEach(() => {
      stub.resetHistory();
    });
    after(() => {
      document.querySelector.restore();
    });
    it("should restore defaults", () => {
      var loaded = {};
      OptionsUI.restoreOptions(loaded, schema);
      expect(document.querySelector).to.be.calledWith(`[name=mycheckbox]`);
      expect(stubCheckbox).to.have.property("checked").to.equal(false);
      expect(document.querySelector).to.be.calledWith(`[name=myradio][value=radiodefault]`);
      expect(stubRadio).to.have.property("checked").to.equal("radiodefault");
      expect(document.querySelector).to.be.calledWith(`[name=mytext]`);
      expect(stubText).to.have.property("value").to.equal("textdefault");
    });

    it("should apply loaded options", () => {
      var loaded = {mycheckbox: true, myradio: "radioval", mytext: "textval", shortcut: "x"};
      OptionsUI.restoreOptions(loaded, schema);
      expect(document.querySelector).to.be.calledWith(`[name=mycheckbox]`);
      expect(stubCheckbox).to.have.property("checked").to.equal(true);
      expect(document.querySelector).to.be.calledWith(`[name=myradio][value=radioval]`);
      expect(stubRadio).to.have.property("checked").to.equal("radioval");
      expect(document.querySelector).to.be.calledWith(`[name=mytext]`);
      expect(stubText).to.have.property("value").to.equal("textval");
    });
  });

  describe("setupAutoSave", () => {
    // add event listener to objects
    var stub, spy, stubFail;
    before(() => {
      stub = {
        addEventListener: (v, fn) => {
          stub[`on${v}`] = fn;
        },
      }
      sinon.stub(OptionsUI, "saveOptions");
      spy = sinon.spy(stub, "addEventListener");
    });
    after(() => {
      OptionsUI.saveOptions.restore();
    });
    it("should add event listeners to elements", () => {
      OptionsUI.setupAutosave(stub);
      expect(spy).to.be.calledWith("change");
      stub.onchange();
      expect(OptionsUI.saveOptions).to.be.called;
    });
    /*
    it("should handle error", () => {
      OptionsUI.setupAutosave(stubFail);
      // TODO
      //expect(console.warn).to.be.called;
    });
    */
  });
});
