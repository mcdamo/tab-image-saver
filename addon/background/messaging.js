/* globals App MESSAGE_TYPES Options */

const Messaging = {
  handleMessage: async (request, sender, sendResponse) => {
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
        const name = request.body.name;
        const value = request.body.value;
        const opt = Options.getOptionMeta(name);
        try {
          msg = {
            type: MESSAGE_TYPES.OPTIONS_ONSAVE,
            body: {
              name,
              value: await opt.onSave.function(value)
            }
          };
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
        console.error("Unexpected message from tab", request); /* RemoveLogging:skip */
        break;
      }
    }
    // strip unserializable objects to prevent console warnings
    return JSON.parse(JSON.stringify(msg));
  }
};

browser.runtime.onMessage.addListener(Messaging.handleMessage);

// Export for testing
if (typeof module !== "undefined") {
  module.exports = {Messaging};
}
