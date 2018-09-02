"use strict";

describe("global.js", () => {
  describe("sleep", () => {
    // TODO
  });

  describe("parseURL", () => {
    // TODO
  });

  describe("allPromises", () => {
    // TODO
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

  describe("pathJoin", () => {
    it("should join paths", () => {
      expect(Global.pathJoin(["a","b","c"])).to.equal("a/b/c");
    });
  });

  describe("isValidFilename", () => {
    it("should return false for empty filename", () => {
      expect(Global.isValidFilename("")).to.equal(false);
    });

    it("should return false for invalid characters", () => {
      var chars = "*\"/\\:<>|?";
      for (const c of chars) {
        expect(Global.isValidFilename(c), `Char ${c}`).to.equal(false);
      }
    });

    it("should return true for valid filename", () => {
      expect(Global.isValidFilename("image.jpg")).to.equal(true);
    });

  });

  describe("getHeaderFilename", () => {
    // TODO
  });

});
