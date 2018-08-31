/* globals ACTION Downloads Options Global */

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

  getRuntime: windowId => {
    const props = App.runtime.get(windowId);
    if (props) {
      return props;
    }
    throw new Error("runtime not found");
  },

  hasRuntime: windowId => App.runtime.has(windowId),

  isCancelled: windowId => App.getRuntime(windowId).cancel,

  addUrl: (url, windowId) => App.getRuntime(windowId).urls.add(url),

  // is valid if not duplicate
  isUniqueUrl: (url, windowId) => !App.getRuntime(windowId).urls.has(url),

  // callback will be called after each chunk of sleep
  sleepOrCancel: async (ms, windowId, callback = undefined) => {
    let chunk = 500;
    if (ms < chunk) {
      chunk = ms;
    }
    for (let remain = ms; remain > 0; remain -= chunk) {
      await Global.sleep(chunk);
      if (callback !== undefined) {
        callback(ms, remain);
      }
      if (App.isCancelled(windowId)) {
        return false;
      }
    }
    return true;
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

  setBadgeText: details => {
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

  setBadgeBackgroundColor: details => {
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

  updateBadgeFinished: windowId => {
    const num = App.getRuntime(windowId).imagesSaved;
    let color = "#579900d0"; // green
    if (App.getRuntime(windowId).imagesFailed > 0) {
      color = "#d3290fd0"; // red
    } else if (App.getRuntime(windowId).imagesSaved === 0) {
      color = "#cc9a23d0"; // yellow
    }
    App.setBadgeText({text: num.toString(), windowId});
    App.setBadgeBackgroundColor({color, windowId});
    App.hideBadge();
  },

  updateBadgeSaving: windowId => {
    const num = App.getRuntime(windowId).imagesSaved;
    if (num > 0) {
      App.setBadgeText({text: num.toString(), windowId});
      App.setBadgeBackgroundColor({color: "#486fe3d0", windowId}); // blue
    }
  },

  updateBadgeLoading: (windowId, percent = undefined) => {
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
      console.error("Note failed:", err);
    }
    return false;
  },

  updateFinished: windowId => {
    App.updateBadgeFinished(windowId);
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
      msg += `No tabs processed: ${App.options.filter}\n${msgErr}`;
      App.notify(`finished_${windowId}`, {
        title: "Tab Image Saver",
        message: msg
      });
      return;
    }
    const imagesSaved = App.getRuntime(windowId).imagesSaved;
    const imagesFailed = App.getRuntime(windowId).imagesFailed;
    console.log(`${imagesSaved} Saved, ${imagesFailed} Failed`);
    if (imagesSaved === 0 && imagesFailed === 0) {
      msg += "No images";
    } else {
      if (imagesSaved > 0) {
        msg += `Saved: ${imagesSaved}\n`;
      }
      if (imagesFailed > 0) {
        msg += `Failed: ${imagesFailed}\n`;
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
  finished: windowId => {
    App.updateFinished(windowId);
    // cleanup orphans in Downloads
    Downloads.removeWindowDownloads(windowId);
    App.runtime.delete(windowId); // cleanup
    if (App.runtime.size === 0) {
      browser.downloads.onChanged.removeListener(Downloads.downloadChangedHandler); // remove download listener
    }
  },

  onDownloadEnded: windowId => {
    // test hasRuntime to guard against concurrent downloads ending
    if (App.hasRuntime(windowId) &&
      Downloads.hasWindowDownloads(windowId) === false) {
      console.log("window has ended", windowId);
      App.finished(windowId);
    }
  },

  onDownloadComplete: async context => {
    const windowId = context.windowId;
    const tabId = context.tabId;
    App.updateBadgeSaving(windowId);
    App.getRuntime(windowId).imagesSaved++;
    if (App.options.closeTab) {
      if (Downloads.hasTabDownloads(tabId) === false) {
        try {
          await browser.tabs.remove(tabId);
          console.log(`Tab removed ${tabId}`);
        } catch (err) {
          console.error(`Failed removing tab ${tabId}:`, err);
        }
      }
    }
    App.onDownloadEnded(windowId);
  },

  onDownloadFailed: context => {
    const windowId = context.windowId;
    App.getRuntime(windowId).imagesFailed++;
    App.onDownloadEnded(windowId);
  },

  createFilename: async (image, num = undefined) => {
    let filename = "";
    // don't use alt as filename for direct images
    if (App.options.altIsFilename && image.alt) {
      // append filename from alt attribute and filename extension
      filename = Global.sanitizeFilename(image.alt) + App.options.altFilenameExt;
      if (Global.isValidFilename(filename)) {
        console.log("alt filename:", filename);
        return filename;
      }
    }
    filename = await Global.getHeaderFilename(image.src);
    if (Global.isValidFilename(filename)) {
      return filename;
    }
    // no filename from headers, so create filename from url
    // get full path and extract filename
    filename = Global.parseURL(image.src).pathname.replace(/^.*[/\\]/, "");
    filename = filename.replace(/:.*/, ""); // Workaround for Twitter
    if (Global.isValidFilename(filename)) {
      console.log("Filename from url:", filename);
      return decodeURI(filename);
    }
    // no filename found from url, so use full path as filename
    filename = Global.parseURL(image.src).pathname.replace(/^[/\\]*/, "").replace(/[/\\]*$/, ""); // remove leading and trailing slashes
    filename = Global.sanitizeFilename(filename);
    if (Global.isValidFilename(filename)) {
      console.log("Filename from url:", filename);
      return decodeURI(filename);
    }

    // if still no valid filename
    console.warn("Unable to generate filename");
    filename = `img_${num.toString().padStart(4, "0")}`; // TODO make configurable option
    // TODO get header Content-Type for extension
    return filename;
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
        console.warn("Embedded image is unsupported"); // TODO support embedded
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

  /*
  // poll tab until status=complete
  async waitForTab(aTab) {
    let tab = aTab;
    let sleepMore = false;
    while (tab) {
      App.updateBadgeLoading();
      if (App.isCancelled()) {
        console.log("cancel:waitForTab", tab);
        return false;
      }
      // scripts do not run in discarded tabs
      if (tab.discarded) {
        console.log(`Tab ${tab.id} discarded, reloading:`, tab.url);
        tab = await browser.tabs.update(tab.id, {url: tab.url}); // reload() does not affect discarded state
        sleepMore = true;
      }
      if (tab.status === "complete") {
        if (sleepMore) {
          await sleep(5000); // wait longer to increase chance that fresh page is ready to execute
        }
        return tab;
      }
      // if (tab.status === "loading") {
      console.log("waitForTab:", tab);
      await sleep(1000);
      tab = await browser.tabs.get(tab.id);
      sleepMore = true;
    }
    return tab;
  },
  */

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
        console.error(`Error executing tab ${tabid}`, err);
        return false;
      }
    }
    App.getRuntime(windowId).tabsSkipped++;
    return false;
  },

  getWindowTabs: windowId => browser.tabs.query({windowId}),

  /*
  // wait until internal downloads map is empty
  async waitForDownloads(windowId) {
    while (Downloads.hasWindowDownloads(windowId)) {
      await App.sleepOrCancel(1000, windowId);
      if (App.isCancelled(windowId)) {
        await Download.cancelDownloads(windowId);
        console.log("waitForDownloads:Received cancel command");
        return false;
      }
    }
    return true;
  },
  */

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
      if (!await App.sleepOrCancel(
        1000,
        windowId,
        (ms, remain) => {
          App.updateBadgeLoading(windowId);
        }
      )) {
        // cancelled
        return false;
      }
    }
    if (sleepMore) {
      await App.sleepOrCancel(
        5000,
        windowId,
        (ms, remain) => {
          const percent = (ms - remain) / ms * 100;
          App.updateBadgeLoading(windowId, percent);
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
      case "current": // deprecated after v2.0.5
        doCurrent = true;
        break;
      default:
        console.error("Invalid method for executeTabs:", method);
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
        async tabResults => {
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
          let count = 0;
          for (const result of tabResults) {
            if (result === false) {
              // tab skipped
            } else {
              // tab ended
              const tabId = result[0];
              const images = result[1];
              for (const image of images) {
                const path = `${App.options.downloadPath}/${await App.createFilename(image, count)}`; // TODO
                promiseDownloads.push(
                  Downloads.startDownload({
                    url: image.src,
                    filename: path,
                    conflictAction: App.options.conflictAction,
                    incognito: App.options.removeEnded // min_ver FF57
                  }, {
                    tabId,
                    windowId,
                    then: v => App.onDownloadComplete({tabId, windowId}),
                    error: v => App.onDownloadFailed({tabId, windowId})
                  }));
                count++;
              }
            }
          }
          return Global.allPromises(
            promiseDownloads,
            downloads => {
              console.log("downloads", downloads);
              if (downloads.length === 0) {
                // No downloads found, finish immediately
                App.finished(windowId);
              }
              /*
              return allPromises(
                [App.waitForDownloads(windowId)],
                () => {console.log("Downloads Ended");},
                err => {console.error("waitForDownloads", err);}
              );
              */
              return true;
            },
            err => {console.error("downloads", err);}
          );
        },
        err => {console.error("executeTabs", err);}
      );
    } catch (err) {
      console.error("waitForTabs", err);
      return false;
    }
  },

  getActiveTab: async windowId => {
    const ret = await browser.tabs.query({windowId, active: true});
    return ret[0]; // TODO error check
  },

  // load options to trigger onLoad and set commands
  init: async () => {
    await App.loadManifest();
    await App.loadOptions();
  },

  updateTitle: async () => {
    const title = `${App.constants.title}: ${App.options.action}`;
    await browser.browserAction.setTitle({title});
  },

  loadManifest: async () => {
    const mf = await browser.runtime.getManifest();
    console.log(mf);
    App.constants.icon = mf.icons["48"];
    App.constants.title = mf.name;
  },

  storageChangeHandler: (changes, area) => {
    console.log("ReLoading background options");
    App.options = Options.storageChangeHandler(changes, area);
  },

  loadOptions: async () => {
    console.log("Loading background options");
    App.options = await Options.loadOptions();
    await App.updateTitle();
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
    browser.downloads.onChanged.addListener(Downloads.downloadChangedHandler); // add download listener
    // browser.runApp.runtime.onMessage.addListener(App.handleMessage);
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
      badgeTimeout: undefined,
      badgeLoading: 0,
      urls: new Set(), // unique urls
      // downloads: new Map(), // downloads in progress mapped to tabs
      cancel: false
    });
    delete App.blocking.windowId;

    App.updateBadgeLoading(windowId);
    if (await App.executeTabs(App.options.action, windowId) === false) {
      // cancelled
      console.log("executeTabs cancelled");
      App.finished(windowId);
    }
    return 1; // for testing
  }
};

browser.browserAction.onClicked.addListener(App.run);
browser.runtime.onInstalled.addListener(App.init);
browser.runtime.onStartup.addListener(App.init);
browser.storage.onChanged.addListener(App.storageChangeHandler);

// Export for testing
if (typeof module !== "undefined") {
  module.exports = {App, getWindowId};
}
