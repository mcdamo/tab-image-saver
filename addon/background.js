/* Global variables */
let ACTION;
let ACTIVE_TAB;
let CLOSE_TAB;
let DOWNLOAD_PATH; // Empty to use Downloads directory or specify subfolder within Downloads directory (no leading or trailing slashes)
let CONFLICT_ACTION;
let MIN_WIDTH;
let MIN_HEIGHT;
let NOTIFY_ENDED;
let REMOVE_ENDED;
let ALT_IS_FILENAME;
let ALT_FILENAME_EXT;
let SCRIPT_MAXIMAGE = "/content-maximage.js"; // content script to find largest image
let SCRIPT_ALLIMAGE = "/content-allimage.js"; // content script to find all images
let SCRIPT_TABIMAGE = "/content-tabimage.js"; // content script to test if tab is a direct image
let CONTENT_SCRIPT = SCRIPT_MAXIMAGE;
let TABS_LOADED = 0; // number of tabs executed
let TABS_ENDED = 0; // number of tabs returned a message
let TABS_SKIPPED = 0; // tabs with no valid images
let IMAGES_MATCHED = 0; // valid images
let IMAGES_SAVED = 0; // saved images
let IMAGES_FAILED = 0; // failed downloads
let DOWNLOADS = [];
let COMMAND = "_execute_browser_action"; // keyboard shortcut command

function getOptions(callback) {
  let getting = browser.storage.local.get();
  getting.then(result => {
    console.log("Loaded Options:", result);
    ACTION = result.action || "current";
    ACTIVE_TAB = result.activeTab;
    CLOSE_TAB = result.closeTab;
    DOWNLOAD_PATH = result.downloadPath || "";
    if (DOWNLOAD_PATH.length > 0) {DOWNLOAD_PATH += "/";}
    CONFLICT_ACTION = result.conflictAction || "uniquify";
    ALT_IS_FILENAME = result.altIsFilename;
    ALT_FILENAME_EXT = result.altFilenameExt;
    MIN_WIDTH = result.minWidth || "100";
    MIN_HEIGHT = result.minHeight || "100";
    if (result.notifyEnded === null) {result.notifyEnded = true;}
    NOTIFY_ENDED = result.notifyEnded;
    REMOVE_ENDED = result.removeEnded;
    if (result.filter === "all") {
      CONTENT_SCRIPT = SCRIPT_ALLIMAGE;
    } else if (result.filter === "direct") {
      CONTENT_SCRIPT = SCRIPT_TABIMAGE;
    } else {
      CONTENT_SCRIPT = SCRIPT_MAXIMAGE;
    }
    callback();
    return;
  }).catch(error => {
    // notify("error", {
    //      "title": "Error",
    //      "content": "
    console.error("OptionsError:", error);
    return false;
  });
}

function setupBadge()
{
  browser.browserAction.setBadgeText({text: ""});
  browser.browserAction.setBadgeBackgroundColor({color: "blue"});
}

function updateBadge()
{
  let text = (IMAGES_MATCHED - IMAGES_SAVED).toString();
  browser.browserAction.setBadgeText({text});
  if (TABS_LOADED === 0) {
    browser.browserAction.setBadgeBackgroundColor({color: "gray"});
  } else if (IMAGES_FAILED > 0) {
    browser.browserAction.setBadgeBackgroundColor({color: "red"});
  }
}

function hideBadge()
{
  browser.browserAction.setBadgeText({text: ""});
}

function notify(id, message) {
  let note = browser.notifications.create(id, {
    "type": "basic",
    "iconUrl": browser.extension.getURL("icons/down-48.png"),
    "title": message.title,
    "message": message.content
  });
  note.then().catch(error => {
    console.error("Note failed:", error);
    return;
  });
}

function notifyFinished() {
  updateBadge();
  if (!NOTIFY_ENDED) {
    return;
  }
  if (TABS_LOADED !== TABS_ENDED) {
    return;
  }
  if (TABS_LOADED === 0) {
    notify("finished", {
      title: "Tab Image Saver",
      content: "Nothing to do"
    });
    return;
  }
  console.log(`${IMAGES_MATCHED} Found, ${IMAGES_SAVED} Saved, ${IMAGES_FAILED} Failed`);
  if (IMAGES_MATCHED !== (IMAGES_SAVED + IMAGES_FAILED)) {
    return;
  }
  console.log("Notify finished");
  hideBadge();
  notify("finished", {
    title: "Tab Image Saver",
    content: `${IMAGES_SAVED} downloaded\n${TABS_SKIPPED} tabs skipped\n${IMAGES_FAILED} failed`
  });
  // setTimeout(browser.notifications.clear('finished'), 4000);
}

