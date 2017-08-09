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
		var maxDimension = 0;
		var maxImage = null;

		// Iterate through all the images.
		for (var img of document.images) {
			var currDimension = img.width * img.height;
			if (currDimension  > maxDimension){
				maxDimension = currDimension
				maxImage = img;
			}
		}
		// Check if an image has been found.
		if (maxImage)
			return {
			src: maxImage.src,
			width: maxImage.width,
			height: maxImage.height
		}
		else
			return null;
	}


	function handleResponse(message) {
		//console.log(`Message from the background script:  ${message.response}`);
	}

	function handleError(error) {
		console.log(`Error: ${error}`);
	}


	function notifyBackgroundPage(e) {
		var sending = browser.runtime.sendMessage({
			image: e
		});
		sending.then(handleResponse, handleError);
	}

	notifyBackgroundPage(getMaxImage());
})();
