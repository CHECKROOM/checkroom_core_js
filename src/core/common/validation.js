/*
 * Validation helpers
 *
 * IMPORTANT
 * DON'T USE RegExp.test METHOD!!!!
 * RegExp.prototype.test updates the regular expressions' lastIndex property so that each test will start where the last one stopped. 
 * I'd suggest using String.prototype.match since it doesn't update the lastIndex property:
 * 'Foo Bar'.match(re); // -> true
 * 'Foo Bar'.match(re); // -> true
 * More information: https://stackoverflow.com/questions/1520800/why-does-a-regexp-with-global-flag-give-wrong-results
 */
define(['moment'], function (moment) {
    return {
        /**
         * isValidEmail
         * @memberOf common
         * @name  common#isValidEmail
         * @method
         * @param  {string}  email 
         * @return {Boolean}       
         */
        isValidEmail: function(email) {
            var m = email.match(/^([\w-\+']+(?:\.[\w-\+']+)*)@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,}(?:\.[a-z]{2})?)$/i);
            return ((m!=null) && (m.length>0));
        },
        /**
         * isFreeEmail
         * @memberOf common
         * @name common#isFreeEmail
         * @method
         * @param email
         * @returns {boolean}
         */
        isFreeEmail: function(email) {
            var m = email.match(/^([\w-\+]+(?:\.[\w-\+]+)*)@(?!gmail\.com)(?!yahoo\.com)(?!hotmail\.com)(?!163\.com)(?!qq\.com)((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,}(?:\.[a-z]{2})?)$/i);
            return m == null;
        },
        /**
         * isValidPhone
         * @memberOf common
         * @name  common#isValidPhone
         * @method
         * @param  {string}  phone 
         * @return {Boolean}       
         */
        isValidPhone: function(phone) {
            // stip all none ascii characters
            // f.e "054-5237745‬4" --> "054-5237745%u202C4"
            // https://stackoverflow.com/questions/20856197/remove-non-ascii-character-in-string
            phone = phone.replace(/[^A-Za-z 0-9 \.,\?""!@#\$%\^&\*\(\)-_=\+;:<>\/\\\|\}\{\[\]`~]*/g, '');

            if ($.isNumeric(phone)) {
                return true;
            }

            var m = phone.match(/^[\s()+-]*([0-9][\s()+-]*){7,20}(( x| ext)\d{1,5}){0,1}$/);
            return ((m!=null) && (m.length>0));
        },
        /**
         * isValidURL
         * @memberOf common
         * @name common#isValidURL
         * @method
         * @param {string}  url
         * @returns {boolean}
         */
        isValidURL : function(url) {
            // http://stackoverflow.com/questions/1303872/trying-to-validate-url-using-javascript
            var m = url.match(/^(https?|ftp):\/\/([a-zA-Z0-9.-]+(:[a-zA-Z0-9.&%$-]+)*@)*((25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9][0-9]?)(\.(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])){3}|([a-zA-Z0-9-]+\.)*[a-zA-Z0-9-]+\.(com|edu|gov|int|mil|net|org|biz|arpa|info|name|pro|aero|coop|museum|[a-zA-Z]{1,}))(:[0-9]+)*(\/($|[a-zA-Z0-9.,?'\\+&%$#=~_@\!-]+))*$/);
            return ((m!=null) && (m.length>0));
        },
        /**
         * isValidPassword
         * @memberOf common
         * @name common#isValidPassword
         * @method
         * @param password
         * @returns {boolean}
         */
        isValidPassword: function(password) {
            var hasDigit = password.match(/[0-9]/);
            return (password.length>=4) && (hasDigit);
        },
        /**
         * isNumeric
         * https://stackoverflow.com/questions/18082/validate-decimal-numbers-in-javascript-isnumeric
         * @memberOf common
         * @name common#isNumeric
         * @method
         * @param  {string}     value
         * @param  {boolean}    onlyInteger
         * @return {Boolean}    
         */
        isNumeric: function(value, onlyInteger){
            var isNumeric = $.isNumeric(value);

            if(onlyInteger){
                return (value ^ 0) === Number(value);
            }

            return $.isNumeric(value);
        },
        /**
         * isValidDate
         * @memberOf common
         * @name common#isValidDate
         * @method
         * @param  {string}     value
         * @return {Boolean}    
         */
        isValidDate: function(value){
            // make sure numbers are parsed as a number
            if(!isNaN(value)){
                value = parseInt(value);
            }

            return moment(value).isValid();
        }
    };
});