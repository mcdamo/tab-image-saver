import Constants from "./constants";
import Options from "./options";
import App from "./background";

const MESSAGE_TYPE = { ...Constants.MESSAGE_TYPE };

const Messaging = {
  [MESSAGE_TYPE.TAB_OPTIONS]: async (request, sender) => {
    const { location } = request.body;
    const options = await Options.getTabOptions(location);
    // 'action' can be overridden by runtime
    const windowId = sender.tab.windowId;
    options.action = App.getRuntime(windowId).action;
    return options;
  },

  [MESSAGE_TYPE.CANCEL]: (request, sender) => {
    const windowId = sender.tab.windowId;
    return { cancel: App.isCancelled(windowId) };
  },

  handleMessage: async (request, sender, sendResponse) => {
    let msg;
    try {
      msg = {
        type: request.type,
        body: await Messaging[request.type](request, sender),
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

  init: async () => {
    await browser.runtime.onMessage.addListener(Messaging.handleMessage);
  },
};

export default Messaging;
