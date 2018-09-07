"use strict";
import {MESSAGE_TYPES} from 'background/constants';
import {OptionsUI} from 'options/options-ui';

describe("options-ui.js", () => {
  var documentStub, schema;
  before(() => {
    //TODO, taken from setup.js
    //documentStub = sinon.stub(document, "addEventListener");
    schema = {
      types: {
        BOOL: "BOOL",
        RADIO: "RADIO",
        VALUE: "VALUE",
      },
      keys: [
        {name: "myradio", type: "RADIO", default: "radiodefault"},
        {name: "mycheckbox", type: "BOOL", default: false},
        {name: "mytext", type: "VALUE", default: "textdefault"},
        {name: "shortcut", type: "VALUE", default: "x", onLoad: {function: undefined}, onSave: {function: undefined} },
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
  describe("saveOptions", () => {
    var onSaveSpy, qsStub;
    before(() => {
      browser.runtime.sendMessage
        .withArgs({type: MESSAGE_TYPES.OPTIONS_SCHEMA})
        .resolves({body: schema});
      onSaveSpy = sinon.spy(OptionsUI, "onSaveOption"); //TODO
      //qsStub = sinon.stub().returns(undefined);
      qsStub = sinon.stub(document, "querySelector")
        .returns(undefined)
        .withArgs("[name=mycheckbox]")
        .returns({checked: true, stub: true})
        .withArgs("[name=myradio]:checked")
        .returns({value: "radioval", stub: true})
        .withArgs("[name=mytext]")
        .returns({value: "textval", stub: true})
        .withArgs("[name=shortcut]")
        .returns({value: "shortcutval", stub: true});
    });
    after(() => {
      browser.runtime.sendMessage.reset();
      qsStub.reset();
    });
    beforeEach(() => {
      onSaveSpy.resetHistory();
    });
    //saveOptions().then(() => {
    it("should update local storage and call 'onsave'", async () => {
      await OptionsUI.saveOptions();
      //expect(OptionsUI.onSaveOption).to.be.calledOnce;
      //expect(document.querySelector).to.be.calledWith(`[name=mycheckbox]`);
      //expect(document.querySelector).to.be.calledWith(`[name=myradio]:checked`);
      //expect(document.querySelector).to.be.calledWith(`[name=mytext]`);
      expect(browser.storage.local.set).to.be.calledWith({
        mycheckbox: true, myradio: "radioval", mytext: "textval", shortcut: "x"
      });
      expect(onSaveSpy).to.be.calledOnce;
    });

/*
    it("should get checkbox value", () => {
      expect(document.querySelector).to.be.calledWith(`[name=mycheckbox]`);
    });
    it("should get radio option", () => {
      expect(document.querySelector).to.be.calledWith(`[name=myradio]:checked`);
    });
    it("should get text value", () => {
      expect(document.querySelector).to.be.calledWith(`[name=mytext]`);
    });
    it("should save options to local storage", () => {
      expect(browser.storage.local.set).to.be.calledWith({
        mycheckbox: true, myradio: "radioval", mytext: "textval", shortcut: "x"
      });
    });
*/
  });
  describe("restoreOptionsHandler", () => {
    // TODO
  });
  describe("restoreOptions", () => {
    // TODO
  });
  describe("setupAutoSave", () => {
    // TODO
  });
   
});
