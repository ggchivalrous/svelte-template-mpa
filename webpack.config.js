const Os = require('os')
const fs = require('fs')
const path = require('path')
const webpack = require('webpack')
const Preprocess = require('svelte-preprocess')
const TerserPlugin = require('terser-webpack-plugin')
const postcssNormalize = require('postcss-normalize')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin')
const pageConfig = require('./page.config')

const ENV = process.env.NODE_ENV || 'development'
const isProd = ENV === 'production'
const isDev = ENV === 'development'
// build的时候是否生成map文件
const prodMaps = false

/**
 * 获取样式处理loader
 */
function getStyleLoaders(cssOptions, preProcessor) {
  const loaders = [
    isDev && require.resolve('style-loader'),
    isProd && {
      loader: MiniCssExtractPlugin.loader,
      options: { publicPath: '../../' },
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
            // 用来解决所有flexbug的问题
            ['postcss-flexbugs-fixes'],
            [
              'postcss-preset-env',
              {
                autoprefixer: {
                  flexbox: 'no-2009',
                },
                stage: 3,
              },
            ],
            postcssNormalize(),
          ],
        },

        sourceMap: isProd ? prodMaps : isDev,
      },
    },
  ].filter(Boolean)

  // 其他自定义 loader 加载
  if (preProcessor) {
    loaders.push(
      {
        loader: require.resolve('resolve-url-loader'),
        options: {
          sourceMap: isProd ? prodMaps : isDev,
          root: path.resolve(__dirname, 'src'),
        },
      },
      {
        loader: require.resolve(preProcessor),
        options: {
          sourceMap: isProd ? prodMaps : isDev,
        },
      }
    )
  }
  return loaders
}

/**
 * 处理环境变量
 */
function handleProcessEnv() {
  let envs = {}
  for (const key in process.env) {
    if (Object.hasOwnProperty.call(process.env, key)) {
      envs[key] = JSON.stringify(process.env[key])
    }
  }
  return { ...envs }
}

function getIP() {
  const ipList = Os.networkInterfaces()
  for (const key in ipList) {
    if (Object.hasOwnProperty.call(ipList, key)) {
      const item = ipList[key]
      for (let index = 0; index < item.length; index++) {
        const data = item[index]
        if (data.family === 'IPv4' && data.address !== '127.0.0.1') {
          return data.address
        }
      }
    }
  }
}

/**
 * 获取多页HTML配置
 */
function getHTMLPlugin() {
  return pageInfo.map(item => {
    return new HtmlWebpackPlugin(
      Object.assign(
        {},
        {
          inject: true,
          filename: item.filename,
          template: item.template,
          chunks: [item.name],
        },
        isProd
          ? {
              minify: {
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
              },
            }
          : undefined
      )
    )
  })
}

/**
 * 自动获取views下得页面，自动生成配置
 */
function getPagesInfo() {
  const root = path.resolve(__dirname, 'src/views')
  const pageList = fs.readdirSync(root)
  return pageList.map(item => {
    const filePath = path.resolve(root, item)
    if (fs.statSync(filePath).isDirectory()) {
      return {
        name: item,
        entry: path.resolve(filePath, 'main.js'),
        template: 'public/index.html',
        filename: item + '/index.html',
      }
    }
  })
}

const sveltePath = path.resolve('node_modules', 'svelte')
const pageInfo = pageConfig && pageConfig.length > 0 ? pageConfig : getPagesInfo()
const entry = {}
pageInfo.forEach(item => {
  entry[item.name] = item.entry
})

console.log(entry, getHTMLPlugin())

