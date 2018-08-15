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
    icon: "icons/tab-image-saver-v2.svg"
  },

  runtime: {
    tabsLoaded: 0, // tabs executed
    tabsEnded: 0, // tabs returned a message
    tabsSkipped: 0, // tabs with no valid images
    tabsError: 0, // tabs with no permission
    imagesMatched: 0, // valid images
    imagesSkipped: 0, // skipped duplicates
    imagesFailed: 0, // failed downloads
    urls: [], // unique urls
    downloads: [], // downloads in progress mapped to tabs
    busy: false
  },

  addDownload(dlid, tabid) {
    App.runtime.downloads[dlid] = tabid;
  },

  removeDownload(dlid) {
    let tabid = App.runtime.downlods[dlid];
    delete App.runtime.downloads[dlid];
    return tabid;
  },

  // is finished when all downloads for tabid have been removed
  isTabFinished(tabid) {
    if (App.runtime.downloads.indexOf(tabid) === -1) {
      return true;
    }
    return false;
  },

  addUrl(url) {
    App.runtime.urls[url] = true;
  },

  // is valid if not duplicate
  isUniqueUrl(url) {
    if (url in App.runtime.urls) {
      return false;
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
    let num = parseInt(100 * (App.runtime.tabsEnded + App.runtime.tabsSkipped) / App.runtime.tabsLoaded, 10);
    let text = "○";
    if (num >= 80) {
      text = "●";
    } else if (num >= 60) {
      text = "◕";
    } else if (num >= 40) {
      text = "◑";
    } else if (num >= 20) {
      text = "◔";
    }
    browser.browserAction.setBadgeText({text});
    browser.browserAction.setBadgeBackgroundColor({color: "blue"});
  },

  setupBadge() {
    clearTimeout(App.runtime.badgeTimeout);
    App.updateBadgeLoading();
  },

  hideBadge() {
    /*
    App.runtime.badgeTimeout = setTimeout(function() {
      browser.browserAction.setBadgeText({text: ""});
    }, 5000);
    */
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
    browser.browserAction.setBadgeText({text: num.toString()});
  },

  async notify(id, message) {
    if (!App.options.notifyEnded) {
      return null;
    }
    try {
      return await browser.notifications.create(id, {
        "type": "basic",
        "iconUrl": browser.extension.getURL(App.options.icon),
        "title": message.title,
        "message": message.content
      });
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
        content: `No tabs processed:\n${msgErr}`
      });
      return;
    }
    console.log(`${App.runtime.imagesMatched} Found, ${App.runtime.imagesSaved} Saved, ${App.runtime.imagesFailed} Failed`);
    /*
    if (App.runtime.imagesMatched !== (App.runtime.imagesSaved + App.runtime.imagesFailed)) {
      return;
    }
    */
    console.log("Notify finished");
    App.notify("finished", {
      title: "Tab Image Saver",
      content: `${App.runtime.imagesSaved} downloaded\n${App.runtime.imagesFailed} failed\n${App.runtime.tabsSkipped} tabs skipped\n${msgErr}`
    });
  },

  // call after download completes to cleanup and close tab
  async downloadComplete(download) {
    if (download.fileSize > 0) { // totalBytes may be undefined
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
    return false;
  },

  // poll in_progress downloads until state change
  async waitDownload(dlid) {
    let complete = false;
    let loop = true;
    while (loop) {
      let downloads = await browser.downloads.search({"id": dlid});
      // TODO if not found
      let download = downloads[0];
      switch (download.state) {
        case "in_progress":
          await sleep(randomIntFromInterval(1000, 2000)); // sleep 1-2sec
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
    return complete;
  },

  isValidFilename(filename) {
    return (filename.length > 0) && (!/[*"/\\:<>|?]/.test(filename));
  },

  // start the download
  async startDownload(url, path, tabid) {
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
      return dlid;
    } catch (err) {
      // catch errors related to Access Denied for data:image URLs
      App.runtime.imagesFailed++;
      console.error(`Download failed (${path}):`, err);
      App.updateBadgeSaving();
      return false;
    }
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

  download(image, tabid) {
    let path = App.options.downloadPath;
    let filename = "";
    if (App.options.altIsFilename && image.alt) {
      // append filename from alt attribute and filename extension
      filename = image.alt + App.options.altFilenameExt;
      console.log("Trying alt filename:", filename);
    }
    if (App.isValidFilename(filename)) {
      path += filename;
      return App.startDownload(image.src, path, tabid);
    }
    return App.downloadXhr(image, tabid);
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

  async executeTab(tab) {
    let tabid = tab.id;
    try {
      // scripts do not run in discarded tabs
      if (tab.discarded) {
        console.log(`Tab ${tab.id} discarded, reloading:`, tab.url);
        await browser.tabs.update(tab.id, {url: tab.url}); // reload() does not affect discarded state
        await sleep(randomIntFromInterval(500, 1500)); // TODO: hack to allow page to load before executing script
      }
      console.log(`Sending tab ${tabid}:`, App.options.contentScript);
      // returns array of script result for each loaded tab
      let results = await browser.tabs.executeScript(
        tabid, {
          file: App.options.contentScript,
          runAt: "document_end" // default "document_idle"
        }
      );

      App.runtime.tabsLoaded++;
      console.log(`Response from tab ${tabid}`, results);
      let images = App.processTabResult(results[0]);
      if (images.length > 0) {
        App.runtime.tabsEnded++;
        App.updateBadgeLoading();
        return [tabid, images];
      }
    } catch (err) {
      App.runtime.tabsError++;
      App.updateBadgeLoading();
      console.error(`Error executing tab ${tabid}`, err);
      return false;
    }
    App.runtime.tabsSkipped++;
    App.updateBadgeLoading();
    return false;
  },

  getCurrentWindowTabs() {
    return browser.tabs.query({currentWindow: true});
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
    let tabs = await App.getCurrentWindowTabs();
    for (let tab of tabs) {
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
        promiseTabs.push(App.executeTab(tab));
      }
      if (tab.active && !doAfter) {
        break;
      }
    }
    return Promise.all(promiseTabs)
      .then(tabResults => {
        console.log("executeTabs then:", tabResults);
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
        return Promise.all(promiseDownloads)
          .then(downloads => {
            console.log("downloadImages then:", downloads);
            let promiseDownloadsCompleted = [];
            for (let dlid of downloads) {
              if (dlid === false) {
                // download failed
              } else {
                promiseDownloadsCompleted.push(App.waitDownload(dlid));
              }
            }
            return Promise.all(promiseDownloadsCompleted)
              .then(completed => {
                console.log("downloadsCompleted then:", completed);
                return true;
              })
              .catch(err => {
                console.error("downloadsCompleted error", err);
              })
              .finally(() => {
                console.log("downloadsCompleted finally");
                App.finished();
              });
          })
          .catch(err => {
            console.error("downloadImages error", err);
          })
          .finally(() => {
            console.log("downloadImages finally");
          });
      })
      .catch(err => {
        console.error("executeTabs error", err);
      })
      .finally(() => {
        console.log("executeTabs finally");
      });
  },

  async init() {
    if (App.runtime.busy) {
      console.warn("Script running, action blocked");
      return;
    }
    let runtime = {
      busy: true,
      tabsLoaded: 0,
      tabsEnded: 0,
      tabsSkipped: 0,
      tabsError: 0,
      imagesMatched: 0,
      imagesSaved: 0,
      imagesFailed: 0,
      downloads: [],
      urls: []
    };
    for (let prop in runtime) {
      if ({}.propertyIsEnumerable.call(runtime, prop)) {
        App.runtime[prop] = runtime[prop];
      }
    }
    App.setupBadge();
    await App.loadOptions();
    App.executeTabs(App.options.action);
  },
  handleMessage(request, sender, sendResponse) {
    console.log(`Message from tab ${sender.tab.id}`, request);
    if (request.action === "config") {
      sendResponse({
        action: request.action,
        body: {
          filter: App.options.filter,
          minHeight: App.options.minHeight,
          minWidth: App.options.minWidth
        }
      });
    } else {
      console.error("Unexpected message from tab", request);
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
  console.log("loadShortcut");
  let result = await browser.storage.local.get("shortcut");
  if (result.shortcut !== undefined) {
    await browser.commands.update({
      name: App.options.command,
      shortcut: result.shortcut
    });
    console.log("shortcut loaded:", result.shortcut);
  } else {
    console.log("shortcut not set");
  }
}

browser.browserAction.onClicked.addListener(App.init);
browser.commands.onCommand.addListener(shortcutCommand);
browser.runtime.onInstalled.addListener(loadShortcut);
browser.runtime.onStartup.addListener(loadShortcut);
browser.runtime.onMessage.addListener(App.handleMessage);
