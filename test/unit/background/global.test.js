"use strict";
/* globals expect */
import Global from "background/global";

describe("global.js", function () {
  describe("allPromises", function () {
    let { pAll, stub, stub2 } = {};
    before(function () {
      let p1 = new Promise(async (resolve) => {
        await Global.sleep(500);
        resolve({ answer: 42 });
      });
      let p2 = new Promise((resolve) => {
        throw new Error("reject");
      });
      pAll = [p1, p2];
    });
    it("should resolve all promises even if some reject", async function () {
      let allThen = sinon.stub();
      await Global.allPromises(
        pAll,
        allThen, //console.log("Resolved:",resolved),
        (errors) => null, //console.error("Errors:",errors),
        (reject) => false //console.warn("Rejected:",reject),
      );
      expect(allThen).to.be.calledOnceWith([{ answer: 42 }, false]);
    });
  });

  describe("sleep", function () {
    it("should sleep for duration", async function () {
      let start = new Date();
      await expect(Global.sleep(1000)).to.eventually.be.fulfilled; // resolved
      let dur = new Date() - start;
      expect(dur).to.be.at.least(900);
    });
  });

  describe("sleepCallback", function () {
    it("should return false and return early when callback false", async function () {
      let start = new Date();
      await expect(Global.sleepCallback(2000, () => true)).to.eventually.become(
        false
      );
      let dur = new Date() - start;
      expect(dur).to.be.at.least(400).and.at.most(1600);
    });

    it("should return true after sleep", async function () {
      let start = new Date();
      await expect(
        Global.sleepCallback(1500, () => false)
      ).to.eventually.become(true);
      let dur = new Date() - start;
      expect(dur).to.be.at.least(1500);
    });
  });

  describe("parseURL", function () {
    it("should return object with URL parts", function () {
      const obj = {
        protocol: "http:",
        host: "example.com",
        hostname: "example.com",
        pathname: "/path/to/file.ext",
      };
      expect(
        Global.parseURL("http://example.com/path/to/file.ext?query#hash")
      ).to.deep.include(obj);
    });
  });

  describe("pathJoin", function () {
    it("should join paths", function () {
      expect(Global.pathJoin(["a", "b", "c"])).to.equal("a/b/c");
    });
  });

  describe("getBasename", function () {
    it("should return filename", function () {
      expect(Global.getBasename("/path/to/file.ext:large")).to.equal(
        "file.ext:large"
      );
    });
  });

  describe("getFilename", function () {
    it("should return filename and remove any twitter-style tags", function () {
      expect(Global.getFilename("/path/to/file.ext:large")).to.equal(
        "file.ext"
      );
    });
  });

  describe("getFilePart", function () {
    it("should return filename without extension", function () {
      expect(Global.getFilePart("/path/to/file.ext:large")).to.equal("file");
    });
  });

  describe("getFileExt", function () {
    it("should return filename extension", function () {
      expect(Global.getFileExt("/path/to/file.ext:large")).to.equal("ext");
    });
    it("should return empty string if no extension", function () {
      expect(Global.getFileExt("/path/to/file:large")).to.equal("");
    });
  });

  describe("getDirname", function () {
    it("should return path without leading or trailing slashes", function () {
      expect(Global.getDirname("/path/to/file.ext:large")).to.equal("path/to");
    });
  });

  describe("sanitizeFilename", function () {
    it("should strip invalid characters from filename", function () {
      expect(Global.sanitizeFilename('f/i\\l*e"n:a<m>e|?.jpg')).to.equal(
        "f_i_l_e_n_a_m_e__.jpg"
      );
    });
    it("should remove leading and trailing spaces", function () {
      expect(Global.sanitizeFilename(" filename.jpg ")).to.equal(
        "filename.jpg"
      );
    });
  });

  describe("sanitizePath", function () {
    it("should replace backslashes with forward slashes", function () {
      expect(Global.sanitizePath("p\\a\\t\\h")).to.equal("p/a/t/h");
    });

    it("should strip leading and trailing slashes", function () {
      expect(Global.sanitizePath("/path/")).to.equal("path");
    });

    it("should remove spaces around slashes", function () {
      expect(Global.sanitizePath("pa / th")).to.equal("pa/th");
    });

    it("should reduce duplicate slashes", function () {
      expect(Global.sanitizePath("pa//th")).to.equal("pa/th");
    });
  });

  describe("isValidPath", function () {
    it("should return false for empty string", function () {
      let paths = [undefined, null, ""];
      for (let test of paths) {
        expect(Global.isValidPath(test), test).to.equal(false);
      }
    });

    it("should return false for invalid characters", function () {
      let chars = '*":<>|?';
      for (const c of chars) {
        const test = `file${c}.ext`;
        expect(Global.isValidPath(test), test).to.equal(false);
      }
    });

    it("should return false for invalid path", function () {
      let paths = [
        ".file.ext", // leading period
        "file.ext.", // trailing period
        "/", // leading slash
        "/path/", // leading slash
        "path/", // no filename
        "path /", // no spaces around slashes (firefox requirement)
      ];
      for (let test of paths) {
        expect(Global.isValidPath(test), test).to.equal(false);
      }
    });

    it("should return true for valid paths", function () {
      let paths = ["file.ext", "path", "path/to/file"];
      for (let test of paths) {
        expect(Global.isValidPath(test), test).to.equal(true);
      }
    });
  });

  describe("isValidFilename", function () {
    it("should return false for empty string", function () {
      let paths = [undefined, null, ""];
      for (let test of paths) {
        expect(Global.isValidFilename(test), test).to.equal(false);
      }
    });

    it("should return false for invalid characters", function () {
      let chars = '*":<>|?';
      for (const c of chars) {
        const test = `file${c}.ext`;
        expect(Global.isValidFilename(test), test).to.equal(false);
      }
    });

    it("should return false for invalid filename", function () {
      let paths = [
        "file", // no extension
        "...", // dots
        ".file.ext", // leading period
        "file.ext.", // trailing period
        "/", // leading slash
        "path/", // no filename
        "path/name", // path with no extension
        " space", // no leading spaces
        "space ", // no trailing spaces
      ];
      for (let test of paths) {
        expect(Global.isValidFilename(test), test).to.equal(false);
      }
    });

    it("should return true for valid filenames", function () {
      let paths = ["file.ext", "path/to/file.ext"];
      for (let test of paths) {
        expect(Global.isValidFilename(test), test).to.equal(true);
      }
    });
  });

  describe("templateCode", function () {
    it("should return input if code undefined", function () {
      expect(Global.templateCode("input")).to.equal("input");
    });
    it("should return input if code invalid", function () {
      expect(Global.templateCode("input", '""'), "undefined code").to.equal(
        "input"
      );
      expect(
        Global.templateCode("input", '"/invalid//"'),
        "invalid action"
      ).to.equal("input");
    });
    it("should replace with regexp", function () {
      expect(
        Global.templateCode("the cat", '"/replace/([a-z]+)/_$1_/g"')
      ).to.equal("_the_ _cat_");
    });
  });

  describe("template", function () {
    it("should replace all variables", function () {
      expect(
        Global.template("<var1><var2>", { var1: "x", var2: "y" })
      ).to.equal("xy");
    });
    it("should replace variables using lower-case naming", function () {
      expect(Global.template("<VarA>", { vara: "x", VarA: "y" })).to.equal("x");
    });
    it("should replace conditional variable", function () {
      expect(Global.template("<var1|var2>", { var1: "", var2: "y" })).to.equal(
        "y"
      );
    });
    it("should replace conditional variables in order", function () {
      expect(
        Global.template("<var1|var2|var3>", { var1: "x", var2: "y", var3: "z" })
      ).to.equal("x");
      expect(
        Global.template("<var1|var2|var3>", { var1: "", var2: "y", var3: "z" })
      ).to.equal("y");
      expect(
        Global.template("<var1|var2|var3>", { var1: "", var2: "", var3: "z" })
      ).to.equal("z");
    });
    it("should replace conditional constant", function () {
      expect(Global.template("<var1|.ext>", { var1: "" })).to.equal(".ext");
    });
    it("should zero-pad number", function () {
      expect(Global.template("<####var1>", { var1: "42" })).to.equal("0042");
    });
    it("should handle undefined variables", function () {
      expect(
        Global.template("<var1>,<var2>", { var1: undefined, var2: undefined }),
        "var1,var2"
      ).to.equal(",");
      expect(
        Global.template("<var1|var2>", { var1: undefined, var2: undefined }),
        "var1|var2"
      ).to.equal("");
    });
    it("should replace outer regex", function () {
      expect(
        Global.template('<var1|var2>"/replace/\\s*\\|.*//"', {
          var1: "",
          var2: "title | site",
        })
      ).to.equal("title");
    });
    it("should replace inner regex", function () {
      expect(
        Global.template('<var1"/replace/.*/"|var2"/replace/([a-z]+)/_$1_/g">', {
          var1: "",
          var2: "title | site",
        })
      ).to.equal("_title_ | _site_");
    });
    it("should replace inner regex with escaped quotation marks", function () {
      expect(
        Global.template('<var1|var2"/replace/\\"([a-z]+)\\"/_$1_/g">', {
          var1: "",
          var2: '"title" | "site"',
        })
      ).to.equal("_title_ | _site_");
    });
    it("should replace inner & outer regex", function () {
      expect(
        Global.template(
          '<var1|var2"/replace/([a-z]+)/_$1_/g">"/replace/\\s*\\|.*//"',
          { var1: "", var2: "title | site" }
        )
      ).to.equal("_title_");
    });
  });

  describe("getHeaders + getHeaderFilename", function () {
    let { headers, server, url } = {};
    before(function () {
      headers = {
        "Content-Type": "image/jpeg",
        "Content-Disposition": "filename=file%20name.ext;",
      };
      url = "/test";
      server = sinon.stub(window, "fetch");
    });
    beforeEach(function () {
      server.returns(
        Promise.resolve(
          new window.Response("", {
            status: 200,
            headers,
          })
        )
      );
    });
    after(function () {
      server.restore();
    });

    describe("getHeaders", function () {
      it("should return the requested headers", async function () {
        let p = Global.getHeaders(url, Object.keys(headers));
        await expect(p).to.eventually.become(headers);
      });
      it("should throw if server error", async function () {
        server.returns(
          Promise.resolve(
            new window.Response("", {
              status: 400,
              headers,
            })
          )
        );
        let p = Global.getHeaders(url, Object.keys(headers));
        await expect(p).to.eventually.be.rejected;
      });
      /*
      // getHeaders now re-throws exceptions
      it("should cleanly handle fetch exception", async () => {
        server.returns(Promise.reject());
        var p = Global.getHeaders(url, Object.keys(headers));
        await expect(p).to.eventually.become(false);
      });
      */
    });

    describe("getHeaderFilename", function () {
      it("should return jpg headers", async function () {
        let p = Global.getHeaderFilename(url);
        //expect(requests.length).to.equal(1);
        //requests[0].respond(200, headers, "");
        await expect(p).to.eventually.become({
          filename: "file name.ext",
          mimeExt: "jpg",
        });
      });
      it("should return gif headers", async function () {
        server.returns(
          Promise.resolve(
            new window.Response("", {
              status: 200,
              headers: { "Content-Type": "image/gif" },
            })
          )
        );
        let p = Global.getHeaderFilename(url);
        //expect(requests.length).to.equal(1);
        //requests[0].respond(200, headers, "");
        await expect(p).to.eventually.become({ mimeExt: "gif" });
      });
      it("should return png headers", async function () {
        server.returns(
          Promise.resolve(
            new window.Response("", {
              status: 200,
              headers: { "Content-Type": "image/png" },
            })
          )
        );
        let p = Global.getHeaderFilename(url);
        //expect(requests.length).to.equal(1);
        //requests[0].respond(200, headers, "");
        await expect(p).to.eventually.become({ mimeExt: "png" });
      });
      it("should return svg headers", async function () {
        server.returns(
          Promise.resolve(
            new window.Response("", {
              status: 200,
              headers: { "Content-Type": "image/svg+xml" },
            })
          )
        );
        let p = Global.getHeaderFilename(url);
        //expect(requests.length).to.equal(1);
        //requests[0].respond(200, headers, "");
        await expect(p).to.eventually.become({ mimeExt: "svg" });
      });
      it("should handle quotes in filename", async function () {
        server.returns(
          Promise.resolve(
            new window.Response("", {
              status: 200,
              headers: {
                "Content-Disposition": 'filename="new%20file.jpg"; filename*=',
              },
            })
          )
        );
        let p = Global.getHeaderFilename(url);
        //expect(requests.length).to.equal(1);
        //requests[0].respond(200, headers, "");
        await expect(p).to.eventually.become({ filename: "new file.jpg" });
      });
      it("should handle RFC 5987 filename", async function () {
        server.returns(
          Promise.resolve(
            new window.Response("", {
              status: 200,
              headers: {
                "Content-Disposition":
                  "filename=\"new%20file.jpg\"; filename*=UTF-8''%E3%82%8B%E3%82%8A.jpg",
              },
            })
          )
        );
        let p = Global.getHeaderFilename(url);
        //expect(requests.length).to.equal(1);
        //requests[0].respond(200, headers, "");
        await expect(p).to.eventually.become({ filename: "るり.jpg" });
      });
    });
  });

  describe("findNextSequence", function () {
    it("should return zero for an empty array", function () {
      expect(Global.findNextSequence([])).to.equal(0);
    });
    it("should return the next element after array", function () {
      expect(Global.findNextSequence([1, 0])).to.equal(2);
    });
    it("should return the first missing sequence", function () {
      expect(Global.findNextSequence([2, 1])).to.equal(0);
      expect(Global.findNextSequence([42, 0, 2, 1])).to.equal(3);
    });
  });
});
