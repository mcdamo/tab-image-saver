// independent functions
const Global = {
  sleep: ms => new Promise(resolve => setTimeout(resolve, ms)),

  parseURL: url => {
    let parser = document.createElement("a");
    let searchObject = {};
    let queries;
    let split;
    let i;
    // Let the browser do the work
    parser.href = url;
    // Convert query string to object
    queries = parser.search.replace(/^\?/, "").split("&");
    for (i = 0; i < queries.length; i++) {
      split = queries[i].split("=");
      searchObject[split[0]] = split[1];
    }
    return {
      protocol: parser.protocol,
      host: parser.host,
      hostname: parser.hostname,
      port: parser.port,
      pathname: parser.pathname,
      search: parser.search,
      searchObject,
      hash: parser.hash
    };
  },

  sanitizeFilename: (filename, str = "_") => filename.replace(/[*"/\\:<>|?]/g, str),

  // wait for all promises to resolve
  // promiseReject default is to silently catch promise rejections
  allPromises: (promises, allThen, allError, promiseReject = undefined) => {
    let catchFn = function(err) {console.error(err);};
    if (promiseReject !== undefined) {
      catchFn = promiseReject;
    }
    // map catch blocks to all promises, so that all promises are run
    return Promise.all(promises.map(p => p.catch(catchFn)))
      .then(allThen)
      .catch(allError);
  },

  sanitizePath: (path, str = "_") =>
    path.replace(/[*":<>|?]/g, str) // remove invalid characters
      .replace(/[/\\]+/g, "/") // replace backslash with forward slash
      .replace(/^[/]/, "") // strip leading slash
      .replace(/[/]$/, ""), // strip trailing slash

  pathJoin: (parts, sep) => {
    const separator = sep || "/";
    const replace = new RegExp(`${separator}{1,}`, "g");
    return parts.join(separator).replace(replace, separator);
  },

  isValidFilename: filename => (filename.length > 0) && (!/[*"/\\:<>|?]/.test(filename)),

  // download using XHR for filename
  getHeaderFilename: url => new Promise((resolve, reject) => {
    let xhr = new XMLHttpRequest();
    xhr.open("HEAD", url);
    // catches events for: load, error, abort
    xhr.onload = function() {
      // try getting filename from response header in XHR request
      console.log("XHR URL:", url);
      let filename = "";
      const disposition = this.getResponseHeader("Content-Disposition");
      if (disposition && disposition.indexOf("filename") !== -1) {
        const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
        let matches = filenameRegex.exec(disposition);
        if (matches !== null && matches[1]) {
          filename = matches[1].replace(/['"]/g, "");
          console.log("XHR Filename:", filename);
          return resolve(filename);
        }
      }
      console.log("XHR response did not provide filename:", disposition);
      return resolve("");
    };
    xhr.onerror = function() {
      reject({
        status: this.status,
        statusText: xhr.statusText
      });
    };
    xhr.send();
  })
};

// Export for testing
if (typeof module !== "undefined") {
  module.exports = {Global};
}
