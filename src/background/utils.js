// independent functions
import Expressions from "./expressions";

const Utils = {
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
      await Utils.sleep(chunk);
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
    obj.sanitizePath = Utils.sanitizePath;
    obj.sanitizeFilename = Utils.sanitizeFilename;
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
  getFilename: (path) => Utils.getBasename(path).replace(/:.*$/, ""), // strip twitter-style tags ":large"

  // sanitize filename, remove extension
  getFilePart: (path) => Utils.getFilename(path).replace(/\.[^.]*$/, ""), // strip extension

  getFileExt: (path) => {
    const m = Utils.getFilename(path).match(/\.([^./]+)$/);
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
    //const replace = new RegExp(`${separator}{1,}`, "g");
    return parts
      .filter((part) => part !== undefined && part !== "")
      .join(separator);
    //.replace(replace, separator);
  },

  isValidPath: (path) =>
    typeof path === "string" &&
    path.length > 0 &&
    !/^[.]/.test(path) && // does not begin with period
    !/[./]$/.test(path) && // does not end with period or slash
    !/[*":<>|?]/.test(path), // does not contain invalid characters

  isValidFilename: (path) =>
    Utils.isValidPath(path) &&
    Utils.getFilePart(path).length > 0 && // filename part
    Utils.getFileExt(path).length > 0, // file extension

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

export default Utils;
