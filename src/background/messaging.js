import Constants from "./constants";
import Options from "./options";
import App from "./background";

const MESSAGE_TYPE = { ...Constants.MESSAGE_TYPE };

const Messaging = {
  [MESSAGE_TYPE.TAB_OPTIONS]: async ({ url }, sender) => {
    const options = await Options.getTabOptions(url);
    // 'action' can be overridden by runtime
    const windowId = sender.tab.windowId;
    options.action = App.getRuntime(windowId).action;
    return options;
  },

  [MESSAGE_TYPE.CANCEL]: (body, sender) => ({
    cancel: App.isCancelled(sender.tab.windowId),
  }),

  [MESSAGE_TYPE.BACKUP_DEFAULT]: async (body, sender) =>
    await App.backupDefault(),

  [MESSAGE_TYPE.BACKUP_EXPORT]: async (body, sender) =>
    await App.backupExport(),

  [MESSAGE_TYPE.BACKUP_IMPORT]: async (body, sender) =>
    await App.backupImport(body),

  [MESSAGE_TYPE.LEGACY_TEMPLATE_UPDATE]: async (body, sender) =>
    await App.legacyTemplateUpdate(),

  //[MESSAGE_TYPE.OPTIONS_ACTION]: (request, sender) => App.getAction(),

  [MESSAGE_TYPE.OPTIONS_OPTION_SAVE]: async ({ name, value }, sender) =>
    await Options.saveOption(name, value),

  [MESSAGE_TYPE.OPTIONS_RULESET_OPTION_SAVE]: async (
    { name, value, rulesetId },
    sender
  ) => await Options.saveRulesetOption(name, value, rulesetId),

  [MESSAGE_TYPE.OPTIONS_RULESET_CREATE]: async (body, sender) =>
    await Options.createRuleset(),

  [MESSAGE_TYPE.OPTIONS_RULESET_DELETE]: async ({ rulesetId }, sender) => {
    const newRulesetIndex = await Options.deleteRuleset(rulesetId);
    return {
      rulesetIndex: newRulesetIndex,
      options: Options.OPTIONS,
      rulesets: Options.RULESETS,
    };
  },

  [MESSAGE_TYPE.OPTIONS_SCHEMAS]: (body, sender) => ({
    options: Options.OPTIONS,
    rulesets: Options.RULESETS,
    schemas: {
      options: Options.getOptionSchema(),
      ruleset: Options.getOptionRulesetSchema(),
      types: Options.OPTION_TYPES,
    },
  }),

  [MESSAGE_TYPE.OPTIONS_ONSAVERULES]: ({ rules }, sender) =>
    Options.onSaveRules(rules),

  [MESSAGE_TYPE.OPTIONS_DOMAIN_ONSAVERULES]: ({ rules }, sender) =>
    Options.onSaveDomainRules(rules),

  [MESSAGE_TYPE.OPTIONS_DOMAIN_RULEMATCH]: ({ url, rule }, sender) => {
    const ret = {};
    try {
      ret.result = Options.domainRuleMatch(url, rule);
    } catch (err) {
      ret.error = err.message;
    }
    return ret;
  },

  [MESSAGE_TYPE.RUN_ACTION]: async ({ windowId, action }, sender) => {
    // Popup does not set sender.tab
    //const windowId = sender.tab.windowId;
    await App.run(windowId, action);
  },

  [MESSAGE_TYPE.RUNTIME_LAST]: ({ windowId }, sender) =>
    App.getRuntimeLast(windowId),

  [MESSAGE_TYPE.COMMAND_OPTIONS]: (body, sender) => {
    App.handleCommandOptions();
  },

  [MESSAGE_TYPE.COMMAND_DOWNLOADS]: (body, sender) => {
    App.handleCommandDownloads();
  },

  [MESSAGE_TYPE.COMMAND_SIDEBAR]: (body, sender) => {
    App.handleCommandSidebar();
  },

  handleMessage: async (request, sender, sendResponse) => {
    let msg;
    try {
      msg = {
        type: request.type,
        body: await Messaging[request.type](request.body, sender),
      };
    } catch (err) {
      if (!(request.type in Messaging)) {
        console.error("Unexpected message", request); /* RemoveLogging:skip */
      }
      msg = {
        type: MESSAGE_TYPE.ERROR,
        body: { error: err.message },
      };
    }
    // strip unserializable objects to prevent console warnings
    return JSON.parse(JSON.stringify(msg));
  },

  init: () => {
    if (!browser.runtime.onMessage.hasListener(Messaging.handleMessage)) {
      browser.runtime.onMessage.addListener(Messaging.handleMessage);
    }
  },
};

export default Messaging;
