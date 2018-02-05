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
let SCRIPT_MAXIMAGE = "/content-maximage.js"; // content script to find largest image in tab
let SCRIPT_TABIMAGE = "/content-tabimage.js"; // content script to test if tab is a direct image
let CONTENT_SCRIPT = SCRIPT_MAXIMAGE;
let TABS_LOADED = 0; // number of tabs executed
let TABS_ENDED = 0; // number of tabs returned a message
let IMAGES_SAVED = 0; // valid images saved
let IMAGES_SKIPPED = 0; // invalid images

function getOptions(callback) {
  let getting = browser.storage.local.get();
  getting.then(result => {
    console.log("Loaded Options:");
    console.log(result);
    ACTION = result.action || "current";
    ACTIVE_TAB = result.activeTab;
    CLOSE_TAB = result.closeTab;
    DOWNLOAD_PATH = result.downloadPath || "";
    if (DOWNLOAD_PATH.length > 0) {DOWNLOAD_PATH += "/";}
    CONFLICT_ACTION = result.conflictAction || "uniquify";
    MIN_WIDTH = result.minWidth || "100";
    MIN_HEIGHT = result.minHeight || "100";
    if (result.notifyEnded === null) {result.notifyEnded = true;}
    NOTIFY_ENDED = result.notifyEnded;
    REMOVE_ENDED = result.removeEnded;
    if (result.tabImage) {CONTENT_SCRIPT = SCRIPT_TABIMAGE;}
    callback();
    return;
  }).catch(error => {
    // notify("error", {
    //      "title": "Error",
    //      "content": "
    console.error(`OptionsError: ${error}`);
    return false;
  });
}

function onDownloadStarted(dlid, tabid, path, callback) {
  IMAGES_SAVED++;
  console.log(`Download(${IMAGES_SAVED}) ${path}`);
  if (CLOSE_TAB) {
    let removing = browser.tabs.remove(tabid);
    removing.then(result => {
      // removed
      console.log(`Tab removed ${tabid}`);
      return;
    }).catch(error => {
      // TODO
      console.error(`Failed removing tab ${tabid}: ${error}`);
    });
  }
  if (REMOVE_ENDED) {
    browser.downloads.erase({"id": dlid});
  }
  callback();
}
function onDownloadFailed(e, path, callback) {
  IMAGES_SKIPPED++;
  console.error(`Download failed (${path}): ${e}`);
  callback();
}

/* receive image from content-script (Tab) */
function downloadImage(image, tabid, callback) {
  if (!image) {
    console.log("No image found");
    IMAGES_SKIPPED++;
    return false;
  }
  console.log(`${image.width}x${image.height} ${image.src}`);
  let path = DOWNLOAD_PATH;
  let url = image.src;
  if (image.width < MIN_WIDTH || image.height < MIN_HEIGHT) {
    console.log("Dimensions smaller than required, not saving");
    IMAGES_SKIPPED++;
    return false;
  }
  path += url.replace(/^.*[/\\]/, ""); // append filename from url
  let downloading = browser.downloads.download({
    url,
    filename: path,
    saveAs: false, // required from FF58, min_ver FF52
    conflictAction: CONFLICT_ACTION
  });
  downloading.then(dlid => onDownloadStarted(dlid, tabid, path, callback))
    .catch(error => onDownloadFailed(error, path, callback));
  return true;
}

function notify(id, message) {
  return browser.notifications.create(id, {
    "type": "basic",
    "iconUrl": browser.extension.getURL("icons/down-48.png"),
    "title": message.title,
    "message": message.content
  });
}

function notifyFinished()
{
  if (!NOTIFY_ENDED) {
    return;
  }
  if (TABS_LOADED !== TABS_ENDED) {
    return;
  }
  if (TABS_LOADED !== (IMAGES_SAVED + IMAGES_SKIPPED)) {
    return;
  }
  notify("finished", {
    title: "Tab Image Saver",
    content: `${IMAGES_SAVED} downloaded`
  });
  // setTimeout(browser.notifications.clear('finished'), 4000);
}

function executeTab(tab) {
  TABS_LOADED++;
  let tabid = tab.id;
  console.log(`Sending tab ${tabid} (LOADED ${TABS_LOADED}): ${CONTENT_SCRIPT}`);
  let executing = browser.tabs.executeScript(tabid, {file: CONTENT_SCRIPT});
  executing.then(result => {
    TABS_ENDED++;
    console.log(`Response from tab ${tabid} (ENDED ${TABS_ENDED})`);
    if (downloadImage(result[0], tabid, notifyFinished)) {
      // do nothing
    } else {
      notifyFinished();
    }
    return result;
  }).catch(error => {
    // TODO
    TABS_ENDED++;
    console.warn(`Error executing tab ${tabid}: ${error}`);
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
    console.error(`Error getting window tabs: ${error}`);
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
    console.error(`Error getting window tabs: ${error}`);
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
    console.error(`Error calling active tab: ${error}`);
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
        console.log("Nothing to do.");
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
  IMAGES_SAVED = 0;
  IMAGES_SKIPPED = 0;
  getOptions(executeTabs);
}

browser.browserAction.onClicked.addListener(init);
