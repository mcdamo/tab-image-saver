const { IgnorePlugin } = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CaseSensitivePathsPlugin = require('case-sensitive-paths-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");
const HtmlWebpackTagsPlugin = require('html-webpack-tags-plugin');
const safePostCssParser = require('postcss-safe-parser');
const ModuleNotFoundPlugin = require('react-dev-utils/ModuleNotFoundPlugin');
const ModuleScopePlugin = require('react-dev-utils/ModuleScopePlugin');
const CopyPlugin = require('copy-webpack-plugin');
const ESLintPlugin = require('eslint-webpack-plugin');

const paths = require('../paths');
const staticFiles = require('./static-files');

const minifyHtml = {
  removeComments: true,
  collapseWhitespace: true,
  removeRedundantAttributes: true,
  useShortDoctype: true,
  removeEmptyAttributes: true,
  removeStyleLinkTypeAttributes: true,
  keepClosingSlash: true,
  minifyJS: true,
  minifyCSS: true,
  minifyURLs: true,
};


const getPlugins = (isEnvProduction = false, shouldUseSourceMap = false) => {
  /* HTML Plugins for options, sidebar, options */
  const optionsHtmlPlugin = new HtmlWebpackPlugin(
    Object.assign(
      {},
      {
        title: 'Options',
        chunks: ['options'],
        filename: 'options.html',
        template: paths.optionsTemplate,
      },
      isEnvProduction
        ? {
          minify: minifyHtml,
        }
        : undefined
    )
  );

  const popupHtmlPlugin = new HtmlWebpackPlugin(
    Object.assign(
      {},
      {
        title: 'Popup',
        chunks: ['popup'],
        filename: 'popup.html',
        template: paths.popupTemplate,
      },
      isEnvProduction
        ? {
          minify: minifyHtml,
        }
        : undefined
    )
  );

  const sidebarHtmlPlugin = new HtmlWebpackPlugin(
    Object.assign(
      {},
      {
        title: 'Sidebar',
        chunks: ['sidebar'],
        filename: 'sidebar.html',
        template: paths.sidebarTemplate,
      },
      isEnvProduction
        ? {
          minify: minifyHtml,
        }
        : undefined
    )
  );

  const moduleNotFoundPlugin = new ModuleNotFoundPlugin(paths.appPath);
  const caseSensitivePathsPlugin = new CaseSensitivePathsPlugin();
  const miniCssExtractPlugin = new MiniCssExtractPlugin({
    filename: '[name].css',
    chunkFilename: '[id].css', // 'static/css/[name].[contenthash:8].chunk.css',
  });
  const ignorePlugin = new IgnorePlugin({resourceRegExp: /^\.\/locale$/, contextRegExp: /moment$/});
  const terserPlugin = new TerserPlugin({
    parallel: true,
    terserOptions: {
      sourceMap: shouldUseSourceMap,
      compress: {
        defaults: false, // disable all defaults; some defaults breaks extension for only 3% saving in space
        ecma: 5,
        comparisons: false,
        // inline: 2,
        negate_iife: false, // breaks extension
        side_effects: false, // breaks extension
      },
      output: {
        ecma: 5,
        comments: false,
        //ascii_only: true,
      },
    },
  });
  const cssMinimizerPlugin = new CssMinimizerPlugin({
    minimizerOptions: {
      processorOptions: {
        // parser: safePostCssParser, // FIXME: breaks build
        map: false,
      }
    }
  });
  /* Include these static JS and CSS assets in the generated HTML files */
  const htmlWebpackTagsPlugin = new HtmlWebpackTagsPlugin({
    append: false,
    assets: staticFiles.htmlAssets,
  });

  const moduleScopePlugin = new ModuleScopePlugin(paths.appSrc, [paths.appPackageJson]);
  const copyPlugin = new CopyPlugin({ patterns: staticFiles.copyPatterns});
  
  const eslintPlugin = new ESLintPlugin( {
    emitError: true,
    emitWarning: true,
    failOnError: true,
    test: /\.(js|mjs|jsx)$/,
    enforce: 'pre',
    use: [
      {
        options: {
          formatter: require.resolve('react-dev-utils/eslintFormatter'),
          eslintPath: require.resolve('eslint'),

        },
      },
    ],
    include: paths.appSrc,
  } );

  return {
    optionsHtmlPlugin,
    popupHtmlPlugin,
    sidebarHtmlPlugin,
    moduleNotFoundPlugin,
    caseSensitivePathsPlugin,
    miniCssExtractPlugin,
    ignorePlugin,
    terserPlugin,
    cssMinimizerPlugin,
    moduleScopePlugin,
    copyPlugin,
    htmlWebpackTagsPlugin,
    eslintPlugin,
  };
};

module.exports = getPlugins;


