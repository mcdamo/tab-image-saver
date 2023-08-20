const getCSSModuleLocalIdent = require('react-dev-utils/getCSSModuleLocalIdent');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

// NOTE: Loader `include` paths are relative to this module
const paths = require('../paths');
const path = require("path");

const cssRegex = /\.css$/;
const cssModuleRegex = /\.module\.css$/;

const getLoaders = (isEnvProduction = false, isEnvDevelopment = true, shouldUseRelativeAssetPaths = true, shouldUseSourceMap = false) => {

  const getStyleLoaders = (cssOptions, preProcessor) => {
    const styleLoaders = [
      isEnvDevelopment && require.resolve('style-loader'),
      isEnvProduction && {
        loader: MiniCssExtractPlugin.loader,
        options: Object.assign(
          {},
          shouldUseRelativeAssetPaths ? { publicPath: '../../' } : undefined,
        ),
        // options: {
        //   publicPath: (resourcePath, context) => {
        //     // publicPath is the relative path of the resource to the context
        //     // e.g. for ./css/admin/main.css the publicPath will be ../../
        //     // while for ./css/main.css the publicPath will be ../
        //     return path.relative(path.dirname(resourcePath), context) + "/";
        //   },
        // },
      },
      {
        loader: require.resolve('css-loader'),
        options: cssOptions,
      },
      {
        loader: require.resolve('postcss-loader'),
        options: {
          postcssOptions: {
            plugins: [
              require.resolve('postcss-flexbugs-fixes')
              [require.resolve('postcss-preset-env'), {
              autoprefixer: {
                flexbox: 'no-2009',
              },
              stage: 3,
              }]
            ]
          },
          sourceMap: isEnvProduction && shouldUseSourceMap,
        },
      },
    ].filter(Boolean);
    if (preProcessor) {
      styleLoaders.push({
        loader: require.resolve(preProcessor),
        options: {
          sourceMap: isEnvProduction && shouldUseSourceMap,
        },
      });
    }
    return styleLoaders;
  };

  // Process application JS with Babel.
  // The preset includes JSX, Flow, TypeScript, and some ESnext features.
  const insideBabelLoader = {
    test: /\.(js|mjs|jsx|ts|tsx)$/,
    include: paths.appSrc,
    loader: require.resolve('babel-loader'),
    options: {
      customize: require.resolve(
        'babel-preset-react-app/webpack-overrides'
      ),

      // probably redundant
      plugins: [
        [
          require.resolve('babel-plugin-named-asset-import'),
          {
            loaderMap: {
              svg: {
                ReactComponent:
                  '@svgr/webpack?-prettier,-svgo![path]',
              },
            },
          },
        ],
        /*[
          require.resolve('transform-object-rest-spread')
        ],*/
      ],
      cacheCompression: isEnvProduction,
      compact: isEnvProduction,
    },
  };
  // Process any JS outside of the app with Babel.
  // Unlike the application JS, we only compile the standard ES features.
  const outsideBabelLoader = {
    test: /\.(js|mjs)$/,
    exclude: /@babel(?:\/|\\{1,2})runtime/,
    loader: require.resolve('babel-loader'),
    options: {
      babelrc: false,
      configFile: false,
      compact: false,
      presets: [
        [
          require.resolve('babel-preset-react-app/dependencies'),
          { helpers: true },
        ],
      ],
      cacheDirectory: true,
      cacheCompression: isEnvProduction,
      sourceMaps: false,
    },
  };
  // "postcss" loader applies autoprefixer to our CSS.
  // "css" loader resolves paths in CSS and adds assets as dependencies.
  // "style" loader turns CSS into JS modules that inject <style> tags.
  // In production, we use MiniCSSExtractPlugin to extract that CSS
  // to a file, but in development "style" loader enables hot editing
  // of CSS.
  // By default we support CSS Modules with the extension .module.css
  const styleLoader = {
    test: cssRegex,
    exclude: cssModuleRegex,
    use: getStyleLoaders({
      importLoaders: 1,
      sourceMap: isEnvProduction && shouldUseSourceMap,
    }),
    sideEffects: true,
  };
  // Adds support for CSS Modules (https://github.com/css-modules/css-modules)
  // using the extension .module.css
  const cssModuleLoader = {
    test: cssModuleRegex,
    use: getStyleLoaders({
      importLoaders: 1,
      sourceMap: isEnvProduction && shouldUseSourceMap,
      modules: true,
      getLocalIdent: getCSSModuleLocalIdent,
    }),
  };

  const assetLoader = {
    test: [/\.(gif|jpe?g|png|svg)$/],
    type: 'asset/resource',
    generator: {
      filename: 'static/media/[name].[hash:8][ext]',
    },
  };

  return {
    insideBabelLoader,
    outsideBabelLoader,
    styleLoader,
    cssModuleLoader,
    assetLoader,
  };
};

module.exports = getLoaders;


