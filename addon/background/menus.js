if (typeof browser.menus !== "undefined") {
  const menus = {
    "browser_action_menu_options": {
      action: () => browser.runtime.openOptionsPage().catch(console.error),
      contexts: ["browser_action"]
    },
    "browser_action_menu_downloads": {
      action: () => browser.downloads.showDefaultFolder(),
      contexts: ["browser_action"]
    }
  };

  for (const [id, menu] of Object.entries(menus)) {
    browser.menus.create({
      id,
      title: browser.i18n.getMessage(id),
      contexts: menu.contexts
    });
  }

  browser.menus.onClicked.addListener((info) => {
    menus[info.menuItemId].action();
  });
}
