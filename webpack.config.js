//webpack.config.js
const path = require('path');

module.exports = {
	mode: 'development',
	entry: {
		core: './src/core.js',
		signup: './src/signup.js',
	},
	output: {
		environment: {
			arrowFunction: false,
			bigIntLiteral: false,
			const: false,
			destructuring: false,
			dynamicImport: false,
			forOf: false,
		},
		libraryTarget: 'umd',
		libraryExport: 'default',
		umdNamedDefine: true,
		//library: 'corejs',
		path: path.resolve(__dirname, './build'),
		filename: '[name].js', // <--- Will be compiled to this single file
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
};
