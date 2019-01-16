"use strict";
import {App, getWindowId} from 'background/background';
//import {ACTION} from 'background/constants';
//import {Global} from 'background/global';
//import {Downloads} from 'background/downloads';

//var Downloads = {};
//Downloads.downloadChangedHandler = sinon.stub();

describe("background.js", () => {
  var windowsStub, windowId;
  before(() => {
    windowId = 1;
    windowsStub = sinon.stub(browser.windows, "getCurrent").resolves({id: windowId});
    browser.windows = {
      getCurrent: windowsStub
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

  describe("getRuntime", () => {
    // TODO
  });

  describe("isFinished", () => {
    // TODO
  });

  describe("isCancelled", () => {
    // TODO
  });

  describe("isRunning", () => {
    // TODO
  });

  describe("isIdle", () => {
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

  describe("setBadgeTextColor", () => {
    // TODO
  });

  describe("setBadgeFinished", () => {
    // TODO
  });

  describe("setBadgeSaving", () => {
    // TODO
  });

  describe("setBadgeStart", () => {
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

  describe("setFinished", () => {
    // TODO
  });

  describe("tabsFinished", () => {
    // TODO
  });

  describe("downloadFinished", () => {
    // TODO
  });

  describe("handleDownloadComplete", () => {
    // TODO
  });

  describe("handleDownloadFailed", () => {
    // TODO
  });

  describe("createFilename", () => {
    var stub;
    before(() => {
      stub = sinon.stub(Global, "getHeaderFilename").resolves({filename: "xhr name.xhrext", mimeExt: ".xm"});
    });

    after(() => {
      stub.restore();
    });

    it("should replace string using template", async () => {
      var tab = {
        id: 6,
        title: "tab title - site name",
        url: "http://my.tab.url/path/to/page.html",
      };
      var img = {
        src: "http://domain.tld/path/part/file.ext?query",
        alt: "alt string",
      };
      var rules = {
        "<alt>.jpg": "alt string.jpg",
        "<name>,<ext>": "file,.ext",
        "<xName>,<xExt>,<xMimeExt>": "xhr name,.xhrext,.xm",
        "<####index>": "0042",
        "<host>": "domain.tld",
        "<hostname>": "domain.tld",
        "<path>": "path/part",
        " <undef> ": "undef", // strip whitespace and treat as literal
        "<tabtitle>": "tab title - site name",
        "<tabhost>,<tabpath>,<tabfile>,<tabext>": "my.tab.url,path/to,page,.html",
      };
      //Object.entries(rules).forEach(async ([test, result]) => {
      for (const test in rules) {
        const result = rules[test];
        await expect(App.createFilename({tab, image: img, index: 42, rules: [test]}), `Rule: ${test}`).to.eventually.become(result);
      };
    });

    it("should return empty string if template doesn't match", async () => {
      var img = {
        src: "http://domain.tld/path/",
      }
      var rules = {
        "<alt>,<name>,<ext>": ",,",
      };
      //Object.entries(rules).forEach(async ([test, result]) => {
      for (const test in rules) {
        const result = rules[test];
        await expect(App.createFilename({tab: {}, image: img, index: 42, rules: [test]}), `Rule: ${test}`).to.eventually.become(result);
      };
    });

    it("should replace invalid characters in path", async () => {
      var tab = {
        id: 6,
        title: "*\":<>|?tab title*\":<>|?",
        //url: "http://my.tab.url/path/to/page.html",
      };
      var img = {
        //src: "http://domain.tld/path/part/file.ext?query",
        alt: "*\":<>|?alt string*\":<>|?",
      };
      var rules = {
        "<alt>.jpg": "_______alt string_______.jpg",
        "<tabtitle>": "_______tab title_______",
      };
      //Object.entries(rules).forEach(async ([test, result]) => {
      for (const test in rules) {
        const result = rules[test];
        await expect(App.createFilename({tab, image: img, index: 42, rules: [test]}), `Rule: ${test}`).to.eventually.become(result);
      };
    });

    it("should decode URI components", async () => {
      var img = {
        src: "http://domain.tld/path%20name/part/file%20name.ext?query",
      }
      var rules = {
        "<name>,<ext>": "file name,.ext",
        "<hostname>": "domain.tld",
        "<path>": "path name/part"
      };
      //Object.entries(rules).forEach(async ([test, result]) => {
      for (const test in rules) {
        const result = rules[test];
        await expect(App.createFilename({tab: {}, image: img, index: 42, rules: [test]}), `Rule: ${test}`).to.eventually.become(result);
      };
    });

    it("should get path from twitter style urls", async () => {
      var img = {
        src: "https://pbs.twimg.com/media/file.ext:large",
      }
      await expect(App.createFilename({tab: {}, image: img, index: 42, rules: ["<name>,<ext>"]})).to.eventually.become("file,.ext");
    });

    it("should return null when filename is not valid", async () => {
      var img = {};
      var rules = [
        "", // empty
        ".", // period only
        ".ext", // extension only
      ];
      for (const test of rules) {
        await expect(App.createFilename({tab: {}, image: img, index: 42, rules: [test]}), `Rule: ${test}`).to.eventually.become(null);
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
      await expect(App.createPath({tab: {}, image: img, index: 0, rules})).to.eventually.become("t/file.ext");
    });
    it("should reject when filename not generated", async () => {
      var rules = [];
      await expect(App.createPath({tab: {}, image: img, index: 0, rules})).to.eventually.be.rejected;
    });
  });

  describe("getActiveDownloadNum", () => {
    // TODO
  });

  describe("createDownloads", () => {
    // TODO
  });

  describe("downloadTab", () => {
    // TODO
  });

  describe("filterImages", () => {
    // TODO
  });

  describe("executeTab", () => {
    // TODO
  });

  describe("executeTabs", () => {
    // TODO
  });

  describe("getWindowTabs", () => {
    // TODO
  });

  describe("checkTabs", () => {
    var getStub, cancelStub, objs, updateStub;
    before(() => {
      objs = [
        {index:1, tab:{id:3, status:"complete", discarded: false}},
        {index:2, tab:{id:1, status:"complete", discarded: false}},
        {index:3, tab:{id:2, url: "http://example.com", status:"complete", discarded: true}},
      ];
      getStub = browser.tabs.get;
      let idx=0;
      getStub.withArgs(objs[idx].tab.id).resolves(objs[idx].tab);
      idx=1;
      getStub.withArgs(objs[idx].tab.id).resolves(objs[idx].tab);
      cancelStub = sinon.stub(App, "isCancelled").returns(false);
      updateStub = browser.tabs.update;
      idx=2;
      updateStub.withArgs(objs[idx].tab.id, {url: objs[idx].tab.url})
        .resolves({id: objs[idx].tab.id, url: objs[idx].tab.url, status: "complete", discarded: false});
    });
    beforeEach(() => {
      updateStub.resetHistory();
    });
    after(() => {
      cancelStub.restore();
      getStub.reset();
      updateStub.reset();
    });
    it("should return object with keys: ready, waiting, sleepMore", async () => {
      var ready = JSON.parse(JSON.stringify(objs));
      ready[2].tab.discarded=false;
      await expect(App.checkTabs({tabs: objs, windowId})).to.eventually.be.an("object")
        .and.to.deep.include({ready:ready,waiting:[]});
      expect(updateStub).to.be.calledOnce;
    });
    it("should ignore discarded tab when option is set", async () => {
      var ready = objs.slice(0,2); // remove discarded tab from array
      App.options.ignoreDiscardedTab = true;
      await expect(App.checkTabs({tabs: objs, windowId})).to.eventually.be.an("object")
        .and.to.deep.include({ready:ready,waiting:[]});
      expect(updateStub).to.be.not.be.called;
    });
  });

  describe("waitForTabs", () => {
    var getStub, cancelStub, tabs, tabIds, tabsMap;
    before(() => {
      tabs = [
        {id:1, status:"-", discarded: false},
        {id:2, status:"loading", discarded: false},
        {id:3, status:"complete", discarded: false},
      ];
      tabIds = tabs.reduce((acc, val) => { acc.push(val.id); return acc; }, [] );
      getStub = browser.tabs.get;
      // resolve in order tab3, tab2, tab1
      let idx = 0;
      getStub.withArgs(tabs[idx].id).onCall(0).resolves(tabs[idx]);
      getStub.withArgs(tabs[idx].id).onCall(1).resolves(tabs[idx]);
      getStub.withArgs(tabs[idx].id).onCall(2).resolves({id:tabs[idx].id, status:"complete"});
      idx = 1;
      getStub.withArgs(tabs[idx].id).onCall(0).resolves(tabs[idx]);
      getStub.withArgs(tabs[idx].id).onCall(1).resolves({id:tabs[idx].id, status:"complete"});
      //browser.tabs.update
      Global.sleepCallback = sinon.stub().resolves(true);
      cancelStub = sinon.stub(App, "isCancelled").returns(false);
    });
    after(() => {
      cancelStub.restore();
      getStub.reset();
      //Global.sleepCallback.restore();
    });
    it("should return tabs in same order as provided", async () => {
      var readyTabs = await App.waitForTabs({tabs, windowId});
      expect(readyTabs).to.be.an("array");
      var readyTabIds = readyTabs.reduce((acc, val) => { acc.push(val.id); return acc; }, [] );
      expect(tabIds).to.deep.equal(readyTabIds);
    });
    // TODO it should return early if cancelled
  });

  describe("waitAndExecuteTabs", () => {
    // TODO
  });

  describe("filterTabs", () => {
    const tabs = [
      {id:0, url:"https://x"},
      {id:1, url:"ftps://x"},
      {id:2, url:""},
      {id:3, url:"about://x"},
      {id:4, url:"http://x"},
      {id:5, url:"ftp://x"},
    ];
    it("should return all tabs with urls", () => {
      var mytabs = [ tabs[0], tabs[1], tabs[4], tabs[5] ];
      expect(App.filterTabs({tabs, windowId})).to.deep.equal(mytabs);
    });
  });

  describe("selectTabs", () => {
    var stub, tabs;
    const ctabs = [
      {id:0},
      {id:1},
      {id:2},
      {id:3},
      {id:4},
      {id:5},
    ];
    before(() => {
      stub = sinon.stub(App, "getWindowTabs").resolves(tabs);
    });
    after(() => {
      stub.restore();
    });
    describe("active tab not defined", () => {
      before(() => {
        tabs = JSON.parse(JSON.stringify(ctabs));
      });
      beforeEach(() => {
        stub.resolves(tabs);
      });
      it("should return all tabs", async () => {
        stub.resolves(tabs);
        var mytabs = tabs.slice();
        await expect(App.selectTabs({
          method: ACTION.ALL,
          includeActive: false,
          windowId
        })).to.eventually.become(mytabs);
      });
    });
    describe("active tab 0", () => {
      before(() => {
        tabs = JSON.parse(JSON.stringify(ctabs));
      });
      beforeEach(() => {
        tabs[0].active = true;
        stub.resolves(tabs);
      });
      it("should return no left tabs", async () => {
        var mytabs = [];
        await expect(App.selectTabs({
          method: ACTION.LEFT,
          includeActive: false,
          windowId
        })).to.eventually.become(mytabs);
      });
    });
    describe("active tab 1", () => {
      before(() => {
        tabs = JSON.parse(JSON.stringify(ctabs));
      });
      beforeEach(() => {
        tabs[1].active = true;
        stub.resolves(tabs);
      });
      it("should return right tabs", async () => {
        var mytabs = tabs.slice(2);
        await expect(App.selectTabs({
          method: ACTION.RIGHT,
          includeActive: false,
          windowId
        })).to.eventually.become(mytabs);
      });
      it("should return right tabs + active", async () => {
        var mytabs = tabs.slice(1);
        await expect(App.selectTabs({
          method: ACTION.RIGHT,
          includeActive: true,
          windowId
        })).to.eventually.become(mytabs);
      });
    });
    describe("active tab 4", () => {
      before(() => {
        tabs = JSON.parse(JSON.stringify(ctabs));
      });
      beforeEach(() => {
        tabs[4].active = true;
        stub.resolves(tabs);
      });
      it("should return active tab", async () => {
        var mytabs = tabs.slice(4,5);
        await expect(App.selectTabs({
          method: ACTION.ACTIVE,
          includeActive: false,
          windowId
        })).to.eventually.become(mytabs);
      });
      it("should return left tabs", async () => {
        var mytabs = tabs.slice(0,4);
        await expect(App.selectTabs({
          method: ACTION.LEFT,
          includeActive: false,
          windowId
        })).to.eventually.become(mytabs);
      });
      it("should return left tabs + active", async () => {
        var mytabs = tabs.slice(0,5);
        await expect(App.selectTabs({
          method: ACTION.LEFT,
          includeActive: true,
          windowId
        })).to.eventually.become(mytabs);
      });
    });
    describe("active tab 5", () => {
      before(() => {
        tabs = JSON.parse(JSON.stringify(ctabs));
      });
      beforeEach(() => {
        tabs[5].active = true;
        stub.resolves(tabs);
      });
      it("should return no right tabs", async () => {
        var mytabs = [];
        await expect(App.selectTabs({
          method: ACTION.RIGHT,
          includeActive: false,
          windowId
        })).to.eventually.become(mytabs);
      });
    });
  });

  describe("getActiveTab", () => {
    // TODO
  });

  describe("handleUpdateAvailable", () => {
    var stubIdle;
    before(() => {
      stubIdle = sinon.stub(App, "isIdle");
    });
    afterEach(() => {
      browser.runtime.reload.resetHistory();
    });
    after(() => {
      stubIdle.reset();
    });
    it("should reload app", () => {
      stubIdle.returns(true);
      App.handleUpdateAvailable();
      expect(browser.runtime.reload).to.be.calledOnce;
    });
    it("should set reload flag if busy", () => {
      stubIdle.returns(false);
      App.handleUpdateAvailable();
      expect(App.reload).to.equal(true);
      expect(browser.runtime.reload).to.not.be.called;
    });

  });

  describe("handleInstalled", () => {
    var stubVer, stubInit, stubMf, spyVer;
    before(() => {
      /*stubVer = sinon.stub().resolves();
      Version = {
        update: stubVer,
      };*/
      spyVer = sinon.spy(Version, "update");
      stubInit = sinon.stub(App, "init").resolves();
      stubMf = sinon.stub(App, "loadManifest").resolves({version: "1.x"});
    });
    after(() => {
      //stubVer.reset();
      stubInit.reset();
      stubMf.reset();
      spyVer.resetHistory();
    });
    it("should call update and init", async () => {
      await App.handleInstalled();
      expect(App.loadManifest).to.be.calledOnce;
      expect(Version.update).to.be.calledOnceWith("1.x");
      expect(App.init).to.be.calledOnce;
    });
  });

  describe("init", () => {
    // TODO
  });

  describe("loadManifest", () => {
    // TODO test in functional
  });

  describe("handleStorageChanged", () => {
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

  describe("cancel", () => {
    // TODO
  });

  describe("run", () => {
    var sleep, stub, stub2, waitFn;
    before(() => {
      sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
      waitFn = async () => { await sleep(500); return false; };
      stub = sinon.stub(App, "executeTabs").callsFake(waitFn);
      stub2 = sinon.stub(App, "getActiveTab").resolves(1);
    });
    beforeEach(() => {
      // increment mocked windowId to prevent interference
      windowId++;
      windowsStub.resolves({id:windowId});
    });
    after(() => {
      stub.restore();
      stub2.restore();
    });
    it("should block upon concurrent call", async () => {
      const p1 = App.run(windowId);
      const p2 = App.run(windowId);
      await expect(p1).to.eventually.equal(1); // normal return
      await expect(p2).to.eventually.equal(-1); // blocked
    });
    // TODO should cleanup/call finished
  });

  
  describe("handleBrowserAction", () => {
    var sleep, stub, stub2, waitFn;
    before(() => {
      sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
      waitFn = async () => { await sleep(500); return false; };
      stub = sinon.stub(App, "executeTabs").callsFake(waitFn);
      stub2 = sinon.stub(App, "getActiveTab").resolves(1);
    });
    beforeEach(() => {
      // increment mocked windowId to prevent interference
      windowId++;
      windowsStub.resolves({id:windowId});
    });
    after(() => {
      stub.restore();
      stub2.restore();
    });
    afterEach(() => {
      /*try {
        App.finished(windowId);
      } catch (err) {}*/
    });

    it("should cancel upon concurrent call", async () => {
      const p1 = App.handleBrowserAction();
      const p2 = App.handleBrowserAction();
      await expect(p1).to.eventually.equal(1); // normal return
      await expect(p2).to.eventually.equal(2); // cancel triggered
    });

    it("should cancel upon delayed call", async () => {
      const p1 = App.handleBrowserAction();
      await sleep(100);
      const p2 = App.handleBrowserAction();
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
