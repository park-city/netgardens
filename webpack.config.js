const path = require('path');

module.exports = {
  entry: './src/index.js',
  output: {
    filename: 'main.js',
    path: path.resolve(__dirname, 'dist'),
  },
  devServer: {
	  contentBase: path.join(__dirname, 'dist'),
	  compress: true,
  	port: 8000,
    hot: true,
  },
  mode: "development"
};