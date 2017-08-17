(function() {
  function getMaxImage() {
    let maxDimension = 0;
    let maxImage = null;

    // Iterate through all the images.
    for (let img of document.images) {
      let currDimension = img.width * img.height;
      if (currDimension > maxDimension) {
        maxDimension = currDimension;
        maxImage = img;
      }
    }
    // Check if an image has been found.
    if (maxImage) {
      return {
        src: maxImage.src,
        width: maxImage.width,
        height: maxImage.height
      };
    }
    return null;
  }

  return getMaxImage();
})();
