"use strict";
import {SHORTCUT_TYPES, Commands} from 'background/commands';
//import {App} from 'background/background';

describe("commands.js", () => {
  var browserAction, invalidAction, invalidKey, validKey, commandUpdateStub, commandResetStub;
  before(() => {
  browserAction = "_execute_browser_action";
  invalidAction = "_x";
  validKey = "Alt+X";
  invalidKey = "x";
  commandUpdateStub = sinon.stub().resolves();
  browser.commands.update = commandUpdateStub;
  commandResetStub = sinon.stub().resolves();
  browser.commands.reset = commandResetStub;
  });

  describe("browser", () => {
    it("should register a listener for onCommand", () => {
      expect(browser.commands.onCommand.addListener).to.be.called; //Once;
    });
  });

  describe("setCommand", () => {
    it("should call browser.commands.reset on empty shortcut key", async () => {
      const keys = ["", null, undefined];
      const command = browserAction;
      for (const key of keys) {
        commandResetStub.resetHistory();
        //expect(Commands.setCommand(command, key)).to.eventually.be.true.notify(done); // notify(done) instead of returning promise
        await expect(Commands.setCommand(command, key), `Key ${key}`).to.be.eventually.become(key);
        expect(browser.commands.reset).to.be.calledOnceWith(command);
      }
    });

    it("should reject on invalid shortcut key", async () => {
      const command = browserAction;
      const key = invalidKey;
      commandUpdateStub.withArgs({name: browserAction, shortcut: invalidKey}).rejects();
      await expect(Commands.setCommand(command, key))
        .to.eventually.be.rejected
        .and.be.an.instanceOf(Error);
    });

    it("should call browser.commands.update on valid shortcut key", async () => {
      const command = browserAction;
      const key = validKey;
      commandUpdateStub.resetHistory();
      await expect(Commands.setCommand(command, key)).to.eventually.become(key);
      expect(browser.commands.update).to.be.calledOnceWith({name: command, shortcut: key});
    });
  });

  describe("setBrowserAction", () => {
    it("should call browser.commands.update", async () => {
      const key = validKey;
      commandUpdateStub.resetHistory();
      await expect(Commands.setBrowserAction(key)).to.eventually.become(key);
      expect(browser.commands.update).to.be.calledOnceWith({name: browserAction, shortcut: key});
    });
  });

  describe("handleCommand", () => {
    var stub;
    before(() => {
      stub = sinon.stub(Commands.COMMANDS, SHORTCUT_TYPES.BROWSER_ACTION);
    });
    after(() => {
      stub.restore();
    });

    //App.run = sinon.stub();
    //var stub = sinon.stub(App, "run");
    it("should call command on browserAction", () => {
      const command = browserAction;
      Commands.handleCommand(command);
      expect(stub).to.be.calledOnce;
    });

    it("should throw on undefined command", () => {
      const command = invalidAction;
      expect(() => Commands.handleCommand(command)).to.throw(Error);
    });

  });
});
