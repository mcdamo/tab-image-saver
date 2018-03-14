(function() {
  function getImages() {
    let maxImage = null;
    if (document.contentType.indexOf("image") === 0) {
      maxImage = document.images[0];
    }
    if (maxImage && maxImage.naturalWidth >= window.MIN_WIDTH && maxImage.naturalHeight >= window.MIN_HEIGHT) {
      return [{src: maxImage.src}];
    }
    return null;
  }

  return getImages();
})();
