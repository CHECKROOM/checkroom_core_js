module.exports = {
	presets: [
		[
			'@babel/preset-env',
			{
				forceAllTransforms: true,
				exclude: ['@babel/plugin-transform-regenerator'],
			},
		],
	],
};
