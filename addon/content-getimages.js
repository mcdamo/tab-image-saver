(function() {
  let App = {
    // variables
    minHeight: undefined,
    minWidth: undefined,
    filter: undefined,
    images: [],

    // add to collection
    addImage(img) {
      App.images.push({
        src: img.src,
        alt: img.alt
      });
    },

    // verify image meets minimum requirements
    validImage(img) {
      if (img.naturalWidth >= App.minWidth && img.naturalHeight >= App.minHeight) {
        return true;
      }
      return false;
    },

    // run chosen filter and return array of images
    getImages() {
      console.log(`getImages ${App.filter} ${App.minWidth}x${App.minHeight}`);
      if (App.filter === "direct") {
        if (document.contentType.indexOf("image") === 0) {
          let img = document.images[0];
          if (App.validImage(img)) {
            App.addImage(img);
          }
        }
      } else if (App.filter === "all") {
        // Iterate through all the images.
        for (let img of document.images) {
          if (App.validImage(img)) {
            App.addImage(img);
          }
        }
      } else { // filter = max
        let maxDimension = 0;
        let maxImage = null;
        // Iterate through all the images.
        for (let img of document.images) {
          if (App.validImage(img)) {
            let currDimension = img.naturalWidth * img.naturalHeight;
            if (currDimension > maxDimension) {
              maxDimension = currDimension;
              maxImage = img;
            }
          }
        }
        // Check if an image has been found.
        if (maxImage) {
          App.addImage(maxImage);
        }
      }
      console.log("Result", App.images);
      return App.images;
    },

    // load options from background script
    async loadOptions() {
      try {
        let message = await browser.runtime.sendMessage({action: "config"});
        console.log("Message received:", message);
        if (message.action === "config") {
          let obj = message.body;
          for (let prop in obj) {
            // property guard https://eslint.org/docs/rules/no-prototype-builtins
            if ({}.propertyIsEnumerable.call(obj, prop)) {
              App[prop] = obj[prop];
            }
          }
          return true;
        }
        console.error("Message did not contain the expected keys", message);
      } catch (err) {
        console.error(err);
      }
      return false;
    },

    async init() {
      if (await App.loadOptions()) {
        return App.getImages();
      }
      return null;
    }
  };

  return App.init();
})();
