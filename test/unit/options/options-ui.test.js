"use strict";
//import {MESSAGE_TYPES} from 'background/constants';
import {OptionsUI} from 'options/options-ui';

describe("options-ui.js", () => {
/*
  // TODO functional test
    it("should restore options on load", () => {
      expect(restoreOptions).to.be.calledOnce;
    });OPTIONS_
*/
  const schema = {
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
  ]
  };
  describe("getOptionsSchema", () => {
  browser.runtime.sendMessage.withArgs({type: MESSAGE_TYPES.OPTIONS_SCHEMA})
    .resolves({body: schema});
    it("should sendMessage and return body", () => {
      return expect(OptionsUI.getOptionsSchema()).to.eventually.become(schema);
    });
  });
  describe("onSaveOption", () => {
    const onsaveErBody = {
      name: "shortcut",
      value: "x"
    };
    const onsaveOkBody = {
      name: "test",
      value: "x"
    };
    browser.runtime.sendMessage.resolves({type: MESSAGE_TYPES.ERROR});
    browser.runtime.sendMessage.withArgs({type: MESSAGE_TYPES.OPTIONS_ONSAVE, body: onsaveOkBody})
      .resolves({type: MESSAGE_TYPES.OPTIONS_ONSAVE, body: onsaveOkBody});
    it("should return value for valid shortcut", async () => {
      const o = onsaveOkBody;
      await expect(OptionsUI.onSaveOption(o)).to.eventually.become(o.value);
    });
    it("should throw Error for invalid shortcut", async () => {
      const o = onsaveErBody;
      await expect(OptionsUI.onSaveOption(o)).to.eventually.be.rejected
        .and.be.an.instanceOf(Error);
    });
  });
  describe("saveOptions", () => {
    browser.runtime.sendMessage.withArgs({type: MESSAGE_TYPES.OPTIONS_SCHEMA})
      .resolves({body: schema});
    var spy = sinon.spy(OptionsUI, "onSaveOption"); //TODO

    var stub = sinon.stub().returns(undefined);
    stub.withArgs("[name=mycheckbox]").returns({checked: true, stub: true});
    stub.withArgs("[name=myradio]:checked").returns({value: "radioval", stub: true});
    stub.withArgs("[name=mytext]").returns({value: "textval", stub: true});
    stub.withArgs("[name=shortcut]").returns({value: "shortcutval", stub: true});
    document.querySelector = stub;

    //saveOptions().then(() => {
    it("should update local storage and call 'onsave'", async () => {
      spy.resetHistory();
      await OptionsUI.saveOptions();
      //expect(OptionsUI.onSaveOption).to.be.calledOnce;
      //expect(document.querySelector).to.be.calledWith(`[name=mycheckbox]`);
      //expect(document.querySelector).to.be.calledWith(`[name=myradio]:checked`);
      //expect(document.querySelector).to.be.calledWith(`[name=mytext]`);
      expect(browser.storage.local.set).to.be.calledWith({
        mycheckbox: true, myradio: "radioval", mytext: "textval", shortcut: "x"
      });
    });

    it("should call onSaveOption for 'onsave'", () => {
      expect(spy).to.be.calledOnce;
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
