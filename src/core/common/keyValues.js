export default {
	/**
	 * Creates a name from a category key
	 *
	 * @memberOf common
	 * @name  common#getCategoryNameFromKey
	 * @method
	 *
	 * @param  {string} key
	 * @return {string}
	 */
	getCategoryNameFromKey: function (key) {
		var re = new RegExp('_', 'g');
		return key.split('.').pop().replace(re, ' ');
	},
};
