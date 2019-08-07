import Global from "./global";

const Downloads = {
  dlMap: new Map(), // shared by all instances

  // details: { tabId, windowId, callback }
  addDownload: (dlid, context) => Downloads.dlMap.set(dlid, context),

  getDownload: (dlid) => Downloads.dlMap.get(dlid),

  removeDownload: async (dlid, eraseHistory) => {
    Downloads.dlMap.delete(dlid);
    if (eraseHistory) {
      console.debug("removeDownload::eraseHistory");
      await browser.downloads.erase({ id: dlid });
    }
  },

  downloadsHaveProp: (prop, val) => {
    for (const dl of Downloads.dlMap.values()) {
      if (dl[prop] === val) {
        return true;
      }
    }
    return false;
  },

  // is finished when all downloads for tabid have been removed
  hasTabDownloads: (tabId) => Downloads.downloadsHaveProp("tabId", tabId),

  // is finished when all downloads for tabid have been removed
  hasWindowDownloads: (windowId) =>
    Downloads.downloadsHaveProp("windowId", windowId),

  // call when download ends to cleanup and erase history
  downloadEnded: async (download) => {
    const dlid = download.id;
    const context = Downloads.getDownload(dlid);
    if (!context) {
      return; // multiple triggers may fire for one download
    }
    console.log(`Download(${dlid}) ${download.state}:`, download.filename);
    console.debug("Download status", download);
    if (
      download.state === "complete" &&
      download.fileSize > 0 && // totalBytes may be undefined
      download.mime !== "text/html"
    ) {
      await Downloads.removeDownload(dlid, context.eraseHistory);
      const fn = context.then || ((x) => x);
      await fn(context);
      return;
    }
    await Downloads.removeDownload(dlid, context.eraseHistory);
    const fn = context.error || ((x) => x);
    await fn(context);
    return;
  },

  // handle downloads changed events
  // note: catches all changes to Downloads, not just from this webext
  handleDownloadChanged: async (delta) => {
    console.debug("handleDownloadChanged", delta);
    let dlid = delta.id;
    // if (delta.state && delta.state.current !== "in_progress") {
    let downloads = await browser.downloads.search({ id: dlid });
    for (let download of downloads) {
      await Downloads.downloadEnded(download); // await?
    }
  },

  removeWindowDownloads: async (windowId) => {
    for (const [dlid, val] of Downloads.dlMap.entries()) {
      if (val.windowId === windowId) {
        console.warn(
          "Removing orphan download",
          dlid,
          val
        ); /* RemoveLogging:skip */
        await Downloads.removeDownload(dlid);
      }
    }
  },

  cancelWindowDownloads: (windowId) => {
    let promises = [];
    for (const [dlid, val] of Downloads.dlMap.entries()) {
      if (val.windowId === windowId) {
        // request cancellation but do not wait for response
        let canceling = browser.downloads.cancel(dlid);
        canceling
          .then(() => {
            console.log("Cancelled download", dlid);
            return true;
          })
          .catch((err) => {
            console.log(`Failed cancelling download ${dlid}`, err);
            return false;
          });
        promises.push(canceling);
      }
    }
    return Global.allPromises(
      promises,
      () => {
        console.log("Cancelled all downloads");
      },
      (err) => {
        console.error("cancelDownloads", err);
      }
    );
  },

  fetchDownload: async (download, context) => {
    const fn = context.error || ((x) => x);
    try {
      console.debug("fetchDownload referrer:", download.referrer);
      const response = await fetch(download.url, {
        mode: "cors",
        credentials: "same-origin",
        cache: "force-cache",
        referrer: download.referrer,
        referrerPolicy: "no-referrer-when-downgrade",
        signal: download.signal,
      });
      console.debug("fetchDownload response:", response);
      if (response.ok) {
        console.log(`fetchDownload from Tab(${context.tabId}):`, download.path);
        let myDownload = download;
        const myBlob = await response.blob();
        myDownload.url = URL.createObjectURL(myBlob);
        return Downloads.saveDownload(myDownload, context);
      }
      console.error(`HTTP error, status = ${response.status}`, response);
      fn({ ...context, response });
    } catch (err) {
      console.error("fetchDownload", err);
      fn({ ...context, error: err });
    }
    return false;
  },

  // start the download
  saveDownload: async (download, context) => {
    try {
      const dlOpts = {
        saveAs: false, // required from FF58, min_ver FF52
        url: download.url,
        filename: download.path,
        conflictAction: download.conflictAction,
        incognito: download.incognito,
      };
      const dlid = await browser.downloads.download(dlOpts);
      console.log(
        `saveDownload(${dlid}) from Tab(${context.tabId}):`,
        download.path
      );
      Downloads.addDownload(dlid, context);
      return dlid;
    } catch (err) {
      // catch errors related to Access Denied for data:image URLs
      console.error("Download failed", err, download); /* RemoveLogging:skip */
    }
    const fn = context.error || ((x) => x);
    await fn(context);
    return false;
  },
};

export default Downloads;
