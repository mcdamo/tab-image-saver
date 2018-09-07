(function() {
  // return random int between min:max
  function randomIntFromInterval(min, max)
  {
    return Math.floor(Math.random() * (max - min + 1) + min);
  }

  function sleep(ms) {
    console.log("sleep", ms);
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function isImageVisible(img) {
    return !(img.hidden);
  }

  function isImageLoaded(img) {
    // return img.complete;
    return (
      img.naturalWidth !== undefined && img.naturalHeight !== undefined
      // && img.naturalWidth > 0 && img.naturalHeight > 0 // an image that is stopped will have natural size 0x0
    );
  }

  function isDirectImage() {
    return (document.contentType.indexOf("image") === 0);
  }

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
        console.log(`waitForDomImage: loaded:${img.complete} ${img.naturalWidth}x${img.naturalHeight}`, img);
        await sleep(randomIntFromInterval(500, 1000));
      }
      return img;
    },

    // verify image meets minimum requirements
    validImage: (img) => {
      if (img.naturalWidth >= App.options.minWidth && img.naturalHeight >= App.options.minHeight) {
        console.log(`valid image (${img.naturalWidth}x${img.naturalHeight}):`, img);
        return true;
      }
      // console.log(`invalid image (${img.naturalWidth}x${img.naturalHeight}):`, img);
      return false;
    },

    // run chosen filter and return array of images
    getImages: async () => {
      console.log(`getImages ${App.options.minWidth}x${App.options.minHeight}`);
      const direct = isDirectImage();
      if (App.options.filter === "direct" && !direct) {
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
      if (App.options.filter !== "all") {
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
      for (const img of images) {
        let obj = {src: img.src};
        if (!direct) {
          obj.alt = img.alt;
        }
        results.push(obj);
      }
      console.log("Result", results);
      return results;
    },

    sendMessage: async (type) => {
      try {
        const message = await browser.runtime.sendMessage({type});
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
    // minHeight
    // minWidth
    // filter
    loadOptions: async () => {
      const obj = await App.sendMessage("OPTIONS");
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
        const obj = await App.sendMessage("CANCEL");
        if (obj.cancel) {
          App.runtime.cancel = true;
          return true;
        }
      }
      return false;
    },

    init: async () => {
      App.runtime = {cancel: false};
      if (await App.loadOptions()) {
        // console.log(document.readyState);
        return App.getImages();
      }
      return null;
    }
  };

  return App.init();
})();