module.exports = {
  entry,
  output: {
    path: path.resolve(__dirname, 'dist'),
    pathinfo: isDev,
    filename: isProd ? 'static/js/[name].bundle.[contenthash:8].js' : 'static/js/[name].bundle.js',
    chunkFilename: isProd ? 'static/js/chunk.[contenthash:8].js' : 'static/js/[name].chunk.js',
  },
  devServer: {
    stats: 'minimal',
    contentBase: 'public',
    watchContentBase: true,
    host: getIP(),
    open: true,
  },
  // 在生产初期停止编译
  bail: isProd,

  // 模块解析
  resolve: {
    modules: ['node_modules'],
    extensions: ['.mjs', '.js', '.svelte'],
    // 模块别名
    alias: {
      svelte: path.resolve('node_modules', 'svelte'),
      '@': path.resolve(__dirname, 'src'),
    },
    mainFields: ['svelte', 'browser', 'module', 'main'],
  },

  // 模块
  module: {
    strictExportPresence: true,
    rules: [
      { parser: { requireEnsure: false } },
      // svelte babel 处理，语法降级
      {
        test: /\.(?:svelte|m?js)$/,
        include: [path.resolve(__dirname, 'src'), path.dirname(sveltePath)],
        use: {
          loader: 'babel-loader',
          options: {
            sourceType: 'unambiguous',
            presets: ['@babel/preset-env'],
            plugins: ['@babel/plugin-transform-runtime'],
          },
        },
      },

      {
        // oneOf 作用是，当规则匹配时，只使用第一个匹配规则
        // 当没有命中时，会直接匹配列表末尾的规则

        oneOf: [
          {
            test: /\.svelte$/,
            use: {
              loader: 'svelte-loader',
              options: {
                emitCss: true,
                hotReload: isDev,
                hotOptions: {
                  noPreserveState: false,
                  optimistic: true,
                },
                preprocess: Preprocess({
                  scss: true,
                  postcss: {
                    plugins: [require('autoprefixer')],
                  },
                }),
              },
            },
          },
          {
            test: /\.(scss|sass)$/,
            use: getStyleLoaders(
              {
                importLoaders: 3,
                sourceMap: isProd ? prodMaps : isDev,
              },
              'sass-loader'
            ),
            // 没有安装对应loader时，运行会报错，当Web包为此添加警告或错误时删除此项。
            sideEffects: true,
          },
          {
            test: /\.css$/,
            use: getStyleLoaders({
              importLoaders: 1,
              sourceMap: isProd ? prodMaps : isDev,
            }),
            sideEffects: true,
          },
          {
            test: [/\.bmp$/, /\.gif$/, /\.jpe?g$/, /\.png$/],
            loader: require.resolve('url-loader'),
            options: {
              limit: 10000,
              name: isProd ? 'static/assets/[hash:8].[ext]' : 'static/assets/[name].[ext]',
            },
          },
          // 其他文件统一处理，如字体、音频
          // 后面追加的 loader 请写在这个规则的前面，否则将不会生效
          {
            loader: require.resolve('file-loader'),
            exclude: [/\.(js|mjs|svelte)$/, /\.html$/, /\.json$/],
            options: {
              name: isProd ? 'static/assets/[hash:8].[ext]' : 'static/assets/[name].[ext]',
            },
          },
        ],
      },
    ].filter(Boolean),
  },

  // 环境
  mode: ENV,

  // 插件
  plugins: [
    new MiniCssExtractPlugin({
      filename: 'static/css/[contenthash:8].css',
      chunkFilename: 'static/css/[contenthash:8].chunk.css',
    }),

    // 每次构建，清除构建目录
    isProd && new CleanWebpackPlugin(),

    // html 模板处理，生产环境自动注入文件路径
    ...getHTMLPlugin(),

    // 在webpack配置外使用Node模块
    new webpack.DefinePlugin({
      'process.env': handleProcessEnv(),
    }),
  ].filter(Boolean),

  // 优化
  optimization: {
    minimize: isProd,
    minimizer: [
      new OptimizeCSSAssetsPlugin({
        cssProcessorOptions: {
          map: prodMaps
            ? {
                inline: false,
                annotation: true,
              }
            : false,
        },
        cssProcessorPluginOptions: {
          preset: [
            'default',
            {
              discardComments: {
                removeAll: !prodMaps,
              },
              minifyFontValues: { removeQuotes: false },
            },
          ],
        },
      }),
      new TerserPlugin({
        sourceMap: prodMaps,
        extractComments: false,
        terserOptions: {
          parse: {
            ecma: 8,
          },
          compress: {
            ecma: 5,
            warnings: false,
            comparisons: false,
            inline: 2,
          },
          mangle: {
            safari10: true,
          },
          output: {
            ecma: 5,
            comments: false,
            ascii_only: true,
          },
        },
      }),
    ],
    splitChunks: {
      chunks: 'all',
      name: false,
    },
  },

  // map 源文件
  devtool: isProd && prodMaps ? 'source-map' : false,

  /**
   * 有些库导入节点模块，但不在浏览器中使用它们。
   * 告诉webpack为它们提供空的模拟，以便导入它们。
   */
  node: {
    module: 'empty',
    dgram: 'empty',
    dns: 'mock',
    fs: 'empty',
    http2: 'empty',
    net: 'empty',
    tls: 'empty',
    child_process: 'empty',
  },
}
