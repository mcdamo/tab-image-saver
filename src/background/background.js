/* globals Constants Downloads Options Utils Version */

import Utils from "./utils";
import Constants from "./constants";
import Version from "./version";
import Options from "./options";
import Downloads from "./downloads";
import Messaging from "./messaging";
import Menus from "./menus";

async function getWindowId() {
  const mywindow = await browser.windows.getCurrent();
  return mywindow.id;
}

class AppCancelled extends Error {}

const App = {
  constants: {
    contentScript: browser.runtime.getURL("content.js"),
    icon: "", // icon used on notifications
    version: null, // loaded from manifest
    id: null, // loaded from manifest
  },
  options: {},
  runtime: new Map(), // active runs
  runtimeLast: new Map(), // previous run
  blocking: new Map(),
  loadedManifest: false,
  reload: false,

  getRuntime: (windowId) => {
    const props = App.runtime.get(windowId);
    if (props) {
      return props;
    }
    throw new Error(`runtime:${windowId} not found`);
  },

  // used by sidebar
  getRuntimeLast: (windowId) => {
    const props = App.runtimeLast.get(windowId);
    if (props) {
      return App.flattenRuntime(props);
    }
    //throw new Error(`runtimeLast:${windowId} not found`);
    return null;
  },

  // convert Maps to arrays of objects
  // - cannot pass Maps via messaging
  // - object keys cannot be URLs
  flattenRuntime: (props) => {
    const imagesFailed = Array.from(props.imagesFailed.entries()).reduce(
      (acc, [key, value]) => {
        acc.push({ url: key, ...value });
        return acc;
      },
      []
    );

    const pathsFailed = Array.from(props.pathsFailed.entries()).reduce(
      (acc, [key, value]) => {
        acc.push({ url: key, ...value });
        return acc;
      },
      []
    );

    return {
      ...props,
      imagesFailed,
      pathsFailed,
      abortControl: undefined, // unserializable
      abortSignal: undefined, // unserializable
    };
  },

  // called by content script via messaging
  // and also for data-url tabs
  getTabOptions: async (windowId, url) => {
    const options = await Options.getTabOptions(url);
    // 'action' can be overridden by runtime
    options.action = App.getRuntime(windowId).action;
    return options;
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
  addDownload: (dlidx, context, tabId, windowId) => {
    if (!App.getRuntime(windowId).dlMap.has(tabId)) {
      let m = new Map();
      m.set(dlidx, context);
      App.getRuntime(windowId).dlMap.set(tabId, m);
    } else {
      App.getRuntime(windowId).dlMap.get(tabId).set(dlidx, context);
    }
    console.debug("App.addDownload", dlidx);
  },

  getDownload: (dlidx, tabId, windowId) => {
    if (App.getRuntime(windowId).dlMap.has(tabId)) {
      return App.getRuntime(windowId).dlMap.get(tabId).get(dlidx);
    }
    return undefined;
  },

  removeDownload: (dlidx, tabId, windowId) => {
    console.debug("App.removeDownload", dlidx, tabId);
    /*
    if (
      !App.getRuntime(windowId).dlMap.has(tabId) ||
      !App.getRuntime(windowId).dlMap.get(tabId).has(dlid)
    ) {
      console.warn(
        "App.removeDownload: attempted to remove non-existant: ",
        dlid,
        tabId,
        windowId
      );
      return;
    }
    */
    App.getRuntime(windowId).dlMap.get(tabId).delete(dlidx);
    if (App.getRuntime(windowId).dlMap.get(tabId).size === 0) {
      App.unloadTab(tabId);
      App.getRuntime(windowId).dlMap.delete(tabId);
    }
  },

  // is finished when all downloads for tabId have been removed
  hasTabDownloads: (tabId, windowId) =>
    (App.getRuntime(windowId) && App.getRuntime(windowId).dlMap.has(tabId)) ||
    Downloads.hasTabDownloads(tabId),

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

  // download test
  addDownloadTest: (windowId, context) => {
    App.getRuntime(windowId).dlTest.push(context);
  },

  setTitle: async (props = {}) => {
    const { action = App.getAction(), browserAction = App.getBrowserAction() } =
      props;
    const placeholder =
      browserAction === Constants.BROWSER_ACTION.POPUP
        ? "options_browser_action_label_popup"
        : `commands_${action}_action_label`;
    const title = browser.i18n.getMessage(
      "browser_action_tooltip",
      browser.i18n.getMessage(placeholder)
    );
    await browser.browserAction.setTitle({ title });
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
    let color = Constants.COLOR.BADGE_OK;
    if (
      App.getRuntime(windowId).imagesFailed.size > 0 ||
      App.getRuntime(windowId).pathsFailed.size > 0
    ) {
      color = Constants.COLOR.BADGE_ERROR;
    } else if (App.getRuntime(windowId).imagesSaved === 0) {
      color = Constants.COLOR.BADGE_WARN;
    }
    App.setBadgeText({ text: num.toString(), windowId });
    App.setBadgeBackgroundColor({ color, windowId });
    App.hideBadge();
  },

  setBadgeSaving: (windowId) => {
    const num = App.getRuntime(windowId).imagesSaved;
    if (num > 0) {
      App.setBadgeText({ text: num.toString(), windowId });
      App.setBadgeBackgroundColor({
        color: Constants.COLOR.BADGE_BUSY,
        windowId,
      }); // blue
    }
  },

  // initialize badge with 'loading' colors
  setBadgeStart: (windowId) => {
    App.setBadgeTextColor({ color: Constants.COLOR.BADGE_BG, windowId });
    App.setBadgeBackgroundColor({
      color: Constants.COLOR.BADGE_DEFAULT,
      windowId,
    });
  },

  setBadgeLoading: (windowId, percent = undefined) => {
    // workaround for asynchronous downloads, don't show loading badge if images already saved
    if (App.getRuntime(windowId).imagesSaved > 0) {
      return false;
    }
    // update loading badge every 200ms
    if (new Date() - App.getRuntime(windowId).badgeLoadingDate <= 200) {
      return false;
    }
    let text = "";
    if (percent !== undefined) {
      const icons = "○◔◑◕●";
      const x = Math.round((percent / 100) * 4);
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
    App.setBadgeText({ text, windowId });
    return true;
  },

  notify: async (id, message) => {
    if (!App.options.notifyEnded) {
      return null;
    }
    try {
      const obj = {
        type: "basic",
        iconUrl: browser.runtime.getURL(App.constants.icon),
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
      if (App.getRuntime(windowId).action === Constants.ACTION.ACTIVE) {
        msgErr = browser.i18n.getMessage(
          "notification_content_permission_error_active"
        );
      } else {
        msgErr = browser.i18n.getMessage(
          "notification_content_permission_error_tabs",
          tabsError
        );
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
      msg += browser.i18n.getMessage(
        "notification_content_no_tabs",
        browser.i18n.getMessage(
          `commands_${App.getRuntime(windowId).action}_action_label`
        )
      );
      msg += `\n${msgErr}`;
      App.notify(`finished_${windowId}`, {
        title,
        message: msg,
      });
      return;
    }
    const imagesSaved = App.getRuntime(windowId).imagesSaved;
    const imagesFailed = App.getRuntime(windowId).imagesFailed.size;
    const pathsFailed = App.getRuntime(windowId).pathsFailed.size;
    console.log(`${imagesSaved} Saved, ${imagesFailed} Failed`);
    if (imagesSaved === 0 && imagesFailed === 0 && pathsFailed === 0) {
      msg += browser.i18n.getMessage("notification_content_no_images");
    } else {
      if (imagesSaved > 0) {
        msg += browser.i18n.getMessage(
          "notification_content_images_saved",
          imagesSaved
        );
        msg += "\n";
      }
      if (imagesFailed > 0) {
        msg += browser.i18n.getMessage(
          "notification_content_images_failed",
          imagesFailed
        );
        msg += "\n";
      }
      if (pathsFailed > 0) {
        msg += browser.i18n.getMessage(
          "notification_content_paths_failed",
          pathsFailed
        );
        msg += "\n";
      }
    }
    msg += "\n";
    // if (App.runtime.tabsSkipped > 0) {
    //  msg += `${App.runtime.tabsSkipped} tabs skipped\n`;
    // }
    console.debug("Notify finished");
    App.notify(`finished_${windowId}`, {
      title,
      message: `${msg}${msgErr}`,
    });
  },

  // cleanup and remove runtime for selected window
  setFinished: async (windowId) => {
    const runtime = App.getRuntime(windowId);
    if (runtime.pathsFailed.size) {
      for (const [url, val] of runtime.pathsFailed.entries()) {
        console.log(`pathsFailed ${url}: ${val}`); /* RemoveLogging:skip */
      }
    }
    if (runtime.imagesFailed.size) {
      for (const [url, o] of runtime.imagesFailed.entries()) {
        console.log(
          `imagesFailed ${url}: ${o.path} => ${o.message}`
        ); /* RemoveLogging:skip */
      }
    }
    // unload content script from tabs
    for (const tabId of runtime.dlMap.keys()) {
      App.unloadTab(tabId);
    }

    App.notifyFinished(windowId);
    const finishedCallback = runtime.finishedCallback;
    if (finishedCallback) {
      finishedCallback(App.flattenRuntime(runtime));
    }
    // cleanup orphans in Downloads
    await Downloads.removeWindowDownloads(windowId);
    App.deleteRuntime(windowId); // cleanup
    if (App.isIdle()) {
      browser.downloads.onChanged.removeListener(
        Downloads.handleDownloadChanged
      ); // remove download listener
      if (App.reload) {
        console.debug("Reloading addon");
        browser.runtime.reload();
      }
    }
  },

  tabsFinished: async (windowId) => {
    if (
      !App.isFinished(windowId) && // test downloads have finished
      App.hasWindowDownloads(windowId) === false
    ) {
      console.log(
        `Window(${windowId}) has ended`,
        new Date() - App.getRuntime(windowId).startDate
      );
      if (!App.isCancelled(windowId)) {
        await App.setFinished(windowId);
      }
    }
  },

  downloadFinished: async (windowId) => {
    // guard against same download sending concurrent triggers
    if (!App.isRunning(windowId)) {
      // test app is not in progress
      await App.tabsFinished(windowId);
    }
  },

  handleDownloadComplete: async (context) => {
    const windowId = context.windowId;
    const tabId = context.tab.id;
    const index = context.index;
    //const options = context.options;
    const closeTab = context.closeTab;
    console.debug("handleDownloadComplete", context);
    try {
      App.removeDownload(index, tabId, windowId);
      App.getRuntime(windowId).imagesSaved++;
      App.getRuntime(windowId).imagesDownloading--;
      App.setBadgeSaving(windowId);
    } catch (err) {
      // if downloads finish _after_ runtime is cancelled
      console.warn("handleDownloadComplete: ignore errors", err);
    }
    if (closeTab) {
      if (App.hasTabDownloads(tabId, windowId) === false) {
        try {
          await browser.tabs.remove(tabId);
          console.debug(`Closed Tab(${tabId})`);
        } catch (err) {
          console.error(
            `Failed removing tab ${tabId}:`,
            err
          ); /* RemoveLogging:skip  */
        }
      }
    }
    await App.downloadFinished(windowId);
  },

  handleDownloadFailed: async (context) => {
    const {
      windowId,
      tab,
      index,
      response, // if response returns HTTP error
      exception, // if fetch or download throws error
      download, // if download returns response object
    } = context;
    let message;
    if (response) {
      message = `${response.status}: ${response.statusText}`;
    } else if (exception) {
      message = exception.message;
    } else if (download) {
      message = download.error;
    }
    console.debug("handleDownloadFailed:", message, context);
    // context may contain
    App.removeDownload(index, tab.id, windowId);
    App.getRuntime(windowId).imagesFailed.set(context.url, {
      tabUrl: tab.url,
      path: context.path,
      message,
    });
    App.getRuntime(windowId).imagesDownloading--;
    await App.downloadFinished(windowId);
  },

  // generate file path from image attributes, index number, and rules template
  // param expected to have these properties: tab, image, index, rules
  // return null if failed
  createFilename: async (props) => {
    const { image, rules } = props;
    const obj = Downloads.getRuleParams(props);
    for (const rule of rules) {
      const filename = Utils.sanitizePath(
        (await Utils.template(rule, obj)).trim()
      );
      console.log(
        `rule: ${rule}, filename: ${filename}, valid: ${Utils.isValidPath(
          filename
        )}`
      );
      if (Utils.isValidPath(filename)) {
        console.log("createFilename", rule, filename); /* RemoveLogging: skip */
        return filename;
      }
    }
    if (obj._errors.length > 0) {
      console.log("errors", obj._errors);
      throw new Error(obj._errors);
    }
    return null;
  },

  // param passed to createFilename
  createPath: async (param) => {
    const filename = await App.createFilename(param);
    if (filename === null) {
      throw new Error("Unable to generate filename");
    }
    const path = Utils.sanitizePath(
      Utils.pathJoin([param.downloadPath, filename])
    );
    if (!Utils.isValidFilename(path)) {
      throw new Error(`Invalid filename generated: ${path}`);
    }
    return path;
  },

  getActiveDownloadNum: (windowId) =>
    App.getRuntime(windowId).imagesDownloading,

  throttleDownloads: async (windowId) => {
    const maxDownloadNum = App.options.downloadNum;
    while (App.getActiveDownloadNum(windowId) >= maxDownloadNum) {
      console.debug(
        `Maximum downloads ${App.getActiveDownloadNum(
          windowId
        )} >= ${maxDownloadNum}`
      );
      if (
        !(await Utils.sleepCallback(100, (ms, remain) => {
          App.setBadgeLoading(windowId);
          return App.isCancelled(windowId);
        }))
      ) {
        throw new AppCancelled("throttleDownloads");
      }
    }
  },

  getDownloadsIndexStart: ({ options, windowId }) => {
    if (options.indexMethod === Constants.INDEX_METHOD.TABBED) {
      return options.indexStart;
    }
    if (options.rulesetKey && !options.indexingInherit) {
      if (!App.getRuntime(windowId).imageIndexRulesets[options.rulesetKey]) {
        App.getRuntime(windowId).imageIndexRulesets[options.rulesetKey] =
          options.indexStart;
        return options.indexStart;
      }
      return App.getRuntime(windowId).imageIndexRulesets[options.rulesetKey];
    }
    return App.getRuntime(windowId).imageIndex;
  },

  /**
   * Increment the runtime counter and return the next index
   * @param {integer} index
   * @param {object} options tab global/ruleset options
   * @param {integer} windowId
   * @returns {integer} next index
   */
  getDownloadsIndexNext: ({ index, options, windowId }) => {
    if (options.indexMethod === Constants.INDEX_METHOD.TABBED) {
      return index + options.indexIncrement;
    }
    if (options.rulesetKey && !options.indexingInherit) {
      return (App.getRuntime(windowId).imageIndexRulesets[options.rulesetKey] +=
        options.indexIncrement);
    }
    return (App.getRuntime(windowId).imageIndex += options.indexIncrement);
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
      const options = result.options;
      let index = App.getDownloadsIndexStart({ options, windowId });
      for (const image of images) {
        try {
          const path = await App.createPath({
            tab,
            image,
            index,
            downloadPath: options.downloadPath,
            rules: options.pathRules,
            downloadMethod: options.downloadMethod,
          });
          if (options.action !== Constants.ACTION.TEST) {
            App.addDownload(index, {}, tabId, windowId);
            downloads.push({
              url: image.src,
              path,
              referrer: tab.url,
              index,
              tab,
              options,
            });
          } else {
            App.addDownloadTest(windowId, {
              url: image.src,
              path,
              index,
              options,
            });
          }
          index = App.getDownloadsIndexNext({ index, options, windowId });
        } catch (err) {
          if (err instanceof AppCancelled) {
            console.debug("createDownloads passed cancelled");
            throw err;
          }
          // unable to generate filename from rules
          console.error(
            "createDownloads failed",
            image,
            err
          ); /* RemoveLogging:skip */
          App.getRuntime(windowId).pathsFailed.set(image.src, {
            message: err.message,
            options,
            tabUrl: tab.url,
          });
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
        await App.throttleDownloads(windowId);
        let index = download.index;
        let tab = download.tab;
        App.getRuntime(windowId).imagesDownloading++;
        promiseDownloads.push(
          Downloads.fetchDownload(
            {
              url: download.url,
              path: download.path,
              conflictAction: download.options.conflictAction,
              incognito: download.options.downloadPrivate, // min_ver FF57
              referrer: download.referrer,
              abortSignal: App.getRuntime(windowId).abortControl.signal,
              downloadMethod: download.options.downloadMethod,
              cookieStoreId: download.tab.cookieStoreId,
            },
            {
              tab,
              windowId,
              index,
              closeTab: download.options.closeTab,
              url: download.url,
              path: download.path,
              eraseHistory: download.options.removeEnded,

              then: async (v) => await App.handleDownloadComplete(v),
              error: async (v) => await App.handleDownloadFailed(v), // v: {response} or {error}
            }
          )
        );
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
    const downloads = await App.createDownloads({
      response: results,
      windowId,
    });
    // options is also available in param.response[].options
    if (App.getRuntime(windowId).action === Constants.ACTION.TEST) {
      return true;
    }
    const promiseDownloads = await App.fetchDownloads({ windowId, downloads });
    return await Utils.allPromises(
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
      (err) => {
        console.error("downloads", err);
      }
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
      if (Utils.isDataUrl(url)) {
        // skip testing for unique
        App.getRuntime(windowId).imagesMatched++;
        result.push(image);
        console.log("Data-URL queued");
      } else if (App.isUniqueUrl(url, windowId) === false) {
        console.log("Duplicate URL skipped", url);
        App.getRuntime(windowId).imagesSkipped++;
      } else {
        App.addUrl(url, windowId);
        console.log("URL queued:", url);
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
      console.debug(`Executing Tab(${tab.id})`);
      let result;
      if (Utils.isDataUrl(tab.url)) {
        // cannot executeScript in data-url tab, so manually craft the result response
        console.debug("executeTab: using data-url workaround");
        const images = [];
        // manually filter the image dimensions by decoding the image
        let img = new Image();
        img.src = tab.url;
        await img.decode();
        const options = await App.getTabOptions(windowId);
        if (
          img.naturalWidth >= options.minWidth &&
          img.naturalHeight >= options.minHeight
        ) {
          images.push({ src: tab.url });
        }
        result = [{ images, options }];
      } else {
        console.debug(
          `Sending tab ${tab.id}: ${App.constants.contentScript}`,
          tab
        );
        // returns array of script result for each loaded tab
        result = await browser.tabs.executeScript(tab.id, {
          file: App.constants.contentScript,
          runAt: "document_end", // "document_idle" may block if page is manually stopped
        });
        console.debug(`Response from tab ${tab.id}`, result);
      }
      App.getRuntime(windowId).tabsLoaded++;
      const images = App.filterImages({ images: result[0].images, windowId });
      if (images.length > 0) {
        App.getRuntime(windowId).tabsEnded++;
        return {
          tab: {
            id: tab.id,
            title: tab.title,
            url: tab.url,
            cookieStoreId: tab.cookieStoreId,
            incognito: tab.incognito,
          },
          images,
          options: result[0].options,
        };
      }
      App.getRuntime(windowId).tabsSkipped++;
    } catch (err) {
      App.getRuntime(windowId).tabsError++;
      console.error(
        `Error executing tab ${tab.id}: ${tab.url}`,
        err
      ); /* RemoveLogging:skip */
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
      promiseTabs.push(execute({ tab, windowId }));
    }
    return await Utils.allPromises(
      promiseTabs,
      async (tabResults) => await callback({ response: tabResults, windowId }),
      (err) => {
        if (err instanceof AppCancelled) {
          console.debug("executeTabs passed cancelled");
          throw err;
        }
        console.error("executeTabs", err);
      }
    );
  },

  getWindowTabs: (windowId) => browser.tabs.query({ windowId }),

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
          tab = await browser.tabs.update(tab.id, { url: tab.url }); // reload() does not affect discarded state
        } catch (err) {
          console.warn("cannot reload tab:", tab.url);
          return waiting;
        }
        sleepMore = true;
      }
      if (tab.status === "complete") {
        ready.push({ index, tab });
      } else {
        // tab.status === "loading"
        sleepMore = true;
        tab = await browser.tabs.get(tab.id);
        waiting.push({ index, tab });
      }
      return waiting;
    }, []);
    return { ready, waiting, sleepMore };
  },

  // wait for all tabs to have status=complete
  // callback: optional, used for asynchronous downloading of tabs
  // returns array of tabs
  waitForTabs: async (param) => {
    const tabs = param.tabs;
    const windowId = param.windowId;
    const callback = param.callback;
    let waiting = tabs.reduce((acc, val, idx) => {
      acc.push({ index: idx, tab: val });
      return acc;
    }, []); // add index to entries
    let ready = [];
    let sleepMore = false;
    let loop = 0;
    while (waiting.length > 0) {
      // don't sleep in the first loop
      if (
        loop > 0 &&
        !(await Utils.sleepCallback(1000, (ms, remain) => {
          App.setBadgeLoading(windowId);
          return App.isCancelled(windowId);
        }))
      ) {
        throw new AppCancelled("waitForTabs");
      }
      try {
        const ret = await App.checkTabs({ tabs: waiting, windowId });
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
      if (
        !(await Utils.sleepCallback(5000, (ms, remain) => {
          const percent = ((ms - remain) / ms) * 100;
          App.setBadgeLoading(windowId, percent);
          return App.isCancelled(windowId);
        }))
      ) {
        throw new AppCancelled("waitForTabs");
      }
    }
    if (callback !== undefined) {
      ready = await ready.reduce(async (accc, val, idx) => {
        let acc = await accc;
        let ret = await callback(val, windowId);
        acc.push({ index: idx, tab: ret });
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
          let tabs = filter({ tabs: [tab], windowId });
          if (tabs.length === 0) {
            return false;
          }
          let ret = await execute({ tab: tabs, windowId });
          return callback({ response: ret, windowId });
        },
      });
      promiseTabs.push(ret);
    }
    return await Utils.allPromises(
      promiseTabs,
      (tabResults) => {
        console.debug("waitAndExecuteTabs:tabResults", tabResults);
        return tabResults.length > 0;
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
    return tabs.filter(
      (tab) =>
        /^(https?|ftps?):\/\/.+/.test(tab.url) || Utils.isDataUrl(tab.url)
    );
  },

  selectTabs: async (param) => {
    const method = param.method;
    const includeActive = param.includeActive;
    const windowId = param.windowId;
    let doTab = false;
    let doAfter = false;
    let doCurrent = false;
    switch (method) {
      case Constants.ACTION.LEFT:
        doTab = true;
        break;
      case Constants.ACTION.RIGHT:
        doAfter = true;
        break;
      case Constants.ACTION.ALL:
        doTab = true;
        doAfter = true;
        break;
      case Constants.ACTION.ACTIVE:
      case Constants.ACTION.TEST:
        doCurrent = true;
        break;
      default:
        throw new Error(
          "Invalid method for selectTabs:",
          method
        ); /* RemoveLogging:skip */
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
      }
      if (tab.active && !doAfter) {
        break;
      }
    }
    return tabsWaiting;
  },

  unloadTab: async (tabId) => {
    console.debug("unloadTab", tabId);
    browser.tabs.sendMessage(tabId, { type: "UNLOAD" }).catch(console.error);
    return true;
  },

  getActiveTab: async (windowId) => {
    const ret = await browser.tabs.query({ windowId, active: true });
    if (!ret) {
      throw new Error("getActiveTab failed");
    }
    return ret[0];
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
  handleInstalled: async (props = {}) => {
    const { previousVersion, reason, temporary } = props;
    console.log(
      `handleInstalled prev:${previousVersion} reason:${reason} temporary:${temporary}`
    );
    const mf = await App.loadManifest(true);
    await Version.update(mf.version, previousVersion);
    await App.init();
    if (
      (browser.runtime.OnInstalledReason &&
        reason === browser.runtime.OnInstalledReason.INSTALL) ||
      temporary
    ) {
      // show options on first install
      App.handleCommandOptions();
      if (temporary) {
        Options.OPTIONS.downloadPath = "tab-image-saver";
      }
    }
  },

  // load options to trigger onLoad and set commands
  init: async () => {
    console.debug("Background.init");
    await Messaging.init();
    await App.loadManifest(); // will skip if already loaded
    await App.loadOptions();
    await Menus.init(App);
  },

  // load manifest.json and apply some fields to constants
  loadManifest: async (reload = false) => {
    if (!App.loadedManifest || reload) {
      const mf = await browser.runtime.getManifest();
      console.debug("loadManifest", mf);
      App.constants.icon = mf.icons["48"];
      App.constants.id = mf.applications.gecko.id;
      App.constants.version = mf.version;
      App.loadedManifest = true;
      return mf;
    }
    return null;
  },

  loadOptions: async () => {
    console.log("Loading background options");
    await Options.init(App); // pass App down to Commands for shortcut callbacks
    App.options = await Options.loadOptions();
    await App.setTitle();
  },

  getAction: () => Options.OPTIONS.action,

  getBrowserAction: () => Options.OPTIONS.browserAction,

  cancel: async (windowId, finishedCallback = null) => {
    console.info("Cancelling windowId:", windowId);
    if (!App.isFinished(windowId)) {
      App.getRuntime(windowId).cancel = true;
      App.getRuntime(windowId).abortControl.abort(); // cancel fetch()
      if (!App.isRunning(windowId)) {
        await Downloads.cancelWindowDownloads(windowId);
        console.debug("cancelWindowDownloads completed");
        await App.setFinished(windowId);
      }
    }
    if (finishedCallback !== null) {
      finishedCallback();
    }
  },

  createRuntime: ({
    windowId,
    tabId,
    action,
    finishedCallback,
    imageIndex = 1,
  }) => {
    App.runtime.set(windowId, {
      action,
      finishedCallback,
      tabId, // required for setting badge
      startDate: new Date(),
      tabsLoaded: 0, // tabs executed
      tabsEnded: 0, // tabs returned a message
      tabsSkipped: 0, // tabs with no valid images
      tabsError: 0, // tabs with no permission
      imageIndex, // runtime index for numbered images
      imageIndexRulesets: {}, // populated by ruleset indexes if ruleset indexing
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
      dlMap: new Map(), // downloads queued for this window but not yet started
      dlTest: [], // array of download contexts, used when running TEST action
    });
  },

  // delete active runtime and insert into history
  deleteRuntime: async (windowId) => {
    const runtime = App.runtime.get(windowId);
    // don't update if testing
    if (runtime.action !== Constants.ACTION.TEST) {
      // save index for global option
      if (App.options.indexMethod === Constants.INDEX_METHOD.SAVED) {
        console.debug(`saving options imageIndex: ${runtime.imageIndex}`);
        await Options.saveOption("indexStart", runtime.imageIndex);
      }
      // save index for rulesets
      Object.entries(runtime.imageIndexRulesets).forEach(
        ([rulesetKey, imageIndex]) => {
          if (
            Options.getRulesetKeyOption({ rulesetKey, name: "indexMethod" }) ===
            Constants.INDEX_METHOD.SAVED
          ) {
            console.debug(
              `saving ruleset imageIndex: ${rulesetKey} => ${imageIndex}`
            );
            Options.saveRulesetKeyOption({
              name: "indexStart",
              value: imageIndex,
              rulesetKey,
            });
          }
        }
      );
    }
    console.debug("Saved old runtime", runtime);
    App.runtimeLast.set(windowId, { ...runtime });
    App.runtime.delete(windowId); // cleanup
  },

  // return (for testing)
  //   -1: run blocked
  //    1: normal completion
  run: async (windowId, browserAction = null, finishedCallback = null) => {
    console.info("run", windowId, browserAction);
    if (browserAction === Constants.ACTION.CANCEL) {
      return await App.cancel(windowId, finishedCallback);
    }
    if (App.isRunning(windowId)) {
      console.debug("run blocked");
      return -1; // -1 for testing
    }
    App.blocking.set(windowId);
    App.options = { ...Options.OPTIONS }; // deep clone is used in Options.init
    const mytab = await App.getActiveTab(windowId);
    const tabId = mytab.id;
    App.setupBadge(); // run before clearing runtime
    if (
      !browser.downloads.onChanged.hasListener(Downloads.handleDownloadChanged)
    ) {
      browser.downloads.onChanged.addListener(Downloads.handleDownloadChanged);
    }
    const action = !browserAction ? App.options.action : browserAction;
    console.log("running", { windowId, tabId, action });
    App.createRuntime({
      windowId,
      tabId,
      action,
      finishedCallback,
      imageIndex: App.options.indexStart,
    });
    App.setBadgeStart(windowId);
    App.setBadgeLoading(windowId);
    try {
      let tabs = await App.selectTabs({
        method: action,
        includeActive: App.options.activeTab,
        windowId,
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
          callback: App.downloadTab,
        });
      } else {
        // synchronous - files saved in tab order, waits for all tabs to be ready
        tabs = await App.waitForTabs({ tabs, windowId });
        tabs = App.filterTabs({ tabs, windowId });
        ret = await App.executeTabs({
          tabs,
          windowId,
          execute: App.executeTab,
          callback: App.downloadTab,
        });
      }
      console.debug(
        `Run finished: ${ret}`,
        new Date() - App.getRuntime(windowId).startDate
      );
      if (!ret) {
        // no tabs or downloads found
        await App.setFinished(windowId);
      } else if (App.isCancelled(windowId)) {
        await Downloads.cancelWindowDownloads(windowId);
        console.debug("cancelWindowDownloads completed");
        await App.setFinished(windowId);
      } else {
        // for condition where all downloads completed before run() finished
        await App.tabsFinished(windowId);
      }
    } catch (err) {
      if (err instanceof AppCancelled) {
        console.debug("Run cancelled in:", err.message);
        // cleanup any lingering downloads
        await Downloads.cancelWindowDownloads(windowId);
        console.debug("cancelWindowDownloads completed");
        await App.setFinished(windowId);
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
  handleCommandAction: async (action = null, callerWindowId = null) => {
    const windowId =
      callerWindowId === null ? await getWindowId() : callerWindowId;
    if (App.isRunning(windowId) || !App.isFinished(windowId)) {
      await App.cancel(windowId);
      return 2; // 2 for testing
    }
    if (action === Constants.CANCEL) {
      return 3;
    }
    return await App.run(windowId, action);
  },

  // called by clicking the App icon
  handleBrowserAction: async (ev) => await App.handleCommandAction(),

  handleCommandDownloads: () => {
    browser.downloads.showDefaultFolder();
  },

  handleCommandOptions: () => {
    // open preferences in tab
    browser.runtime.openOptionsPage().catch(console.error);
    // open preferences in panel window
    // browser.windows
    //   .create({
    //     type: "detached_panel",
    //     url: browser.runtime.getURL("options.html"),
    //     allowScriptsToClose: true,
    //   })
    //   .catch(console.error);
  },

  handleCommandSidebar: async () => {
    await browser.sidebarAction.toggle();
  },

  appRefresh: async (version) => {
    await Version.update(App.constants.version, version);
    await App.init();
    // return new options for UI
    return { options: Options.OPTIONS, rulesets: Options.RULESETS };
  },

  backupDefault: async () => {
    await browser.storage.local.clear();
    return App.appRefresh();
  },

  backupImport: async (data) => {
    console.debug(data);
    if (data.addon_id !== App.constants.id || !data.data) {
      return {
        error: browser.i18n.getMessage(
          "options_backup_import_error_invalid_contents"
        ),
      };
    }
    const options = data.data;
    await browser.storage.local.set(options);
    return await App.appRefresh(options.version);
  },

  backupExport: async () => {
    const storage = await browser.storage.local.get();
    return {
      addon_id: App.constants.id,
      data: storage,
    };
  },

  legacyTemplateUpdate: async () => {
    await Version.updateLegacyTemplates();
    return await App.appRefresh();
  },
};

if (!browser.browserAction.onClicked.hasListener(App.handleBrowserAction)) {
  browser.browserAction.onClicked.addListener(App.handleBrowserAction);
}

if (!browser.runtime.onInstalled.hasListener(App.handleInstalled)) {
  browser.runtime.onInstalled.addListener(App.handleInstalled);
}

if (!browser.runtime.onUpdateAvailable.hasListener(App.handleUpdateAvailable)) {
  browser.runtime.onUpdateAvailable.addListener(App.handleUpdateAvailable);
}

// browser.runtime.onStartup.addListener(App.init); // does not fire when addon is 'Enabled' in addon manager
App.init();

// attach to window object to make available from getBackgroundPage
window.getWindowId = getWindowId;
window.backgroundApp = App;

export default App;
export { getWindowId };
