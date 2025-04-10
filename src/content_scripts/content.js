(async function () {
  // return random int between min:max
  function randomIntFromInterval(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
  }

  function sleep(ms) {
    console.debug("sleep", ms);
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function isImageVisible(img) {
    return !img.hidden;
  }

  function isImageLoaded(img) {
    // return img.complete;
    return (
      img.naturalWidth !== undefined && img.naturalHeight !== undefined
      // && img.naturalWidth > 0 && img.naturalHeight > 0 // an image that is stopped will have natural size 0x0
    );
  }

  function isDirectImage() {
    return document.contentType.indexOf("image") === 0;
  }

  const Constants = {
    ACTION: {
      TEST: "test",
    },

    FILTER: {
      //MAX: "max",
      ALL: "all",
      DIRECT: "direct",
    },

    MESSAGE_TYPES: {
      TAB_OPTIONS: "TAB_OPTIONS",
      CANCEL: "CANCEL",
    },
  };

  const App = {
    options: {},
    runtime: undefined,

    waitForDomImage: async (i) => {
      let img = true;
      while (img) {
        img = document.images[i];
        if (isImageLoaded(img)) {
          return img;
        }
        if (await App.getCancelled()) {
          console.debug("cancel:waitForDomImage");
          return false;
        }
        console.debug(
          `waitForDomImage: loaded:${img.complete} ${img.naturalWidth}x${img.naturalHeight}`,
          img
        );
        await sleep(randomIntFromInterval(500, 1000));
      }
      return img;
    },

    // verify image meets minimum requirements
    validImage: (img) => {
      if (
        img.naturalWidth >= App.options.minWidth &&
        img.naturalHeight >= App.options.minHeight
      ) {
        console.debug(
          `valid image (${img.naturalWidth}x${img.naturalHeight}):`,
          img
        );
      } else {
        // console.log(`invalid image (${img.naturalWidth}x${img.naturalHeight}):`, img);
        return false;
      }
      if (App.options.imageRegex) {
        const regex = new RegExp(App.options.imageRegex);
        if (!regex.test(img.src)) {
          console.debug(`image failed regex: ${App.options.imageRegex}`, img);
          return false;
        }
      }
      return true;
    },

    // fill src from responsive image
    responsiveSrc: (img) => {
      if (img.srcset && !img.src) {
        let size = 0;
        let src = "";
        let srcsetArr = img.srcset.split(",");
        for (const srcset of srcsetArr) {
          let srcArr = srcset.trim().split(" ");
          if (srcArr[1].replace("w", "") > size) {
            src = srcArr[0];
          }
        }
        img.src = src;
      }
      return img;
    },

    // run chosen filter and return array of images
    getImages: async () => {
      console.log(`getImages ${App.options.minWidth}x${App.options.minHeight}`);
      const direct = isDirectImage();
      if (App.options.filter === Constants.FILTER.DIRECT && !direct) {
        console.log("not direct image");
        return false;
      }
      let images = [];
      for (const i in document.images) {
        if ({}.propertyIsEnumerable.call(document.images, i)) {
          if (App.isCancelled()) {
            return null;
          }
          let img = document.images[i];
          if (isImageVisible(img)) {
            if (!isImageLoaded(img)) {
              img = await App.waitForDomImage(i);
            }
            if (img === false) {
              continue;
            }
            img = App.responsiveSrc(img);
            if (App.validImage(img)) {
              images.push(img);
            }
          }
        }
      }
      let results = [];
      if (App.options.filter !== Constants.FILTER.ALL) {
        let maxDimension = 0;
        let maxImage; // undefined
        for (const img of images) {
          let currDimension = img.naturalWidth * img.naturalHeight;
          if (currDimension > maxDimension) {
            maxDimension = currDimension;
            maxImage = img;
          }
        }
        if (maxImage !== undefined) {
          images = [maxImage];
        }
      }
      let i = 0;
      for (const img of images) {
        i += 1;
        if (App.options.action === Constants.ACTION.TEST) {
          const wrapper = document.createElement("div");
          wrapper.setAttribute("style", "position:relative;");
          const label = document.createElement("div");
          label.setAttribute(
            "style",
            "position:absolute; top:10px; left:10px; padding:3px; background-color: #8b67b3; color: #fff; border: 1px solid #fff;"
          );
          label.innerText = i;
          const newImg = img.cloneNode();
          //newImg.setAttribute("style", "border: 1px solid #8b67b3;");
          wrapper.appendChild(newImg);
          wrapper.appendChild(label);
          if (img.parentNode) {
            img.parentNode.replaceChild(wrapper, img);
          }
        }
        let obj = { src: img.src, srcset: img.srcset };
        if (!direct) {
          obj.alt = img.alt;
        }
        results.push(obj);
      }
      console.log("Result", results, App.options);
      return { images: results, options: App.options };
    },

    sendMessage: async (type, body = null) => {
      try {
        console.debug(body);
        const message = await browser.runtime.sendMessage({
          type,
          body,
        });
        console.debug("Message received:", message);
        if (message.type === type) {
          return message.body;
        }
        console.error("Message did not contain the expected keys", message);
      } catch (err) {
        console.error("loadOptions error:", err);
      }
      return false;
    },

    // load options from background script
    // and find matching ruleset
    loadOptions: async () => {
      const obj = await App.sendMessage(Constants.MESSAGE_TYPES.TAB_OPTIONS, {
        url: window.location.href,
      });
      if (!obj) {
        return false;
      }
      for (const prop in obj) {
        // property guard https://eslint.org/docs/rules/no-prototype-builtins
        if ({}.propertyIsEnumerable.call(obj, prop)) {
          App.options[prop] = obj[prop];
        }
      }
      return true;
    },

    isCancelled: () => App.runtime.cancel,

    getCancelled: async () => {
      if (!App.isCancelled()) {
        const obj = await App.sendMessage(Constants.MESSAGE_TYPES.CANCEL);
        if (obj.cancel) {
          App.runtime.cancel = true;
          return true;
        }
      }
      return false;
    },

    fetchHeaders: async ({ url, options }) => {
      const r = await fetch(url, {
        method: "HEAD",
        mode: "no-cors",
        credentials: "same-origin",
        cache: "force-cache",
        referrerPolicy: "no-referrer-when-downgrade",
        ...options,
      });
      if (r.ok) {
        return {
          ok: r.ok,
          headers: [...r.headers].reduce(
            (acc, header) => ({ ...acc, [header[0]]: header[1] }),
            {}
          ),
        };
      }
      // HTTP error
      return {
        ok: r.ok,
        status: r.status,
        statusText: r.statusText,
      };
    },

    fetchDownload: async ({ url, options }) => {
      const start = new Date();
      const o = {
        mode: "no-cors",
        credentials: "same-origin",
        cache: "force-cache",
        referrerPolicy: "no-referrer-when-downgrade",
        ...options,
      };
      const r = await fetch(url, o);
      const finish = new Date();
      if (r.ok) {
        const blob = await r.blob();
        return { ok: r.ok, blob, ms: finish.getTime() - start.getTime() };
      }
      // HTTP error
      return {
        ok: r.ok,
        status: r.status,
        statusText: r.statusText,
      };
    },

    unload: () => {
      if (browser.runtime.onMessage.hasListener(App.handleMessage)) {
        console.debug("deleting message listener");
        browser.runtime.onMessage.removeListener(App.handleMessage);
      }
      return;
    },

    FETCH_HEADERS: async (body, sender) => {
      let result = {};
      try {
        result.result = await App.fetchHeaders(body);
      } catch (err) {
        result.error = err.message;
      }
      return result;
    },

    FETCH_DOWNLOAD: async (body, sender) => {
      let result = {};
      try {
        result.result = await App.fetchDownload(body);
      } catch (err) {
        result.error = err.message;
      }
      return result;
    },

    UNLOAD: (body, sender) => {
      let result = {};
      try {
        result.result = App.unload(body);
      } catch (err) {
        result.error = err.message;
      }
      return result;
    },

    wrapResponse: async (request, sender) => ({
      type: request.type,
      body: await App[request.type](request.body, sender),
    }),

    handleMessage: (request, sender, sendResponse) => {
      let msg;
      try {
        sendResponse(App.wrapResponse(request, sender));
      } catch (err) {
        if (!(request.type in App)) {
          console.error("Unexpected message", request); /* RemoveLogging:skip */
        }
        msg = {
          type: "ERROR",
          body: { error: err.message },
        };
        sendResponse(msg);
      }
    },

    init: async () => {
      App.runtime = { cancel: false };
      if (await App.loadOptions()) {
        browser.runtime.onMessage.addListener(App.handleMessage);

        // console.log(document.readyState);
        return await App.getImages();
      }
      return null;
    },
  };
  return App.init();
})();
