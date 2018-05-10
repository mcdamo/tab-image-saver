(function() {
  function getImages() {
    let maxImage = null;
    if (document.contentType.indexOf("image") === 0) {
      maxImage = document.images[0];
    }
    if (maxImage && maxImage.width >= window.MIN_WIDTH && maxImage.height >= window.MIN_HEIGHT) {
      return [{src: maxImage.src,
	       alt: maxImage.alt}];
    }
    return null;
  }

  return getImages();
})();
