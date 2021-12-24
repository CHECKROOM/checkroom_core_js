import moment from 'moment';

export default {
	templateIsArchived: function (templ) {
		return !(templ.archived == null);
	},
	templateCanDelete: function (templ) {
		return !templ.system;
	},
	templateCanActivate: function (templ) {
		return templ.status == 'inactive' && templ.archived == null;
	},
	templateCanDeactivate: function (templ) {
		return templ.status == 'active' && templ.archived == null;
	},
	templateCanArchive: function (templ) {
		return templ.archived == null;
	},
	templateCanUndoArchive: function (templ) {
		return templ.archived != null;
	},

	/**
	 * getFriendlyTemplateStatus
	 *
	 * @memberOf common
	 * @name  common#getFriendlyTemplateStatus
	 * @method
	 *
	 * @param  {string} status
	 * @return {string}
	 */
	getFriendlyTemplateStatus: function (status) {
		switch (status) {
			case 'inactive':
				return 'Inactive';
			case 'active':
				return 'Active';
			case 'archived':
				return 'Archived';
			default:
				return 'Unknown';
		}
	},
	/**
	 * getFriendlyTemplateCss
	 *
	 * @memberOf common
	 * @name  common#getFriendlyTemplateCss
	 * @method
	 *
	 * @param  {string} status
	 * @return {string}
	 */
	getFriendlyTemplateCss: function (status) {
		switch (status) {
			case 'inactive':
				return 'label-inactive';
			case 'active':
				return 'label-active';
			case 'archived':
				return 'label-archived';
			default:
				return '';
		}
	},
	/**
	 * getFriendlyTemplateSize
	 *
	 * @memberOf common
	 * @name  common#getFriendlyTemplateSize
	 * @method
	 *
	 * @param  {float} width
	 * @param  {float} height
	 * @param  {string} unit
	 * @return {string}
	 */
	getFriendlyTemplateSize: function (width, height, unit) {
		if (width == 0.0 || height == 0.0) {
			return '';
		} else if (unit == 'inch' && ((width == 8.5 && height == 11.0) || (width == 11.0 && height == 8.5))) {
			return 'US Letter';
		} else if (unit == 'inch' && ((width == 11.0 && height == 17.0) || (width == 17.0 && height == 11.0))) {
			return 'US Tabloid';
		} else if (unit == 'mm' && ((width == 210.0 && height == 297.0) || (width == 297.0 && height == 210.0))) {
			return 'A4';
		} else if (unit == 'cm' && ((width == 21 && height == 29.7) || (width == 29.7 && height == 21))) {
			return 'A4';
		} else {
			var friendlyUnit = unit == 'inch' ? '"' : unit;
			return width + friendlyUnit + ' x ' + height + friendlyUnit;
		}
	},
	/**
	 * getPageSizes
	 *
	 * @memberOf common
	 * @name  common#getPageSizes
	 * @method
	 *
	 * @return {array}
	 */
	getPageSizes: function () {
		return [
			{
				id: 'letter',
				name: 'US Letter',
				width: 8.5,
				height: 11.0,
				unit: 'inch',
				layout: 'portrait',
				px: { width: 816, height: 1056 },
			},
			{
				id: 'a4',
				name: 'A4',
				width: 210.0,
				height: 297.0,
				unit: 'mm',
				layout: 'portrait',
				px: { width: 793, height: 1122 },
			},
			{
				id: 'tabloid',
				name: 'US Tabloid',
				width: 11.0,
				height: 17.0,
				unit: 'inch',
				layout: 'portrait',
				px: { width: 1056, height: 1632 },
			},
			{
				id: 'label4x6',
				name: '4" x 6" Shipping Label',
				width: 4.0,
				height: 6.0,
				unit: 'inch',
				layout: 'portrait',
				px: { width: 384, height: 576 },
			},
		];
	},
	/**
	 * getPageSize
	 *
	 * @memberOf common
	 * @name  common#getPageSize
	 * @method
	 *
	 * @return {object}
	 */
	getPageSize: function (unit, width, height) {
		var pageSizes = this.getPageSizes(),
			pageSize = null;

		// Portrait?
		pageSize = pageSizes.find(function (size) {
			return size.unit == unit && size.width == width && size.height == height;
		});
		if (pageSize) return pageSize;

		// Landscape?
		pageSize = pageSizes.find(function (size) {
			return size.unit == unit && size.width == height && size.height == width;
		});
		if (pageSize) {
			pageSize.layout = 'landscape';
			return pageSize;
		}

		// Unknown pagesize
		return null;
	},
};
