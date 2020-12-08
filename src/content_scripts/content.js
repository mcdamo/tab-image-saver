(async function () {
  // return random int between min:max
  function randomIntFromInterval(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
  }

  function sleep(ms) {
    console.log("sleep", ms);
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
          console.log("cancel:waitForDomImage");
          return false;
        }
        console.log(
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
        console.log(
          `valid image (${img.naturalWidth}x${img.naturalHeight}):`,
          img
        );
        return true;
      }
      // console.log(`invalid image (${img.naturalWidth}x${img.naturalHeight}):`, img);
      return false;
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
          img.parentNode.replaceChild(wrapper, img);
        }
        let obj = { src: img.src };
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
        console.log(body);
        const message = await browser.runtime.sendMessage({
          type,
          body,
        });
        console.log("Message received:", message);
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

    init: async () => {
      App.runtime = { cancel: false };
      if (await App.loadOptions()) {
        // console.log(document.readyState);
        return await App.getImages();
      }
      return null;
    },
  };
  return App.init();
})();
