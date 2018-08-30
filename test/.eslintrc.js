"use strict";

module.exports = {
  "globals": {"sinon": false},

  // Mocha can't use arrow functions as sometimes we need to call `this` and
  // using an arrow function alters the binding of `this`.
  // Hence we disable prefer-arrow-callback here so that mocha/no-mocha-arrows can
  // be applied nicely.
  "rules": {"prefer-arrow-callback": 0}
};
