function saveOptions(e) {
	e.preventDefault();
	browser.storage.local.set({
		// radio
		action: document.querySelector("input[name=action]:checked").value,
		conflictAction: document.querySelector("input[name=conflictAction]:checked").value,
		// checkbox
		activeTab: document.querySelector("#activeTab").checked,
		tabImage: document.querySelector("#tabImage").checked,
		closeTab: document.querySelector("#closeTab").checked,
		activeTab: document.querySelector("#activeTab").checked,
		removeEnded: document.querySelector("#removeEnded").checked,
		notifyEnded: document.querySelector("#notifyEnded").checked,
		// text
		downloadPath: document.querySelector("#downloadPath").value.replace(/^[\/\\]+|[\/\\]+$/g, ''), // remove leading and trailing slashes
		minWidth: document.querySelector("#minWidth").value,
		minHeight: document.querySelector("#minHeight").value
	});
}

function restoreOptions() {

	function setCurrentChoice(result) {
		// radio
		if (null == result.action) {
			result.action = "current";
		}
		document.querySelector("#action-"+result.action).checked = true;
		if (null == result.conflictAction) {
			result.conflictAction = "uniquify";
		}
		// checkbox
		document.querySelector("#conflictAction-"+result.conflictAction).checked = true;
		document.querySelector("#activeTab").checked = result.activeTab;
		document.querySelector("#tabImage").checked = result.tabImage;
		document.querySelector("#closeTab").checked = result.closeTab;
		if (null == result.notifyOnEnded) {
			result.notifyOnEnded = true;
		}
		document.querySelector("#notifyEnded").checked = result.notifyEnded;
		document.querySelector("#removeEnded").checked = result.removeEnded;
		// text
		document.querySelector("#downloadPath").value = result.downloadPath || "";
		document.querySelector("#minWidth").value = result.minWidth || "100";
		document.querySelector("#minHeight").value = result.minHeight || "100";

	}

	function onError(error) {
		console.log(`Error: ${error}`);
	}

	var getting = browser.storage.local.get();
	getting.then(setCurrentChoice, onError);
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.querySelector("form").addEventListener("submit", saveOptions);
