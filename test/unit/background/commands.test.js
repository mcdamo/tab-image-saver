"use strict";
/* globals expect */
import Constants from "background/constants";
import Commands from "background/commands";

describe("commands.js", function () {
  let {
    browserAction,
    commandResetStub,
    commandUpdateStub,
    invalidAction,
    invalidKey,
    validKey,
  } = {};
  before(function () {
    browserAction = Constants.SHORTCUT_TYPE.DEFAULT_ACTION;
    invalidAction = "_x";
    validKey = "Alt+X";
    invalidKey = "x";
    commandUpdateStub = sinon.stub().resolves();
    browser.commands.update = commandUpdateStub;
    commandResetStub = sinon.stub().resolves();
    browser.commands.reset = commandResetStub;
  });

  describe("browser", function () {
    /*
    // TODO this is now in init()
    it("should register a listener for onCommand", function () {
      expect(browser.commands.onCommand.addListener).to.be.called; //Once;
    });
    */
  });

  describe("setCommand", function () {
    it("should call browser.commands.reset on empty shortcut key", async function () {
      const keys = ["", null, undefined];
      const command = browserAction;
      for (const key of keys) {
        commandResetStub.resetHistory();
        //expect(Commands.setCommand(command, key)).to.eventually.be.true.notify(done); // notify(done) instead of returning promise
        await expect(
          Commands.setCommand(command, key),
          `Key ${key}`
        ).to.be.eventually.become(key);
        expect(browser.commands.reset).to.be.calledOnceWith(command);
      }
    });

    it("should reject on invalid shortcut key", async function () {
      const command = browserAction;
      const key = invalidKey;
      commandUpdateStub
        .withArgs({ name: browserAction, shortcut: invalidKey })
        .rejects();
      await expect(
        Commands.setCommand(command, key)
      ).to.eventually.be.rejected.and.be.an.instanceOf(Error);
    });

    it("should call browser.commands.update on valid shortcut key", async function () {
      const command = browserAction;
      const key = validKey;
      commandUpdateStub.resetHistory();
      await expect(Commands.setCommand(command, key)).to.eventually.become(key);
      expect(browser.commands.update).to.be.calledOnceWith({
        name: command,
        shortcut: key,
      });
    });
  });

  describe("setBrowserAction", function () {
    it("should call browser.commands.update", async function () {
      const key = validKey;
      commandUpdateStub.resetHistory();
      await expect(Commands.setBrowserAction(key)).to.eventually.become(key);
      expect(browser.commands.update).to.be.calledOnceWith({
        name: browserAction,
        shortcut: key,
      });
    });
  });

  describe("handleCommand", function () {
    let stub;
    before(function () {
      stub = sinon.stub(
        Commands.COMMANDS,
        Constants.SHORTCUT_TYPE.DEFAULT_ACTION
      );
    });
    after(function () {
      stub.restore();
    });

    //App.run = sinon.stub();
    //var stub = sinon.stub(App, "run");
    it("should call command on browserAction", function () {
      const command = browserAction;
      Commands.handleCommand(command);
      expect(stub).to.be.calledOnce;
    });

    it("should throw on undefined command", function () {
      const command = invalidAction;
      expect(() => Commands.handleCommand(command)).to.throw(Error);
    });
  });
});
