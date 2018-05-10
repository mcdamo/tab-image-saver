(function() {
  function getImages() {
    let maxDimension = 0;
    let maxImage = null;

    // Iterate through all the images.
    for (let img of document.images) {
      if (img.width >= window.MIN_WIDTH && img.height >= window.MIN_HEIGHT) {
        let currDimension = img.width * img.height;
        if (currDimension > maxDimension) {
          maxDimension = currDimension;
          maxImage = img;
        }
      }
    }
    // Check if an image has been found.
    if (maxImage) {
      return [{src: maxImage.src,
	       alt: maxImage.alt}];
    }
    return null;
  }

  return getImages();
})();
