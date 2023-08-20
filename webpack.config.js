const path = require("path");

const addon = path.resolve(__dirname, "src");
const dist = path.resolve(__dirname, "dist");

module.exports = {
  entry: {
    content: path.join(addon, "content"),
    background: path.join(addon, "background"),
    options: path.join(addon, "options"),
    popup: path.join(addon, "popup"),
  },

  output: {
    path: dist,
    filename: "[name].js",
  },

  resolve: {
    extensions: [".js"],
    modules: [path.join(__dirname, "src"), "node_modules"],
  },

  module: {
    rules: [
      {
        test: /\.js$/,
        enforce: "post",
        include: [path.resolve(__dirname, addon)],
        use: "@jsdevtools/coverage-istanbul-loader",
      },
    ],
  },
};
