/* globals App MESSAGE_TYPES Options */

const Messaging = {
  listener: async (request, sender, sendResponse) => {
    let msg = {};
    switch (request.type) {
      case MESSAGE_TYPES.OPTIONS: {
        msg = {
          type: MESSAGE_TYPES.OPTIONS,
          body: await Options.getOptions()
        };
        break;
      }
      case MESSAGE_TYPES.OPTIONS_SCHEMA: {
        msg = {
          type: MESSAGE_TYPES.OPTIONS_SCHEMA,
          body: {
            keys: Options.OPTION_KEYS,
            types: Options.OPTION_TYPES
          }
        };
        break;
      }
      case MESSAGE_TYPES.OPTIONS_ONSAVE: {
        let name = request.body.name;
        let value = request.body.value;
        let opt = Options.getOptionMeta(name);
        try {
          await opt.onSave.function(value);
          msg = {type: MESSAGE_TYPES.OK};
        } catch (err) {
          msg = {
            type: MESSAGE_TYPES.ERROR,
            body: {error: err.message}
          };
        }
        break;
      }
      case MESSAGE_TYPES.CANCEL: {
        let windowId = sender.tab.windowId;
        msg = {
          type: MESSAGE_TYPES.CANCEL,
          body: {cancel: App.isCancelled(windowId)}
        };
        break;
      }
      default: {
        console.error("Unexpected message from tab", request);
        break;
      }
    }
    return msg;
  }
};

browser.runtime.onMessage.addListener(Messaging.listener);

// Export for testing
if (typeof module !== "undefined") {
  module.exports = {Messaging};
}
