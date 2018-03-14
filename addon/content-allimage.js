(function() {
  function getImages() {
    let images = [];
    // Iterate through all the images.
    for (let img of document.images) {
      if (img.naturalWidth >= window.MIN_WIDTH && img.naturalHeight >= window.MIN_HEIGHT) {
        images.push({src: img.src});
      }
    }
    return images;
  }

  return getImages();
})();
