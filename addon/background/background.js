/* globals ACTION Downloads Options Global Version */

// Import for testing
if (typeof module !== "undefined") {
  const d = require("background/downloads");
  window.Downloads = d.Downloads;
  const g = require("background/global");
  window.Global = g.Global;
}

async function getWindowId() {
  const mywindow = await browser.windows.getCurrent();
  console.log("Window", mywindow);
  return mywindow.id;
}

const App = {
  constants: {
    title: "",
    contentScript: "/content/get-images.js",
    icon: "" // icon used on notifications
  },
  options: {},
  runtime: new Map(),
  blocking: {},
  loadedManifest: false,

  getRuntime: (windowId) => {
    const props = App.runtime.get(windowId);
    if (props) {
      return props;
    }
    throw new Error("runtime not found");
  },

  hasRuntime: (windowId) => App.runtime.has(windowId),

  isCancelled: (windowId) => App.getRuntime(windowId).cancel,

  addUrl: (url, windowId) => App.getRuntime(windowId).urls.add(url),

  // is valid if not duplicate
  isUniqueUrl: (url, windowId) => !App.getRuntime(windowId).urls.has(url),

  setTitle: async () => {
    const title = `${App.constants.title}: ${App.options.action}`;
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

  setBadgeFinished: (windowId) => {
    const num = App.getRuntime(windowId).imagesSaved;
    let color = "#579900d0"; // green
    if (App.getRuntime(windowId).imagesFailed > 0 ||
      App.getRuntime(windowId).pathsFailed > 0) {
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

  setBadgeLoading: (windowId, percent = undefined) => {
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
    App.setBadgeText({text, windowId});
    App.setBadgeBackgroundColor({color: "#8b67b3d0", windowId}); // purple
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
        msgErr = "active tab does not have permission";
      } else {
        msgErr = `${tabsError} tabs do not have permission`;
      }
    }
    let msg = "";
    if (App.isCancelled(windowId)) {
      msg += "User Cancelled\n";
    }
    if (App.getRuntime(windowId).tabsLoaded === 0) {
      msg += `No tabs processed: ${App.options.action}\n${msgErr}`;
      App.notify(`finished_${windowId}`, {
        title: "Tab Image Saver",
        message: msg
      });
      return;
    }
    const imagesSaved = App.getRuntime(windowId).imagesSaved;
    const imagesFailed = App.getRuntime(windowId).imagesFailed;
    const pathsFailed = App.getRuntime(windowId).pathsFailed;
    console.log(`${imagesSaved} Saved, ${imagesFailed} Failed`);
    if (imagesSaved === 0 &&
      imagesFailed === 0 &&
      pathsFailed === 0) {
      msg += "No images";
    } else {
      if (imagesSaved > 0) {
        msg += `Saved: ${imagesSaved}\n`;
      }
      if (imagesFailed > 0) {
        msg += `Failed downloads: ${imagesFailed}\n`;
      }
      if (pathsFailed > 0) {
        msg += `Path rules failed: ${pathsFailed}\n`;
      }
    }
    msg += "\n";
    // if (App.runtime.tabsSkipped > 0) {
    //  msg += `${App.runtime.tabsSkipped} tabs skipped\n`;
    // }
    console.log("Notify finished");
    App.notify(`finished_${windowId}`, {
      title: "Tab Image Saver",
      message: `${msg}${msgErr}`
    });
  },

  // cleanup and remove runtime for selected window
  finished: (windowId) => {
    App.notifyFinished(windowId);
    // cleanup orphans in Downloads
    Downloads.removeWindowDownloads(windowId);
    App.runtime.delete(windowId); // cleanup
    if (App.runtime.size === 0) {
      browser.downloads.onChanged.removeListener(Downloads.downloadChangedHandler); // remove download listener
    }
  },

  downloadFinished: (windowId) => {
    // test hasRuntime to guard against concurrent downloads ending
    if (App.hasRuntime(windowId) &&
      Downloads.hasWindowDownloads(windowId) === false) {
      console.log("window has ended", windowId);
      App.finished(windowId);
    }
  },

  onDownloadComplete: async (context) => {
    const windowId = context.windowId;
    const tabId = context.tabId;
    App.setBadgeSaving(windowId);
    App.getRuntime(windowId).imagesSaved++;
    if (App.options.closeTab) {
      if (Downloads.hasTabDownloads(tabId) === false) {
        try {
          await browser.tabs.remove(tabId);
          console.log(`Tab removed ${tabId}`);
        } catch (err) {
          console.error(`Failed removing tab ${tabId}:`, err); /* RemoveLogging:skip  */
        }
      }
    }
    App.downloadFinished(windowId);
  },

  onDownloadFailed: (context) => {
    const windowId = context.windowId;
    App.getRuntime(windowId).imagesFailed++;
    App.downloadFinished(windowId);
  },

  // generate file path from image attributes, index number, and rules template
  // return null if failed
  createFilename: async (image, index, rules) => {
    let xhrLoaded = false;
    const parse = Global.parseURL(image.src); // URI components will be encoded
    const path = decodeURI(parse.pathname);
    // obj properties should be lowercase
    let obj = {
      alt: "",
      ext: Global.getFileExt(path),
      hostname: parse.hostname,
      host: parse.hostname,
      index: index.toString(),
      name: Global.getFilePart(path),
      path: Global.getDirname(path),
      xname: "",
      xext: "",
      xmimeext: ""
    };
    if (image.alt) {
      obj.alt = Global.sanitizeFilename(image.alt);
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
      const filename = Global.template(rule, obj).trim();
      console.info(`rule: ${rule}, filename: ${filename}, valid: ${Global.isValidPath(filename)}`);
      if (Global.isValidPath(filename)) {
        return filename;
      }
    }
    return null;
  },

  createPath: async (image, index, rules) => {
    const filename = await App.createFilename(image, index, rules);
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

  // select valid images and remove duplicates
  // return array of images to be downloaded
  processTabResult: (images, windowId) => {
    let result = [];
    if (!images) {
      return result;
    }
    for (const image of images) {
      const url = image.src;
      if (url.indexOf("data:") === 0) {
        App.getRuntime(windowId).imagesFailed++;
        // TODO
        console.warn("Embedded image is unsupported"); /* RemoveLogging:skip */
      } else if (App.isUniqueUrl(url, windowId) === false) {
        console.log("Duplicate URL skipped", url);
        App.getRuntime(windowId).imagesSkipped++;
      } else {
        App.addUrl(url, windowId);
        console.log("Found image:", url);
        App.getRuntime(windowId).imagesMatched++;
        result.push(image);
      }
    }
    return result;
  },

  executeTab: async (tab, windowId) => {
    if (tab) {
      const tabid = tab.id;
      try {
        console.log(`Sending tab ${tabid}: ${App.constants.contentScript}`, tab);
        // returns array of script result for each loaded tab
        const results = await browser.tabs.executeScript(
          tabid, {
            file: App.constants.contentScript,
            runAt: "document_end" // "document_idle" may block if page is manually stopped
          }
        );
        App.getRuntime(windowId).tabsLoaded++;
        console.log(`Response from tab ${tabid}`, results);
        const images = App.processTabResult(results[0], windowId);
        if (images.length > 0) {
          App.getRuntime(windowId).tabsEnded++;
          return [tabid, images];
        }
      } catch (err) {
        App.getRuntime(windowId).tabsError++;
        console.error(`Error executing tab ${tabid}`, err); /* RemoveLogging:skip */
        return false;
      }
    }
    App.getRuntime(windowId).tabsSkipped++;
    return false;
  },

  getWindowTabs: (windowId) => browser.tabs.query({windowId}),

  // wait for all tabs in tabmap to have status=complete
  // returns array of tabs
  waitForTabs: async (tabsWaiting, windowId) => {
    let tabsReady = [];
    let sleepMore = false;
    while (tabsWaiting.size > 0) {
      for (let [tabid, tab] of tabsWaiting) {
        if (App.isCancelled(windowId)) {
          console.log("cancel:waitForTabs");
          return false;
        }
        // scripts do not run in discarded tabs
        if (tab.discarded) {
          console.log(`Tab ${tab.id} discarded, reloading:`, tab.url);
          tab = await browser.tabs.update(tab.id, {url: tab.url}); // reload() does not affect discarded state
          sleepMore = true;
        }
        if (tab.status === "complete") {
          tabsWaiting.delete(tabid);
          tabsReady.push(tab);
          if (tabsWaiting.size === 0) {
            break;
          }
        } else {
          // tab.status === "loading"
          sleepMore = true;
          console.log("waitForTabs:", tab);
          tab = await browser.tabs.get(tab.id);
          tabsWaiting.set(tab.id, tab); // update map
        }
      }
      if (!await Global.sleepCallback(
        1000,
        (ms, remain) => {
          App.setBadgeLoading(windowId);
          return App.isCancelled(windowId);
        }
      )) {
        // cancelled
        return false;
      }
    }
    if (sleepMore) {
      await Global.sleepCallback(
        5000,
        (ms, remain) => {
          const percent = (ms - remain) / ms * 100;
          App.setBadgeLoading(windowId, percent);
          return App.isCancelled(windowId);
        }
      );
    }
    return tabsReady;
  },

  executeTabs: async (method, windowId) => {
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
        console.error("Invalid method for executeTabs:", method); /* RemoveLogging:skip */
        return false;
    }
    let promiseTabs = [];
    const alltabs = await App.getWindowTabs(windowId);
    let tabsWaiting = new Map();
    for (const tab of alltabs) {
      if (tab.active) {
        if (!doAfter) {
          doTab = false;
        } else {
          doTab = true;
          if (!(doCurrent || App.options.activeTab)) {
            continue;
          }
        }
      }
      if (doTab || (tab.active && (doCurrent || App.options.activeTab))) {
        tabsWaiting.set(tab.id, tab);
        // promiseTabs.push(App.executeTab(await App.waitForTab(tab)));
      }
      if (tab.active && !doAfter) {
        break;
      }
    }
    try {
      const tabs = await App.waitForTabs(tabsWaiting, windowId);
      if (!tabs) {
        console.log("waitForTabs returned false");
        return false;
      }
      for (const tab of tabs) {
        promiseTabs.push(App.executeTab(tab, windowId));
      }
      return Global.allPromises(
        promiseTabs,
        async (tabResults) => {
          // executeTab returns: [tabid, [results]]
          if (App.isCancelled(windowId)) {
            console.log("cancelling tabResults");
            return false;
          }
          console.log("tabResults", tabResults);
          if (tabResults.length === 0) {
            App.finished(windowId);
            return true;
          }
          let promiseDownloads = [];
          let index = 1;
          for (const result of tabResults) {
            if (result === false) {
              // tab skipped
            } else {
              // tab ended
              const tabId = result[0];
              const images = result[1];
              for (const image of images) {
                try {
                  const path = await App.createPath(image, index, App.options.pathRules);
                  promiseDownloads.push(
                    Downloads.startDownload({
                      url: image.src,
                      filename: path,
                      conflictAction: App.options.conflictAction,
                      incognito: App.options.removeEnded // min_ver FF57
                    }, {
                      tabId,
                      windowId,
                      then: (v) => App.onDownloadComplete({tabId, windowId}),
                      error: (v) => App.onDownloadFailed({tabId, windowId})
                    }));
                  index++;
                } catch (err) {
                  // unable to generate filename from rules
                  console.error(err, image); /* RemoveLogging:skip */
                  App.getRuntime(windowId).pathsFailed++;
                }
              }
            }
          }
          return Global.allPromises(
            promiseDownloads,
            (downloads) => {
              console.log("downloads", downloads);
              if (downloads.length === 0) {
                // No downloads found, finish immediately
                App.finished(windowId);
              }
              return true;
            },
            (err) => {console.error("downloads", err);}
          );
        },
        (err) => {console.error("executeTabs", err);}
      );
    } catch (err) {
      console.error("waitForTabs", err); /* RemoveLogging:skip */
      return false;
    }
  },

  getActiveTab: async (windowId) => {
    const ret = await browser.tabs.query({windowId, active: true});
    return ret[0]; // TODO error check
  },

  // load options to trigger onLoad and set commands
  installHandler: async () => {
    // TODO prevent onInstalled from interrupting run process
    console.debug("Background.installHandler");
    const mf = await App.loadManifest();
    await Version.update(mf.version);
    await App.init();
  },

  // load options to trigger onLoad and set commands
  init: async () => {
    console.debug("Background.init");
    if (browser.storage.onChanged.hasListener(App.storageChangeHandler)) {
      browser.storage.onChanged.removeListener(App.storageChangeHandler);
    }
    await App.loadManifest(); // will skip if already loaded
    await App.loadOptions();
    browser.storage.onChanged.addListener(App.storageChangeHandler);
  },

  // load manifest.json and apply some fields to constants
  loadManifest: async (reload = false) => {
    if (!App.loadedManifest || reload) {
      const mf = await browser.runtime.getManifest();
      console.log(mf);
      App.constants.icon = mf.icons["48"];
      App.constants.title = mf.name;
      App.loadedManifest = true;
      return mf;
    }
    return null;
  },

  storageChangeHandler: (changes, area) => {
    console.log("ReLoading background options");
    App.options = Options.storageChangeHandler(changes, area);
  },

  loadOptions: async () => {
    console.log("Loading background options");
    App.options = await Options.loadOptions();
    await App.setTitle();
  },

  run: async () => {
    const windowId = await getWindowId();
    if (App.blocking.windowId) {
      console.log("Blocking concurrent run command");
      return -1; // for testing
    }
    App.blocking.windowId = windowId;
    if (App.runtime.has(windowId)) {
      console.warn("Cancelling windowId:", windowId);
      App.getRuntime(windowId).cancel = true;
      await Downloads.cancelWindowDownloads(windowId);
      // TODO call finished() after timeout?
      delete App.blocking.windowId;
      return 0; // for testing
    }
    const mytab = await App.getActiveTab(windowId);
    const tabId = mytab.id;
    console.log("running", {windowId, tabId});
    App.setupBadge(); // run before clearing runtime
    browser.downloads.onChanged.addListener(Downloads.downloadChangedHandler);
    App.runtime.set(windowId, {
      tabId, // required for setting badge
      startDate: new Date(),
      tabsLoaded: 0, // tabs executed
      tabsEnded: 0, // tabs returned a message
      tabsSkipped: 0, // tabs with no valid images
      tabsError: 0, // tabs with no permission
      imagesMatched: 0, // valid images
      imagesSkipped: 0, // skipped duplicates
      imagesFailed: 0, // failed downloads
      imagesSaved: 0, // saved images
      pathsFailed: 0, // failed creating path using rules
      badgeTimeout: undefined,
      badgeLoading: 0,
      urls: new Set(), // unique urls for this window's tabs only
      cancel: false
    });
    delete App.blocking.windowId;

    App.setBadgeLoading(windowId);
    if (await App.executeTabs(App.options.action, windowId) === false) {
      // cancelled
      console.log("executeTabs cancelled");
      App.finished(windowId);
    }
    return 1; // for testing
  }
};

browser.browserAction.onClicked.addListener(App.run);
browser.runtime.onInstalled.addListener(App.installHandler);
browser.runtime.onStartup.addListener(App.init);

// Export for testing
if (typeof module !== "undefined") {
  module.exports = {App, getWindowId};
}
