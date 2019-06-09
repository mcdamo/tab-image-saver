/* globals ACTION Downloads Options Global Version */

// Import for testing
if (typeof module !== "undefined") {
  const d = require("background/downloads");
  window.Downloads = d.Downloads;
  const g = require("background/global");
  window.Global = g.Global;
  const v = require("background/version");
  window.Version = v.Version;
}

async function getWindowId() {
  const mywindow = await browser.windows.getCurrent();
  console.debug("Window", mywindow);
  return mywindow.id;
}

class AppCancelled extends Error {}

const App = {
  constants: {
    contentScript: "/content/get-images.js",
    icon: "" // icon used on notifications
  },
  options: {},
  runtime: new Map(),
  blocking: new Map(),
  loadedManifest: false,
  reload: false,

  getRuntime: (windowId) => {
    const props = App.runtime.get(windowId);
    if (props) {
      return props;
    }
    throw new Error("runtime not found");
  },

  // window is idle, all downloads ended
  isFinished: (windowId) => !App.runtime.has(windowId),

  // cancel has been triggered but not finished
  isCancelled: (windowId) => App.getRuntime(windowId).cancel,

  // is in run() function
  isRunning: (windowId) => App.blocking.has(windowId),

  // all windows idle
  isIdle: () => App.runtime.size === 0,

  addUrl: (url, windowId) => App.getRuntime(windowId).urls.add(url),

  // is valid if not duplicate
  isUniqueUrl: (url, windowId) => !App.getRuntime(windowId).urls.has(url),

  // download queue for window
  addDownload: (dlid, context, tabId, windowId) => {
    if (!App.getRuntime(windowId).dlMap.has(tabId)) {
      let m = new Map();
      m.set(dlid, context);
      App.getRuntime(windowId).dlMap.set(tabId, m);
    } else {
      App.getRuntime(windowId).dlMap.get(tabId).set(dlid, context);
    }
    console.debug("App.addDownload", dlid);
  },

  getDownload: (dlid, tabId, windowId) => {
    if (App.getRuntime(windowId).dlMap.has(tabId)) {
      return App.getRuntime(windowId).dlMap.get(tabId).get(dlid);
    }
    return undefined;
  },

  removeDownload: (dlid, tabId, windowId) => {
    App.getRuntime(windowId).dlMap.get(tabId).delete(dlid);
    if (App.getRuntime(windowId).dlMap.get(tabId).size === 0) {
      App.getRuntime(windowId).dlMap.delete(tabId);
    }
    console.debug("App.removeDownload", dlid);
  },

  // is finished when all downloads for tabId have been removed
  hasTabDownloads: (tabId, windowId) => ((App.getRuntime(windowId) && App.getRuntime(windowId).dlMap.has(tabId)) ||
    Downloads.hasTabDownloads(tabId)),

  // is finished when all downloads for windowId have been removed
  hasWindowDownloads: (windowId) => {
    try {
      if (App.getRuntime(windowId).dlMap.size > 0) {
        return true;
      }
    } catch (e) {
      // silently catch errors if runtime is destroyed
    }
    return Downloads.hasWindowDownloads(windowId);
  },

  setTitle: async () => {
    const title = browser.i18n.getMessage("browser_action_tooltip", browser.i18n.getMessage(`options_action_label_${App.options.action}`));
    await browser.browserAction.setTitle({title});
  },

  setupBadge: () => {
    /*
    if (App.runtime && App.runtime.badgeTimeout) {
      clearTimeout(App.runtime.badgeTimeout);
    }
    */
  },

  hideBadge: () => {
    /*
    App.runtime.badgeTimeout = setTimeout(() => {
    browser.browserAction.setBadgeText({text: ""});
    }, 60*1000);
    */
  },

  setBadgeText: (details) => {
    try {
      browser.browserAction.setBadgeText(details);
    } catch (err) {
      // if cannot set windowId then use tabId
      if (details.windowId) {
        const tabId = App.getRuntime(details.windowId).tabId;
        delete details.windowId;
        details.tabId = tabId;
        App.setBadgeText(details);
      }
    }
  },

  setBadgeBackgroundColor: (details) => {
    try {
      browser.browserAction.setBadgeBackgroundColor(details);
    } catch (err) {
      // if cannot set windowId then use tabId
      if (details.windowId) {
        const tabId = App.getRuntime(details.windowId).tabId;
        delete details.windowId;
        details.tabId = tabId;
        App.setBadgeBackgroundColor(details);
      }
    }
  },

  setBadgeTextColor: (details) => {
    try {
      browser.browserAction.setBadgeTextColor(details);
    } catch (err) {
      // do nothing if not supported
    }
  },

  setBadgeFinished: (windowId) => {
    const num = App.getRuntime(windowId).imagesSaved;
    let color = "#579900d0"; // green
    if (App.getRuntime(windowId).imagesFailed.size > 0 ||
      App.getRuntime(windowId).pathsFailed.size > 0) {
      color = "#d3290fd0"; // red
    } else if (App.getRuntime(windowId).imagesSaved === 0) {
      color = "#cc9a23d0"; // yellow
    }
    App.setBadgeText({text: num.toString(), windowId});
    App.setBadgeBackgroundColor({color, windowId});
    App.hideBadge();
  },

  setBadgeSaving: (windowId) => {
    const num = App.getRuntime(windowId).imagesSaved;
    if (num > 0) {
      App.setBadgeText({text: num.toString(), windowId});
      App.setBadgeBackgroundColor({color: "#486fe3d0", windowId}); // blue
    }
  },

  // initialize badge with 'loading' colors
  setBadgeStart: (windowId) => {
    let color = "#ffffffff"; // white
    App.setBadgeTextColor({color, windowId});
    color = "#8b67b3d0"; // purple
    App.setBadgeBackgroundColor({color, windowId});
  },

  setBadgeLoading: (windowId, percent = undefined) => {
    // workaround for asynchronous downloads, don't show loading badge if images already saved
    if (App.getRuntime(windowId).imagesSaved > 0) {
      return false;
    }
    // update loading badge every 200ms
    if ((new Date() - App.getRuntime(windowId).badgeLoadingDate) <= 200) {
      return false;
    }
    let text = "";
    if (percent !== undefined) {
      const icons = "○◔◑◕●";
      const x = Math.round(percent / 100 * 4);
      text = icons.charAt(x);
    } else {
      const icons = "◷◶◵◴";
      let num = App.getRuntime(windowId).badgeLoading;
      text = icons.charAt(num);
      num++;
      if (num > 3) {
        num = 0;
      }
      App.getRuntime(windowId).badgeLoading = num;
    }
    App.getRuntime(windowId).badgeLoadingDate = new Date();
    App.setBadgeText({text, windowId});
    return true;
  },

  notify: async (id, message) => {
    if (!App.options.notifyEnded) {
      return null;
    }
    try {
      const obj = {
        "type": "basic",
        "iconUrl": browser.extension.getURL(App.constants.icon)
      };
      for (const prop in message) {
        if ({}.propertyIsEnumerable.call(message, prop)) {
          obj[prop] = message[prop];
        }
      }
      return await browser.notifications.create(id, obj);
    } catch (err) {
      console.error("Note failed:", err); /* RemoveLogging:skip */
    }
    return false;
  },

  notifyFinished: (windowId) => {
    App.setBadgeFinished(windowId);
    let msgErr = "";
    const tabsError = App.getRuntime(windowId).tabsError;
    if (tabsError > 0) {
      if (App.options.action === ACTION.ACTIVE) {
        msgErr = browser.i18n.getMessage("notification_content_permission_error_active");
      } else {
        msgErr = browser.i18n.getMessage("notification_content_permission_error_tabs", tabsError);
      }
    }
    let msg = "";
    let title = browser.i18n.getMessage("notification_title_finished");
    if (App.isCancelled(windowId)) {
      title = browser.i18n.getMessage("notification_title_cancelled");
      msg += browser.i18n.getMessage("notification_content_cancelled");
      msg += "\n";
    }
    if (App.getRuntime(windowId).tabsLoaded === 0) {
      msg += browser.i18n.getMessage("notification_content_no_tabs",
        browser.i18n.getMessage(`options_action_label_${App.options.action}`));
      msg += `\n${msgErr}`;
      App.notify(`finished_${windowId}`, {
        title,
        message: msg
      });
      return;
    }
    const imagesSaved = App.getRuntime(windowId).imagesSaved;
    const imagesFailed = App.getRuntime(windowId).imagesFailed.size;
    const pathsFailed = App.getRuntime(windowId).pathsFailed.size;
    console.log(`${imagesSaved} Saved, ${imagesFailed} Failed`);
    if (imagesSaved === 0 &&
      imagesFailed === 0 &&
      pathsFailed === 0) {
      msg += browser.i18n.getMessage("notification_content_no_images");
    } else {
      if (imagesSaved > 0) {
        msg += browser.i18n.getMessage("notification_content_images_saved", imagesSaved);
        msg += "\n";
      }
      if (imagesFailed > 0) {
        msg += browser.i18n.getMessage("notification_content_images_failed", imagesFailed);
        msg += "\n";
      }
      if (pathsFailed > 0) {
        msg += browser.i18n.getMessage("notification_content_paths_failed", pathsFailed);
        msg += "\n";
      }
    }
    msg += "\n";
    // if (App.runtime.tabsSkipped > 0) {
    //  msg += `${App.runtime.tabsSkipped} tabs skipped\n`;
    // }
    console.log("Notify finished");
    App.notify(`finished_${windowId}`, {
      title,
      message: `${msg}${msgErr}`
    });
  },

  // cleanup and remove runtime for selected window
  setFinished: (windowId) => {
    if (App.getRuntime(windowId).pathsFailed.size) {
      console.info("pathsFailed", App.getRuntime(windowId).pathsFailed); /* RemoveLogging:skip  */
    }
    if (App.getRuntime(windowId).imagesFailed.size) {
      console.info("imagesFailed", App.getRuntime(windowId).imagesFailed); /* RemoveLogging:skip  */
    }
    App.notifyFinished(windowId);

    // cleanup orphans in Downloads
    Downloads.removeWindowDownloads(windowId);
    App.deleteRuntime(windowId); // cleanup
    if (App.isIdle()) {
      browser.downloads.onChanged.removeListener(Downloads.handleDownloadChanged); // remove download listener
      if (App.reload) {
        console.debug("Reloading addon");
        browser.runtime.reload();
      }
    }
  },

  tabsFinished: (windowId) => {
    if (!App.isFinished(windowId) && // test downloads have finished
      App.hasWindowDownloads(windowId) === false) {
      console.log(`Window(${windowId}) has ended`, new Date() - App.getRuntime(windowId).startDate);
      if (!App.isCancelled(windowId)) {
        App.setFinished(windowId);
      }
    }
  },

  downloadFinished: (windowId) => {
    // guard against same download sending concurrent triggers
    if (!App.isRunning(windowId)) { // test app is not in progress
      App.tabsFinished(windowId);
    }
  },

  handleDownloadComplete: async (context) => {
    const windowId = context.windowId;
    const tabId = context.tabId;
    const index = context.index;
    console.debug("handleDownloadComplete", context);
    App.removeDownload(index, tabId, windowId);
    App.getRuntime(windowId).imagesSaved++;
    App.getRuntime(windowId).imagesDownloading--;
    App.setBadgeSaving(windowId);
    if (App.options.closeTab) {
      if (App.hasTabDownloads(tabId, windowId) === false) {
        try {
          await browser.tabs.remove(tabId);
          console.log(`Closed Tab(${tabId})`);
        } catch (err) {
          console.error(`Failed removing tab ${tabId}:`, err); /* RemoveLogging:skip  */
        }
      }
    }
    App.downloadFinished(windowId);
  },

  handleDownloadFailed: (context) => {
    const windowId = context.windowId;
    const tabId = context.tabId;
    const index = context.index;
    console.debug("handleDownloadFailed", context);
    App.removeDownload(index, tabId, windowId);
    App.getRuntime(windowId).imagesFailed.set(context.url, context.path);
    App.getRuntime(windowId).imagesDownloading--;
    App.downloadFinished(windowId);
  },

  // generate file path from image attributes, index number, and rules template
  // param expected to have these properties: tab, image, index, rules
  // return null if failed
  createFilename: async (param) => {
    const tab = param.tab;
    const image = param.image;
    const index = param.index;
    const rules = param.rules;
    let xhrLoaded = false;
    const parse = Global.parseURL(image.src); // URI components will be encoded
    const path = decodeURI(parse.pathname);
    const tabParse = Global.parseURL(tab.url);
    const tabPath = decodeURI(tabParse.pathname);
    // obj properties should be lowercase
    let obj = {
      alt: "",
      ext: Global.getFileExt(path),
      hostname: parse.hostname,
      host: parse.hostname,
      index: index.toString(),
      name: Global.getFilePart(path),
      path: Global.getDirname(path),
      tabtitle: tab.title,
      tabhost: tabParse.hostname,
      tabpath: Global.getDirname(tabPath),
      tabfile: Global.getFilePart(tabPath),
      tabext: Global.getFileExt(tabPath),
      xname: "",
      xext: "",
      xmimeext: ""
    };
    if (image.alt) {
      obj.alt = image.alt;
    }
    for (const rule of rules) {
      // check current rule for XHR variables and load XHR if required
      if (!xhrLoaded && (rule.includes("<x") || rule.includes("|x"))) {
        const hdr = await Global.getHeaderFilename(image.src);
        if (hdr.filename) {
          obj.xname = Global.getFilePart(hdr.filename);
          obj.xext = Global.getFileExt(hdr.filename);
        }
        if (hdr.mimeExt) {
          obj.xmimeext = hdr.mimeExt;
        }
        xhrLoaded = true;
      }
      const filename = Global.sanitizePath(Global.template(rule, obj).trim());
      console.debug(`rule: ${rule}, filename: ${filename}, valid: ${Global.isValidPath(filename)}`);
      if (Global.isValidPath(filename)) {
        console.debug("createFilename", rule, filename); /* RemoveLogging: skip */
        return filename;
      }
    }
    return null;
  },

  // param passed to createFilename
  createPath: async (param) => {
    const filename = await App.createFilename(param);
    if (filename === null) {
      throw new Error("Unable to generate filename");
    }
    const path = Global.sanitizePath(
      Global.pathJoin([App.options.downloadPath, filename])
    );
    if (!Global.isValidFilename(path)) {
      throw new Error(`Invalid filename generated: ${path}`);
    }
    return path;
  },

  getActiveDownloadNum: (windowId) => App.getRuntime(windowId).imagesDownloading,

  throttleDownloads: async (windowId) => {
    const maxDownloadNum = App.options.downloadNum;
    while (App.getActiveDownloadNum(windowId) >= maxDownloadNum) {
      console.debug(`Maximum downloads ${App.getActiveDownloadNum(windowId)} >= ${maxDownloadNum}`);
      if (!await Global.sleepCallback(100,
        (ms, remain) => {
          App.setBadgeLoading(windowId);
          return App.isCancelled(windowId);
        }
      )) {
        throw new AppCancelled("throttleDownloads");
      }
    }
  },

  createDownloads: async (param) => {
    const tabResults = param.response;
    const windowId = param.windowId;
    let downloads = [];
    for (const result of tabResults) {
      if (result === false) {
        continue;
      }
      const tab = result.tab;
      const tabId = tab.id;
      const images = result.images;
      for (const image of images) {
        try {
          let index = App.getRuntime(windowId).imageIndex++;
          const path = await App.createPath({
            tab,
            image,
            index,
            rules: App.options.pathRules
          });
          App.addDownload(index, {}, tabId, windowId);
          downloads.push({
            url: image.src,
            path,
            referrer: tab.url,
            index,
            tabId
          });
        } catch (err) {
          if (err instanceof AppCancelled) {
            console.debug("createDownloads passed cancelled");
            throw err;
          }
          // unable to generate filename from rules
          console.error(err, image); /* RemoveLogging:skip */
          App.getRuntime(windowId).pathsFailed.set(image.src, undefined);
        }
      }
    }
    return downloads;
  },

  fetchDownloads: async (param) => {
    const windowId = param.windowId;
    const downloads = param.downloads;
    let promiseDownloads = [];
    for (const download of downloads) {
      if (App.isCancelled(windowId)) {
        return promiseDownloads;
      }
      try {
        let index = download.index;
        let tabId = download.tabId;
        await App.throttleDownloads(windowId);
        App.getRuntime(windowId).imagesDownloading++;
        promiseDownloads.push(Downloads.fetchDownload({
          url: download.url,
          path: download.path,
          conflictAction: App.options.conflictAction,
          incognito: App.options.downloadPrivate, // min_ver FF57
          referrer: download.referrer,
          signal: App.getRuntime(windowId).abortControl.signal
        }, {
          tabId,
          windowId,
          then: (v) => App.handleDownloadComplete({tabId, windowId, index}),
          error: (v) => App.handleDownloadFailed({tabId, windowId, index, url: download.url, path: download.path}),
          eraseHistory: App.options.removeEnded
        }));
      } catch (err) {
        if (err instanceof AppCancelled) {
          console.debug("fetchDownloads passed cancelled");
          throw err;
        }
      }
    }
    return promiseDownloads;
  },

  // return false if no downloads
  downloadTab: async (param) => {
    // executeTab returns: {tab{}, images[]}
    let results;
    const windowId = param.windowId;
    console.debug("downloadTab", param.response);
    if (Array.isArray(param.response)) {
      // sync downloads pass all results in an array
      if (param.response.length === 0) {
        console.debug("downloadTab:finished");
        return false;
      }
      results = param.response;
    } else {
      // async downloads pass single results at a time
      results = [param.response];
    }
    const downloads = await App.createDownloads({response: results, windowId});
    const promiseDownloads = await App.fetchDownloads({windowId, downloads});
    return await Global.allPromises(
      promiseDownloads,
      (downloads) => {
        console.debug("downloadTab promises", downloads);
        if (downloads.length === 0) {
          // No downloads found, finish immediately
          console.debug("downloadTab:allPromises:finished");
          return false;
        }
        return true;
      },
      (err) => {console.error("downloads", err);}
    );
  },

  // select valid images and remove duplicates
  // return array of images to be downloaded
  filterImages: (param) => {
    const images = param.images;
    const windowId = param.windowId;
    let result = [];
    if (!images) {
      return result;
    }
    for (const image of images) {
      const url = image.src;
      if (url.indexOf("data:") === 0) {
        App.getRuntime(windowId).imagesFailed.set(url, "(embedded images not supported)");
        // TODO support embedded images
        console.warn("Embedded image is unsupported"); /* RemoveLogging:skip */
      } else if (App.isUniqueUrl(url, windowId) === false) {
        console.log("Duplicate URL skipped", url);
        App.getRuntime(windowId).imagesSkipped++;
      } else {
        App.addUrl(url, windowId);
        console.debug("URL queued:", url);
        App.getRuntime(windowId).imagesMatched++;
        result.push(image);
      }
    }
    return result;
  },

  executeTab: async (param) => {
    const windowId = param.windowId;
    if (!param.tab) {
      App.getRuntime(windowId).tabsSkipped++;
      return false;
    }
    let tab;
    if (Array.isArray(param.tab)) {
      tab = param.tab[0];
    } else {
      tab = param.tab;
    }
    try {
      console.log(`Executing Tab(${tab.id})`);
      console.debug(`Sending tab ${tab.id}: ${App.constants.contentScript}`, tab);
      // returns array of script result for each loaded tab
      const results = await browser.tabs.executeScript(
        tab.id, {
          file: App.constants.contentScript,
          runAt: "document_end" // "document_idle" may block if page is manually stopped
        }
      );
      App.getRuntime(windowId).tabsLoaded++;
      console.log(`Result from Tab(${tab.id})`);
      console.debug(`Response from tab ${tab.id}`, results);
      const images = App.filterImages({images: results[0], windowId});
      if (images.length > 0) {
        App.getRuntime(windowId).tabsEnded++;
        return {
          tab: {
            id: tab.id,
            title: tab.title,
            url: tab.url
          },
          images
        };
      }
      App.getRuntime(windowId).tabsSkipped++;
    } catch (err) {
      App.getRuntime(windowId).tabsError++;
      console.error(`Error executing tab ${tab.id}: ${tab.url}`, err); /* RemoveLogging:skip */
    }
    return false;
  },

  // execute all tabs and run callback on each tab
  executeTabs: async (param) => {
    const tabs = param.tabs;
    const windowId = param.windowId;
    const execute = param.execute;
    const callback = param.callback;
    let promiseTabs = [];
    for (const tab of tabs) {
      promiseTabs.push(execute({tab, windowId}));
    }
    return await Global.allPromises(
      promiseTabs,
      async (tabResults) => await callback({response: tabResults, windowId}),
      (err) => {
        if (err instanceof AppCancelled) {
          console.debug("executeTabs passed cancelled");
          throw err;
        }
        console.error("executeTabs", err);
      }
    );
  },

  getWindowTabs: (windowId) => browser.tabs.query({windowId}),

  // pass array of objects {index, tab}
  // loops through tabs checking for loaded status
  // refresh tabs if discarded
  // returns object with arrays ready and waiting
  checkTabs: async (param) => {
    const objs = param.tabs;
    const windowId = param.windowId;
    let ready = [];
    let sleepMore = false;
    let waiting = await objs.reduce(async (aacc, aval) => {
      let waiting = await aacc;
      let tab = aval.tab;
      let index = aval.index;
      if (App.isCancelled(windowId)) {
        throw new AppCancelled("checkTabs");
      }
      // scripts do not run in discarded tabs
      if (tab.discarded) {
        if (App.options.ignoreDiscardedTab) {
          console.log(`Tab ${tab.id} discarded, ignoring:`, tab.url);
          return waiting;
        }
        try {
          console.log(`Tab ${tab.id} discarded, reloading:`, tab.url);
          tab = await browser.tabs.update(tab.id, {url: tab.url}); // reload() does not affect discarded state
        } catch (err) {
          console.debug("cannot reload tab:", tab.url);
          return waiting;
        }
        sleepMore = true;
      }
      if (tab.status === "complete") {
        ready.push({index, tab});
      } else {
        // tab.status === "loading"
        sleepMore = true;
        tab = await browser.tabs.get(tab.id);
        waiting.push({index, tab});
      }
      return waiting;
    },
    []
    );
    return {ready, waiting, sleepMore};
  },

  // wait for all tabs to have status=complete
  // callback: optional, used for asynchronous downloading of tabs
  // returns array of tabs
  waitForTabs: async (param) => {
    const tabs = param.tabs;
    const windowId = param.windowId;
    const callback = param.callback;
    let waiting = tabs.reduce((acc, val, idx) => {
      acc.push({index: idx, tab: val});
      return acc;
    }, []); // add index to entries
    let ready = [];
    let sleepMore = false;
    let loop = 0;
    while (waiting.length > 0) {
      // don't sleep in the first loop
      if (loop > 0 && !await Global.sleepCallback(
        1000,
        (ms, remain) => {
          App.setBadgeLoading(windowId);
          return App.isCancelled(windowId);
        }
      )) {
        throw new AppCancelled("waitForTabs");
      }
      try {
        const ret = await App.checkTabs({tabs: waiting, windowId});
        sleepMore = ret.sleepMore;
        for (let i = 0; i < ret.ready.length; i++) {
          let val = ret.ready[i];
          ready[val.index] = val.tab;
        }
        waiting = ret.waiting;
      } catch (err) {
        console.debug("waitForTabs passed", err);
        throw err;
      }
      loop++;
    }
    if (sleepMore) {
      if (!await Global.sleepCallback(
        5000,
        (ms, remain) => {
          const percent = (ms - remain) / ms * 100;
          App.setBadgeLoading(windowId, percent);
          return App.isCancelled(windowId);
        }
      )) {
        throw new AppCancelled("waitForTabs");
      }
    }
    if (callback !== undefined) {
      ready = await ready.reduce(async (accc, val, idx) => {
        let acc = await accc;
        let ret = await callback(val, windowId);
        acc.push({index: idx, tab: ret});
        return acc;
      }, []);
    }
    return ready;
  },

  // wait for tabs and execute asynchronously
  waitAndExecuteTabs: async (param) => {
    let tabs = param.tabs;
    const windowId = param.windowId;
    const wait = param.wait;
    const filter = param.filter;
    const execute = param.execute;
    const callback = param.callback;
    let promiseTabs = [];
    for (const tab of tabs) {
      let ret = wait({
        tabs: [tab],
        windowId,
        callback: async (tab) => {
          let tabs = filter({tabs: [tab], windowId});
          if (tabs.length === 0) {
            return false;
          }
          let ret = await execute({tab: tabs, windowId});
          return callback({response: ret, windowId});
        }
      });
      promiseTabs.push(ret);
    }
    return await Global.allPromises(
      promiseTabs,
      (tabResults) => {
        console.debug("waitAndExecuteTabs:tabResults", tabResults);
        return (tabResults.length > 0);
      },
      (err) => {
        if (err instanceof AppCancelled) {
          console.debug("waitAndExecuteTabs passed cancelled");
          throw err;
        }
        console.error("waitAndExecuteTabs", err);
      }
    );
  },

  filterTabs: (param) => {
    const tabs = param.tabs;
    // filter tabs without URLs
    return tabs.filter((tab) => /^(https?|ftps?):\/\/.+/.test(tab.url));
  },

  selectTabs: async (param) => {
    const method = param.method;
    const includeActive = param.includeActive;
    const windowId = param.windowId;
    let doTab = false;
    let doAfter = false;
    let doCurrent = false;
    switch (method) {
      case ACTION.LEFT:
        doTab = true;
        break;
      case ACTION.RIGHT:
        doAfter = true;
        break;
      case ACTION.ALL:
        doTab = true;
        doAfter = true;
        break;
      case ACTION.ACTIVE:
        doCurrent = true;
        break;
      default:
        throw new Error("Invalid method for selectTabs:", method); /* RemoveLogging:skip */
    }
    let tabsWaiting = [];
    const allTabs = await App.getWindowTabs(windowId);
    if (allTabs.length === 0) {
      return tabsWaiting;
    }
    for (const tab of allTabs) {
      if (tab.active) {
        if (!doAfter) {
          doTab = false;
        } else {
          doTab = true;
          if (!(doCurrent || includeActive)) {
            continue;
          }
        }
      }
      if (doTab || (tab.active && (doCurrent || includeActive))) {
        tabsWaiting.push(tab);
        // promiseTabs.push(App.executeTab(await App.waitForTabs([tab], windowId)));
      }
      if (tab.active && !doAfter) {
        break;
      }
    }
    return tabsWaiting;
  },

  getActiveTab: async (windowId) => {
    const ret = await browser.tabs.query({windowId, active: true});
    return ret[0]; // TODO error check
  },

  handleUpdateAvailable: async () => {
    console.debug("Addon update available");
    if (App.isIdle()) {
      browser.runtime.reload();
    } else {
      App.reload = true;
    }
  },

  // load options to trigger onLoad and set commands
  handleInstalled: async () => {
    const mf = await App.loadManifest();
    await Version.update(mf.version);
    await App.init();
  },

  // load options to trigger onLoad and set commands
  init: async () => {
    console.debug("Background.init");
    if (browser.storage.onChanged.hasListener(App.handleStorageChanged)) {
      await browser.storage.onChanged.removeListener(App.handleStorageChanged);
    }
    await App.loadManifest(); // will skip if already loaded
    await App.loadOptions();
    await browser.storage.onChanged.addListener(App.handleStorageChanged);
  },

  // load manifest.json and apply some fields to constants
  loadManifest: async (reload = false) => {
    if (!App.loadedManifest || reload) {
      const mf = await browser.runtime.getManifest();
      console.debug("loadManifest", mf);
      App.constants.icon = mf.icons["48"];
      App.loadedManifest = true;
      return mf;
    }
    return null;
  },

  handleStorageChanged: (changes, area) => {
    console.debug("ReLoading background options");
    App.options = Options.handleStorageChanged(changes, area);
  },

  loadOptions: async () => {
    console.debug("Loading background options");
    App.options = await Options.loadOptions();
    await App.setTitle();
  },

  cancel: async (windowId) => {
    console.info("Cancelling windowId:", windowId);
    if (!App.isFinished(windowId)) {
      App.getRuntime(windowId).cancel = true;
      App.getRuntime(windowId).abortControl.abort(); // cancel fetch()
      if (!App.isRunning(windowId)) {
        await Downloads.cancelWindowDownloads(windowId);
        console.debug("cancelWindowDownloads completed");
        App.setFinished(windowId);
      }
    }
  },

  createRuntime: (windowId, tabId) => {
    App.runtime.set(windowId, {
      tabId, // required for setting badge
      startDate: new Date(),
      tabsLoaded: 0, // tabs executed
      tabsEnded: 0, // tabs returned a message
      tabsSkipped: 0, // tabs with no valid images
      tabsError: 0, // tabs with no permission
      imageIndex: 1, // starting index for numbered images
      imagesMatched: 0, // valid images
      imagesSkipped: 0, // skipped duplicates
      imagesDownloading: 0, // active downloads
      imagesFailed: new Map(), // failed downloads
      imagesSaved: 0, // saved images
      pathsFailed: new Map(), // failed creating path using rules
      badgeTimeout: undefined,
      badgeLoading: 0,
      badgeLoadingDate: 0,
      urls: new Set(), // unique urls for this window's tabs only
      abortControl: new AbortController(), // for cancelling fetch()
      cancel: false,
      dlMap: new Map() // downloads queued for this window but not yet started
    });
  },

  deleteRuntime: (windowId) => {
    App.runtime.delete(windowId); // cleanup
  },

  // return (for testing)
  //   -1: run blocked
  //    1: normal completion
  run: async (windowId) => {
    if (App.isRunning(windowId)) {
      console.debug("run blocked");
      return -1; // -1 for testing
    }
    App.blocking.set(windowId);
    const mytab = await App.getActiveTab(windowId);
    const tabId = mytab.id;
    console.debug("running", {windowId, tabId});
    // workaround for private browsing mode does not trigger onStartup callback
    if (!browser.storage.onChanged.hasListener(App.handleStorageChanged)) {
      console.debug("storage listener not detected - forcing init()");
      await App.init();
    }
    App.setupBadge(); // run before clearing runtime
    browser.downloads.onChanged.addListener(Downloads.handleDownloadChanged);
    App.createRuntime(windowId, tabId);
    App.setBadgeStart(windowId);
    App.setBadgeLoading(windowId);
    try {
      let tabs = await App.selectTabs({
        method: App.options.action,
        includeActive: App.options.activeTab,
        windowId
      });
      let ret;
      if (App.options.downloadAsync) {
        // asynchronous - files saved in parallel
        ret = await App.waitAndExecuteTabs({
          tabs,
          windowId,
          wait: App.waitForTabs,
          filter: App.filterTabs,
          execute: App.executeTab,
          callback: App.downloadTab
        });
      } else {
        // synchronous - files saved in tab order, waits for all tabs to be ready
        tabs = await App.waitForTabs({tabs, windowId});
        tabs = App.filterTabs({tabs, windowId});
        ret = await App.executeTabs({tabs, windowId, execute: App.executeTab, callback: App.downloadTab});
      }
      console.debug(`Run finished: ${ret}`, new Date() - App.getRuntime(windowId).startDate);
      if (!ret) {
        // no tabs or downloads found
        App.setFinished(windowId);
      } else if (App.isCancelled(windowId)) {
        await Downloads.cancelWindowDownloads(windowId);
        console.debug("cancelWindowDownloads completed");
        App.setFinished(windowId);
      } else {
        // for condition where all downloads completed before run() finished
        App.tabsFinished(windowId);
      }
    } catch (err) {
      if (err instanceof AppCancelled) {
        console.debug("Run cancelled in:", err.message);
        // cleanup any lingering downloads
        await Downloads.cancelWindowDownloads(windowId);
        console.debug("cancelWindowDownloads completed");
        App.setFinished(windowId);
      } else {
        console.error("Run:", err);
      }
    }
    App.blocking.delete(windowId);
    return 1; // 1 for testing
  },

  // return (for testing)
  //   -1: run blocked
  //    1: normal completion
  //    2: cancel triggered
  handleBrowserAction: async () => {
    const windowId = await getWindowId();
    if (App.isRunning(windowId) || !App.isFinished(windowId)) {
      await App.cancel(windowId);
      return 2; // 2 for testing
    }
    return App.run(windowId);
  }
};

browser.browserAction.onClicked.addListener(App.handleBrowserAction);
browser.runtime.onInstalled.addListener(App.handleInstalled);
browser.runtime.onUpdateAvailable.addListener(App.handleUpdateAvailable);
browser.runtime.onStartup.addListener(App.init);

// Export for testing
if (typeof module !== "undefined") {
  module.exports = {App, getWindowId};
}
