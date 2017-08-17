(function() {
  function getMaxImage() {
    let maxImage = null;
    if (document.contentType.indexOf("image") === 0) {
      maxImage = document.images[0];
    }
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
