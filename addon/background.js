// return random int between min:max
function randomIntFromInterval(min, max)
{
  return Math.floor(Math.random() * (max - min + 1) + min);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

let App = {
  options: {
    contentScript: "/content-getimages.js",
    command: "_execute_browser_action", // keyboard shortcut command
    icon: "icons/tab-image-saver-v2.svg" // icon used on notifications
  },

  runtime: undefined, // defined by init()

  isCancelled() {
    return App.runtime.cancel;
  },

  addDownload(dlid, tabid) {
    return App.runtime.downloads.set(dlid, tabid);
  },

  getDownload(dlid) {
    return App.runtime.downloads.get(dlid);
  },

  removeDownload(dlid) {
    let tabid = App.getDownload(dlid);
    delete App.runtime.downloads.delete(dlid);
    return tabid;
  },

  downloadsLength() {
    return App.runtime.downloads.size;
  },

  // is finished when all downloads for tabid have been removed
  isTabFinished(tabid) {
    // TODO create tabs.Map() to track tabid => [download ids]
    let tabs = Array.from(App.runtime.downloads.keys());
    if (tabs.indexOf(tabid) === -1) {
      return true;
    }
    return false;
  },

  addUrl(url) {
    App.runtime.urls.add(url);
  },

  // is valid if not duplicate
  isUniqueUrl(url) {
    return !App.runtime.urls.has(url);
  },

  async sleepOrCancel(ms, callback=undefined) {
    let chunk = 500;
    if (ms < chunk) {
      chunk = ms;
    }
    for (let remain = ms; remain > 0; ) {
      console.log("subsleep", chunk);
      await sleep(chunk);
      if (callback !== undefined) {
        callback();
      }
      remain = remain - chunk;
      if (App.isCancelled()) {
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

  updateBadgeLoading() {
    console.log(`TABS_ENDED ${App.runtime.tabsEnded} + TABS_SKIPPED ${App.runtime.tabsSkipped} / TABS_LOADED ${App.runtime.tabsLoaded}`);
    let icons = ["◷", "◶", "◵", "◴"];
    // let num = parseInt(100 * (App.runtime.tabsEnded + App.runtime.tabsSkipped) / App.runtime.tabsLoaded, 10);
    let text = icons[App.runtime.badgeLoading];
    let num = App.runtime.badgeLoading;
    num++;
    if (num >= 3) {
      num = 0;
    }
    App.runtime.badgeLoading = num;
    browser.browserAction.setBadgeText({text});
    browser.browserAction.setBadgeBackgroundColor({color: "blue"});
  },

  setupBadge() {
    if (App.runtime && App.runtime.badgeTimeout) {
      clearTimeout(App.runtime.badgeTimeout);
    }
    //App.updateBadgeLoading();
  },

  hideBadge() {
    App.runtime.badgeTimeout = setTimeout(() => {
      browser.browserAction.setBadgeText({text: ""});
    }, 5000);
  },

  updateBadgeFinished() {
    let num = App.runtime.imagesSaved;
    browser.browserAction.setBadgeText({text: num.toString()});
    if (App.runtime.imagesFailed > 0) {
      browser.browserAction.setBadgeBackgroundColor({color: "red"});
    } else if (App.runtime.imagesSaved === 0) {
      browser.browserAction.setBadgeBackgroundColor({color: "gray"});
    } else {
      browser.browserAction.setBadgeBackgroundColor({color: "green"});
    }
    App.hideBadge();
  },

  updateBadgeSaving() {
    // parseInt(100 * (IMAGES_MATCHED > 0 ? IMAGES_SAVED / IMAGES_MATCHED : IMAGES_MATCHED));
    let num = App.runtime.imagesSaved;
    console.log("IMAGES_SAVED:", num);
    browser.browserAction.setBadgeText({text: num.toString()});
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

  finished() {
    App.runtime.busy = false;
    App.updateBadgeFinished();
    let msgErr = "";
    if (App.runtime.tabsError > 0) {
      if (App.options.action === "current") {
        msgErr = "active tab does not have permission";
      } else {
        msgErr = `${App.runtime.tabsError} tabs do not have permission`;
      }
    }
    if (App.runtime.tabsLoaded === 0) {
      App.notify("finished", {
        title: "Tab Image Saver",
        message: `No tabs processed: ${App.options.filter}\n${msgErr}`
      });
      return;
    }
    console.log(`${App.runtime.imagesMatched} Found, ${App.runtime.imagesSaved} Saved, ${App.runtime.imagesFailed} Failed`);
    /*
    if (App.runtime.imagesMatched !== (App.runtime.imagesSaved + App.runtime.imagesFailed)) {
      return;
    }
    */
    let msg = `Saved: ${App.runtime.imagesSaved}\n`;
    if (App.runtime.imagesFailed > 0) {
      msg += `Failed: ${App.runtime.imagesFailed}\n`;
    }
    msg += "\n";
    // if (App.runtime.tabsSkipped > 0) {
    //  msg += `${App.runtime.tabsSkipped} tabs skipped\n`;
    // }
    console.log("Notify finished");
    App.notify("finished", {
      title: "Tab Image Saver",
      message: `${msg}${msgErr}`
    });
  },

  // call when download ends to cleanup and close tab
  async downloadEnded(download) {
    console.log("downloadComplete", download);
    if (download.state === "complete" && download.fileSize > 0) { // totalBytes may be undefined
      let dlid = download.id;
      let tabid = App.removeDownload(dlid);
      console.log(`Download ${dlid} complete`);
      App.runtime.imagesSaved++;
      if (App.options.closeTab) {
        if (App.isTabFinished(tabid)) {
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
    console.warn("Download size is 0 bytes", download);
    App.runtime.imagesFailed++;
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
          App.downloadEnded(download); // await not required
        }
      }
    }
  },

  /*
  // poll in_progress download until state change
  async waitForDownload(dlid) {
    let complete = false;
    let loop = true;
    while (loop) {
      let downloads = await browser.downloads.search({"id": dlid});
      if (!downloads[0]) {
        console.error("Download missing", dlid);
        App.runtime.imagesFailed++;
        return false;
      }
      let download = downloads[0];
      switch (download.state) {
        case "in_progress":
          if (App.isCancelled()) {
            console.log("cancel:waitForDownload", dlid);
            browser.downloads.cancel(dlid); // no await
            loop = false;
          } else {
            console.log("waitForDownload:", dlid);
            await sleep(randomIntFromInterval(1000, 3000)); // sleep 1-3sec
          }
          break;
        case "complete":
          complete = await App.downloadComplete(download);
          loop = false;
          break;
        case "interrupted":
        default:
          loop = false;
          break;
      }
    }
    App.updateBadgeSaving();
    if (!complete) {
      App.runtime.imagesFailed++;
    }
    return complete;
  },
  */

  isValidFilename(filename) {
    return (filename.length > 0) && (!/[*"/\\:<>|?]/.test(filename));
  },

  // start the download
  async startDownload(url, path, tabid) {
    if (App.isCancelled()) {
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
        App.addDownload(dlid, tabid);
        App.updateBadgeLoading();
        return dlid;
      } catch (err) {
        // catch errors related to Access Denied for data:image URLs
        console.error(`Download failed (${path}):`, err);
      }
    }
    App.updateBadgeLoading();
    App.runtime.imagesFailed++;
    return false;
  },

  // download using XHR for filename
  downloadXhr(image, tabid) {
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
          filename = image.src.replace(/^.*[/\\]/, "");
          filename = filename.replace(/\?.*/, ""); // Remove query string
          filename = filename.replace(/:.*/, ""); // Workaround for Twitter
          if (!App.isValidFilename(filename)) {
            // no filename found from url, so use domain+path as filename
            filename = image.src.replace(/\?.*/, ""); // Remove query string
            filename = filename.replace(/:.*/, ""); // Workaround for Twitter
            filename = filename.replace(/[*"/\\:<>|?]/g, "_"); // Remove invalid characters
            // TODO if still no valid filename
          }
          filename = decodeURI(filename);
          console.log("Filename from url:", filename);
        }
        let path = App.options.downloadPath;
        path += filename;
        resolve(App.startDownload(image.src, path, tabid));
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

  async download(image, tabid) {
    if (App.isCancelled()) {
      console.log("cancel:download");
      return false;
    }
    let path = App.options.downloadPath;
    let filename = "";
    if (App.options.altIsFilename && image.alt) {
      // append filename from alt attribute and filename extension
      filename = image.alt + App.options.altFilenameExt;
      console.log("Trying alt filename:", filename);
    }
    if (App.isValidFilename(filename)) {
      path += filename;
      return await App.startDownload(image.src, path, tabid);
    }
    App.updateBadgeLoading();
    return await App.downloadXhr(image, tabid);
  },

  // select valid images and remove duplicates
  // return array of images to be downloaded
  processTabResult(images) {
    let result = [];
    if (!images) {
      return result;
    }
    for (let image of images) {
      let url = image.src;
      if (url.indexOf("data:") === 0) {
        App.runtime.imagesFailed++;
        console.warn("Embedded image is unsupported"); // TODO support embedded
      } else if (!App.isUniqueUrl(url)) {
        console.log("Duplicate URL skipped", url);
        App.runtime.imagesSkipped++;
      } else {
        App.addUrl(url);
        console.log("Found image:", url);
        App.runtime.imagesMatched++;
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
      await sleep(1000); //randomIntFromInterval(500, 1000));
      tab = await browser.tabs.get(tab.id);
      sleepMore = true;
    }
    return tab;
  },
  */

  async executeTab(tab) {
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
        App.runtime.tabsLoaded++;
        console.log(`Response from tab ${tabid}`, results);
        let images = App.processTabResult(results[0]);
        App.updateBadgeLoading();
        if (images.length > 0) {
          App.runtime.tabsEnded++;
          return [tabid, images];
        }
      } catch (err) {
        App.runtime.tabsError++;
        App.updateBadgeLoading();
        console.error(`Error executing tab ${tabid}`, err);
        return false;
      }
    }
    App.runtime.tabsSkipped++;
    return false;
  },

  getCurrentWindowTabs() {
    return browser.tabs.query({currentWindow: true});
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
  async waitForDownloads() {
    while (App.downloadsLength() > 0) {
      console.log("waitForDownloads:", App.runtime.downloads);
      await App.sleepOrCancel(1000);
      if (App.isCancelled()) {
        console.log("cancel:resolveDownloads");
        return false;
      }
    }
    return true;
  },

  resolveDownloads(promises) {
    // map catch blocks to all promises, so that all promises are run
    return Promise.all(promises.map(p => p.catch(e => {
      console.error("resolveDownloads.map", e);
      return false;
    })))
      .then(downloads => {
        console.log("resolveDownloads then:", downloads);
        return App.resolveCompleted([App.waitForDownloads()]);
        /*
        // poll individual downloads
        let promiseCompleted = [];
        for (let dlid of downloads) {
          if (dlid === false) {
            // download failed
          } else {
            promiseCompleted.push(App.waitForDownload(dlid));
          }
        }
        return App.resolveCompleted(promiseCompleted);
        */
      })
      .catch(err => {
        console.error("resolveDownloads error", err);
      });
  },

  resolveTabs(promises) {
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
              promiseDownloads.push(App.download(image, tabid));
            }
          }
        }
        return App.resolveDownloads(promiseDownloads);
      })
      .catch(err => {
        console.error("resolveTabs error", err);
      });
  },

  // wait for all tabs in tabmap to have status=complete
  // returns array of tabs
  async waitForTabs(tabmap) {
    let tabsWaiting = tabmap;
    let tabsReady = [];
    let sleepMore = false;
    while (tabsWaiting.size > 0) {
      //App.updateBadgeLoading();
      for (let tabid of tabsWaiting.keys()) {
        if (App.isCancelled()) {
          console.log("cancel:waitForTabs", tab);
          return false;
        }
        let tab = tabsWaiting.get(tabid);
        // scripts do not run in discarded tabs
        if (tab.discarded) {
          console.log(`Tab ${tab.id} discarded, reloading:`, tab.url);
          tab = await browser.tabs.update(tab.id, {url: tab.url}); // reload() does not affect discarded state
          sleepMore = true;
        }
        if (tab.status === "complete" && tabsWaiting.delete(tabid)) {
          tabsReady.push(tab);
          if (tabsWaiting.size === 0) {
            if (sleepMore) {
              if(!await App.sleepOrCancel(5000, App.updateBadgeLoading)) {
                //console.log("cancelled");
                return false;
              }
            }
            return tabsReady;
          }
          continue;
        }
        // tab.status === "loading"
        sleepMore = true;
        console.log("waitForTabs:", tab);
        tab = await browser.tabs.get(tab.id);
        tabsWaiting.set(tab.id, tab); // update map
      }
      if (!await App.sleepOrCancel(1000, App.updateBadgeLoading)) {
        return false;
      }
    }
    return tabsReady;
  },

  async executeTabs(method) {
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
    let alltabs = await App.getCurrentWindowTabs();
    let tabsWaiting = new Map();
    for (let tab of alltabs) {
      /* if (App.isCancelled()) {
        console.log("cancel:executeTabs");
        return;
      }*/
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
    let tabs = await App.waitForTabs(tabsWaiting);
    if (!tabs) {
      console.log("cancel:executeTabs");
      return false;
    }
    for (let tab of tabs) {
      promiseTabs.push(App.executeTab(tab));
    }
    return await App.resolveTabs(promiseTabs);
  },

  async init() {
    if (App.runtime !== undefined && App.runtime.busy) {
      console.warn("Cancelling actions");
      App.runtime.cancel = true;
      return;
    }
    App.setupBadge(); // run before clearing runtime
    App.runtime = {
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
      busy: true,
      cancel: false
    };

    await App.loadOptions();
    await App.executeTabs(App.options.action);
    App.finished();
    
  },

  // handle messages from content scripts
  handleMessage(request, sender, sendResponse) {
    console.log(`Message from tab ${sender.tab.id}`, request);
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
          body: {cancel: App.isCancelled()}
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
