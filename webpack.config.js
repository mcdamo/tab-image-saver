const path = require('path');

const addon = path.resolve(__dirname, 'addon');
const dist = path.resolve(__dirname, 'dist');

module.exports = {
  entry: {
    content: path.join(addon, 'content'),
    background: path.join(addon, 'background'),
    options: path.join(addon, 'options'),
  },

  output: {
    path: dist,
    filename: '[name].js'
  },

  resolve: {
    extensions: [ '.js' ],
    modules: [path.join(__dirname, 'addon'), 'node_modules']
  },

  module: {
    rules: [
  		{
        test: /\.js$/,
        include: [
          path.resolve(__dirname, addon)
        ],
        exclude: /node_modules/
	  	},

{
    enforce: 'post',
    test: /\.js$/,
    loader: 'istanbul-instrumenter-loader',
//    include: helpers.root('src', 'app'),
        include: [
          path.resolve(__dirname, addon)
        ],
    exclude: /node_modules/,
}

    ],
  },
};
