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

  for (const menu of Object.keys(menus)) {
    browser.menus.create({
      id: menu,
      title: browser.i18n.getMessage(menu),
      contexts: menu.contexts
    });
  }

  browser.menus.onClicked.addListener((info) => {
    menus[info.menuItemId].action();
  });
}
