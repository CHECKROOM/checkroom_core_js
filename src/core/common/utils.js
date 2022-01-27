var utils = {};

/**
 * Stringifies an object while first sorting the keys
 * Ensures we can use it to check object equality
 * http://stackoverflow.com/questions/16167581/sort-object-properties-and-json-stringify
 * @memberOf  utils
 * @name  utils#stringifyOrdered
 * @method
 * @param obj
 * @return {string}
 */
utils.stringifyOrdered = function (obj) {
	let keys = [];
	if (obj) {
		for (var key in obj) {
			keys.push(key);
		}
	}
	keys.sort();
	var tObj = {};
	var key;
	for (var index in keys) {
		key = keys[index];
		tObj[key] = obj[key];
	}
	return JSON.stringify(tObj);
};

/**
 * Checks if two objects are equal
 * Mimics behaviour from http://underscorejs.org/#isEqual
 * @memberOf  utils
 * @name  utils#areEqual
 * @method
 * @param obj1
 * @param obj2
 * @return {boolean}
 */
utils.areEqual = function (obj1, obj2) {
	return utils.stringifyOrdered(obj1 || {}) == utils.stringifyOrdered(obj2 || {});
};

/**
 * Turns an integer into a compact text to show in a badge
 * @memberOf  utils
 * @name  utils#badgeify
 * @method
 * @param  {int} count
 * @return {string}
 */
utils.badgeify = function (count) {
	if (count > 100) {
		return '99+';
	} else if (count > 10) {
		return '10+';
	} else if (count > 0) {
		return '' + count;
	} else {
		return '';
	}
};

/**
 * Gets a parameter from the querystring (returns null if not found)
 * @memberOf utils
 * @name  utils#getUrlParam
 * @method
 * @param  {string} name
 * @param  {string} default
 * @param  {string} url
 * @return {string}
 */
utils.getUrlParam = function (name, def, url) {
	name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
	var regexS = '[\\?&]' + name + '=([^&#]*)';
	var regex = new RegExp(regexS);
	var results = regex.exec(url || window.location.href);
	return results ? decodeURIComponent(results[1].replace(/\+/g, ' ')) : def;
};

/**
 * getParsedLines
 * @memberOf utils
 * @name  utils#getParsedLines
 * @method
 * @param  {string} text
 * @return {Array}
 */
utils.getParsedLines = function (text) {
	if (text && text.length > 0) {
		var customs = text.split(/\s*([,;\r\n]+|\s\s)\s*/);
		return customs
			.filter(function (cust, idx, arr) {
				return (
					cust.length > 0 &&
					cust.indexOf(',') < 0 &&
					cust.indexOf(';') < 0 &&
					cust.trim().length > 0 &&
					arr.indexOf(cust) >= idx
				);
			})
			.map(function (cust) {
				// trim each line
				return cust.trim();
			});
	} else {
		return [];
	}
};

/**
 * getFriendlyFileName
 * @memberOf utils
 * @name  utils#getFriendlyFileName
 * @method
 * @param  {string} name
 * @return {string}
 */
utils.getFriendlyFileName = function (name) {
	return name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
};

/**
 * getFriendlyKind
 * @memberOf utils
 * @name  utils#getFriendlyKind
 * @method
 * @param {object} kind
 * @return {string}
 */
utils.getFriendlyKind = function (kind) {
	var friendlyKind = kind;

	if (kind == 'string') {
		friendlyKind = 'single line text';
	}

	if (kind == 'text') {
		friendlyKind = 'multi line text';
	}

	if (kind == 'select') {
		friendlyKind = 'dropdown list';
	}

	if (kind == 'number') {
		friendlyKind = 'numeric';
	}

	return friendlyKind;
};

/**
 * arrayToCSV
 * https://www.codexworld.com/export-html-table-data-to-csv-using-javascript/
 * @param  {array} csv
 * @param  {[type]} filename
 */
utils.arrayToCSV = function (csv, filename) {
	var csvFile;
	var downloadLink;

	// CSV file
	csvFile = new Blob([csv], { type: 'text/csv;charset=utf-8;' });

	// BUGFIX IE Access is denied.
	// https://stackoverflow.com/questions/36984907/access-is-denied-when-attempting-to-open-a-url-generated-for-a-procedurally-ge/36984974
	if (window.navigator && window.navigator.msSaveOrOpenBlob) {
		window.navigator.msSaveOrOpenBlob(csvFile, filename);
	} else {
		// Download link
		downloadLink = window.document.createElement('a');

		// File name
		downloadLink.download = filename;

		// Create a link to the file
		downloadLink.href = window.URL.createObjectURL(csvFile);

		// Hide download link
		downloadLink.style.display = 'none';

		// Add the link to DOM
		window.document.body.appendChild(downloadLink);

		// Click download link
		downloadLink.click();
	}
};

/**
 * kFormatter
 * @param  {number} num
 * @return string
 */
utils.kFormatter = function (num) {
	return Math.abs(num) > 999
		? Math.sign(num) * (Math.abs(num) / 1000).toFixed(0) + 'k'
		: Math.sign(num) * Math.abs(num);
};

/**
 * sanitizeHtml
 * https://remarkablemark.org/blog/2019/11/29/javascript-sanitize-html/
 *
 * @param  {string} html
 * @return string
 */
utils.sanitizeHtml = function (html) {
	return $('<div />')
		.text(html)
		.html()
		.replace(/&nbsp;/g, ' ')
		.replace(/&amp;/g, '&');
};

/**
 * removeHtmlTags
 * @param  {string} html
 * @return {string}
 */
utils.removeHtmlTags = function (html) {
	var regX = /(<([^>]+)>)/gi;
	return html.replace(regX, '');
};

export const isEmptyObject = (obj) => {
	var name;
	for (name in obj) {
		return false;
	}
	return true;
};

export default utils;
