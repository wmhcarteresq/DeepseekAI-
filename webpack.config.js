const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");
const TerserPlugin = require("terser-webpack-plugin");

module.exports = {
  entry: "./src/content/content.js",
  output: {
    filename: "content.js",
    path: path.resolve(__dirname, "dist"),
    clean: true
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        },
        exclude: /node_modules/
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"],
      }
    ],
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        {
          from: "./src/manifest.json",
          to: "manifest.json",
          transform(content) {
            return Buffer.from(JSON.stringify(JSON.parse(content), null, 2), 'utf-8')
          }
        },
        { from: "./src/icons", to: "icons" },
        { from: "./src/content/styles/style.css", to: "style.css" },
        { from: "./src/popup", to: "popup" },
        { from: "./src/background.js", to: "background.js" },
        { from: "./src/Instructions/Instructions.html", to: "Instructions/Instructions.html" },
        { from: "./src/Instructions/instructions.js", to: "Instructions/instructions.js" }
      ],
    }),
  ],
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          format: {
            comments: false,
            ascii_only: true
          }
        },
        extractComments: false,
      }),
    ],
  },
  resolve: {
    extensions: [".js"],
  },
  mode: "production",
};
