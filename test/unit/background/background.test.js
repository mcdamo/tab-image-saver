"use strict";
/* globals expect */
import App, { getWindowId } from "background/background";
import Constants from "background/constants";
import Global from "background/global";
import Version from "background/version";

describe("background.js", function () {
  let { windowId, windowsOrig, windowsStub } = {};
  before(function () {
    windowId = 1;
    windowsOrig = browser.windows;
    windowsStub = sinon
      .stub(browser.windows, "getCurrent")
      .resolves({ id: windowId });
    browser.windows = {
      getCurrent: windowsStub,
    };
  });
  after(function () {
    sinon.restore();
    browser.windows = windowsOrig;
  });

  describe("browserAction", function () {
    /*
    // FIXME this is in init()
    it("should register a listener for browserAction.onClicked", function () {
      expect(browser.browserAction.onClicked.addListener).to.be.calledOnce;
    });
    */
    /*
    // not defined
    it("should register a listener for onCommand", () => {
      expect(browser.commands.onCommand.addListener).to.be.calledOnce;
    });
    */
    /*
    it("should register a listener for runtime.onStartup", function () {
      expect(browser.runtime.onStartup.addListener).to.be.calledOnce;
    });
    */
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
  describe("runtime", function () {
    it("should getWindowId", async function () {
      const result = await getWindowId();
      expect(result).to.equal(windowId);
    });
  });

  describe("getRuntime", function () {
    // TODO
  });

  describe("isFinished", function () {
    // TODO
  });

  describe("isCancelled", function () {
    // TODO
  });

  describe("isRunning", function () {
    // TODO
  });

  describe("isIdle", function () {
    // TODO
  });

  describe("addUrl & isUniqueUrl", function () {
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

  describe("addDownload + getDownload + removeDownload", function () {
    let dl = { id: 42, context: "value" };
    let tabId = 43;
    let windowId = 44;
    before(function () {
      App.createRuntime({ windowId, tabId });
    });
    after(function () {
      App.deleteRuntime(windowId);
    });
    it("should add download to map", function () {
      expect(App.getDownload(dl.id, tabId, windowId)).to.equal(undefined);
      App.addDownload(dl.id, dl, tabId, windowId);
      expect(App.getDownload(dl.id, tabId, windowId)).to.deep.equal(dl);
      App.removeDownload(dl.id, tabId, windowId);
      expect(App.getDownload(dl.id, tabId, windowId)).to.equal(undefined);
    });
  });

  describe("hasTabDownloads", function () {
    let dl;
    let tabId = 43;
    let windowId = 44;
    before(function () {
      App.createRuntime({ windowId, tabId });
      dl = { id: 42, tabId };
      App.addDownload(dl.id, dl, tabId, windowId);
    });
    after(function () {
      App.removeDownload(dl.id, tabId, windowId);
      App.deleteRuntime(windowId);
    });
    it("should return true for defined tabId", function () {
      expect(App.hasTabDownloads(tabId, windowId)).to.equal(true);
    });
    it("should return false for other tabId", function () {
      expect(App.hasTabDownloads(6, windowId)).to.equal(false);
    });
  });

  describe("hasWindowDownloads", function () {
    let dl;
    let tabId = 43;
    let windowId = 44;
    before(function () {
      App.createRuntime({ windowId, tabId });
      dl = { id: 42, tabId };
      App.addDownload(dl.id, dl, tabId, windowId);
    });
    after(function () {
      App.removeDownload(dl.id, tabId, windowId);
      App.deleteRuntime(windowId);
    });
    it("should return true for defined windowId", function () {
      expect(App.hasWindowDownloads(windowId)).to.equal(true);
    });
    it("should return false for other windowId", function () {
      expect(App.hasWindowDownloads(6)).to.equal(false);
    });
  });

  describe("setTitle", function () {
    // TODO
  });

  describe("setBadgeText", function () {
    // TODO
  });

  describe("setBadgeBackgroundColor", function () {
    // TODO
  });

  describe("setBadgeTextColor", function () {
    // TODO
  });

  describe("setBadgeFinished", function () {
    // TODO
  });

  describe("setBadgeSaving", function () {
    // TODO
  });

  describe("setBadgeStart", function () {
    // TODO
  });

  describe("setBadgeLoading", function () {
    // TODO
  });

  describe("notify", function () {
    // TODO
  });

  describe("notifyFinished", function () {
    // TODO
  });

  describe("setFinished", function () {
    // TODO
  });

  describe("tabsFinished", function () {
    // TODO
  });

  describe("downloadFinished", function () {
    // TODO
  });

  describe("handleDownloadComplete", function () {
    // TODO
  });

  describe("handleDownloadFailed", function () {
    // TODO
  });

  describe("createFilename", function () {
    let stub;
    before(function () {
      stub = sinon
        .stub(Global, "getHeaderFilename")
        .resolves({ filename: "xhr name.xhrext", mimeExt: "xm" });
    });

    after(function () {
      stub.restore();
    });

    it("should replace string using template", async function () {
      let tab = {
        id: 6,
        title: "tab title - site name",
        url: "http://my.tab.url/path/to/page.html",
      };
      let img = {
        src: "http://domain.tld/path/part/file.ext?query",
        alt: "alt string",
      };
      let rules = {
        "${alt}.jpg": "alt string.jpg",
        "${name},${ext}": "file,ext",
        "${xName},${xExt},${xMimeExt}": "xhr name,xhrext,xm",
        "${index.padStart(4,0)}": "0042",
        "${host}": "domain.tld",
        "${hostname}": "domain.tld",
        "${path}": "path/part",
        "${tabtitle}": "tab title - site name",
        "${tabhost},${tabpath},${tabfile},${tabext}":
          "my.tab.url,path/to,page,html",
        // no longer a valid replacement
        // " ${undef} ": "undef", // strip whitespace and return literal
      };
      //Object.entries(rules).forEach(async ([test, result]) => {
      for (const test in rules) {
        const result = rules[test];
        await expect(
          App.createFilename({ tab, image: img, index: 42, rules: [test] }),
          `Rule: ${test}`
        ).to.eventually.become(result);
      }
    });

    it("should return empty string if template doesn't match", async function () {
      let img = {
        src: "http://domain.tld/path/",
      };
      let rules = {
        "${alt},${name},${ext}": ",,",
      };
      //Object.entries(rules).forEach(async ([test, result]) => {
      for (const test in rules) {
        const result = rules[test];
        await expect(
          App.createFilename({ tab: {}, image: img, index: 42, rules: [test] }),
          `Rule: ${test}`
        ).to.eventually.become(result);
      }
    });

    it("should replace invalid characters in path", async function () {
      let tab = {
        id: 6,
        title: '*":<>|?tab title*":<>|?',
        //url: "http://my.tab.url/path/to/page.html",
      };
      let img = {
        //src: "http://domain.tld/path/part/file.ext?query",
        alt: '*":<>|?alt string*":<>|?',
      };
      let rules = {
        "${alt}.jpg": "_______alt string_______.jpg",
        "${tabtitle}": "_______tab title_______",
      };
      //Object.entries(rules).forEach(async ([test, result]) => {
      for (const test in rules) {
        const result = rules[test];
        await expect(
          App.createFilename({ tab, image: img, index: 42, rules: [test] }),
          `Rule: ${test}`
        ).to.eventually.become(result);
      }
    });

    it("should decode URI components", async function () {
      let img = {
        src: "http://domain.tld/path%20name/part/file%20name.ext?query",
      };
      let rules = {
        "${name},${ext}": "file name,ext",
        "${hostname}": "domain.tld",
        "${path}": "path name/part",
      };
      //Object.entries(rules).forEach(async ([test, result]) => {
      for (const test in rules) {
        const result = rules[test];
        await expect(
          App.createFilename({ tab: {}, image: img, index: 42, rules: [test] }),
          `Rule: ${test}`
        ).to.eventually.become(result);
      }
    });

    it("should get path from twitter style urls", async function () {
      let img = {
        src: "https://pbs.twimg.com/media/file.ext:large",
      };
      await expect(
        App.createFilename({
          tab: {},
          image: img,
          index: 42,
          rules: ["${name},${ext}"],
        })
      ).to.eventually.become("file,ext");
    });

    it("should return null when filename is not valid", async function () {
      let img = {};
      let rules = [
        "", // empty
        ".", // period only
        ".ext", // extension only
      ];
      for (const test of rules) {
        await expect(
          App.createFilename({ tab: {}, image: img, index: 42, rules: [test] }),
          `Rule: ${test}`
        ).to.eventually.become(null);
      }
    });
  });

  describe("createPath", function () {
    let { img, param } = {};
    before(function () {
      param = {
        downloadPath: "t",
      };
      img = {
        src: "http://domain.tld/file.ext",
      };
    });

    it("should join path with options.downloadPath", async function () {
      let rules = ["${name}.${ext}"];
      await expect(
        App.createPath({ tab: {}, image: img, index: 0, rules, ...param })
      ).to.eventually.become("t/file.ext");
    });
    it("should reject when filename not generated", async function () {
      let rules = [];
      await expect(
        App.createPath({ tab: {}, image: img, index: 0, rules, ...param })
      ).to.eventually.be.rejected;
    });
  });

  describe("getActiveDownloadNum", function () {
    // TODO
  });

  describe("createDownloads", function () {
    // TODO
  });

  describe("downloadTab", function () {
    // TODO
  });

  describe("filterImages", function () {
    // TODO
  });

  describe("executeTab", function () {
    // TODO
  });

  describe("executeTabs", function () {
    // TODO
  });

  describe("getWindowTabs", function () {
    // TODO
  });

  describe("checkTabs", function () {
    let { cancelStub, getStub, objs, updateStub } = {};
    before(function () {
      objs = [
        { index: 1, tab: { id: 3, status: "complete", discarded: false } },
        { index: 2, tab: { id: 1, status: "complete", discarded: false } },
        {
          index: 3,
          tab: {
            id: 2,
            url: "http://example.com",
            status: "complete",
            discarded: true,
          },
        },
      ];
      getStub = browser.tabs.get;
      let idx = 0;
      getStub.withArgs(objs[idx].tab.id).resolves(objs[idx].tab);
      idx = 1;
      getStub.withArgs(objs[idx].tab.id).resolves(objs[idx].tab);
      cancelStub = sinon.stub(App, "isCancelled").returns(false);
      updateStub = browser.tabs.update;
      idx = 2;
      updateStub
        .withArgs(objs[idx].tab.id, { url: objs[idx].tab.url })
        .resolves({
          id: objs[idx].tab.id,
          url: objs[idx].tab.url,
          status: "complete",
          discarded: false,
        });
    });
    beforeEach(function () {
      updateStub.resetHistory();
    });
    after(function () {
      cancelStub.restore();
      getStub.reset();
      updateStub.reset();
    });
    it("should return object with keys: ready, waiting, sleepMore", async function () {
      let ready = JSON.parse(JSON.stringify(objs));
      ready[2].tab.discarded = false;
      await expect(App.checkTabs({ tabs: objs, windowId }))
        .to.eventually.be.an("object")
        .and.to.deep.include({ ready, waiting: [] });
      expect(updateStub).to.be.calledOnce;
    });
    it("should ignore discarded tab when option is set", async function () {
      let ready = objs.slice(0, 2); // remove discarded tab from array
      App.options.ignoreDiscardedTab = true;
      await expect(App.checkTabs({ tabs: objs, windowId }))
        .to.eventually.be.an("object")
        .and.to.deep.include({ ready, waiting: [] });
      expect(updateStub).to.be.not.be.called;
    });
  });

  describe("waitForTabs", function () {
    let { cancelStub, getStub, tabIds, tabs, tabsMap } = {};
    before(function () {
      tabs = [
        { id: 1, status: "-", discarded: false },
        { id: 2, status: "loading", discarded: false },
        { id: 3, status: "complete", discarded: false },
      ];
      tabIds = tabs.reduce((acc, val) => {
        acc.push(val.id);
        return acc;
      }, []);
      getStub = browser.tabs.get;
      // resolve in order tab3, tab2, tab1
      let idx = 0;
      getStub.withArgs(tabs[idx].id).onCall(0).resolves(tabs[idx]);
      getStub.withArgs(tabs[idx].id).onCall(1).resolves(tabs[idx]);
      getStub
        .withArgs(tabs[idx].id)
        .onCall(2)
        .resolves({ id: tabs[idx].id, status: "complete" });
      idx = 1;
      getStub.withArgs(tabs[idx].id).onCall(0).resolves(tabs[idx]);
      getStub
        .withArgs(tabs[idx].id)
        .onCall(1)
        .resolves({ id: tabs[idx].id, status: "complete" });
      //browser.tabs.update
      Global.sleepCallback = sinon.stub().resolves(true);
      cancelStub = sinon.stub(App, "isCancelled").returns(false);
    });
    after(function () {
      cancelStub.restore();
      getStub.reset();
      //Global.sleepCallback.restore();
    });
    it("should return tabs in same order as provided", async function () {
      let readyTabs = await App.waitForTabs({ tabs, windowId });
      expect(readyTabs).to.be.an("array");
      let readyTabIds = readyTabs.reduce((acc, val) => {
        acc.push(val.id);
        return acc;
      }, []);
      expect(tabIds).to.deep.equal(readyTabIds);
    });
    // TODO it should return early if cancelled
  });

  describe("waitAndExecuteTabs", function () {
    // TODO
  });

  describe("filterTabs", function () {
    const tabs = [
      { id: 0, url: "https://x" },
      { id: 1, url: "ftps://x" },
      { id: 2, url: "" },
      { id: 3, url: "about://x" },
      { id: 4, url: "http://x" },
      { id: 5, url: "ftp://x" },
    ];
    it("should return all tabs with urls", function () {
      let mytabs = [tabs[0], tabs[1], tabs[4], tabs[5]];
      expect(App.filterTabs({ tabs, windowId })).to.deep.equal(mytabs);
    });
  });

  describe("selectTabs", function () {
    let { stub, tabs } = {};
    const ctabs = [
      { id: 0 },
      { id: 1 },
      { id: 2 },
      { id: 3 },
      { id: 4 },
      { id: 5 },
    ];
    before(function () {
      stub = sinon.stub(App, "getWindowTabs").resolves(tabs);
    });
    after(function () {
      stub.restore();
    });
    describe("active tab not defined", function () {
      before(function () {
        tabs = JSON.parse(JSON.stringify(ctabs));
      });
      beforeEach(function () {
        stub.resolves(tabs);
      });
      it("should return all tabs", async function () {
        stub.resolves(tabs);
        let mytabs = tabs.slice();
        await expect(
          App.selectTabs({
            method: Constants.ACTION.ALL,
            includeActive: false,
            windowId,
          })
        ).to.eventually.become(mytabs);
      });
    });
    describe("active tab 0", function () {
      before(function () {
        tabs = JSON.parse(JSON.stringify(ctabs));
      });
      beforeEach(function () {
        tabs[0].active = true;
        stub.resolves(tabs);
      });
      it("should return no left tabs", async function () {
        let mytabs = [];
        await expect(
          App.selectTabs({
            method: Constants.ACTION.LEFT,
            includeActive: false,
            windowId,
          })
        ).to.eventually.become(mytabs);
      });
    });
    describe("active tab 1", function () {
      before(function () {
        tabs = JSON.parse(JSON.stringify(ctabs));
      });
      beforeEach(function () {
        tabs[1].active = true;
        stub.resolves(tabs);
      });
      it("should return right tabs", async function () {
        let mytabs = tabs.slice(2);
        await expect(
          App.selectTabs({
            method: Constants.ACTION.RIGHT,
            includeActive: false,
            windowId,
          })
        ).to.eventually.become(mytabs);
      });
      it("should return right tabs + active", async function () {
        let mytabs = tabs.slice(1);
        await expect(
          App.selectTabs({
            method: Constants.ACTION.RIGHT,
            includeActive: true,
            windowId,
          })
        ).to.eventually.become(mytabs);
      });
    });
    describe("active tab 4", function () {
      before(function () {
        tabs = JSON.parse(JSON.stringify(ctabs));
      });
      beforeEach(function () {
        tabs[4].active = true;
        stub.resolves(tabs);
      });
      it("should return active tab", async function () {
        let mytabs = tabs.slice(4, 5);
        await expect(
          App.selectTabs({
            method: Constants.ACTION.ACTIVE,
            includeActive: false,
            windowId,
          })
        ).to.eventually.become(mytabs);
      });
      it("should return left tabs", async function () {
        let mytabs = tabs.slice(0, 4);
        await expect(
          App.selectTabs({
            method: Constants.ACTION.LEFT,
            includeActive: false,
            windowId,
          })
        ).to.eventually.become(mytabs);
      });
      it("should return left tabs + active", async function () {
        let mytabs = tabs.slice(0, 5);
        await expect(
          App.selectTabs({
            method: Constants.ACTION.LEFT,
            includeActive: true,
            windowId,
          })
        ).to.eventually.become(mytabs);
      });
    });
    describe("active tab 5", function () {
      before(function () {
        tabs = JSON.parse(JSON.stringify(ctabs));
      });
      beforeEach(function () {
        tabs[5].active = true;
        stub.resolves(tabs);
      });
      it("should return no right tabs", async function () {
        let mytabs = [];
        await expect(
          App.selectTabs({
            method: Constants.ACTION.RIGHT,
            includeActive: false,
            windowId,
          })
        ).to.eventually.become(mytabs);
      });
    });
  });

  describe("getActiveTab", function () {
    // TODO
  });

  describe("handleUpdateAvailable", function () {
    let stubIdle;
    before(function () {
      stubIdle = sinon.stub(App, "isIdle");
    });
    afterEach(function () {
      browser.runtime.reload.resetHistory();
    });
    after(function () {
      stubIdle.reset();
    });
    it("should reload app", function () {
      stubIdle.returns(true);
      App.handleUpdateAvailable();
      expect(browser.runtime.reload).to.be.calledOnce;
    });
    it("should set reload flag if busy", function () {
      stubIdle.returns(false);
      App.handleUpdateAvailable();
      expect(App.reload).to.equal(true);
      expect(browser.runtime.reload).to.not.be.called;
    });
  });

  describe("handleInstalled", function () {
    let { spyVer, stubInit, stubMf, stubVer } = {};
    before(function () {
      /*stubVer = sinon.stub().resolves();
      Version = {
        update: stubVer,
      };*/
      spyVer = sinon.spy(Version, "update");
      stubInit = sinon.stub(App, "init").resolves();
      stubMf = sinon.stub(App, "loadManifest").resolves({ version: "1.x" });
    });
    after(function () {
      //stubVer.reset();
      stubInit.reset();
      stubMf.reset();
      spyVer.resetHistory();
    });
    it("should call update", async function () {
      await App.handleInstalled();
      expect(App.loadManifest).to.be.calledOnce;
      expect(Version.update).to.be.calledOnceWith("1.x", undefined);
      //expect(App.init).to.be.calledOnce;
    });
  });

  describe("init", function () {
    // TODO
  });

  describe("loadManifest", function () {
    // TODO test in functional
  });

  describe("handleStorageChanged", function () {
    // TODO
  });

  describe("loadOptions", function () {
    /*
    // FIXME this calls down to browser.commands.reset() which is not defined
    it("should load defaults", async function () {
      await App.loadOptions();
      expect(App.options)
        .to.be.an("object")
        .and.to.have.property("pathRules")
        .to.be.an("array");
    });
    */
  });

  describe("cancel", function () {
    // TODO
  });

  describe("run", function () {
    let { sleep, stub, stub2, waitFn } = {};
    before(function () {
      sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      waitFn = async () => {
        await sleep(500);
        return false;
      };
      stub = sinon.stub(App, "executeTabs").callsFake(waitFn);
      stub2 = sinon.stub(App, "getActiveTab").resolves(1);
    });
    beforeEach(function () {
      // increment mocked windowId to prevent interference
      windowId++;
      windowsStub.resolves({ id: windowId });
    });
    after(function () {
      stub.restore();
      stub2.restore();
    });
    it("should block upon concurrent call", async function () {
      const p1 = App.run(windowId, "active");
      const p2 = App.run(windowId, "active");
      await expect(p1).to.eventually.equal(1); // normal return
      await expect(p2).to.eventually.equal(-1); // blocked
    });
    // TODO should cleanup/call finished
  });

  describe("handleBrowserAction", function () {
    let { sleep, stub, stub2, waitFn } = {};
    // workaround new config default: dom.min_background_timeout_value_without_budget_throttling=1000
    this.timeout(5000); // sleep timeout may be throttled to 1000ms each call
    before(function () {
      sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      waitFn = async () => {
        await sleep(2000);
        return false;
      };
      stub = sinon.stub(App, "executeTabs").callsFake(waitFn);
      stub2 = sinon.stub(App, "getActiveTab").resolves(1);
    });
    beforeEach(function () {
      // increment mocked windowId to prevent interference
      windowId++;
      windowsStub.resolves({ id: windowId });
    });
    after(function () {
      stub.restore();
      stub2.restore();
    });
    afterEach(function () {
      /*try {
        App.finished(windowId);
      } catch (err) {}*/
    });

    it("should cancel upon concurrent call", async function () {
      const p1 = App.handleCommandAction("active");
      const p2 = App.handleCommandAction("active");
      await expect(p1).to.eventually.equal(1); // normal return
      await expect(p2).to.eventually.equal(2); // cancel triggered
    });

    it("should cancel upon delayed call", async function () {
      const p1 = App.handleCommandAction("active");
      await sleep(100);
      const p2 = App.handleCommandAction("active");
      await sleep(100);
      expect(App.isCancelled(windowId)).to.be.true;
      await expect(p1).to.eventually.equal(1); // normal return
      await expect(p2).to.eventually.equal(2); // cancel triggered
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
