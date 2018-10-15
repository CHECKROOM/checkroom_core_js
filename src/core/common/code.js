/**
 * QR and barcode helpers
 */
define(['settings'], function (settings) {
    return {
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
		isCodeValid: function(codeId){
			// Checks if a code is syntactically valid
	        // This does not mean that it is an official code issued by CHEQROOM
	        return codeId.trim().match(/^[a-z0-9]{8}$/i) != null;
		},
		/**
		 * isCodeFromScanner
		 *
		 * @memberOf common
		 * @name  common#isCodeFromScanner
		 * @method
		 * 
		 * @param  urlPart
		 * @return {Boolean}        
		 */
		isCodeFromScanner: function(urlPart){
			// If no urlPart is given or is empty, return false
			if(!urlPart || urlPart.length == 0) return false;

			var prefix = urlPart.substring(0,23);
	        var index = 'http://cheqroom.com/qr/'.indexOf(prefix);
	        return (index==0);
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
		isValidBarcode: function(barCode){
			return barCode && barCode.match(/^([A-Z0-9\s\-]{3,22})$/i) != null;
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
		isValidQRCode: function(qrCode){
			return this.isValidItemQRCode(qrCode) || 
					this.isValidTransferQRCode(qrCode);
		},

		/**
		 * isValidTransferQRCode
		 * For example: http://cheqroom.com/ordertransfer/tTfZXW6eTianQU3UQVELdn
		 * 
		 * @memberOf common
		 * @name  common#isValidTransferQRCode
		 * @method
		 * 
		 * @param  {string}  qrCode 
		 * @return {Boolean} 
		 */
		isValidTransferQRCode: function(qrCode){
			return qrCode.match(/^http:\/\/cheqroom\.com\/ordertransfer\/[a-zA-Z0-9]{22}$/i) != null;
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
		isValidDocQRCode: function(qrCode){
			return qrCode && (qrCode.match(/^http:\/\/cheqroom\.com\/qr\/[a-z0-9]{8}$/i) != null || qrCode.match(/^[a-z0-9]{8}$/i) != null);
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
		isValidItemQRCode: function(qrCode){
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
		isValidKitQRCode: function(qrCode){
			return this.isValidDocQRCode(qrCode);
		},

		/**
		 * getCheqRoomRedirectUrl
		 *
		 * @memberOf  common
		 * @name  common#getCheqRoomRedirectUrl
		 * @method
		 * 
		 * @param  codeId 
		 * @return {string}       
		 */
		getCheqRoomRedirectUrl: function(codeId){
			return this.isCodeValid(codeId) ? 'http://cheqroom.com/qr/' + codeId.trim() : '';
		},
		/**
		 * getCheqRoomRedirectUrlQR 
		 *
		 * @memberOf  common
		 * @name  common#getCheqRoomRedirectUrlQR
		 * @method
		 * 
		 * @param  codeId 
		 * @param  size   
		 * @return {string}      
		 */
		getCheqRoomRedirectUrlQR: function(codeId, size){
			 if (this.isCodeValid(codeId)) {
	            //https://chart.googleapis.com/chart?chs=200x200&cht=qr&choe=UTF-8&chld=L|0&chl=http://cheqroom.com/qr/c4ab3a6a
	            var url = encodeURI(this.getCheqRoomRedirectUrl(codeId));
	            return 'https://chart.googleapis.com/chart?chs=' + size + 'x' + size + '&cht=qr&choe=UTF-8&chld=L|0&chl=' + url;
	        } else {
	            return '';
	        }
		},
	 	/**
         * getQRCodeUrl 
         *
         * @memberOf  common
         * @name  common#getCheqRoomRedirectUrlQR
         * @method
         *
         * @param  {string} urlApi 
         * @param  {string} code 
         * @param  {number} size 
         * @return {string}      
         */
        getQRCodeUrl: function(urlApi, code, size){
            return urlApi + "/qrcode?code=" + code + "&size=" + size;
        },
        /**
         * getBarcodeUrl 
         *
         * @memberOf  common
         * @name  common#getCheqRoomRedirectUrlQR
         * @method
         *
         * @param  {string} urlApi 
         * @param  {string} code 
         * @param  {number} size 
         * @return {string}      
         */
        getBarcodeUrl: function(urlApi, code, width, height){
            return urlApi + "/barcode?code=" + code + "&width=" + width + (height?"&height=" + height:"");
        }
    };
});
