const path = require('path');

module.exports = {
	mode: 'production',
	entry: {
		core: './src/core.js',
		signup: './src/signup.js',
	},
	output: {
		libraryTarget: 'umd',
		libraryExport: 'default',
		umdNamedDefine: true,
		path: path.resolve(__dirname, './build'),
		filename: '[name].js',
	},
	resolve: {
		extensions: ['.js'],
	},
	externals: {
		moment: 'moment',
	},
	module: {
		rules: [
			{
				test: /\.(js)$/,
				exclude: /node_modules/,
				loader: 'babel-loader',
			},
		],
	},
	devtool: 'source-map',
};
