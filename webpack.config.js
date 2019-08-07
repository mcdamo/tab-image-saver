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
        include: [path.resolve(__dirname, addon)],
        exclude: path.resolve("node_modules/"),
      },

      {
        enforce: "post",
        test: /\.js$/,
        loader: "istanbul-instrumenter-loader",
        query: {
          // https://github.com/webpack-contrib/istanbul-instrumenter-loader/issues/33
          esModules: true,
        },
        //    include: helpers.root('src', 'app'),
        include: [
          path.resolve(__dirname, addon),
          /*exclude: [
          path.resolve('node_modules/'),
          path.resolve(__dirname, addon, 'lib')
          */
        ],
      },
    ],
  },
};
