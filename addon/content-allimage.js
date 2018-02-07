(function() {
  function getImages() {
    let images = [];
    // Iterate through all the images.
    for (let img of document.images) {
      if (img.width >= window.MIN_WIDTH && img.height >= window.MIN_HEIGHT) {
        images.push({src: img.src});
      }
    }
    return images;
  }

  return getImages();
})();
