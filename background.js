
// these are defined in options.js
var ACTION;
var ACTIVE_TAB;
var CLOSE_TAB;
var DOWNLOAD_PATH; // Empty to use Downloads directory or specify subfolder within Downloads directory (no leading or trailing slashes)
var CONFLICT_ACTION;
var MIN_WIDTH;
var MIN_HEIGHT;
var NOTIFY_ENDED;
var REMOVE_ENDED;
// these are used at runtime
var TABS_LOADED = 0; // number of tabs executed
var TABS_ENDED = 0; // number of tabs returned a message
var IMAGES_SAVED = 0; // valid images saved
var IMAGES_SKIPPED = 0; // invalid images
const DEBUG_LOG = false;

function init() {
	TABS_LOADED = 0;
	TABS_ENDED = 0;
	IMAGES_SAVED = 0;
	IMAGES_SKIPPED = 0;
	getOptions(executeTabs);
}

function debug(message) {
	if (DEBUG_LOG) {
		console.log(message);
	}
}

function getOptions(callback) {
	var getting = browser.storage.local.get();
	getting.then(result => {
		debug("Options: ");
		for (let o in result) {
			debug(`${o}: ${result[o]}`);
		}
		ACTION = result.action || "current";
		ACTIVE_TAB = result.activeTab;
		CLOSE_TAB = result.closeTab;
		DOWNLOAD_PATH = result.downloadPath || "";
		if (DOWNLOAD_PATH.length > 0) {
			DOWNLOAD_PATH += "/";
		}
		CONFLICT_ACTION = result.conflictAction || "uniquify";
		MIN_WIDTH = result.minWidth || "100";
		MIN_HEIGHT = result.minHeight || "100";
		if (null == result.notifyEnded) {
			result.notifyEnded = true;
		}
		NOTIFY_ENDED = result.notifyEnded;
		REMOVE_ENDED = result.removeEnded;
		callback();
	}, error => {
/*
		notify("error", {
			"title": "Error",
			"content": "
*/
		debug("OptionsError: "+error);
	});
}

function executeTabs() {
	//decide which action to take
	debug("Action: "+ACTION);
	switch(ACTION) {
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

function executeTab(tab) {
	TABS_LOADED++;
	let tabid = tab.id;
	debug(`Sending tab ${tabid} (LOADED ${TABS_LOADED})`);
	var executing = browser.tabs.executeScript(
		tabid, {
		file: "/content-script.js"
	});

}

function tabsAll() {
	tabs = getCurrentWindowTabs();
	for (let i = 0; i < tabs.length; i++) {
		if (tab.active && ACTIVE_TAB == false) {
			continue;
		}
		executeTab(tabs[i]);
	}
}

function tabsCurrent() {
	callOnActiveTab((tab, tabs) => {
		executeTab(tab);
	});
}

function tabsLeft() {
	callOnActiveTab((tab, tabs) => {
		debug(`Starting at id: ${tab.id}, index: ${tab.index}`);
		let next = tab.index;
		if(ACTIVE_TAB == false) {
			if((tab.index - 1) < 0) {
				// already at last tab
				debug("Nothing to do.");
				return;
			}
			next = tab.index - 1;
		}
		for (let i = next; i >= 0; i--) {
			executeTab(tabs[i]);
		}
	});
}

function tabsRight() {
	callOnActiveTab((tab, tabs) => {
		debug(`Starting at id: ${tab.id}, index: ${tab.index}`);
		let next = tab.index;
		if(ACTIVE_TAB == false) {
			if((tab.index+1) == tabs.length) {
				// already at last tab
				debug("Nothing to do.");
				return;
			}
			next = tab.index+1;
		}
		for (let i = next; i < tabs.length; i++) {
			executeTab(tabs[i]);
		}
	});
}

function getCurrentWindowTabs() {
	return browser.tabs.query({currentWindow: true});
}

function callOnActiveTab(callback) {
	getCurrentWindowTabs().then((tabs) => {
		for (var tab of tabs) {
			if (tab.active) {
				callback(tab, tabs);
			}
		}
	});
}

/* receive image from content-script (Tab) */
function downloadImage(image, tabid, callback) {
	if (!image) {
		IMAGES_SKIPPED++;
		return false;
	}
	debug(`${image.width}x${image.height} ${image.src}`);
	var path = DOWNLOAD_PATH;
	var url = image.src;
	if (image.width < MIN_WIDTH || image.height < MIN_HEIGHT) {
		debug("Dimensions smaller than required, not saving");
		IMAGES_SKIPPED++;
		return false;
	}
	path += url.replace(/^.*[\\\/]/, ''); // append filename from url
	var downloading = browser.downloads.download({
		url: url,
		filename: path,
		//saveAs: false, // not required, min_ver FF52
		conflictAction: CONFLICT_ACTION
	});
	downloading.then(
		function(dlid) { onDownloadStarted(dlid, tabid, path, callback); },
		function(e) { onDownloadFailed(e, path, callback); }
	);
	return true;
}

function onDownloadStarted(dlid, tabid, path, callback) {
	IMAGES_SAVED++;
	debug(`Download(${IMAGES_SAVED}) ${path}`);
	if (CLOSE_TAB) {
		var removing = browser.tabs.remove(tabid);
		//removing.then(onRemoved, onError);
	}
	if (REMOVE_ENDED) {
		browser.downloads.erase({
			"id": dlid
		});
	}
	callback();
}
function onDownloadFailed(e, path, callback) {
	IMAGES_SKIPPED++;
	console.log(`Download failed (${path}): ${e}`);
	callback();
}

function notify(id, message) {
	var title = message.title;
	var content = message.content;
	return browser.notifications.create(id, {
		"type": "basic",
		"iconUrl": browser.extension.getURL("icons/down-48.png"),
		"title": title,
		"message": content
	});
}

function notifyFinished()
{
	if (true != NOTIFY_ENDED) {
		return;
	}
	if (TABS_LOADED != TABS_ENDED) {
		return;
	}
	if (TABS_LOADED != (IMAGES_SAVED + IMAGES_SKIPPED)) {
		return;
	}
	notify('finished', {
		title: "Tab Image Saver",
		content: `${IMAGES_SAVED} downloaded`
	});
	//setTimeout(browser.notifications.clear('finished'), 4000);
}

function handleMessage(request, sender, sendResponse) {
	TABS_ENDED++;
	debug(`Response from tab ${sender.tab.id} (ENDED ${TABS_ENDED})`);
	if (downloadImage(request.image, sender.tab.id, notifyFinished)) {
/*
		sendResponse({
			response: "Thanks for the image"
		});
*/
	} else {
		notifyFinished();
	}
}

browser.runtime.onMessage.addListener(handleMessage);

browser.browserAction.onClicked.addListener(init);
