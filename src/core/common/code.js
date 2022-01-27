export default {
	/**
	 * isCodeValid
	 *
	 * @memberOf common
	 * @name  common#isCodeValid
	 * @method
	 *
	 * @param  codeId
	 * @return {Boolean}
	 */
	isCodeValid: function (codeId) {
		// Checks if a code is syntactically valid
		// This does not mean that it is an official code issued by CHEQROOM
		return codeId.trim().match(/^[a-z0-9]{8}$/i) != null;
	},
	/**
	 * isBarcodeValid
	 *
	 * @memberOf common
	 * @name  common#isValidBarcode
	 * @method
	 *
	 * @param  {string}  barCode
	 * @return {Boolean}
	 */
	isValidBarcode: function (barCode) {
		return barCode && barCode.match(/^([A-Z0-9\s\-]{3,43})$/i) != null;
	},
	/**
	 * isValidQRCode
	 *
	 * @memberOf common
	 * @name  common#isValidQRCode
	 * @method
	 *
	 * @param  {string}  qrCode
	 * @return {Boolean}
	 */
	isValidQRCode: function (qrCode) {
		return this.isValidItemQRCode(qrCode);
	},
	/**
	 * isValidDocQRCode
	 * For example: http://cheqroom.com/qr/eeaa37ed
	 *
	 * @memberOf common
	 * @name  common#isValidDocQRCode
	 * @method
	 *
	 * @param  {string}  qrCode
	 * @return {Boolean}
	 */
	isValidDocQRCode: function (qrCode) {
		return (
			qrCode &&
			(qrCode.match(/^http:\/\/cheqroom\.com\/qr\/[a-z0-9]{8}$/i) != null ||
				qrCode.match(/^[a-z0-9]{8}$/i) != null)
		);
	},
	/**
	 * isValidItemQRCode
	 *
	 * @memberOf common
	 * @name  common#isValidItemQRCode
	 * @method
	 *
	 * @param  {string}  qrCode
	 * @return {Boolean}
	 */
	isValidItemQRCode: function (qrCode) {
		return this.isValidDocQRCode(qrCode);
	},
	/**
	 * isValidKitQRCode
	 *
	 * @memberOf common
	 * @name  common#isValidKitQRCode
	 * @method
	 *
	 * @param  {string}  qrCode
	 * @return {Boolean}
	 */
	isValidKitQRCode: function (qrCode) {
		return this.isValidDocQRCode(qrCode);
	},
	/**
	 * getQRCodeUrl
	 *
	 * @memberOf  common
	 * @method
	 *
	 * @param  {string} urlApi
	 * @param  {string} code
	 * @param  {number} size
	 * @return {string}
	 */
	getQRCodeUrl: function (urlApi, code, size) {
		var sizes = {
			XS: 1,
			S: 2,
			M: 3,
			L: 4,
			XL: 5,
		};

		return urlApi + '?code=' + code + '&scale=' + sizes[size];
	},
	/**
	 * getBarcodeUrl
	 *
	 * @memberOf  common
	 * @method
	 *
	 * @param  {string} urlApi
	 * @param  {string} code
	 * @param  {number} size
	 * @return {string}
	 */
	getBarcodeUrl: function (urlApi, code, width, height) {
		return urlApi + '?code=' + code + '&width=' + width + (height ? '&height=' + height : '');
	},
};
