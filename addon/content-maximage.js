(function() {
  function getImages() {
    let maxDimension = 0;
    let maxImage = null;

    // Iterate through all the images.
    for (let img of document.images) {
      if (img.naturalWidth >= window.MIN_WIDTH && img.naturalHeight >= window.MIN_HEIGHT) {
        let currDimension = img.naturalWidth * img.naturalHeight;
        if (currDimension > maxDimension) {
          maxDimension = currDimension;
          maxImage = img;
        }
      }
    }
    // Check if an image has been found.
    if (maxImage) {
      return [{src: maxImage.src}];
    }
    return null;
  }

  return getImages();
})();
