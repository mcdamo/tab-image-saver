function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function parseURL(url) {
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
}

function sanitizeFilename(filename, str = "_") {
  return filename.replace(/[*"/\\:<>|?]/g, str);
}

let App = {
  options: {
    contentScript: "/content-getimages.js",
    command: "_execute_browser_action", // keyboard shortcut command
    icon: "icons/tab-image-saver-v2@48.png" // icon used on notifications
  },
  downloads: new Map(), // shared by all instances
  runtime: new Map(),

  getRuntime(windowId) {
    let props = App.runtime.get(windowId);
    if (props) {
      return props;
    }
    throw new Error("runtime not found");
  },

  isCancelled(windowId) {
    return App.getRuntime(windowId).cancel;
  },

  addDownload(dlid, tabid, windowId) {
    App.downloads.set(dlid, windowId);
    return App.getRuntime(windowId).downloads.set(dlid, tabid);
  },

  getDownload(dlid) {
    let windowId = App.getDownloadWindow(dlid);
    return App.getRuntime(windowId).downloads.get(dlid);
  },

  getDownloadWindow(dlid) {
    return App.downloads.get(dlid);
  },

  removeDownload(dlid) {
    let windowId = App.getDownloadWindow(dlid);
    let tabid = App.getDownload(dlid);
    App.downloads.delete(dlid);
    App.getRuntime(windowId).downloads.delete(dlid);
    return tabid;
  },

  downloadsLength(windowId) {
    return App.getRuntime(windowId).downloads.size;
  },

  // is finished when all downloads for tabid have been removed
  isTabFinished(tabid, windowId) {
    let tabs = Array.from(App.getRuntime(windowId).downloads.values());
    if (tabs.indexOf(tabid) === -1) {
      return true;
    }
    return false;
  },

  addUrl(url, windowId) {
    return App.getRuntime(windowId).urls.add(url);
  },

  // is valid if not duplicate
  isUniqueUrl(url, windowId) {
    return !App.getRuntime(windowId).urls.has(url);
  },

  // callback will be called after each chunk of sleep
  async sleepOrCancel(ms, windowId, callback = undefined) {
    let chunk = 500;
    if (ms < chunk) {
      chunk = ms;
    }
    for (let remain = ms; remain > 0; remain -= chunk) {
      await sleep(chunk);
      if (callback !== undefined) {
        callback(ms, remain);
      }
      if (App.isCancelled(windowId)) {
        return false;
      }
    }
    return true;
  },

  async loadOptions() {
    try {
      let result = await browser.storage.local.get();
      console.log("Loaded Options:", result);
      for (let prop in result) {
        if ({}.propertyIsEnumerable.call(result, prop)) {
          App.options[prop] = result[prop];
        }
      }
      // load some sane defaults
      if (!App.options.action) {
        App.options.action = "current";
      }
      // Empty to use Downloads directory or specify subfolder within Downloads directory (no leading or trailing slashes)
      if (!App.options.downloadPath) {
        App.options.downloadPath = "";
      }
      if (App.options.downloadPath.length > 0) {
        App.options.downloadPath += "/";
      }
      if (!App.options.conflictAction) {
        App.options.conflictAction = "uniquify";
      }
      if (!App.options.minHeight) {
        App.options.minHeight = "100";
      }
      if (!App.options.minWidth) {
        App.options.minWidth = "100";
      }
      if (App.options.notifyEnded === null) {
        App.options.notifyEnded = true;
      }
      if (!App.options.filter) {
        App.options.filter = "max";
      }
    } catch (err) {
      console.error("Error loading options", err);
    }
  },

  setupBadge() {
    /*
    if (App.runtime && App.runtime.badgeTimeout) {
      clearTimeout(App.runtime.badgeTimeout);
    }
    */
  },

  hideBadge() {
    /*
    App.runtime.badgeTimeout = setTimeout(() => {
    browser.browserAction.setBadgeText({text: ""});
    }, 60*1000);
    */
  },

  setBadgeText(details) {
    try {
      browser.browserAction.setBadgeText(details);
    } catch (err) {
      // if cannot set windowId then use tabId
      if (details.windowId) {
        let tabId = App.getRuntime(details.windowId).tabId;
        delete details.windowId;
        details.tabId = tabId;
        App.setBadgeText(details);
      }
    }
  },

  setBadgeBackgroundColor(details) {
    try {
      browser.browserAction.setBadgeBackgroundColor(details);
    } catch (err) {
      // if cannot set windowId then use tabId
      if (details.windowId) {
        let tabId = App.getRuntime(details.windowId).tabId;
        delete details.windowId;
        details.tabId = tabId;
        App.setBadgeBackgroundColor(details);
      }
    }
  },

  updateBadgeFinished(windowId) {
    let num = App.getRuntime(windowId).imagesSaved;
    let color = "#579900"; // green
    if (App.getRuntime(windowId).imagesFailed > 0) {
      color = "#d3290f"; // red
    } else if (App.getRuntime(windowId).imagesSaved === 0) {
      color = "#cc9a23"; // yellow
    }
    App.setBadgeText({text: num.toString(), windowId});
    App.setBadgeBackgroundColor({color, windowId});
    App.hideBadge();
  },

  updateBadgeSaving(windowId) {
    let num = App.getRuntime(windowId).imagesSaved;
    if (num > 0) {
      App.setBadgeText({text: num.toString(), windowId});
      App.setBadgeBackgroundColor({color: "#486fe3", windowId}); // blue
    }
  },

  updateBadgeLoading(windowId, percent = undefined) {
    let text = "";
    if (percent !== undefined) {
      let icons = "○◔◑◕●";
      let x = Math.round(percent / 100 * 4);
      text = icons.charAt(x);
    } else {
      let icons = "◷◶◵◴";
      let num = App.getRuntime(windowId).badgeLoading;
      text = icons.charAt(num);
      num++;
      if (num > 3) {
        num = 0;
      }
      App.getRuntime(windowId).badgeLoading = num;
    }
    App.setBadgeText({text, windowId});
    App.setBadgeBackgroundColor({color: "#8b67b3", windowId}); // purple
  },

  async notify(id, message) {
    if (!App.options.notifyEnded) {
      return null;
    }
    try {
      let obj = {
        "type": "basic",
        "iconUrl": browser.extension.getURL(App.options.icon)
      };
      for (let prop in message) {
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

  finished(windowId) {
    App.updateBadgeFinished(windowId);
    let msgErr = "";
    let tabsError = App.getRuntime(windowId).tabsError;
    if (tabsError > 0) {
      if (App.options.action === "current") {
        msgErr = "active tab does not have permission";
      } else {
        msgErr = `${tabsError} tabs do not have permission`;
      }
    }
    if (App.getRuntime(windowId).tabsLoaded === 0) {
      App.notify(`finished_${windowId}`, {
        title: "Tab Image Saver",
        message: `No tabs processed: ${App.options.filter}\n${msgErr}`
      });
      return;
    }
    let imagesSaved = App.getRuntime(windowId).imagesSaved;
    let imagesFailed = App.getRuntime(windowId).imagesFailed;
    console.log(`${imagesSaved} Saved, ${imagesFailed} Failed`);
    let msg = "";
    if (imagesSaved > 0) {
      msg += `Saved: ${imagesSaved}\n`;
    }
    if (imagesFailed > 0) {
      msg += `Failed: ${imagesFailed}\n`;
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

  // call when download ends to cleanup and close tab
  async downloadEnded(download) {
    let dlid = download.id;
    let windowId = App.getDownloadWindow(dlid);
    if (
      download.state === "complete"
      && download.fileSize > 0 // totalBytes may be undefined
      && download.mime !== "text/html"
    ) {
      App.updateBadgeSaving(windowId);
      let tabid = App.removeDownload(dlid);
      console.log(`Download ${dlid} complete`, download);
      App.getRuntime(windowId).imagesSaved++;
      if (App.options.closeTab) {
        if (App.isTabFinished(tabid, windowId)) {
          try {
            await browser.tabs.remove(tabid);
            console.log(`Tab removed ${tabid}`);
          } catch (err) {
            console.error(`Failed removing tab ${tabid}:`, err);
          }
        }
      }
      return true;
    }
    console.warn("Download failed", download);
    App.getRuntime(windowId).imagesFailed++;
    App.removeDownload(dlid);
    return false;
  },

  // handle downloads changed events
  // note: catches all changes to Downloads, not just from this webext
  async handleDownloadChanged(delta) {
    console.log("handleDownloadChanged", delta);
    if (delta.state && delta.state.current !== "in_progress") {
      let dlid = delta.id;
      let downloads = await browser.downloads.search({"id": dlid});
      for (let download of downloads) {
        let dlid = download.id;
        if (App.getDownload(dlid) !== undefined) {
          App.downloadEnded(download); // await?
        }
      }
    }
  },

  isValidFilename(filename) {
    return (filename.length > 0) && (!/[*"/\\:<>|?]/.test(filename));
  },

  // start the download
  async startDownload(url, path, tabid, windowId) {
    if (App.isCancelled(windowId)) {
      console.log("cancel:startDownload");
    } else {
      try {
        let dlid = await browser.downloads.download({
          url,
          filename: path,
          saveAs: false, // required from FF58, min_ver FF52
          conflictAction: App.options.conflictAction,
          headers: [{name: "cache", value: "force-cache"}],
          incognito: App.options.removeEnded // min_ver FF57
        });
        console.log(`Download ${dlid} from tab ${tabid}`);
        App.addDownload(dlid, tabid, windowId);
        return dlid;
      } catch (err) {
        // catch errors related to Access Denied for data:image URLs
        console.error(`Download failed (${path}):`, err);
      }
    }
    App.getRuntime(windowId).imagesFailed++;
    return false;
  },

  // download using XHR for filename
  downloadXhr(image, tabid, windowId) {
    return new Promise((resolve, reject) => {
      let xhr = new XMLHttpRequest();
      xhr.open("HEAD", image.src);
      // catches events for: load, error, abort
      xhr.onload = function() {
        // try getting filename from response header in XHR request
        console.log("XHR URL:", image.src);
        let filename = "";
        let disposition = this.getResponseHeader("Content-Disposition");
        if (disposition && disposition.indexOf("filename") !== -1) {
          let filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
          let matches = filenameRegex.exec(disposition);
          if (matches !== null && matches[1]) {
            filename = matches[1].replace(/['"]/g, "");
            console.log("XHR Filename:", filename);
          }
        } else {
          console.log("XHR response did not provide filename");
        }

        if (!App.isValidFilename(filename)) {
          // no filename found, so create filename from url
          // get full path and extract filename
          filename = parseURL(image.src).pathname.replace(/^.*[/\\]/, "");
          filename = filename.replace(/:.*/, ""); // Workaround for Twitter
          if (!App.isValidFilename(filename)) {
            // no filename found from url, so use full path as filename
            filename = parseURL(image.src).pathname.replace(/^[/\\]*/, "").replace(/[/\\]*$/, ""); // remove leading and trailing slashes
            filename = sanitizeFilename(filename);
            if (!App.isValidFilename(filename)) {
              // if still no valid filename
              console.warn("Unable to generate filename");
              filename = "image";
            }
          }
          filename = decodeURI(filename);
          console.log("Filename from url:", filename);
        }
        let path = App.options.downloadPath;
        path += filename;
        resolve(App.startDownload(image.src, path, tabid, windowId));
      };
      xhr.onerror = function() {
        reject({
          status: this.status,
          statusText: xhr.statusText
        });
      };
      xhr.send();
    });
  },

  async download(image, tabid, windowId) {
    if (App.isCancelled(windowId)) {
      console.log("cancel:download");
      return false;
    }
    let path = App.options.downloadPath;
    let filename = "";
    if (App.options.altIsFilename && image.alt) {
      // append filename from alt attribute and filename extension
      filename = sanitizeFilename(image.alt) + App.options.altFilenameExt;
      console.log("Trying alt filename:", filename);
    }
    if (App.isValidFilename(filename)) {
      path += filename;
      return await App.startDownload(image.src, path, tabid, windowId);
    }
    return await App.downloadXhr(image, tabid, windowId);
  },

  // select valid images and remove duplicates
  // return array of images to be downloaded
  processTabResult(images, windowId) {
    let result = [];
    if (!images) {
      return result;
    }
    for (let image of images) {
      let url = image.src;
      if (url.indexOf("data:") === 0) {
        App.getRuntime(windowId).imagesFailed++;
        console.warn("Embedded image is unsupported"); // TODO support embedded
      } else if (!App.isUniqueUrl(url, windowId)) {
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

  async executeTab(tab, windowId) {
    if (tab) {
      let tabid = tab.id;
      try {
        console.log(`Sending tab ${tabid}: ${App.options.contentScript}`, tab);
        // returns array of script result for each loaded tab
        let results = await browser.tabs.executeScript(
          tabid, {
            file: App.options.contentScript,
            runAt: "document_end" // "document_idle" may block if page is manually stopped
          }
        );
        App.getRuntime(windowId).tabsLoaded++;
        console.log(`Response from tab ${tabid}`, results);
        let images = App.processTabResult(results[0], windowId);
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

  getWindowTabs(windowId) {
    return browser.tabs.query({windowId});
  },

  resolveCompleted(promises) {
    // map catch blocks to all promises, so that all promises are run
    return Promise.all(promises.map(p => p.catch(e => {
      console.error("resolveCompleted.map", e);
      return false;
    })))
      .then(completed => {
        console.log("resolveCompleted then:", completed);
        return true;
      })
      .catch(err => {
        console.error("resolveCompleted error", err);
      });
  },

  // wait until internal downloads map is empty
  async waitForDownloads(windowId) {
    while (App.downloadsLength(windowId) > 0) {
      await App.sleepOrCancel(1000, windowId);
      if (App.isCancelled(windowId)) {
        console.log("cancel:resolveDownloads");
        return false;
      }
    }
    return true;
  },

  resolveDownloads(promises, windowId) {
    // map catch blocks to all promises, so that all promises are run
    return Promise.all(promises.map(p => p.catch(e => {
      console.error("resolveDownloads.map", e);
      return false;
    })))
      .then(downloads => {
        console.log("resolveDownloads then:", downloads);
        return App.resolveCompleted([App.waitForDownloads(windowId)]);
      })
      .catch(err => {
        console.error("resolveDownloads error", err);
      });
  },

  resolveTabs(promises, windowId) {
    // map catch blocks to all promises, so that all promises are run
    return Promise.all(promises.map(p => p.catch(e => {
      console.error("resolveTabs.map", e);
      return false;
    })))
      .then(tabResults => {
        console.log("resolveTabs then:", tabResults);
        // executeTab returns: [tabid, [results]]
        let promiseDownloads = [];
        for (let result of tabResults) {
          if (result === false) {
            // tab skipped
          } else {
            // tab ended
            let tabid = result[0];
            let images = result[1];
            for (let image of images) {
              promiseDownloads.push(App.download(image, tabid, windowId));
            }
          }
        }
        return App.resolveDownloads(promiseDownloads, windowId);
      })
      .catch(err => {
        console.error("resolveTabs error", err);
      });
  },

  // wait for all tabs in tabmap to have status=complete
  // returns array of tabs
  async waitForTabs(tabsWaiting, windowId) {
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
          let percent = (ms - remain) / ms * 100;
          App.updateBadgeLoading(windowId, percent);
        }
      );
    }
    return tabsReady;
  },

  async executeTabs(method, windowId) {
    let doTab = false;
    let doAfter = false;
    let doCurrent = false;
    switch (method) {
      case "left":
        doTab = true;
        break;
      case "right":
        doAfter = true;
        break;
      case "all":
        doTab = true;
        doAfter = true;
        break;
      case "current":
        doCurrent = true;
        break;
      default:
        console.error("Invalid method for executeTabs:", method);
        return false;
    }
    let promiseTabs = [];
    let alltabs = await App.getWindowTabs(windowId);
    let tabsWaiting = new Map();
    for (let tab of alltabs) {
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
    let tabs = await App.waitForTabs(tabsWaiting, windowId);
    if (!tabs) {
      console.log("cancel:executeTabs");
      return false;
    }
    for (let tab of tabs) {
      promiseTabs.push(App.executeTab(tab, windowId));
    }
    return await App.resolveTabs(promiseTabs, windowId);
  },

  async getActiveTab(windowId)
  {
    let ret = await browser.tabs.query({windowId, active: true});
    return ret[0]; // TODO error check
  },

  async init() {
    let mywindow = await browser.windows.getCurrent();
    let windowId = mywindow.id;
    if (App.runtime.has(windowId)) {
      console.warn("Cancelling windowId:", windowId);
      App.getRuntime(windowId).cancel = true;
      return;
    }
    let mytab = await App.getActiveTab(windowId);
    let tabId = mytab.id;
    console.log("init", {windowId, tabId});
    App.setupBadge(); // run before clearing runtime
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
      downloads: new Map(), // downloads in progress mapped to tabs
      cancel: false
    });

    await App.loadOptions();
    App.updateBadgeLoading(windowId);
    await App.executeTabs(App.options.action, windowId);
    App.finished(windowId);
    App.runtime.delete(windowId); // cleanup
  },

  // handle messages from content scripts
  handleMessage(request, sender, sendResponse) {
    console.log(`Message from tab ${sender.tab.id}`, request);
    let windowId = sender.tab.windowId;
    switch (request.action) {
      case "config":
        sendResponse({
          action: request.action,
          body: {
            filter: App.options.filter,
            minHeight: App.options.minHeight,
            minWidth: App.options.minWidth
          }
        });
        break;
      case "cancel":
        sendResponse({
          action: request.action,
          body: {cancel: App.isCancelled(windowId)}
        });
        break;
      default:
        console.error("Unexpected message from tab", request);
        break;
    }
  }
};

function shortcutCommand(command) {
  if (command === App.options.command) {
    console.log("Caught keyboard shortcut");
    App.init();
  }
}

async function loadShortcut() {
  console.log("loadShortcut", App.options.command);
  let result = await browser.storage.local.get("shortcut");
  if (result.shortcut !== undefined) {
    await browser.commands.update({
      name: App.options.command,
      shortcut: result.shortcut
    });
    console.log("shortcut updated:", result.shortcut);
  } else {
    console.log("shortcut not set");
  }
}

browser.browserAction.onClicked.addListener(App.init);
browser.commands.onCommand.addListener(shortcutCommand);
browser.runtime.onInstalled.addListener(loadShortcut);
browser.runtime.onStartup.addListener(loadShortcut);
browser.runtime.onMessage.addListener(App.handleMessage);
browser.downloads.onChanged.addListener(App.handleDownloadChanged);
