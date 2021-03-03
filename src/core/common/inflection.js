/*
 * Javascript extenders for string/number
 */
define(function () {
	/**
	 * STRING EXTENSIONS
	 */
	/**
	 * pluralize
	 *
	 * @memberOf String
	 * @name  String#pluralize
	 * @method
	 *
	 * @param  {int} count
	 * @param  {string} suffix
	 * @return {string}
	 */
	String.prototype.pluralize = function (count, suffix) {
		if( (this == 'is') && (count!=1)) {
			return 'are';
		} else if (this == 'this') {
			return (count==1) ? this : "these";
		} else if (this.endsWith('s')) {
			suffix = suffix || 'es';
			return (count==1) ? this : this+suffix;
		} else if (this.endsWith('y')) {
			suffix = suffix || 'ies';
			return (count==1) ? this : this.substr(0, this.length-1) + suffix;
		} else {
			suffix = suffix || 's';
			return (count==1) ? this : this+suffix;
		}
	};


	/**
	 * capitalize
	 *
	 * @memberOf String
	 * @name  String#capitalize
	 * @method
	 *
	 * @param  {Boolean} lower
	 * @return {string}
	 */
	String.prototype.capitalize = function(lower) {
		return (lower ? this.toLowerCase() : this).replace(/(?:^|\s)\S/g, function(a) { return a.toUpperCase(); });
	};

	if(!String.prototype.truncate){
		/**
		 * truncate
		 *
		 * @memberOf String
		 * @name  String#truncate
		 * @method
		 *
		 * @param  {int} len
		 * @return {string}
		 */
		String.prototype.truncate = function(len){
			len = (len!=null) ? len : 25;
			var re = this.match(RegExp("^.{0,"+len+"}[\S]*"));
			var l = re[0].length;
			re = re[0].replace(/\s$/,'');
			if(l < this.length)
				re = re + "&hellip;";
			return re;
		};
	}
	if(!String.prototype.isValidUrl){
		/**
		 * isValidUrl
		 *
		 * @memberOf String
		 * @name  String#isValidUrl
		 * @method
		 *
		 * @return {Boolean}
		 */
		String.prototype.isValidUrl = function() {
			var pattern = new RegExp('^(https?:\\/\\/)?'+ // protocol
				'((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|'+ // domain name
				'((\\d{1,3}\\.){3}\\d{1,3}))'+ // OR ip (v4) address
				'(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'+ // port and path
				'(\\?[;&a-z\\d%_.~+=-]*)?'+ // query string
				'(\\#[-a-z\\d_]*)?$','i'); // fragment locator
			if(!pattern.test(this)) {
				return false;
			} else {
				return true;
			}
		};
	}
	if(!String.prototype.hashCode){
		/**
		 * hashCode
		 * http://stackoverflow.com/questions/7616461/generate-a-hash-from-string-in-javascript-jquery
		 *
		 * @memberOf String
		 * @name  String#hashCode
		 * @method
		 *
		 * @return {string}
		 */
		String.prototype.hashCode = function() {
			var hash = 0, i, chr, len;
			if (this.length == 0) return hash;
			for (i = 0, len = this.length; i < len; i++) {
				chr   = this.charCodeAt(i);
				hash  = ((hash << 5) - hash) + chr;
				hash |= 0; // Convert to 32bit integer
			}
			return hash;
		};
	}

	//http://stackoverflow.com/questions/286921/efficiently-replace-all-accented-characters-in-a-string
	var Latinise={};Latinise.latin_map={"Á":"A","Ă":"A","Ắ":"A","Ặ":"A","Ằ":"A","Ẳ":"A","Ẵ":"A","Ǎ":"A","Â":"A","Ấ":"A","Ậ":"A","Ầ":"A","Ẩ":"A","Ẫ":"A","Ä":"A","Ǟ":"A","Ȧ":"A","Ǡ":"A","Ạ":"A","Ȁ":"A","À":"A","Ả":"A","Ȃ":"A","Ā":"A","Ą":"A","Å":"A","Ǻ":"A","Ḁ":"A","Ⱥ":"A","Ã":"A","Ꜳ":"AA","Æ":"AE","Ǽ":"AE","Ǣ":"AE","Ꜵ":"AO","Ꜷ":"AU","Ꜹ":"AV","Ꜻ":"AV","Ꜽ":"AY","Ḃ":"B","Ḅ":"B","Ɓ":"B","Ḇ":"B","Ƀ":"B","Ƃ":"B","Ć":"C","Č":"C","Ç":"C","Ḉ":"C","Ĉ":"C","Ċ":"C","Ƈ":"C","Ȼ":"C","Ď":"D","Ḑ":"D","Ḓ":"D","Ḋ":"D","Ḍ":"D","Ɗ":"D","Ḏ":"D","ǲ":"D","ǅ":"D","Đ":"D","Ƌ":"D","Ǳ":"DZ","Ǆ":"DZ","É":"E","Ĕ":"E","Ě":"E","Ȩ":"E","Ḝ":"E","Ê":"E","Ế":"E","Ệ":"E","Ề":"E","Ể":"E","Ễ":"E","Ḙ":"E","Ë":"E","Ė":"E","Ẹ":"E","Ȅ":"E","È":"E","Ẻ":"E","Ȇ":"E","Ē":"E","Ḗ":"E","Ḕ":"E","Ę":"E","Ɇ":"E","Ẽ":"E","Ḛ":"E","Ꝫ":"ET","Ḟ":"F","Ƒ":"F","Ǵ":"G","Ğ":"G","Ǧ":"G","Ģ":"G","Ĝ":"G","Ġ":"G","Ɠ":"G","Ḡ":"G","Ǥ":"G","Ḫ":"H","Ȟ":"H","Ḩ":"H","Ĥ":"H","Ⱨ":"H","Ḧ":"H","Ḣ":"H","Ḥ":"H","Ħ":"H","Í":"I","Ĭ":"I","Ǐ":"I","Î":"I","Ï":"I","Ḯ":"I","İ":"I","Ị":"I","Ȉ":"I","Ì":"I","Ỉ":"I","Ȋ":"I","Ī":"I","Į":"I","Ɨ":"I","Ĩ":"I","Ḭ":"I","Ꝺ":"D","Ꝼ":"F","Ᵹ":"G","Ꞃ":"R","Ꞅ":"S","Ꞇ":"T","Ꝭ":"IS","Ĵ":"J","Ɉ":"J","Ḱ":"K","Ǩ":"K","Ķ":"K","Ⱪ":"K","Ꝃ":"K","Ḳ":"K","Ƙ":"K","Ḵ":"K","Ꝁ":"K","Ꝅ":"K","Ĺ":"L","Ƚ":"L","Ľ":"L","Ļ":"L","Ḽ":"L","Ḷ":"L","Ḹ":"L","Ⱡ":"L","Ꝉ":"L","Ḻ":"L","Ŀ":"L","Ɫ":"L","ǈ":"L","Ł":"L","Ǉ":"LJ","Ḿ":"M","Ṁ":"M","Ṃ":"M","Ɱ":"M","Ń":"N","Ň":"N","Ņ":"N","Ṋ":"N","Ṅ":"N","Ṇ":"N","Ǹ":"N","Ɲ":"N","Ṉ":"N","Ƞ":"N","ǋ":"N","Ñ":"N","Ǌ":"NJ","Ó":"O","Ŏ":"O","Ǒ":"O","Ô":"O","Ố":"O","Ộ":"O","Ồ":"O","Ổ":"O","Ỗ":"O","Ö":"O","Ȫ":"O","Ȯ":"O","Ȱ":"O","Ọ":"O","Ő":"O","Ȍ":"O","Ò":"O","Ỏ":"O","Ơ":"O","Ớ":"O","Ợ":"O","Ờ":"O","Ở":"O","Ỡ":"O","Ȏ":"O","Ꝋ":"O","Ꝍ":"O","Ō":"O","Ṓ":"O","Ṑ":"O","Ɵ":"O","Ǫ":"O","Ǭ":"O","Ø":"O","Ǿ":"O","Õ":"O","Ṍ":"O","Ṏ":"O","Ȭ":"O","Ƣ":"OI","Ꝏ":"OO","Ɛ":"E","Ɔ":"O","Ȣ":"OU","Ṕ":"P","Ṗ":"P","Ꝓ":"P","Ƥ":"P","Ꝕ":"P","Ᵽ":"P","Ꝑ":"P","Ꝙ":"Q","Ꝗ":"Q","Ŕ":"R","Ř":"R","Ŗ":"R","Ṙ":"R","Ṛ":"R","Ṝ":"R","Ȑ":"R","Ȓ":"R","Ṟ":"R","Ɍ":"R","Ɽ":"R","Ꜿ":"C","Ǝ":"E","Ś":"S","Ṥ":"S","Š":"S","Ṧ":"S","Ş":"S","Ŝ":"S","Ș":"S","Ṡ":"S","Ṣ":"S","Ṩ":"S","Ť":"T","Ţ":"T","Ṱ":"T","Ț":"T","Ⱦ":"T","Ṫ":"T","Ṭ":"T","Ƭ":"T","Ṯ":"T","Ʈ":"T","Ŧ":"T","Ɐ":"A","Ꞁ":"L","Ɯ":"M","Ʌ":"V","Ꜩ":"TZ","Ú":"U","Ŭ":"U","Ǔ":"U","Û":"U","Ṷ":"U","Ü":"U","Ǘ":"U","Ǚ":"U","Ǜ":"U","Ǖ":"U","Ṳ":"U","Ụ":"U","Ű":"U","Ȕ":"U","Ù":"U","Ủ":"U","Ư":"U","Ứ":"U","Ự":"U","Ừ":"U","Ử":"U","Ữ":"U","Ȗ":"U","Ū":"U","Ṻ":"U","Ų":"U","Ů":"U","Ũ":"U","Ṹ":"U","Ṵ":"U","Ꝟ":"V","Ṿ":"V","Ʋ":"V","Ṽ":"V","Ꝡ":"VY","Ẃ":"W","Ŵ":"W","Ẅ":"W","Ẇ":"W","Ẉ":"W","Ẁ":"W","Ⱳ":"W","Ẍ":"X","Ẋ":"X","Ý":"Y","Ŷ":"Y","Ÿ":"Y","Ẏ":"Y","Ỵ":"Y","Ỳ":"Y","Ƴ":"Y","Ỷ":"Y","Ỿ":"Y","Ȳ":"Y","Ɏ":"Y","Ỹ":"Y","Ź":"Z","Ž":"Z","Ẑ":"Z","Ⱬ":"Z","Ż":"Z","Ẓ":"Z","Ȥ":"Z","Ẕ":"Z","Ƶ":"Z","Ĳ":"IJ","Œ":"OE","ᴀ":"A","ᴁ":"AE","ʙ":"B","ᴃ":"B","ᴄ":"C","ᴅ":"D","ᴇ":"E","ꜰ":"F","ɢ":"G","ʛ":"G","ʜ":"H","ɪ":"I","ʁ":"R","ᴊ":"J","ᴋ":"K","ʟ":"L","ᴌ":"L","ᴍ":"M","ɴ":"N","ᴏ":"O","ɶ":"OE","ᴐ":"O","ᴕ":"OU","ᴘ":"P","ʀ":"R","ᴎ":"N","ᴙ":"R","ꜱ":"S","ᴛ":"T","ⱻ":"E","ᴚ":"R","ᴜ":"U","ᴠ":"V","ᴡ":"W","ʏ":"Y","ᴢ":"Z","á":"a","ă":"a","ắ":"a","ặ":"a","ằ":"a","ẳ":"a","ẵ":"a","ǎ":"a","â":"a","ấ":"a","ậ":"a","ầ":"a","ẩ":"a","ẫ":"a","ä":"a","ǟ":"a","ȧ":"a","ǡ":"a","ạ":"a","ȁ":"a","à":"a","ả":"a","ȃ":"a","ā":"a","ą":"a","ᶏ":"a","ẚ":"a","å":"a","ǻ":"a","ḁ":"a","ⱥ":"a","ã":"a","ꜳ":"aa","æ":"ae","ǽ":"ae","ǣ":"ae","ꜵ":"ao","ꜷ":"au","ꜹ":"av","ꜻ":"av","ꜽ":"ay","ḃ":"b","ḅ":"b","ɓ":"b","ḇ":"b","ᵬ":"b","ᶀ":"b","ƀ":"b","ƃ":"b","ɵ":"o","ć":"c","č":"c","ç":"c","ḉ":"c","ĉ":"c","ɕ":"c","ċ":"c","ƈ":"c","ȼ":"c","ď":"d","ḑ":"d","ḓ":"d","ȡ":"d","ḋ":"d","ḍ":"d","ɗ":"d","ᶑ":"d","ḏ":"d","ᵭ":"d","ᶁ":"d","đ":"d","ɖ":"d","ƌ":"d","ı":"i","ȷ":"j","ɟ":"j","ʄ":"j","ǳ":"dz","ǆ":"dz","é":"e","ĕ":"e","ě":"e","ȩ":"e","ḝ":"e","ê":"e","ế":"e","ệ":"e","ề":"e","ể":"e","ễ":"e","ḙ":"e","ë":"e","ė":"e","ẹ":"e","ȅ":"e","è":"e","ẻ":"e","ȇ":"e","ē":"e","ḗ":"e","ḕ":"e","ⱸ":"e","ę":"e","ᶒ":"e","ɇ":"e","ẽ":"e","ḛ":"e","ꝫ":"et","ḟ":"f","ƒ":"f","ᵮ":"f","ᶂ":"f","ǵ":"g","ğ":"g","ǧ":"g","ģ":"g","ĝ":"g","ġ":"g","ɠ":"g","ḡ":"g","ᶃ":"g","ǥ":"g","ḫ":"h","ȟ":"h","ḩ":"h","ĥ":"h","ⱨ":"h","ḧ":"h","ḣ":"h","ḥ":"h","ɦ":"h","ẖ":"h","ħ":"h","ƕ":"hv","í":"i","ĭ":"i","ǐ":"i","î":"i","ï":"i","ḯ":"i","ị":"i","ȉ":"i","ì":"i","ỉ":"i","ȋ":"i","ī":"i","į":"i","ᶖ":"i","ɨ":"i","ĩ":"i","ḭ":"i","ꝺ":"d","ꝼ":"f","ᵹ":"g","ꞃ":"r","ꞅ":"s","ꞇ":"t","ꝭ":"is","ǰ":"j","ĵ":"j","ʝ":"j","ɉ":"j","ḱ":"k","ǩ":"k","ķ":"k","ⱪ":"k","ꝃ":"k","ḳ":"k","ƙ":"k","ḵ":"k","ᶄ":"k","ꝁ":"k","ꝅ":"k","ĺ":"l","ƚ":"l","ɬ":"l","ľ":"l","ļ":"l","ḽ":"l","ȴ":"l","ḷ":"l","ḹ":"l","ⱡ":"l","ꝉ":"l","ḻ":"l","ŀ":"l","ɫ":"l","ᶅ":"l","ɭ":"l","ł":"l","ǉ":"lj","ſ":"s","ẜ":"s","ẛ":"s","ẝ":"s","ḿ":"m","ṁ":"m","ṃ":"m","ɱ":"m","ᵯ":"m","ᶆ":"m","ń":"n","ň":"n","ņ":"n","ṋ":"n","ȵ":"n","ṅ":"n","ṇ":"n","ǹ":"n","ɲ":"n","ṉ":"n","ƞ":"n","ᵰ":"n","ᶇ":"n","ɳ":"n","ñ":"n","ǌ":"nj","ó":"o","ŏ":"o","ǒ":"o","ô":"o","ố":"o","ộ":"o","ồ":"o","ổ":"o","ỗ":"o","ö":"o","ȫ":"o","ȯ":"o","ȱ":"o","ọ":"o","ő":"o","ȍ":"o","ò":"o","ỏ":"o","ơ":"o","ớ":"o","ợ":"o","ờ":"o","ở":"o","ỡ":"o","ȏ":"o","ꝋ":"o","ꝍ":"o","ⱺ":"o","ō":"o","ṓ":"o","ṑ":"o","ǫ":"o","ǭ":"o","ø":"o","ǿ":"o","õ":"o","ṍ":"o","ṏ":"o","ȭ":"o","ƣ":"oi","ꝏ":"oo","ɛ":"e","ᶓ":"e","ɔ":"o","ᶗ":"o","ȣ":"ou","ṕ":"p","ṗ":"p","ꝓ":"p","ƥ":"p","ᵱ":"p","ᶈ":"p","ꝕ":"p","ᵽ":"p","ꝑ":"p","ꝙ":"q","ʠ":"q","ɋ":"q","ꝗ":"q","ŕ":"r","ř":"r","ŗ":"r","ṙ":"r","ṛ":"r","ṝ":"r","ȑ":"r","ɾ":"r","ᵳ":"r","ȓ":"r","ṟ":"r","ɼ":"r","ᵲ":"r","ᶉ":"r","ɍ":"r","ɽ":"r","ↄ":"c","ꜿ":"c","ɘ":"e","ɿ":"r","ś":"s","ṥ":"s","š":"s","ṧ":"s","ş":"s","ŝ":"s","ș":"s","ṡ":"s","ṣ":"s","ṩ":"s","ʂ":"s","ᵴ":"s","ᶊ":"s","ȿ":"s","ɡ":"g","ᴑ":"o","ᴓ":"o","ᴝ":"u","ť":"t","ţ":"t","ṱ":"t","ț":"t","ȶ":"t","ẗ":"t","ⱦ":"t","ṫ":"t","ṭ":"t","ƭ":"t","ṯ":"t","ᵵ":"t","ƫ":"t","ʈ":"t","ŧ":"t","ᵺ":"th","ɐ":"a","ᴂ":"ae","ǝ":"e","ᵷ":"g","ɥ":"h","ʮ":"h","ʯ":"h","ᴉ":"i","ʞ":"k","ꞁ":"l","ɯ":"m","ɰ":"m","ᴔ":"oe","ɹ":"r","ɻ":"r","ɺ":"r","ⱹ":"r","ʇ":"t","ʌ":"v","ʍ":"w","ʎ":"y","ꜩ":"tz","ú":"u","ŭ":"u","ǔ":"u","û":"u","ṷ":"u","ü":"u","ǘ":"u","ǚ":"u","ǜ":"u","ǖ":"u","ṳ":"u","ụ":"u","ű":"u","ȕ":"u","ù":"u","ủ":"u","ư":"u","ứ":"u","ự":"u","ừ":"u","ử":"u","ữ":"u","ȗ":"u","ū":"u","ṻ":"u","ų":"u","ᶙ":"u","ů":"u","ũ":"u","ṹ":"u","ṵ":"u","ᵫ":"ue","ꝸ":"um","ⱴ":"v","ꝟ":"v","ṿ":"v","ʋ":"v","ᶌ":"v","ⱱ":"v","ṽ":"v","ꝡ":"vy","ẃ":"w","ŵ":"w","ẅ":"w","ẇ":"w","ẉ":"w","ẁ":"w","ⱳ":"w","ẘ":"w","ẍ":"x","ẋ":"x","ᶍ":"x","ý":"y","ŷ":"y","ÿ":"y","ẏ":"y","ỵ":"y","ỳ":"y","ƴ":"y","ỷ":"y","ỿ":"y","ȳ":"y","ẙ":"y","ɏ":"y","ỹ":"y","ź":"z","ž":"z","ẑ":"z","ʑ":"z","ⱬ":"z","ż":"z","ẓ":"z","ȥ":"z","ẕ":"z","ᵶ":"z","ᶎ":"z","ʐ":"z","ƶ":"z","ɀ":"z","ﬀ":"ff","ﬃ":"ffi","ﬄ":"ffl","ﬁ":"fi","ﬂ":"fl","ĳ":"ij","œ":"oe","ﬆ":"st","ₐ":"a","ₑ":"e","ᵢ":"i","ⱼ":"j","ₒ":"o","ᵣ":"r","ᵤ":"u","ᵥ":"v","ₓ":"x"};

	/**
	 * latinise
	 *
	 * @memberOf  String
	 * @name  String#latinise
	 * @method
	 *
	 * @return {string}
	 */
	String.prototype.latinise=function(){
		return this.replace(/[^A-Za-z0-9\[\] ]/g,function(a){return Latinise.latin_map[a]||a});
	};

	/**
	 * latinize
	 *
	 * @memberOf  String
	 * @name  String#latinize
	 * @method
	 *
	 * @return {string}
	 */
	String.prototype.latinize=String.prototype.latinise;

	/**
	 * isLatin
	 *
	 * @memberOf  String
	 * @name  String#isLatin
	 * @method
	 *
	 * @return {Boolean}
	 */
	String.prototype.isLatin=function(){
		return this==this.latinise();
	};

	/**
	 * OnlyAlphaNumSpaceAndUnderscore
	 *
	 * @memberOf String
	 * @name  String#OnlyAlphaNumSpaceAndUnderscore
	 * @method
	 *
	 */
	String.prototype.OnlyAlphaNumSpaceAndUnderscore = function (){
		// \s Matches a single white space character, including space, tab, form feed, line feed and other Unicode spaces.
		// \W Matches any character that is not a word character from the basic Latin alphabet. Equivalent to [^A-Za-z0-9_]
		// Preceding or trailing whitespaces are removed, and words are also latinised
		return $.trim(this).toLowerCase().replace(/[\s-]+/g, '_').latinise().replace(/[\W]/g, '');
	};

	/**
	 * OnlyAlphaNumSpaceUnderscoreAndDot
	 *
	 * @memberOf String
	 * @name  String#OnlyAlphaNumSpaceUnderscoreAndDot
	 * @method
	 *
	 */
	String.prototype.OnlyAlphaNumSpaceUnderscoreAndDot = function (){
		// \s Matches a single white space character, including space, tab, form feed, line feed and other Unicode spaces.
		// \W Matches any character that is not a word character from the basic Latin alphabet. Equivalent to [^A-Za-z0-9_]
		// Preceding or trailing whitespaces are removed, and words are also latinised
		return $.trim(this).toLowerCase().replace(/[\s-]+/g, '_').latinise().replace(/[^a-z0-9_\.]/g, '');
	};

	if(!String.prototype.NoWhiteSpaceInWord) {
		/**
		 * NoWhiteSpaceInWord
		 *
		 * @memberOf String
		 * @name String#NoWhiteSpaceInWord
		 * @method
		 * @returns {string}
		 */
		String.prototype.NoWhiteSpaceInWord = function() {
			return this.replace(/[\s]+/g, '');
		};
	}

	if(!String.prototype.addLeadingZero){
		/**
		 * addLeadingZero adds zeros in front of a number
		 * http://stackoverflow.com/questions/6466135/adding-extra-zeros-in-front-of-a-number-using-jquery
		 * ex: 5.pad(3) --> 005
		 *
		 * @param  {string} str
		 * @param  {Number} max
		 * @return {string}
		 */
		String.prototype.addLeadingZero = function(max){
			var str = this.toString();
			return str.length < max ? ("0" + str).addLeadingZero(max) : str;
		}
	}

	/**
	 * Pad a number with leading zeros f.e. "5".lpad('0',2) -> 005
	 * @param padString
	 * @param length
	 * @return {string}
	 */
	String.prototype.lpad = function(padString, length) {
		var str = this;
		while (str.length < length)
			str = padString + str;
		return str;
	}

	/**
	 * NUMBER EXTENSIONS
	 */
	if(!Number.prototype.between){
		/**
		 * between
		 *
		 * @memberOf  Number
		 * @name  Number#between
		 * @method
		 *
		 * @param  {int} a
		 * @param  {int} b
		 * @return {Boolean}
		 */
		Number.prototype.between  = function (a, b) {
			var min = Math.min(a,b),
				max = Math.max(a,b);
			return this >= min && this <= max;
		};
	}

	/**
	 * ARRAY EXTENSTIONS
	 */
	if(!Array.prototype.joinOther) {
		/**
		 * joinOther
		 *
		 * Makes a friendly joined list of strings
		 * constrained to a certain maxLength
		 * where the text would be:
		 * Kit 1, Kit2 +3 other
		 * or
		 * Kit 1 +4 other (if no params were passed)
		 *
		 * @memberOf Array
		 * @name Array#joinOther
		 * @method
		 *
		 * @param maxLength {int} 30
		 * @param sep {string} ", "
		 * @param other {string} "other"
		 */
		Array.prototype.joinOther = function(maxLength, sep, other) {
			// If we only have 1 item, no need to join anything
			if (this.length<2) {
				return this.join(sep);
			}

			sep = sep || ", ";
			other = other || "other";

			// Take the minimum length if no maxLength was passed
			if(	(!maxLength) ||
				(maxLength<0)) {
				maxLength = 1;
			}

			// Keep popping off entries in the array
			// until there's only one left, or until
			// the joined text is shorter than maxLength
			var copy = this.slice(0);
			var joined = copy.join(sep);
			while((copy.length>1) && (joined.length>maxLength)) {
				copy.pop();
				joined = copy.join(sep)
			}

			var numOther = this.length - copy.length;
			if (numOther>0) {
				joined += " +" + numOther + " " + other;
			}
			return joined;
		};
	}

	if(!Array.prototype.joinAdvanced){
		/**
		 * Special join method
		 * ['a','a','a'].specialJoin(',', 'and') -> 'a, a and a'
		 * http://stackoverflow.com/questions/15069587/is-there-a-way-to-join-the-elements-in-an-js-array-but-let-the-last-separator-b
		 *
		 * @param  {string} sep
		 * @param  {string} sepLast
		 */
		Array.prototype.joinAdvanced =  function(sep, sepLast){
			var arr = this.slice(0);

			var outStr = "";
			if (arr.length === 1) {
				outStr = arr[0];
			} else if (arr.length === 2) {
				//joins all with "and" but no commas
				//example: "bob and sam"
				outStr = arr.join(sepLast);
			} else if (arr.length > 2) {
				//joins all with commas, but last one gets ", and" (oxford comma!)
				//example: "bob, joe, and sam"
				outStr = arr.slice(0, -1).join(sep) + sepLast + arr.slice(-1);
			}
			return outStr;
		}
	}

	/**
	 * Draw rectangle with rounded corners on canvas
	 * https://stackoverflow.com/questions/1255512/how-to-draw-a-rounded-rectangle-on-html-canvas
	 */
	CanvasRenderingContext2D.prototype.roundRect = function (x, y, width, height, radius, fill, stroke) {
	    var cornerRadius = { upperLeft: 0, upperRight: 0, lowerLeft: 0, lowerRight: 0 };
	    if (typeof stroke == "undefined") {
	        stroke = true;
	    }
	    if (typeof radius === "object") {
	        for (var side in radius) {
	            cornerRadius[side] = radius[side];
	        }
	    }

	    this.beginPath();
	    this.moveTo(x + cornerRadius.upperLeft, y);
	    this.lineTo(x + width - cornerRadius.upperRight, y);
	    this.quadraticCurveTo(x + width, y, x + width, y + cornerRadius.upperRight);
	    this.lineTo(x + width, y + height - cornerRadius.lowerRight);
	    this.quadraticCurveTo(x + width, y + height, x + width - cornerRadius.lowerRight, y + height);
	    this.lineTo(x + cornerRadius.lowerLeft, y + height);
	    this.quadraticCurveTo(x, y + height, x, y + height - cornerRadius.lowerLeft);
	    this.lineTo(x, y + cornerRadius.upperLeft);
	    this.quadraticCurveTo(x, y, x + cornerRadius.upperLeft, y);
	    this.closePath();
	    if (stroke) {
	        this.stroke();
	    }
	    if (fill) {
	        this.fill();
	    }
	} 
});
