if (typeof browser.menus !== "undefined") {
  browser.menus.create({
    id: "browser_action_options",
    title: "Preferences",
    contexts: ["browser_action"]
  });
  browser.menus.create({
    id: "browser_action_downloadsFolder",
    title: "Downloads Folder",
    contexts: ["browser_action"]
  });

  browser.menus.onClicked.addListener(info => {
    switch (info.menuItemId) {
      case "browser_action_options": {
        browser.runtime.openOptionsPage().catch(console.error);
        break;
      }
      case "browser_action_downloadsFolder": {
        browser.downloads.showDefaultFolder();
        break;
      }
    }
  });
}
