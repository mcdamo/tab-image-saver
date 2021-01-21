// independent functions

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

  // code: "|command|param|..."
  // eg.   "|replace|pattern|newSubstr[|regexp flags]"
  templateCode: (input, code) => {
    if (code === undefined) {
      return input;
    }
    let delim = code.substr(1, 1);
    let aCode = code.substr(2).slice(0, -1).split(delim); // remove 2 leading and 1 trailing characters and split
    switch (aCode[0]) {
      case "replace": {
        let rMod;
        if (aCode.length >= 3) {
          rMod = aCode[3]; // optional regex modifier
        }
        let regex = new RegExp(aCode[1], rMod);
        let newStr = aCode[2] !== undefined ? aCode[2] : "";
        return input.replace(regex, newStr);
      }
      default: {
        console.warn(
          "Ignoring invalid templateCode",
          code
        ); /* RemoveLogging:skip */
        return input;
      }
    }
  },

  // string contains varnames in angled brackets
  // optional pipe to define 'or'
  // optional #'s to define zero padding
  // vars defined in obj
  // <var1|var2> => var1 || var2
  // <###index> => 000
  template: (string, obj) => {
    let s = string;
    // greedy match <.> with optional templateCode
    const r = /<([^>]+)>("[^"\\]*(?:\\.[^"\\]*)*")?/g;
    s = s.replace(r, (match, p, globalCode) => {
      // match #key with optional templateCode, repeating separated by pipe '|'
      const rPipe = /([#]*)([^"|]+)("[^"\\]*(?:\\.[^"\\]*)*")?(?:\|([#]*)([^"|]+)("[^"\\]*(?:\\.[^"\\]*)*")?)?/g;
      // const varsArray = [...p.matchAll(rPipe)]; // target Firefox-67
      let varsArray = [];
      let matches = null;
      while ((matches = rPipe.exec(p)) !== null) {
        varsArray.push(matches);
      }
      for (let h = 0; h < varsArray.length; h++) {
        let vars = varsArray[h];
        for (let i = 1; i < vars.length; i += 3) {
          const pad = vars[i];
          const key = vars[i + 1];
          if (key === undefined) {
            return "";
          }
          const localCode = vars[i + 2];
          const lkey = key.toLowerCase();
          if (!Object.prototype.hasOwnProperty.call(obj, lkey)) {
            // treat as a string
            return key;
          }
          if (obj[lkey] !== undefined && obj[lkey].length > 0) {
            let ret = obj[lkey].padStart(pad.length, "0");
            if (localCode !== undefined) {
              ret = Global.templateCode(ret, localCode);
            }
            if (globalCode !== undefined) {
              ret = Global.templateCode(ret, globalCode);
            }
            return ret;
          }
        }
      }
      // return empty string if no vars are evaluated
      return "";
    });
    // return original string if no template is defined
    return s;
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
  getFilePart: (path) => Global.getFilename(path).replace(/.[^.]+$/, ""), // strip extension

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
    filename.replace(/[*"/\\:<>|?]/g, str).trim(),

  // replace invalid characters and strip leading/trailing slashes
  sanitizePath: (path, str = "_") =>
    path
      .replace(/[*":<>|?]/g, str) // replace invalid characters
      .replace(/[/\\]+/g, "/") // replace backslash with forward slash
      .replace(/^[/]/, "") // strip leading slash
      .replace(/[/]$/, "") // strip trailing slash
      .replace(/ *\/ */, "/"), // remove spaces around slashes

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
    const parse = Global.parseURL(image.src); // URI components will be encoded
    const path = parse ? decodeURI(parse.pathname) : null;
    const tabParse = Global.parseURL(tab.url);
    const tabPath = tabParse ? decodeURI(tabParse.pathname) : null;
    // obj properties should be lowercase
    const obj = {
      alt: "",
      ext: path ? Global.getFileExt(path) : "",
      hostname: parse ? parse.hostname : "",
      host: parse ? parse.hostname : "",
      index: index.toString(),
      name: path ? Global.getFilePart(path) : "",
      path: path ? Global.getDirname(path) : "",
      tabtitle: tab.title,
      tabhost: tabParse ? tabParse.hostname : "",
      tabpath: tabPath ? Global.getDirname(tabPath) : "",
      tabfile: tabPath ? Global.getFilePart(tabPath) : "",
      tabext: tabPath ? Global.getFileExt(tabPath) : "",
      xname: "",
      xext: "",
      xmimeext: "",
    };
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
};

export default Global;
