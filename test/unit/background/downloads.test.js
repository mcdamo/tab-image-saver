"use strict";
import {Downloads} from 'background/downloads';

describe("downloads.js", () => {
  describe("addDownload & getDownload & removeDownload", () => {
    it("should add download to map", () => {
      var dl = {id:42,context:"value"};
      expect(Downloads.getDownload(dl.id)).to.equal(undefined);
      Downloads.addDownload(dl.id, dl);
      expect(Downloads.getDownload(dl.id)).to.deep.equal(dl);
      Downloads.removeDownload(dl.id);
      expect(Downloads.getDownload(dl.id)).to.equal(undefined);
    });
  });

  describe("downloadsHaveProp", () => {
    var dl;
    before(() => {
      dl = {id:42,context:"value"};
      Downloads.addDownload(dl.id, dl);
    });
    after(() => {
      Downloads.removeDownload(dl.id);
    });
    it("should return true when at least one download has property=value", () => {
      expect(Downloads.downloadsHaveProp("context", "value")).to.equal(true);
    });
    it("should return false when no download has property=value", () => {
      expect(Downloads.downloadsHaveProp("context", "no")).to.equal(false);
      expect(Downloads.downloadsHaveProp("id", "value")).to.equal(false);
    });
  });

  describe("hasTabDownloads", () => {
    // TODO
  });

  describe("hasWindowDownloads", () => {
    // TODO
  });

  describe("downloadEnded", () => {
    var dlok, context;
    before(() => {
      dlok = {id:1,state: "complete",fileSize: 1,mime: "image/jpeg"};
      context = {
        then: sinon.stub(),
        error: sinon.stub(),
      };
    });
    afterEach(() => {
      context.then.resetHistory();
      context.error.resetHistory();
    });
    it("should call downloads 'then' callback when complete", async () => {
      var dl = dlok;
      Downloads.addDownload(dl.id, context);
      await Downloads.downloadEnded(dl);
      expect(context.then).to.be.calledOnce;
    });
    it("should call downloads 'error' callback when failed", async () => {
      var dl = dlok;
      dl.state = "failed";
      Downloads.addDownload(dl.id, context);
      await Downloads.downloadEnded(dl);
      expect(context.error).to.be.calledOnce;
    });
    it("should call downloads 'error' callback when size=0", async () => {
      var dl = dlok;
      dl.fileSize = "0";
      Downloads.addDownload(dl.id, context);
      await Downloads.downloadEnded(dl);
      expect(context.error).to.be.calledOnce;
    });
    it("should call downloads 'error' callback when mime=text/html", async () => {
      var dl = dlok;
      dl.mime = "text/html";
      Downloads.addDownload(dl.id, context);
      await Downloads.downloadEnded(dl);
      expect(context.error).to.be.calledOnce;
    });
  });

  describe("handleDownloadChanged", () => {
    // TODO
  });

  describe("removeWindowDownloads", () => {
    // TODO
  });

  describe("cancelWindowDownloads", () => {
    // TODO
  });

  describe("fetchDownload", () => {
    // TODO
  });

  describe("saveDownload", () => {
    // TODO
  });

});