/* call after download completes to cleanup and close tab */
function downloadComplete(dlid, tabid) {
  delete DOWNLOADS[dlid];
  console.log(`Download ${dlid} complete`);
  IMAGES_SAVED++;
  if (CLOSE_TAB) {
    if (DOWNLOADS.indexOf(tabid) === -1) {
      let removing = browser.tabs.remove(tabid);
      removing.then(result => {
        // removed
        console.log(`Tab removed ${tabid}`);
        return;
      }).catch(error => {
        // TODO
        console.error(`Failed removing tab ${tabid}:`, error);
      });
    }
  }
  notifyFinished();
}

/* check Download was instigated by this webext and is nonzero in size */
function verifyDownloads(downloads) {
  for (let download of downloads) {
    let dlid = download.id;
    if (DOWNLOADS[dlid] !== undefined) {
      if (download.fileSize > 0) { // totalBytes may be undefined
        downloadComplete(dlid, DOWNLOADS[dlid]);
      }
    }
  }
}

/* catches all changes to Downloads, not just from this webext */
function onDownloadChanged(delta) {
  if (delta.state && delta.state.current === "complete") {
    let dlid = delta.id;
    let download = browser.downloads.search({"id": dlid});
    download.then(result => verifyDownloads(result))
      .catch(error => {
      // TODO
        console.error(`Failed searching download ${dlid}:`, error);
      });
  }
}

/* download started - store reference to tabid in global array */
function onDownloadStarted(dlid, tabid, path) {
  console.log(`Download(${IMAGES_SAVED})`, path);
  DOWNLOADS[dlid] = tabid;
}

function onDownloadFailed(e, path) {
  IMAGES_FAILED++;
  console.error(`Download failed (${path}):`, e);
  notifyFinished();
}

