// setup sinon and chai
let chai = require("chai");
let sinon = require("sinon");
let chaiAsPromised = require("chai-as-promised");
global.sinon = sinon;
let sinonChai = require("sinon-chai");
chai.use(sinonChai);
chai.use(chaiAsPromised); // install as last plugin
global.expect = chai.expect;
// global.assert = chai.assert;
// sinon.assert.expose(chai.assert, { prefix: "" });

// create mock browser
let browser = require("sinon-chrome/webextensions");

/*
browser.windows = {
  getCurrent: sinon.stub().resolves({id: 1}), // return window object.
};
*/
global.browser = browser;

// stub document to prevent options-ui from running on-load
document.addEventListener = sinon.stub();

// mock local storage
let localStore = {};
const localStorage = {
  get(keys = null) {
    // TODO: keys ignored
    return localStore;
  },
  set(o) {
    for (const [key, val] of Object.entries(o)) {
      localStore[key] = val;
    }
    return true;
  },
  remove(keys) {
    for (const key of keys) {
      delete localStore[key];
    }
    return true;
  },
  clear() {
    localStore = {};
    return true;
  },
};
browser.storage.local.get.callsFake((keys) =>
  Promise.resolve(localStorage.get(keys))
);
browser.storage.local.set.callsFake((o) =>
  Promise.resolve(localStorage.set(o))
);
browser.storage.local.remove.callsFake((keys) =>
  Promise.resolve(localStorage.remove(keys))
);
browser.storage.local.clear.callsFake(() =>
  Promise.resolve(localStorage.clear())
);
