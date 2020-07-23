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
// let browser = require('sinon-chrome/webextensions');
const browserFake = require("webextensions-api-fake");
const browser = browserFake();

/*
browser.windows = {
  getCurrent: sinon.stub().resolves({id: 1}), // return window object.
};
*/
global.browser = browser;

// stub document to prevent options-ui from running on-load
document.addEventListener = sinon.stub();
