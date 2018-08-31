"use strict";
import {App, getWindowId} from 'background/background';
//import {Downloads} from 'background/downloads';

//var Downloads = {};
Downloads.downloadChangedHandler = sinon.stub();
App.getActiveTab = sinon.stub().resolves(1);

describe("background.js", () => {
  describe("browserAction", () => {

    it("should register a listener for onClicked", () => {
      expect(browser.browserAction.onClicked.addListener).to.be.called; //Once
    });
/*    
    // not defined
    it("should register a listener for onCommand", () => {
      expect(browser.commands.onCommand.addListener).to.be.calledOnce;
    });
*/
    it("should register a listener for onStartup", () => {
      expect(browser.runtime.onStartup.addListener).to.be.called; //Once
    });
    

/*
    it("should open a tab when the button is clicked", function() {
      chrome.browserAction.onClicked.trigger();

      sinon.assert.calledOnce(chrome.tabs.create);
      sinon.assert.calledWithExactly(chrome.tabs.create, {
        active: true,
        url: "https://www.mozilla.org"
      });
    });
*/
  });

// runtime isn't defined until it is run, maybe should be functional test?
  describe("runtime", () => {
/*
    it("should be an integer", function() {
//getRuntimeId().then(id => {
let id = getRuntimeId();
      expect(id, `nooo why fail?? ${id}`).to.equal(2);
//});
    });
*/
//App.init();
// async
it('getWindowId', async () => {
  const result = await getWindowId();
  expect(result).to.equal(1); 
});

});

  describe("run", () => {

    it("should block concurrent call", async () => {
    const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
    const waitFn = async () => { await sleep(500); return false; };
    App.executeTabs = sinon.stub().callsFake(waitFn);
      const p1 = App.run();
      const p2 = App.run();
      await expect(p1).to.eventually.equal(1);
      await expect(p2).to.eventually.equal(-1);
  App.executeTabs.reset();
    });

    it("should cancel upon subsequent call", async () => {
    const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
    const waitFn = async () => { await sleep(500); return false; };
    App.executeTabs = sinon.stub().callsFake(waitFn);
      const windowId = await getWindowId();
      const p1 = App.run();
      await sleep(100);
      const p2 = App.run();
      await sleep(100);
      expect(App.isCancelled(windowId)).to.be.true;
      await expect(p1).to.eventually.equal(1);
      await expect(p2).to.eventually.equal(0);
  App.executeTabs.reset();
    });
  });

/*
  describe("isCancelled", function() {
    it("should be false", function() {
      expect(App.isCancelled(id)).to.be(false);
    });
  });
*/
/*
// functional test for e2e, use selenium-webdriver?
    describe('sendMessageCancel', function() {
        it('should return cancel status', function() {
            // Return a promise for Mocha using the Firefox browser API instead of chrome.
            return browser.runtime.sendMessage({action: 'cancel'})
                .then(function(response) {
                    expect(response.action).to.equal('cancel');
                    expect(response.body).to.equal('false');
                });
        });
  });
*/
});
