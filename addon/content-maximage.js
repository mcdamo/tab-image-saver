(function() {
  /*
  Check and set a global guard variable.
  If this content script is injected into the same page again,
  it will do nothing next time.
  */
  if (window.hasRun) {
    return;
  }
  window.hasRun = true;

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

  function handleResponse(message) {
    // console.log(`Message from the background script:  ${message.response}`);
  }

  function handleError(error) {
    console.error(`Error: ${error}`);
  }

  function notifyBackgroundPage(e) {
    let sending = browser.runtime.sendMessage({image: e});
    sending.then(handleResponse)
      .catch(error => handleError(error));
  }

  notifyBackgroundPage(getMaxImage());
})();