function isValidFilename(filename) {
  return (filename.length > 0) && (!/[*"/\\:<>|?]/.test(filename));
}

/* do the download */
function download(url, path, tabid) {
  try {
    let downloading = browser.downloads.download({
      url,
      filename: path,
      saveAs: false, // required from FF58, min_ver FF52
      conflictAction: CONFLICT_ACTION,
      headers: [{name: "cache", value: "force-cache"}],
      incognito: REMOVE_ENDED // min_ver FF57
    });
    downloading.then(dlid => onDownloadStarted(dlid, tabid, path))
      .catch(error => onDownloadFailed(error, path));
  } catch (error) {
    // catch errors related to Access Denied for data:image URLs
    onDownloadFailed(error, path);
    return;
  }
}

/* now using XHR for filename */
function downloadXhr(image, tabid) {
  let path = DOWNLOAD_PATH;
  let filename = "";
  let xhrCallback = (function() { // catches events for: load, error, abort
    // try getting filename from response header in XHR request
    console.log("XHR URL:", image.src);
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

    if (!isValidFilename(filename)) {
      // no filename found, so create filename from url
      filename = image.src.replace(/^.*[/\\]/, "");
      filename = filename.replace(/\?.*/, ""); // Remove query string
      filename = filename.replace(/:.*/, ""); // Workaround for Twitter
      if (!isValidFilename(filename)) {
        // no filename found from url, so use domain+path as filename
        filename = image.src.replace(/\?.*/, ""); // Remove query string
        filename = filename.replace(/:.*/, ""); // Workaround for Twitter
        filename = filename.replace(/[*"/\\:<>|?]/g, "_"); // Remove invalid characters
        // TODO if still no valid filename
      }
      filename = decodeURI(filename);
      console.log("Filename from url:", filename);
    }
    path += filename;
    download(image.src, path, tabid);
  });
  if (ALT_IS_FILENAME && image.alt) {
    // append filename from alt attribute and filename extension
    filename = image.alt + ALT_FILENAME_EXT;
    console.log("Trying alt filename:", filename);
  }
  if (isValidFilename(filename)) {
    path += filename;
    download(image.src, path, tabid);
  } else {
    let xhr = new XMLHttpRequest();
    xhr.open("HEAD", image.src);
    xhr.addEventListener("loadend", xhrCallback);
    xhr.send();
  }
  return true;
}

/* receive image from content-script (Tab) */
function downloadImages(images, tabid) {
  if (!images) {
    console.log("No images found on tab:", tabid);
    TABS_SKIPPED++;
    return false;
  }
  for (let image of images) {
    let url = image.src;
    IMAGES_MATCHED++;
    if (url.indexOf("data:") === 0) {
      IMAGES_FAILED++;
      console.warn("Embedded image is unsupported"); // TODO support embedded
    } else {
      downloadXhr(image, tabid);
    }
  }
  return true;
}

function executeTab(tab) {
  TABS_LOADED++;
  let tabid = tab.id;
  console.log(`Sending tab ${tabid} (LOADED ${TABS_LOADED}):`, CONTENT_SCRIPT);
  // inject size variables and attach to global 'window' var
  let executing0 = browser.tabs.executeScript(
    tabid,
    {code: `window.MIN_WIDTH = ${MIN_WIDTH}; window.MIN_HEIGHT = ${MIN_HEIGHT};`}
  );
  executing0.then(result0 => {
    let executing = browser.tabs.executeScript(tabid, {file: CONTENT_SCRIPT});
    executing.then(result => {
      TABS_ENDED++;
      console.log(`Response from tab ${tabid} (ENDED ${TABS_ENDED})`);
      downloadImages(result[0], tabid);
      notifyFinished();
      return result;
    }).catch(error => {
      // TODO
      TABS_ENDED++;
      console.warn(`Error executing(1) tab ${tabid}: ${error}`);
      return false;
    });
    return result0;
  }).catch(error => {
    // TODO
    TABS_ENDED++;
    console.warn(`Error executing(0) tab ${tabid}: ${error}`);
    return false;
  });
}

function getCurrentWindowTabs() {
  return browser.tabs.query({currentWindow: true});
}

function callOnActiveTab(callback) {
  getCurrentWindowTabs().then(tabs => {
    for (let tab of tabs) {
      if (tab.active) {
        callback(tab, tabs);
      }
    }
    return;
  }).catch(error => {
    // TODO
    console.error("Error getting window tabs:", error);
  });
}

/* execute all tabs */
function tabsAll() {
  getCurrentWindowTabs().then(tabs => {
    for (let tab of tabs) {
      if (tab.active && !ACTIVE_TAB) {
        continue;
      }
      executeTab(tab);
    }
    return;
  }).catch(error => {
    // TODO
    console.error("Error getting window tabs:", error);
  });
}

/* execute on active tab */
function tabsCurrent() {
  callOnActiveTab((tab, tabs) => {
    executeTab(tab);
  });
}

/* execute tabs to the LEFT of the active tab */
function tabsLeft() {
  let returnNow = false;
  getCurrentWindowTabs().then(tabs => {
    for (let tab of tabs) {
      if (tab.active) {
        returnNow = true;
        if (!ACTIVE_TAB) {
          notifyFinished();
          return;
        }
      }
      executeTab(tab);
      if (returnNow) {
        return;
      }
    }
    return;
  }).catch(error => {
    // TODO
    console.error("Error calling active tab:", error);
  });
}

/* execute tabs to the right of the active tab */
function tabsRight() {
  callOnActiveTab((tab, tabs) => {
    console.log(`Starting at id: ${tab.id}, index: ${tab.index}`);
    let next = tab.index;
    if (!ACTIVE_TAB) {
      if ((tab.index + 1) === tabs.length) {
        // already at last tab
        notifyFinished();
        return;
      }
      next = tab.index + 1;
    }
    for (let i = next; i < tabs.length; i++) {
      executeTab(tabs[i]);
    }
  });
}

function executeTabs() {
  console.log(`Action: ${ACTION}`);
  switch (ACTION) {
    case "all":
      tabsAll();
      break;
    case "left":
      tabsLeft();
      break;
    case "right":
      tabsRight();
      break;
    case "current":
    default:
      tabsCurrent();
      break;
  }
}

function init() {
  TABS_LOADED = 0;
  TABS_ENDED = 0;
  TABS_SKIPPED = 0;
  IMAGES_MATCHED = 0;
  IMAGES_SAVED = 0;
  IMAGES_FAILED = 0;
  setupBadge();
  getOptions(executeTabs);
}

function shortcutCommand(command) {
  if (command === COMMAND) {
    console.log("Caught keyboard shortcut");
    init();
  }
}

async function loadShortcut() {
  console.log("loadShortcut");
  let result = await browser.storage.local.get("shortcut");
  if (result.shortcut !== undefined) {
    await browser.commands.update({
      name: COMMAND,
      shortcut: result.shortcut
    });
    console.log("shortcut loaded:", result.shortcut);
  } else {
    console.log("shortcut not set");
  }
}

browser.downloads.onChanged.addListener(onDownloadChanged);
browser.browserAction.onClicked.addListener(init);
browser.commands.onCommand.addListener(shortcutCommand);
browser.runtime.onInstalled.addListener(loadShortcut);
browser.runtime.onStartup.addListener(loadShortcut);
