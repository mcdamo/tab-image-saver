import Constants from "./constants";
import Utils from "./utils";

const Downloads = {
  dlMap: new Map(), // shared by all instances

  // details: { tabId, windowId, callback }
  addDownload: (dlid, context) => Downloads.dlMap.set(dlid, context),

  getDownload: (dlid) => Downloads.dlMap.get(dlid),

  removeDownload: async (dlid, eraseHistory) => {
    Downloads.dlMap.delete(dlid);
    if (eraseHistory) {
      console.debug("removeDownload::eraseHistory", dlid);
      await browser.downloads.erase({ id: dlid });
    }
  },

  downloadsHaveProp: (prop, val) => {
    for (const dl of Downloads.dlMap.values()) {
      if (dl[prop] === val) {
        return true;
      }
    }
    return false;
  },

  // is finished when all downloads for tabid have been removed
  hasTabDownloads: (tabId) => Downloads.downloadsHaveProp("tabId", tabId),

  // is finished when all downloads for tabid have been removed
  hasWindowDownloads: (windowId) =>
    Downloads.downloadsHaveProp("windowId", windowId),

  // call when download ends to cleanup and erase history
  downloadEnded: async (delta) => {
    const dlid = delta.id;
    const context = Downloads.getDownload(dlid);
    if (!context) {
      return; // multiple triggers may fire for one download
    }
    const downloads = await browser.downloads.search({ id: dlid });
    if (downloads.length === 0) {
      return;
    }
    const download = downloads[0];
    console.log(`Download(${dlid}) ${download.state}:`, download.filename);
    console.debug("Download status", download);
    URL.revokeObjectURL(download.url); // cleanup memory
    if (
      download.state === "complete" &&
      download.fileSize > 0 && // totalBytes may be undefined
      download.mime !== "text/html"
    ) {
      await Downloads.removeDownload(dlid, context.eraseHistory);
      const fn = context.then || ((x) => x);
      await fn(context);
      return;
    }
    await Downloads.removeDownload(dlid, context.eraseHistory);
    const fn = context.error || ((x) => x);
    context.download = download; // append 'download' response
    await fn(context);
    return;
  },

  // handle downloads changed events
  // note: catches all changes to Downloads, not just from this webext
  handleDownloadChanged: (delta) => {
    console.debug("handleDownloadChanged", delta);
    if (delta.state && delta.state.current !== "in_progress") {
      Downloads.downloadEnded(delta);
    }
    return true;
  },

  removeWindowDownloads: async (windowId) => {
    for (const [dlid, val] of Downloads.dlMap.entries()) {
      if (val.windowId === windowId) {
        console.warn(
          "Removing orphan download",
          dlid,
          val
        ); /* RemoveLogging:skip */
        await Downloads.removeDownload(dlid);
      }
    }
  },

  cancelWindowDownloads: (windowId) => {
    let promises = [];
    for (const [dlid, val] of Downloads.dlMap.entries()) {
      if (val.windowId === windowId) {
        // request cancellation but do not wait for response
        let canceling = browser.downloads.cancel(dlid);
        canceling
          .then(() => {
            console.log("Cancelled download", dlid);
            return true;
          })
          .catch((err) => {
            console.log(`Failed cancelling download ${dlid}`, err);
            return false;
          });
        promises.push(canceling);
      }
    }
    return Utils.allPromises(
      promises,
      () => {
        console.log("Cancelled all downloads");
      },
      (err) => {
        console.error("cancelDownloads", err);
      }
    );
  },

  fetchDownload: async (download, context) => {
    if (Utils.isDataUrl(download.url)) {
      download.downloadMethod = Constants.DOWNLOAD_METHOD.FETCH;
    }
    console.debug(`fetchDownload via ${download.downloadMethod}`);
    if (download.downloadMethod === Constants.DOWNLOAD_METHOD.DOWNLOAD) {
      return Downloads.saveDownload(download, context);
    }
    const fn = context.error || ((x) => x);
    try {
      console.debug("fetchDownload referrer:", download.referrer);
      let response;
      if (download.downloadMethod === Constants.DOWNLOAD_METHOD.CONTENT_FETCH) {
        // content fetch
        const MESSAGE_TYPE = "FETCH_DOWNLOAD";
        const msg = await browser.tabs.sendMessage(context.tab.id, {
          type: MESSAGE_TYPE,
          body: {
            url: download.url,
            options: {
              referrer: download.referrer,
            },
          },
        });
        if (msg.type !== MESSAGE_TYPE || msg.body.error) {
          throw Error(msg.body.error || msg);
        }
        response = msg.body.result;
      } else {
        // background fetch
        const start = new Date();
        response = await fetch(download.url, {
          mode: "cors",
          credentials: "same-origin",
          cache: "force-cache",
          referrer: download.referrer,
          referrerPolicy: "no-referrer-when-downgrade",
          signal: download.abortSignal,
        });
        const finish = new Date();
        response.ms = finish.getTime() - start.getTime();
      }
      console.debug("fetchDownload response:", response);
      if (response.ok) {
        console.log(
          `fetchDownload from Tab(${context.tab?.id}) ${response.ms / 1000}s:`,
          download.path
        );
        let myDownload = download;
        const myBlob =
          download.downloadMethod === Constants.DOWNLOAD_METHOD.CONTENT_FETCH
            ? response.blob
            : await response.blob();
        myDownload.url = URL.createObjectURL(myBlob);
        myDownload.isObjectURL = true;
        return Downloads.saveDownload(myDownload, context);
      }
      console.error(`HTTP error, status = ${response.status}`, response);
      fn({ ...context, response });
    } catch (err) {
      console.error("fetchDownload", err);
      fn({ ...context, exception: err });
    }
    return false;
  },

  // start the download
  saveDownload: async (download, context) => {
    try {
      let dlOpts = {
        saveAs: false, // required from FF58, min_ver FF52
        url: download.url,
        filename: download.path,
        conflictAction: download.conflictAction,
      };
      if (
        !download.isObjectURL &&
        download.downloadMethod === Constants.DOWNLOAD_METHOD.DOWNLOAD
      ) {
        const incognito =
          (context.tab && context.tab.incognito) || download.incognito;
        dlOpts = {
          ...dlOpts,
          incognito,
          headers: [{ name: "Referer", value: download.referrer }],
          ...(!incognito && { cookieStoreId: context.tab.cookieStoreId }),
        };
      }
      const dlid = await browser.downloads.download(dlOpts);
      console.log(
        `saveDownload(${dlid}) from Tab(${context.tab?.id}):`,
        download.path
      );
      Downloads.addDownload(dlid, context);
      return dlid;
    } catch (err) {
      // catch errors related to Access Denied eg. illegal filenames
      console.error("Download failed", err, download); /* RemoveLogging:skip */
      const fn = context.error || ((x) => x);
      await fn({ ...context, exception: err });
      return false;
    }
  },

  // use fetch:HEAD to get headers
  // keys is array of headers to return as Promise
  // throw Errors such as HTTP NOT FOUND
  fetchHeaders: async (url, keys, context) => {
    console.debug("fetchHeaders", url, keys, context);
    let response;
    if (context.downloadMethod !== Constants.DOWNLOAD_METHOD.FETCH) {
      // content fetch
      const MESSAGE_TYPE = "FETCH_HEADERS";
      const msg = await browser.tabs.sendMessage(context.tabId, {
        type: MESSAGE_TYPE,
        body: { url },
      });
      if (msg.type !== MESSAGE_TYPE || msg.body.error) {
        throw Error(msg.body.error || msg);
      }
      response = {
        ...msg.body.result,
        headers: new Headers(Object.entries(msg.body.result.headers)),
      };
    } else {
      // background fetch
      response = await fetch(url, {
        method: "HEAD",
        mode: "no-cors",
        credentials: "same-origin",
        cache: "force-cache",
      });
    }
    console.debug("fetchHeaders response:", response);
    if (response.ok) {
      const headers = keys.reduce(
        (acc, val) => Object.assign(acc, { [val]: response.headers.get(val) }),
        {}
      );
      console.debug("fetchHeaders headers:", headers);
      return headers;
    }
    const errorMsg = `HTTP error, status = ${response.status}`;
    console.error(errorMsg, response);
    throw new Error(errorMsg);
  },

  // try to get filename from XHR request
  // returns {filename: filename} or {ext: ext}
  // throws Error if HTTP ERROR
  getHeaderFilename: async (url, context) => {
    let obj = {};
    let headers = await Downloads.fetchHeaders(
      url,
      ["Content-Disposition", "Content-Type"],
      context
    );
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

  getRuleParams: (props) => {
    const {
      tab,
      image,
      index,
      startDate = new Date(), // default date used for testing path rules
      downloadMethod = undefined,
    } = props;
    const isDataUrl = Utils.isDataUrl(image.src);
    const parse = Utils.parseURL(image.src); // URI components will be encoded
    const path = parse ? decodeURI(parse.pathname) : null;
    const tabParse = Utils.parseURL(tab.url);
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
        this.date = startDate.toLocaleDateString();
        this.year = startDate.getFullYear();
        this.month = (startDate.getMonth() + 1).toString().padStart(2, 0);
        this.day = startDate.getDate().toString().padStart(2, 0);
        this.time = startDate.toLocaleTimeString();
        this.hours = startDate.getHours().toString().padStart(2, 0);
        this.minutes = startDate.getMinutes().toString().padStart(2, 0);
        this.seconds = startDate.getSeconds().toString().padStart(2, 0);
        this.timestamp = startDate.getTime() / 1000;
        // internal
        this._errors = [];
        this._image_src = image_src;
        this._xhrLoaded = false;
        this._xhrHdr;
      }
      async _fetchHeader() {
        if (!this._xhrLoaded) {
          try {
            this._xhrHdr = Downloads.getHeaderFilename(this._image_src, {
              tabId: tab.id,
              downloadMethod,
            }); // async
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
          return Utils.getFilePart(_xhrHdr.filename);
        }
        return "";
      }
      async xext() {
        const _xhrHdr = await this._fetchHeader();
        if (_xhrHdr.filename) {
          return Utils.getFileExt(_xhrHdr.filename);
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
      obj.ext = Utils.getFileExt(path);
      obj.name = Utils.getFilePart(path);
      obj.path = Utils.getDirname(path);
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
      obj.tabpath = Utils.getDirname(tabPath);
      obj.tabfile = Utils.getFilePart(tabPath);
      obj.tabext = Utils.getFileExt(tabPath);
    }
    if (image.alt) {
      obj.alt = image.alt;
    }
    return obj;
  },
  getTabParams: (props) => {
    const { tab } = props;
    const tabParse = Utils.parseURL(tab.url);
    const tabPath = tabParse ? decodeURI(tabParse.pathname) : null;
    // public properties should be lowercase
    let TabParams = class {
      constructor() {
        this.tabtitle = "";
        this.tabhost = "";
        this.tabpath = "";
        this.tabfile = "";
        this.tabext = "";
      }
    };
    const obj = new TabParams();
    obj.tabtitle = tab.title;
    if (tabParse) {
      obj.tabhost = tabParse.hostname;
    }
    if (tabPath) {
      obj.tabpath = Utils.getDirname(tabPath);
      obj.tabfile = Utils.getFilePart(tabPath);
      obj.tabext = Utils.getFileExt(tabPath);
    }
    return obj;
  },
};

export default Downloads;
