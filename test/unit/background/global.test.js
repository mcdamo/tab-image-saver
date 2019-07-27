"use strict";
import {Global} from 'background/global';

describe("global.js", () => {
  describe("allPromises", () => {
    var stub, stub2, pAll;
    before(() => {
      var p1 = new Promise(async (resolve) => { await Global.sleep(500); resolve({answer:42});});
      var p2 = new Promise((resolve) => { throw new Error("reject"); });
      pAll = [ p1, p2 ];
    });
    it("should resolve all promises even if some reject", async () => {
      var allThen = sinon.stub();
      await Global.allPromises(
        pAll,
        allThen,//console.log("Resolved:",resolved),
        (errors) => null,//console.error("Errors:",errors),
        (reject) => false,//console.warn("Rejected:",reject),
      );
      expect(allThen).to.be.calledOnceWith([{answer:42},false]);
    });
  });

  describe("sleep", () => {
    it("should sleep for duration", async () => {
      var start = new Date();
      await expect(Global.sleep(1000)).to.eventually.be.fulfilled; // resolved
      var dur = new Date() - start;
      expect(dur).to.be.at.least(900);
    });
  });

  describe("sleepCallback", () => {
    it("should return false and return early when callback false", async () => {
      var start = new Date();
      await expect(Global.sleepCallback(2000, () => true)).to.eventually.become(false);
      var dur = new Date() - start;
      expect(dur).to.be.at.least(400).and.at.most(1600);
    });

    it("should return true after sleep", async () => {
      var start = new Date();
      await expect(Global.sleepCallback(1500, () => false)).to.eventually.become(true);
      var dur = new Date() - start;
      expect(dur).to.be.at.least(1500);
    });

  });

  describe("parseURL", () => {
    it("should return object with URL parts", () => {
      const obj = {
        protocol: "http:",
        host:     "example.com",
        hostname: "example.com",
        pathname: "/path/to/file.ext",
      };
      expect(Global.parseURL("http://example.com/path/to/file.ext?query#hash"))
        .to.deep.include(obj);
    });
  });

  describe("pathJoin", () => {
    it("should join paths", () => {
      expect(Global.pathJoin(["a","b","c"])).to.equal("a/b/c");
    });
  });
  
  describe("getBasename", () => {
    it("should return filename", () => {
      expect(Global.getBasename("/path/to/file.ext:large")).to.equal("file.ext:large");
    });
  });

  describe("getFilename", () => {
    it("should return filename and remove any twitter-style tags", () => {
      expect(Global.getFilename("/path/to/file.ext:large")).to.equal("file.ext");
    });
  });

  describe("getFilePart", () => {
    it("should return filename without extension", () => {
      expect(Global.getFilePart("/path/to/file.ext:large")).to.equal("file");
    });
  });

  describe("getFileExt", () => {
    it("should return filename extension", () => {
      expect(Global.getFileExt("/path/to/file.ext:large")).to.equal(".ext");
    });
    it("should return empty string if no extension", () => {
      expect(Global.getFileExt("/path/to/file:large")).to.equal("");
    });
  });

  describe("getDirname", () => {
    it("should return path without leading or trailing slashes", () => {
      expect(Global.getDirname("/path/to/file.ext:large")).to.equal("path/to");
    });
  });

  describe("sanitizeFilename", () => {
    it("should strip invalid characters from filename", () => {
      expect(Global.sanitizeFilename("f/i\\l*e\"n:a<m>e|?.jpg")).to.equal("f_i_l_e_n_a_m_e__.jpg");
    });
  });

  describe("sanitizePath", () => {
    it("should replace backslashes with forward slashes", () => {
      expect(Global.sanitizePath("p\\a\\t\\h")).to.equal("p/a/t/h");
    });

    it("should strip leading and trailing slashes", () => {
      expect(Global.sanitizePath("/path/")).to.equal("path");
    });

    it("should reduce duplicate slashes", () => {
      expect(Global.sanitizePath("pa//th")).to.equal("pa/th");
    });
  });

  describe("isValidPath", () => {
    it("should return false for empty string", () => {
      var paths = [
        undefined,
        null,
        "",
      ];
      for (var test of paths) {
        expect(Global.isValidPath(test), test).to.equal(false);
      }
    });

    it("should return false for invalid characters", () => {
      var chars = "*\":<>|?";
      for (const c of chars) {
        const test = `file${c}.ext`;
        expect(Global.isValidPath(test), test).to.equal(false);
      }
    });

    it("should return false for invalid path", () => {
      var paths = [
        ".file.ext", // leading period
        "file.ext.", // trailing period
        "/", // leading slash
        "/path/", // leading slash
        "path/", // no filename
      ];
      for (var test of paths) {
        expect(Global.isValidPath(test), test).to.equal(false); 
      }
    });

    it("should return true for valid paths", () => {
      var paths = [
        "file.ext",
        "path",
        "path/to/file",
      ];
      for (var test of paths) {
        expect(Global.isValidPath(test), test).to.equal(true); 
      }
    });

  });

  describe("isValidFilename", () => {
    it("should return false for empty string", () => {
      var paths = [
        undefined,
        null,
        "",
      ];
      for (var test of paths) {
        expect(Global.isValidFilename(test), test).to.equal(false);
      }
    });

    it("should return false for invalid characters", () => {
      var chars = "*\":<>|?";
      for (const c of chars) {
        const test = `file${c}.ext`;
        expect(Global.isValidFilename(test), test).to.equal(false);
      }
    });

    it("should return false for invalid filename", () => {
      var paths = [
        "file", // no extension
        "...", // dots
        ".file.ext", // leading period
        "file.ext.", // trailing period
        "/", // leading slash
        "path/", // no filename
        "path/name", // path with no extension
      ];
      for (var test of paths) {
        expect(Global.isValidFilename(test), test).to.equal(false); 
      }
    });

    it("should return true for valid filenames", () => {
      var paths = [
        "file.ext",
        "path/to/file.ext",
      ];
      for (var test of paths) {
        expect(Global.isValidFilename(test), test).to.equal(true); 
      }
    });
  });
  
  describe("templateCode", () => {
    it("should return input if code undefined", () => {
      expect(Global.templateCode("input")).to.equal("input");
    });
    it("should return input if code invalid", () => {
      expect(Global.templateCode("input", '""'), "undefined code").to.equal("input");
      expect(Global.templateCode("input", '"/invalid//"'), "invalid action").to.equal("input");
    });
    it("should replace with regexp", () => {
      expect(Global.templateCode('the cat', '"/replace/([a-z]+)/_$1_/g"')).to.equal("_the_ _cat_");
    });
  });

  describe("template", () => {
    it("should replace all variables", () => {
      expect(Global.template("<var1><var2>", {var1: "x", var2: "y"})).to.equal("xy");
    });
    it("should replace variables using lower-case naming", () => {
      expect(Global.template("<VarA>", {vara: "x", VarA: "y"})).to.equal("x");
    });
    it("should replace conditional variable", () => {
      expect(Global.template("<var1|var2>", {var1: "", var2: "y"})).to.equal("y");
    });
    it("should replace conditional variables in order", () => {
      expect(Global.template("<var1|var2|var3>", {var1: "x", var2: "y", var3: "z"})).to.equal("x");
      expect(Global.template("<var1|var2|var3>", {var1: "", var2: "y", var3: "z"})).to.equal("y");
      expect(Global.template("<var1|var2|var3>", {var1: "", var2: "", var3: "z"})).to.equal("z");
    });
    it("should replace conditional constant", () => {
      expect(Global.template("<var1|.ext>", {var1: ""})).to.equal(".ext");
    });
    it("should zero-pad number", () => {
      expect(Global.template("<####var1>", {var1: "42"})).to.equal("0042");
    });
    it("should handle undefined variables", () => {
      expect(Global.template("<var1>,<var2>", {var1:undefined, var2:undefined}), "var1,var2").to.equal(",");
      expect(Global.template("<var1|var2>", {var1: undefined, var2: undefined}), "var1|var2").to.equal("");
    });
    it("should replace outer regex", () => {
      expect(Global.template('<var1|var2>"/replace/\\s*\\|.*//"', {var1: "", var2: "title | site"})).to.equal("title");
    });
    it("should replace inner regex", () => {
      expect(Global.template('<var1"/replace/.*/"|var2"/replace/([a-z]+)/_$1_/g">', {var1: "", var2: "title | site"})).to.equal("_title_ | _site_");
    });
    it("should replace inner regex with escaped quotation marks", () => {
      expect(Global.template('<var1|var2"/replace/\\"([a-z]+)\\"/_$1_/g">', {var1: "", var2: '"title" | "site"'})).to.equal("_title_ | _site_");
    });
    it("should replace inner & outer regex", () => {
      expect(Global.template('<var1|var2"/replace/([a-z]+)/_$1_/g">"/replace/\\s*\\|.*//"', {var1: "", var2: "title | site"})).to.equal("_title_");
    });
  });

  describe("getHeaders + getHeaderFilename", () => {
    var headers, server, url;
    before(() => {
      headers = {
        "Content-Type": "image/jpeg",
        "Content-Disposition": "filename=file%20name.ext;",
      };
      url = "/test";
      server = sinon.stub(window, "fetch");
    });
    beforeEach(() => {
      server.returns(Promise.resolve(new window.Response(
        "", {
          status: 200,
          headers,
      })));
    });
    after(() => {
      server.restore();
    });

    describe("getHeaders", () => {
      it("should return the requested headers", async () => {
        var p = Global.getHeaders(url, Object.keys(headers));
        await expect(p).to.eventually.become(headers);
      });
      it("should return false if server error", async () => {
        server.returns(Promise.resolve(new window.Response(
          "", {
            status: 400,
            headers,
        })));
        var p = Global.getHeaders(url, Object.keys(headers));
        await expect(p).to.eventually.become(false);
      });
      it("should cleanly handle fetch exception", async () => {
        server.returns(Promise.reject());
        var p = Global.getHeaders(url, Object.keys(headers));
        await expect(p).to.eventually.become(false);
      });
    });

    describe("getHeaderFilename", () => {
      it("should return jpg headers", async () => {
        var p = Global.getHeaderFilename(url);
        //expect(requests.length).to.equal(1);
        //requests[0].respond(200, headers, "");
        await expect(p).to.eventually.become({filename: "file name.ext", mimeExt: ".jpg"});
      });
      it("should return gif headers", async () => {
        server.returns(Promise.resolve(new window.Response(
          "", {
            status: 200,
            headers: {"Content-Type": "image/gif"},
        })));
        var p = Global.getHeaderFilename(url);
        //expect(requests.length).to.equal(1);
        //requests[0].respond(200, headers, "");
        await expect(p).to.eventually.become({mimeExt: ".gif"});
      });
      it("should return png headers", async () => {
        server.returns(Promise.resolve(new window.Response(
          "", {
            status: 200,
            headers: {"Content-Type": "image/png"},
        })));
        var p = Global.getHeaderFilename(url);
        //expect(requests.length).to.equal(1);
        //requests[0].respond(200, headers, "");
        await expect(p).to.eventually.become({mimeExt: ".png"});
      });
      it("should return svg headers", async () => {
        server.returns(Promise.resolve(new window.Response(
          "", {
            status: 200,
            headers: {"Content-Type": "image/svg+xml"},
        })));
        var p = Global.getHeaderFilename(url);
        //expect(requests.length).to.equal(1);
        //requests[0].respond(200, headers, "");
        await expect(p).to.eventually.become({mimeExt: ".svg"});
      });
      it("should handle quotes in filename", async () => {
        server.returns(Promise.resolve(new window.Response(
          "", {
            status: 200,
            headers: {"Content-Disposition": "filename=\"new%20file.jpg\"; filename*="},
        })));
        var p = Global.getHeaderFilename(url);
        //expect(requests.length).to.equal(1);
        //requests[0].respond(200, headers, "");
        await expect(p).to.eventually.become({filename: "new file.jpg"});
      });
      it("should handle RFC 5987 filename", async () => {
        server.returns(Promise.resolve(new window.Response(
          "", {
            status: 200,
            headers: {"Content-Disposition": "filename=\"new%20file.jpg\"; filename*=UTF-8''%E3%82%8B%E3%82%8A.jpg"},
        })));
        var p = Global.getHeaderFilename(url);
        //expect(requests.length).to.equal(1);
        //requests[0].respond(200, headers, "");
        await expect(p).to.eventually.become({filename: "るり.jpg"});
      });


    });

  });


});
