const reporters = ["mocha", "coverage-istanbul"];
if (process.env.COVERALLS_REPO_TOKEN) {
  reporters.push("coveralls");
}

module.exports = function (config) {
  let webpackConfig = require("./webpack.config.js");
  config.set({
    // base path that will be used to resolve all patterns (eg. files, exclude)
    basePath: "",

    // frameworks to use
    // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
    frameworks: ["mocha"],

    files: [
      // Test dependencies
      // "node_modules/sinon/pkg/sinon.js",
      // "node_modules/sinon-chrome/bundle/sinon-chrome.min.js",
      // "node_modules/sinon-chrome/bundle/sinon-chrome-webextensions.min.js",
      "test/setup.js",

      // Files
      // "addon/**/*.js",
      //"addon/background/constants.js",
      //"addon/background/global.js",
      //"addon/**/*.js",

      // Tests
      "test/unit/**/*.test.js",
    ],

    // The tests below are intended to be run from inside the WebExtension itself,
    // not from the Karma test suite.
    exclude: ["test/functional"],

    // change Karma's debug.html to the mocha web reporter
    client: {
      captureConsole: true, // output browser.console messages
      mocha: {
        // change Karma's debug.html to the mocha web reporter
        reporter: "html",
      },
    },
    browserConsoleLogOptions: {
      level: "log",
      format: "%b %T: %m",
      terminal: true,
    },

    // preprocess matching files before serving them to the browser
    // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
    preprocessors: {
      "src/**/*.js": ["coverage"],
      "test/setup.js": ["webpack"],
      "test/unit/**/*.test.js": ["webpack"],
    },

    // web server port
    port: 9876,

    // enable / disable colors in the output (reporters and logs)
    colors: true,

    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR ||
    //                  config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    //logLevel: config.LOG_INFO,

    // enable/disable watching file and executing tests when any file changes
    autoWatch: false,

    // start these browsers
    // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
    browsers: ["Firefox"],

    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: true,

    // test results reporter to use
    // possible values: 'dots', 'progress'
    // available reporters: https://npmjs.org/browse/keyword/karma-reporter
    reporters,

    // Concurrency level
    // how many browser should be started simultaneous
    concurrency: Infinity,
    /*
    coverageReporter: {
      dir: "report/coverage",
      reporters: [
        {
          type: "lcov",
          subdir: "lcov"
        },
        {
          type: "html",
          subdir(browser) {
            // normalization process to keep a consistent browser name
            // across different OS
            return browser.toLowerCase().split(/[ /-]/)[0];
          }
        }, {type: "text-summary"}
      ]
    },
*/
    // any of these options are valid: https://github.com/istanbuljs/istanbuljs/blob/aae256fb8b9a3d19414dcf069c592e88712c32c6/packages/istanbul-api/lib/config.js#L33-L39
    coverageIstanbulReporter: {
      // reports can be any that are listed here: https://github.com/istanbuljs/istanbuljs/tree/aae256fb8b9a3d19414dcf069c592e88712c32c6/packages/istanbul-reports/lib
      reports: ["html", "lcovonly", "text-summary"],

      // base output directory. If you include %browser% in the path it will be replaced with the karma browser name
      //dir: path.join('report', 'coverage'),
      dir: "report/coverage",

      // Combines coverage information from multiple browsers into one report rather than outputting a report
      // for each browser.
      combineBrowserReports: true,

      // if using webpack and pre-loaders, work around webpack breaking the source path
      fixWebpackSourcePaths: true,

      // Omit files with no statements, no functions and no branches from the report
      skipFilesWithNoCoverage: false,

      // Most reporters accept additional config options. You can pass these through the `report-config` option
      "report-config": {
        // all options available at: https://github.com/istanbuljs/istanbuljs/blob/aae256fb8b9a3d19414dcf069c592e88712c32c6/packages/istanbul-reports/lib/html/index.js#L135-L137
        html: {
          // outputs the report in ./coverage/html
          subdir: "html",
        },
      },
      verbose: false, // output config used by istanbul for debugging
    },
    // webpack: webpackConfig,
    webpack: {
      mode: "development",
      resolve: webpackConfig.resolve,
      module: webpackConfig.module,
    },
  });
};
