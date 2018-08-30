"use strict";
import {SHORTCUT_TYPES, Commands} from 'background/commands';
//import {App} from 'background/background';

describe("commands.js", () => {
  const browserAction = "_execute_browser_action";
  const invalidAction = "_x";
  const validKey = "Alt+X";
  const invalidKey = "x";
  const commandUpdateStub = sinon.stub().resolves();
  browser.commands.update = commandUpdateStub;
  const commandResetStub = sinon.stub().resolves();
  browser.commands.reset = commandResetStub;

  describe("browser", () => {
    it("should register a listener for onCommand", () => {
      expect(browser.commands.onCommand.addListener).to.be.calledOnce;
    });
  });

  describe("setCommand", () => {
    it("should call browser.commands.reset on empty shortcut key", async () => {
      const keys = ["", null, undefined];
      const command = browserAction;
      for (const key of keys) {
        commandResetStub.resetHistory();
        //expect(Commands.setCommand(command, key)).to.eventually.be.true.notify(done); // notify(done) instead of returning promise
        expect(await Commands.setCommand(command, key)).to.be.true;
        expect(browser.commands.reset).to.be.calledOnceWith(command);
      }
    });

    it("should throw on invalid shortcut key", async () => {
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
      expect(await Commands.setCommand(command, key)).to.be.true; // redundant?
      expect(browser.commands.update).to.be.calledOnceWith({name: command, shortcut: key});
    });
  });

  describe("setBrowserAction", () => {
    it("should call browser.commands.update", async () => {
      const key = validKey;
      commandUpdateStub.resetHistory();
      expect(await Commands.setBrowserAction(key)).to.be.true; // redundant?
      expect(browser.commands.update).to.be.calledOnceWith({name: browserAction, shortcut: key});
    });
  });

  describe("commandHandler", () => {

    var stub = sinon.stub(Commands.COMMANDS, SHORTCUT_TYPES.BROWSER_ACTION);
    //App.run = sinon.stub();
    //var stub = sinon.stub(App, "run");
    it("should call command on browserAction", () => {
      const command = browserAction;
      Commands.commandHandler(command);
      expect(stub).to.be.calledOnce;
    });
    stub.reset();

    it("should throw on undefined command", () => {
      const command = invalidAction;
      expect(() => Commands.commandHandler(command)).to.throw(Error);
    });

  });
});
