"use strict";
/* globals expect */
import Downloads from "background/downloads";

describe("downloads.js", function () {
  describe("addDownload + getDownload + removeDownload", function () {
    it("should add download to map", function () {
      let dl = { id: 42, context: "value" };
      expect(Downloads.getDownload(dl.id)).to.equal(undefined);
      Downloads.addDownload(dl.id, dl);
      expect(Downloads.getDownload(dl.id)).to.deep.equal(dl);
      Downloads.removeDownload(dl.id);
      expect(Downloads.getDownload(dl.id)).to.equal(undefined);
    });
  });

  describe("downloadsHaveProp", function () {
    let dl;
    before(function () {
      dl = { id: 42, context: "value" };
      Downloads.addDownload(dl.id, dl);
    });
    after(function () {
      Downloads.removeDownload(dl.id);
    });
    it("should return true when at least one download has property=value", function () {
      expect(Downloads.downloadsHaveProp("context", "value")).to.equal(true);
    });
    it("should return false when no download has property=value", function () {
      expect(Downloads.downloadsHaveProp("context", "no")).to.equal(false);
      expect(Downloads.downloadsHaveProp("id", "value")).to.equal(false);
    });
  });

  describe("hasTabDownloads", function () {
    let dl;
    before(function () {
      dl = { id: 42, tabId: 5 };
      Downloads.addDownload(dl.id, dl);
    });
    after(function () {
      Downloads.removeDownload(dl.id);
    });
    it("should return true for defined tabId", function () {
      expect(Downloads.hasTabDownloads(5)).to.equal(true);
    });
    it("should return false for other tabId", function () {
      expect(Downloads.hasTabDownloads(6)).to.equal(false);
    });
  });

  describe("hasWindowDownloads", function () {
    let dl;
    before(function () {
      dl = { id: 42, windowId: 5 };
      Downloads.addDownload(dl.id, dl);
    });
    after(function () {
      Downloads.removeDownload(dl.id);
    });
    it("should return true for defined windowId", function () {
      expect(Downloads.hasWindowDownloads(5)).to.equal(true);
    });
    it("should return false for other windowId", function () {
      expect(Downloads.hasWindowDownloads(6)).to.equal(false);
    });
  });

  describe("downloadEnded", function () {
    let { context, dlok } = {};
    before(function () {
      dlok = { id: 1, state: "complete", fileSize: 1, mime: "image/jpeg" };
      context = {
        then: sinon.stub(),
        error: sinon.stub(),
      };
    });
    afterEach(function () {
      context.then.resetHistory();
      context.error.resetHistory();
    });
    it("should call downloads 'then' callback when complete", async function () {
      let dl = JSON.parse(JSON.stringify(dlok)); // clone
      Downloads.addDownload(dl.id, context);
      await Downloads.downloadEnded(dl);
      expect(context.then).to.be.calledOnce;
    });
    it("should call downloads 'then' callback only once", async function () {
      let dl = JSON.parse(JSON.stringify(dlok)); // clone
      Downloads.addDownload(dl.id, context);
      await Downloads.downloadEnded(dl);
      await Downloads.downloadEnded(dl); // multiple ended triggers
      expect(context.then).to.be.calledOnce;
    });
    it("should call downloads 'error' callback when failed", async function () {
      let dl = JSON.parse(JSON.stringify(dlok)); // clone
      dl.state = "failed";
      Downloads.addDownload(dl.id, context);
      await Downloads.downloadEnded(dl);
      expect(context.error).to.be.calledOnce;
    });
    it("should call downloads 'error' callback when size=0", async function () {
      let dl = JSON.parse(JSON.stringify(dlok)); // clone
      dl.fileSize = "0";
      Downloads.addDownload(dl.id, context);
      await Downloads.downloadEnded(dl);
      expect(context.error).to.be.calledOnce;
    });
    it("should call downloads 'error' callback when mime=text/html", async function () {
      let dl = JSON.parse(JSON.stringify(dlok)); // clone
      dl.mime = "text/html";
      Downloads.addDownload(dl.id, context);
      await Downloads.downloadEnded(dl);
      expect(context.error).to.be.calledOnce;
    });
    it("should resolve if no context.then function", async function () {
      let dl = JSON.parse(JSON.stringify(dlok)); // clone
      Downloads.addDownload(dl.id, {});
      expect(Downloads.downloadEnded(dl)).to.eventually.be.fulfilled; // resolved
    });
    it("should resolve if no context.error function", async function () {
      let dl = JSON.parse(JSON.stringify(dlok)); // clone
      dl.state = "failed";
      Downloads.addDownload(dl.id, {});
      expect(Downloads.downloadEnded(dl)).to.eventually.be.fulfilled; // resolved
    });
  });

  describe("handleDownloadChanged", function () {
    let { downloads, stubEnded, stubSearch } = {};
    before(function () {
      downloads = browser.downloads;
      stubSearch = sinon.stub().resolves([]);
      browser.downloads = {
        search: stubSearch,
      };
      stubSearch.withArgs({ id: 42 }).resolves([{ result: 42 }]);
      stubEnded = sinon.stub(Downloads, "downloadEnded");
    });
    beforeEach(function () {
      stubEnded.resetHistory();
    });
    after(function () {
      //stubSearch.restore();
      browser.downloads = downloads;
      stubEnded.restore();
    });
    it("should call ended for defined download", async function () {
      await Downloads.handleDownloadChanged({ id: 42 });
      expect(stubEnded).to.be.calledOnceWith({ result: 42 });
    });
    it("should not call ended for non-defined download", async function () {
      await Downloads.handleDownloadChanged({ id: 43 });
      expect(stubEnded).to.not.be.called;
    });
  });

  describe("removeWindowDownloads", function () {
    let { dl1, dl2, dl3 } = {};
    before(function () {
      dl1 = { id: 41, windowId: 5 };
      Downloads.addDownload(dl1.id, dl1);
      dl2 = { id: 42, windowId: 6 };
      Downloads.addDownload(dl2.id, dl2);
      dl3 = { id: 43, windowId: 5 };
      Downloads.addDownload(dl3.id, dl3);
    });
    it("should remove downloads with windowId", async function () {
      await Downloads.removeWindowDownloads(5);
      expect(Downloads.getDownload(dl1.id)).to.deep.equal(undefined);
      expect(Downloads.getDownload(dl2.id)).to.deep.equal(dl2);
      expect(Downloads.getDownload(dl3.id)).to.deep.equal(undefined);
    });
  });

  describe("cancelWindowDownloads", function () {
    let { dl1, dl2, dl3, downloads, stubCancel } = {};
    before(function () {
      downloads = browser.downloads;
      stubCancel = sinon.stub().resolves();
      browser.downloads = {
        cancel: stubCancel,
      };
      stubCancel.withArgs(42).rejects();
      dl1 = { id: 41, windowId: 5 };
      Downloads.addDownload(dl1.id, dl1);
      dl2 = { id: 42, windowId: 6 };
      Downloads.addDownload(dl2.id, dl2);
      dl3 = { id: 43, windowId: 5 };
      Downloads.addDownload(dl3.id, dl3);
    });
    beforeEach(function () {
      stubCancel.resetHistory();
    });
    after(function () {
      browser.downloads = downloads;
    });
    it("should cancel downloads with windowId 5", async function () {
      await Downloads.cancelWindowDownloads(5);
      expect(stubCancel).to.be.calledTwice;
      expect(stubCancel).to.be.calledWith(41);
      expect(stubCancel).to.be.calledWith(43);
    });
    it("should cancel downloads with windowId 6", async function () {
      await Downloads.cancelWindowDownloads(6);
      expect(stubCancel).to.be.calledOnce;
      expect(stubCancel).to.be.calledWith(42);
    });
  });

  describe("fetchDownload", function () {
    let {
      tabsOrig,
      responseFail,
      responseOk,
      server,
      stubDownload,
      stubError,
      useFetch,
    } = {};
    before(function () {
      tabsOrig = browser.tabs;
      stubDownload = sinon.stub(Downloads, "saveDownload").resolves(true);
      stubError = sinon.stub();
      responseOk = new window.Response("", { status: 200 });
      responseFail = new window.Response("", { status: 400 });
      server = sinon.stub(window, "fetch");
      useFetch = Downloads.useFetch;
      Downloads.useFetch = true;
    });
    beforeEach(function () {
      stubDownload.resetHistory();
      stubError.resetHistory();
    });
    after(function () {
      browser.tabs = tabsOrig;
      server.restore();
      stubDownload.restore();
      Downloads.useFetch = useFetch;
    });
    it("should call saveDownload if ok", async function () {
      server.resolves(responseOk);
      expect(
        await Downloads.fetchDownload({ url: "/test" }, { error: stubError })
      ).to.equal(true);
      expect(stubDownload).to.be.calledOnceWith();
      expect(stubError).to.not.be.called;
    });
    it("should call context.error if fail", async function () {
      server.returns(Promise.resolve(responseFail));
      expect(
        await Downloads.fetchDownload({ url: "/fail" }, { error: stubError })
      ).to.equal(false);
      expect(stubDownload).to.not.be.called;
      expect(stubError).to.be.calledOnce;
    });
    it("should catch fetch exceptions", async function () {
      server.returns(Promise.reject());
      expect(await Downloads.fetchDownload({ url: "/throw" }, {})).to.equal(
        false
      );
      expect(stubDownload).to.not.be.called;
    });
  });

  describe("saveDownload", function () {
    let { downloads, stubDownload, stubError } = {};
    before(function () {
      stubDownload = sinon.stub();
      downloads = browser.downloads;
      browser.downloads = {
        download: stubDownload,
      };
      stubError = sinon.stub();
    });
    beforeEach(function () {
      stubError.resetHistory();
    });
    after(function () {
      //stubDownload.restore();
      browser.downloads = downloads;
    });
    it("should call download and return id", async function () {
      stubDownload.resolves(5);
      expect(
        await Downloads.saveDownload({ url: "/test" }, { error: stubError })
      ).to.equal(5);
      expect(stubError).to.not.be.called;
    });
    it("should call context.error", async function () {
      stubDownload.rejects();
      expect(
        await Downloads.saveDownload({ url: "/fail" }, { error: stubError })
      ).to.equal(false);
      expect(stubError).to.be.calledOnce;
    });
    it("should return cleanly if no context", async function () {
      stubDownload.rejects();
      expect(await Downloads.saveDownload({ url: "/fail" }, {})).to.equal(
        false
      );
    });
  });
});
