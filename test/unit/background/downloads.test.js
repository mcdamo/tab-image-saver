"use strict";
/* globals expect */
import Downloads from "background/downloads";
import Constants from "background/constants";

describe("downloads.js", function () {
  const downloadMethod = Constants.DOWNLOAD_METHOD.FETCH; // background fetch
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
    let { context, delta, dlok, downloads, stubSearch } = {};
    before(function () {
      delta = { id: 1, state: { current: "completed" } };
      dlok = { id: 1, state: "complete", fileSize: 1, mime: "image/jpeg" };
      downloads = browser.downloads;
      stubSearch = sinon.stub().resolves([]);
      browser.downloads = {
        search: stubSearch,
      };
      context = {
        then: sinon.stub(),
        error: sinon.stub(),
      };
    });
    afterEach(function () {
      context.then.resetHistory();
      context.error.resetHistory();
    });
    after(function () {
      browser.downloads = downloads;
    });
    it("should call downloads 'then' callback when complete", async function () {
      const dl = dlok;
      stubSearch.withArgs({ id: dl.id }).resolves([dl]);
      Downloads.addDownload(dl.id, context);
      await Downloads.downloadEnded(delta);
      expect(context.then).to.be.calledOnce;
    });
    it("should call downloads 'then' callback only once", async function () {
      const dl = dlok;
      stubSearch.withArgs({ id: dl.id }).resolves([dl]);
      Downloads.addDownload(dl.id, context);
      await Downloads.downloadEnded(dl);
      await Downloads.downloadEnded(dl); // multiple ended triggers
      expect(context.then).to.be.calledOnce;
    });
    it("should call downloads 'error' callback when failed", async function () {
      let dl = dlok;
      dl.state = "failed";
      stubSearch.withArgs({ id: dl.id }).resolves([dl]);
      Downloads.addDownload(dl.id, context);
      await Downloads.downloadEnded(dl);
      expect(context.error).to.be.calledOnce;
    });
    it("should call downloads 'error' callback when size=0", async function () {
      let dl = dlok;
      dl.fileSize = "0";
      stubSearch.withArgs({ id: dl.id }).resolves([dl]);
      Downloads.addDownload(dl.id, context);
      await Downloads.downloadEnded(dl);
      expect(context.error).to.be.calledOnce;
    });
    it("should call downloads 'error' callback when mime=text/html", async function () {
      let dl = dlok;
      dl.mime = "text/html";
      stubSearch.withArgs({ id: dl.id }).resolves([dl]);
      Downloads.addDownload(dl.id, context);
      await Downloads.downloadEnded(dl);
      expect(context.error).to.be.calledOnce;
    });
    it("should resolve if no context.then function", async function () {
      let dl = dlok;
      stubSearch.withArgs({ id: dl.id }).resolves([dl]);
      Downloads.addDownload(dl.id, {});
      expect(Downloads.downloadEnded(dl)).to.eventually.be.fulfilled; // resolved
    });
    it("should resolve if no context.error function", async function () {
      let dl = dlok;
      dl.state = "failed";
      stubSearch.withArgs({ id: dl.id }).resolves([dl]);
      Downloads.addDownload(dl.id, {});
      expect(Downloads.downloadEnded(dl)).to.eventually.be.fulfilled; // resolved
    });
  });

  describe("handleDownloadChanged", function () {
    let { downloads, stubEnded, stubSearch, delta } = {};
    before(function () {
      downloads = browser.downloads;
      stubSearch = sinon.stub().resolves([]);
      browser.downloads = {
        search: stubSearch,
      };
      delta = {
        id: 42,
        state: { current: "completed" },
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
      await Downloads.handleDownloadChanged(delta);
      expect(stubEnded).to.be.calledOnceWith(delta);
    });
    it("should not call for in_progress download", async function () {
      await Downloads.handleDownloadChanged({
        id: 43,
        state: { current: "in_progress" },
      });
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
    } = {};
    before(function () {
      tabsOrig = browser.tabs;
      stubDownload = sinon.stub(Downloads, "saveDownload").resolves(true);
      stubError = sinon.stub();
      responseOk = new window.Response("", { status: 200 });
      responseFail = new window.Response("", { status: 400 });
      server = sinon.stub(window, "fetch");
    });
    beforeEach(function () {
      stubDownload.resetHistory();
      stubError.resetHistory();
    });
    after(function () {
      browser.tabs = tabsOrig;
      server.restore();
      stubDownload.restore();
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

  describe("fetchHeaders + getHeaderFilename", function () {
    let { tabsOrig, headers, server, url } = {};
    before(function () {
      headers = {
        "Content-Type": "image/jpeg",
        "Content-Disposition": "filename=file%20name.ext;",
      };
      url = "/test";
      tabsOrig = browser.tabs;
      server = sinon.stub(window, "fetch");
    });
    beforeEach(function () {
      server.resolves(
        new window.Response("", {
          status: 200,
          headers,
        })
      );
    });
    after(function () {
      browser.tabs = tabsOrig;
      server.restore();
    });

    describe("fetchHeaders", function () {
      it("should return the requested headers", async function () {
        let p = Downloads.fetchHeaders(url, Object.keys(headers), {
          tabId: 1,
          downloadMethod,
        });
        await expect(p).to.eventually.become(headers);
      });
      it("should throw if server error", async function () {
        server.resolves(
          new window.Response("", {
            status: 400,
            headers,
          })
        );
        let p = Downloads.fetchHeaders(url, Object.keys(headers), {
          downloadMethod,
        });
        await expect(p).to.eventually.be.rejected;
      });
      // // fetchHeaders now re-throws exceptions
      // it("should cleanly handle fetch exception", async () => {
      //   server.returns(Promise.reject());
      //   var p = Utils.fetchHeaders(url, Object.keys(headers));
      //   await expect(p).to.eventually.become(false);
      // });
    });

    describe("getHeaderFilename", function () {
      it("should return jpg headers", async function () {
        let p = Downloads.getHeaderFilename(url, { downloadMethod });
        //expect(requests.length).to.equal(1);
        //requests[0].respond(200, headers, "");
        await expect(p).to.eventually.become({
          filename: "file name.ext",
          mimeExt: "jpg",
        });
      });
      it("should return gif headers", async function () {
        server.resolves(
          new window.Response("", {
            status: 200,
            headers: { "Content-Type": "image/gif" },
          })
        );
        let p = Downloads.getHeaderFilename(url, { downloadMethod });
        //expect(requests.length).to.equal(1);
        //requests[0].respond(200, headers, "");
        await expect(p).to.eventually.become({ mimeExt: "gif" });
      });
      it("should return png headers", async function () {
        server.resolves(
          new window.Response("", {
            status: 200,
            headers: { "Content-Type": "image/png" },
          })
        );
        let p = Downloads.getHeaderFilename(url, { downloadMethod });
        //expect(requests.length).to.equal(1);
        //requests[0].respond(200, headers, "");
        await expect(p).to.eventually.become({ mimeExt: "png" });
      });
      it("should return svg headers", async function () {
        server.resolves(
          new window.Response("", {
            status: 200,
            headers: { "Content-Type": "image/svg+xml" },
          })
        );
        let p = Downloads.getHeaderFilename(url, { downloadMethod });
        //expect(requests.length).to.equal(1);
        //requests[0].respond(200, headers, "");
        await expect(p).to.eventually.become({ mimeExt: "svg" });
      });
      it("should handle quotes in filename", async function () {
        server.resolves(
          new window.Response("", {
            status: 200,
            headers: {
              "Content-Disposition": 'filename="new%20file.jpg"; filename*=',
            },
          })
        );
        let p = Downloads.getHeaderFilename(url, { downloadMethod });
        //expect(requests.length).to.equal(1);
        //requests[0].respond(200, headers, "");
        await expect(p).to.eventually.become({ filename: "new file.jpg" });
      });
      it("should handle RFC 5987 filename", async function () {
        server.resolves(
          new window.Response("", {
            status: 200,
            headers: {
              "Content-Disposition":
                "filename=\"new%20file.jpg\"; filename*=UTF-8''%E3%82%8B%E3%82%8A.jpg",
            },
          })
        );
        let p = Downloads.getHeaderFilename(url, { downloadMethod });
        //expect(requests.length).to.equal(1);
        //requests[0].respond(200, headers, "");
        await expect(p).to.eventually.become({ filename: "るり.jpg" });
      });
    });
  });
});
