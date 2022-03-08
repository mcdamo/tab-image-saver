import Constants from "./constants";

const Menus = {
  menus: {
    // maximum 6 top-level menu items
    // any more will be created in a submenu
    /*
    commands_default_action_label: {
      action: () => App.handleCommandAction(),
      contexts: ["browser_action"],
    },
    */
    commands_active_action_label: {
      icons: {
        16: "img/angle-down-solid.svg",
      },
      action: (App) =>
        App.handleCommandAction(Constants.SHORTCUT_TYPE.ACTIVE_ACTION),
      contexts: ["browser_action"],
    },
    commands_left_action_label: {
      icons: {
        16: "img/angle-double-left-solid.svg",
      },
      action: (App) =>
        App.handleCommandAction(Constants.SHORTCUT_TYPE.LEFT_ACTION),
      contexts: ["browser_action"],
    },
    commands_right_action_label: {
      icons: {
        16: "img/angle-double-right-solid.svg",
      },
      action: (App) =>
        App.handleCommandAction(Constants.SHORTCUT_TYPE.RIGHT_ACTION),
      contexts: ["browser_action"],
    },
    commands_all_action_label: {
      icons: {
        16: "img/angle-double-down-solid.svg",
      },
      action: (App) =>
        App.handleCommandAction(Constants.SHORTCUT_TYPE.ALL_ACTION),
      contexts: ["browser_action"],
    },
    browser_action_menu_options: {
      icons: { 16: "img/cog-solid.svg" },
      action: (App) => App.handleCommandOptions(),
      contexts: ["browser_action"],
    },
    browser_action_menu_sidebar: {
      icons: { 16: "img/columns-solid.svg" },
      action: (App) => App.handleCommandSidebar(),
      contexts: ["browser_action"],
    },
  },

  callback: (info) => {
    Menus.menus[info.menuItemId].action(Menus.App);
  },

  // init with App object for action callbacks
  init: async (App) => {
    Menus.App = App;
    console.debug("Menus.init");
    for (const [id, menu] of Object.entries(Menus.menus)) {
      if (menu.type && menu.type === "separator") {
        browser.menus.create({
          id,
          contexts: menu.contexts,
          type: menu.type,
        });
      } else {
        browser.menus.create({
          id,
          title: browser.i18n.getMessage(id),
          icons: menu.icons && menu.icons,
          contexts: menu.contexts,
          type: menu.type && menu.type,
        });
      }
    }

    if (!browser.menus.onClicked.hasListener(Menus.callback)) {
      browser.menus.onClicked.addListener(Menus.callback);
    }
  },
};

export default Menus;
