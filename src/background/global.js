// independent functions
import Expressions from "./expressions";

const Global = {
  // wait for all promises to resolve
  // promiseReject default is to silently catch promise rejections
  allPromises: (promises, allThen, allError, promiseReject = undefined) => {
    let catchFn = (err) => {
      console.error(err);
    };
    if (promiseReject !== undefined) {
      catchFn = promiseReject;
    }
    // map catch blocks to all promises, so that all promises are run
    return Promise.all(promises.map((p) => p.catch(catchFn)))
      .then(allThen)
      .catch(allError);
  },

  // minimum timeout may be throttled by browser to 1000ms or more
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),

  // callback will be called after each chunk of sleep
  // sleep will return early if callback returns true
  sleepCallback: async (ms, callback = undefined) => {
    let chunk = 500;
    let remain = ms;
    while (remain > 0) {
      let start = new Date();
      await Global.sleep(chunk);
      let dur = new Date() - start;
      if (callback !== undefined) {
        if (callback(ms, remain)) {
          return false;
        }
      }
      remain -= dur;
    }
    return true;
  },

  template: async (string, obj) => {
    obj.sanitizePath = Global.sanitizePath;
    obj.sanitizeFilename = Global.sanitizeFilename;
    // convert template to expression
    // wrap expressions in parenthesis for quirk of parser
    const ret = `"${string
      // match opening and closing braces
      .replace(/\${((?:([^}"]*"[^"]*"[^}"]*)*|[^{}]*))}/g, '" + ($1) + "')}"`;
    return await Expressions.evaluate(ret, obj);
  },

  // returned values may be URI encoded
  parseURL: (uri) => {
    let parser;
    let searchObject = {};
    let queries;
    let split;
    let i;
    try {
      parser = new URL(uri);
    } catch (err) {
      return null;
    }
    // Convert query string to object
    queries = parser.search.replace(/^\?/, "").split("&");
    for (i = 0; i < queries.length; i++) {
      split = queries[i].split("=");
      searchObject[split[0]] = split[1];
    }
    parser.searchObject = searchObject;
    return parser;
  },

  // return filename from path, use getFilename for sanitized filename
  getBasename: (path) => path.replace(/^.*\//, ""), // strip everything before last slash

  // sanitized filename
  getFilename: (path) => Global.getBasename(path).replace(/:.*$/, ""), // strip twitter-style tags ":large"

  // sanitize filename, remove extension
  getFilePart: (path) => Global.getFilename(path).replace(/\.[^.]+$/, ""), // strip extension

  getFileExt: (path) => {
    const m = Global.getFilename(path).match(/\.([^./]+)$/);
    if (m && m.length > 0) {
      return m[1];
    }
    return "";
  },

  getDirname: (path) =>
    path
      .replace(/\/[^/]*$/g, "") // strip everything after last slash
      .replace(/^\/+/, ""), // strip leading slashes

  // replace all invalid characters and slashes
  sanitizeFilename: (filename, str = "_") =>
    filename
      .replace(/\u200b/g, "") // remove zero-width spaces
      .replace(/[*"/\\:<>|?]/g, str) // replace invalid characters
      .replace(/^[\s]+/, "") // strip leading spaces
      .replace(/[.\s]+$/, ""), // strip trailing spaces and period

  // replace invalid characters and strip leading/trailing slashes
  sanitizePath: (path, str = "_") =>
    path
      .replace(/\u200b/g, "") // remove zero-width spaces
      .replace(/[*":<>|?]/g, str) // replace invalid characters
      .replace(/[/\\]+/g, "/") // replace backslash with forward slash
      .replace(/^[/]/, "") // strip leading slash
      .replace(/\.?\/\s*/g, "/") // replace sequence of period-slash-space to slash
      .replace(/ *\/ */g, "/"), // remove spaces around slashes

  pathJoin: (parts, sep) => {
    const separator = sep || "/";
    const replace = new RegExp(`${separator}{1,}`, "g");
    return parts.join(separator).replace(replace, separator);
  },

  isValidPath: (path) =>
    typeof path === "string" &&
    path.length > 0 &&
    !/^[.]/.test(path) && // does not begin with period
    !/[./]$/.test(path) && // does not end with period or slash
    !/[*":<>|?]/.test(path), // does not contain invalid characters

  isValidFilename: (path) =>
    Global.isValidPath(path) &&
    Global.getFilePart(path).length > 0 && // filename part
    Global.getFileExt(path).length > 0, // file extension

  getRuleParams: (props) => {
    const { tab, image, index } = props;
    const isDataUrl = Global.isDataUrl(image.src);
    const parse = Global.parseURL(image.src); // URI components will be encoded
    const path = parse ? decodeURI(parse.pathname) : null;
    const tabParse = Global.parseURL(tab.url);
    const tabPath = tabParse ? decodeURI(tabParse.pathname) : null;
    // public properties should be lowercase
    let RuleParams = class {
      constructor(image_src) {
        this.alt = "";
        this.ext = "";
        this.hostname = "";
        this.host = "";
        this.index = "";
        this.name = "";
        this.path = "";
        this.tabtitle = "";
        this.tabhost = "";
        this.tabpath = "";
        this.tabfile = "";
        this.tabext = "";
        // internal
        this._errors = [];
        this._image_src = image_src;
        this._xhrLoaded = false;
        this._xhrHdr;
      }
      async _fetchHeader() {
        if (!this._xhrLoaded) {
          try {
            this._xhrHdr = Global.getHeaderFilename(this._image_src); // async
            this._xhrLoaded = true;
          } catch (err) {
            this._errors.push(err);
          }
        }
        return this._xhrHdr;
      }
      async xname() {
        const _xhrHdr = await this._fetchHeader();
        if (_xhrHdr.filename) {
          return Global.getFilePart(_xhrHdr.filename);
        }
        return "";
      }
      async xext() {
        const _xhrHdr = await this._fetchHeader();
        if (_xhrHdr.filename) {
          return Global.getFileExt(_xhrHdr.filename);
        }
        return "";
      }
      async xmimeext() {
        const _xhrHdr = await this._fetchHeader();
        if (_xhrHdr.mimeExt) {
          return _xhrHdr.mimeExt;
        }
        return "";
      }
    };
    const obj = new RuleParams(image.src);
    if (path) {
      obj.ext = Global.getFileExt(path);
      obj.name = Global.getFilePart(path);
      obj.path = Global.getDirname(path);
    }
    if (isDataUrl) {
      // inherit the hostname from the tab
      obj.hostname = tabParse.hostname;
      obj.host = tabParse.hostname;
    } else if (parse) {
      obj.hostname = parse.hostname;
      obj.host = parse.hostname;
    }
    obj.index = index.toString();
    obj.tabtitle = tab.title;
    if (tabParse) {
      obj.tabhost = tabParse.hostname;
    }
    if (tabPath) {
      obj.tabpath = Global.getDirname(tabPath);
      obj.tabfile = Global.getFilePart(tabPath);
      obj.tabext = Global.getFileExt(tabPath);
    }
    if (image.alt) {
      obj.alt = image.alt;
    }
    return obj;
  },

  // use fetch:HEAD to get headers
  // keys is array of headers to return as Promise
  // throw Errors such as HTTP NOT FOUND
  getHeaders: async (url, keys) => {
    const response = await fetch(url, {
      method: "HEAD",
      mode: "cors",
      credentials: "same-origin",
      cache: "force-cache",
    });
    console.debug("getHeaders response:", response);
    if (response.ok) {
      const headers = keys.reduce(
        (acc, val) => Object.assign(acc, { [val]: response.headers.get(val) }),
        {}
      );
      console.debug("getHeaders headers:", headers);
      return headers;
    }
    const errorMsg = `HTTP error, status = ${response.status}`;
    console.error(errorMsg, response);
    throw new Error(errorMsg);
  },

  // try to get filename from XHR request
  // returns {filename: filename} or {ext: ext}
  // throws Error if HTTP ERROR
  getHeaderFilename: async (url) => {
    let obj = {};
    let headers = await Global.getHeaders(url, [
      "Content-Disposition",
      "Content-Type",
    ]);
    const mime = headers["Content-Type"];
    if (mime && mime.indexOf("image/") === 0) {
      let ext = mime.substr(6);
      switch (ext) {
        case "jpeg": {
          ext = "jpg";
          break;
        }
        case "svg+xml": {
          ext = "svg";
          break;
        }
      }
      obj.mimeExt = ext;
    }
    const disposition = headers["Content-Disposition"];
    if (disposition && disposition.indexOf("filename") !== -1) {
      const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/g;
      // get all matches to include subsequent filename*=UTF-8''...
      // let matchArray = [...disposition.matchAll(filenameRegex)]; // target Firefox-67
      let matchArray = [];
      let matches = null;
      while ((matches = filenameRegex.exec(disposition)) !== null) {
        matchArray.push(matches);
      }
      for (let i = matchArray.length - 1; i >= 0; i--) {
        console.debug("getHeaderFilename", i, matchArray[i]);
        if (matchArray[i][1]) {
          let filename = matchArray[i][1];
          if (/^UTF/.test(filename)) {
            filename = decodeURI(filename.replace(/^UTF-8''/, ""));
          } else {
            filename = decodeURI(filename.replace(/['"]/g, ""));
          }
          console.debug("getHeaderFilename", filename);
          obj.filename = filename;
          break;
        }
      }
    }
    return obj;
  },

  // find the first missing integer from a sequence beginning at zero
  findNextSequence: (numericArray) => {
    const nums = [...numericArray].sort();
    for (let i = 0; i < nums.length; i++) {
      if (nums[i] !== i) {
        return i;
      }
    }
    return nums.length;
  },

  isDataUrl: (url) => url.indexOf("data:image/") === 0,
};

export default Global;
