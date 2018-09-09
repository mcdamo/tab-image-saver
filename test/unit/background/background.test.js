"use strict";
import {App, getWindowId} from 'background/background';
//import {Global} from 'background/global';
//import {Downloads} from 'background/downloads';

//var Downloads = {};
//Downloads.downloadChangedHandler = sinon.stub();

describe("background.js", () => {
  var windowsStub, windowId;
  before(() => {
    windowId = 1;
    browser.windows = {
      getCurrent: sinon.stub(browser.windows, "getCurrent").resolves({id: windowId}),
    }
  });

  describe("browserAction", () => {

    it("should register a listener for browserAction.onClicked", () => {
      expect(browser.browserAction.onClicked.addListener).to.be.calledOnce;
    });
    /*    
    // not defined
    it("should register a listener for onCommand", () => {
      expect(browser.commands.onCommand.addListener).to.be.calledOnce;
    });
    */
    it("should register a listener for runtime.onStartup", () => {
      expect(browser.runtime.onStartup.addListener).to.be.calledOnce;
    });
    /*
    // TODO
    it("should register a listener for runtime.onInstalled ", () => {
      expect(browser.runtime.onInstalled.addListener).to.be.calledOnce;
    });
    */
    /*
    // TODO
    it("should register a listener for storage.onChanged ", () => {
      expect(browser.storage.onChanged.addListener).to.be.calledOnce;
    });
    */
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
    it("getWindowId", async () => {
      const result = await getWindowId();
      expect(result).to.equal(windowId); 
    });
  });

  describe("hasRuntime", () => {
    // TODO
  });

  describe("isCancelled", () => {
    // TODO
  });

  describe("addUrl & isUniqueUrl", () => {
    /*
    // TODO needs runtime
     it("should return false on duplicate url",  () => {
      var url = "test/url";
      expect(App.isUniqueUrl(url, windowId)).to.equal(true);
      App.addUrl(url, windowId);
      expect(App.isUniqueUrl(url, windowId)).to.equal(false);
    });
    */
  });

  describe("setTitle", () => {
    // TODO
  });

  describe("setBadgeText", () => {
    // TODO
  });

  describe("setBadgeBackgroundColor", () => {
    // TODO
  });

  describe("setBadgeFinished", () => {
    // TODO
  });

  describe("setBadgeSaving", () => {
    // TODO
  });

  describe("setBadgeLoading", () => {
    // TODO
  });

  describe("notify", () => {
    // TODO
  });

  describe("notifyFinished", () => {
    // TODO
  });

  describe("finished", () => {
    // TODO
  });

  describe("downloadFinished", () => {
    // TODO
  });

  describe("onDownloadComplete", () => {
    // TODO
  });

  describe("onDownloadFailed", () => {
    // TODO
  });

  describe("createFilename", () => {
    var stub;
    before(() => {
      stub = sinon.stub(Global, "getHeaderFilename").resolves({filename: "xhrname.xhrext", mimeExt: ".xm"});
    });

    after(() => {
      stub.restore();
    });

    it("should replace string using template", async () => {
      var img = {
        src: "http://domain.tld/path/part/file.ext?query",
        alt: "alt string",
      }
      var rules = {
        "<alt>.jpg": "alt string.jpg",
        "<name>,<ext>": "file,.ext",
        "<xName>,<xExt>,<xMimeExt>": "xhrname,.xhrext,.xm",
        "<####index>": "0042",
        "<hostname>": "domain.tld",
        "<path>": "path/part",
        " <undef> ": "undef", // strip whitespace and treat as literal
      };
      //Object.entries(rules).forEach(async ([test, result]) => {
      for (const test in rules) {
        const result = rules[test];
        await expect(App.createFilename(img, 42, [test]), `Rule: ${test}`).to.eventually.become(result);
      };
    });

    it("should get path from twitter style urls", async () => {
      var img = {
        src: "https://pbs.twimg.com/media/file.ext:large",
      }
      await expect(App.createFilename(img, 42, ["<name>,<ext>"])).to.eventually.become("file,.ext");
    });
    it("should return null when filename is not valid", async () => {
      var img = {};
      var rules = [
        "", // empty
        ".", // period only
        ".ext", // extension only
      ];
      for (const test of rules) {
        await expect(App.createFilename(img, 42, [test]), `Rule: ${test}`).to.eventually.become(null);
      }
    });
  });

  describe("createPath", () => {
    var img;
    before(() => {
      App.options.downloadPath = "t";
      img = {
        src: "http://domain.tld/file.ext"
      };
    });

    it("should join path with options.downloadPath", async () => {
      var rules = ["<name><ext>"];
      await expect(App.createPath(img, 0, rules)).to.eventually.become("t/file.ext");
    });
    it("should reject when filename not generated", async () => {
      var rules = [];
      await expect(App.createPath(img, 0, rules)).to.eventually.be.rejected;
    });
  });

  describe("processTabResult", () => {
    // TODO
  });

  describe("executeTab", () => {
    // TODO
  });

  describe("getWindowTabs", () => {
    // TODO
  });

  describe("waitForTabs", () => {
    // TODO
  });

  describe("executeTabs", () => {
    // TODO
  });

  describe("getActiveTab", () => {
    // TODO
  });

  describe("init", () => {
    // TODO
  });

  describe("loadManifest", () => {
    // TODO
  });

  describe("storageChangeHandler", () => {
    // TODO
  });

  describe("loadOptions", () => {
    it("should load defaults", async () => {
      await App.loadOptions();
      expect(App.options).to.be.an("object")
        .and.to.have.property("pathRules")
        .to.be.an("array");
    });
  });

  describe("run", () => {
    var sleep, stub, stub2, waitFn;
    before(() => {
      sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
      waitFn = async () => { await sleep(500); return false; };
      stub = sinon.stub(App, "executeTabs").callsFake(waitFn);
      stub2 = sinon.stub(App, "getActiveTab").resolves(1);
    });

    after(() => {
      stub.restore();
      stub2.restore();
    });

    it("should block concurrent call", async () => {
      const p1 = App.run();
      const p2 = App.run();
      await expect(p1).to.eventually.equal(1);
      await expect(p2).to.eventually.equal(-1);
    });

    it("should cancel upon subsequent call", async () => {
      const windowId = await getWindowId();
      const p1 = App.run();
      await sleep(100);
      const p2 = App.run();
      await sleep(100);
      expect(App.isCancelled(windowId)).to.be.true;
      await expect(p1).to.eventually.equal(1);
      await expect(p2).to.eventually.equal(0);
    });
  });

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
