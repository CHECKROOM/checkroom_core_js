/*
 * Validation helpers
 */
define(function () {
    return {
        /**
         * isValidEmail
         *
         * @memberOf common
         * @name  common#isValidEmail
         * @method
         * 
         * @param  {string}  email 
         * @return {Boolean}       
         */
        isValidEmail: function(email) {
            var re = /^([\w-\+]+(?:\.[\w-\+]+)*)@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,}(?:\.[a-z]{2})?)$/i;
            return re.test(email);
        },
        /**
         * isValidPhone
         *
         * @memberOf common
         * @name  common#isValidPhone
         * @method
         * 
         * @param  {string}  phone 
         * @return {Boolean}       
         */
        isValidPhone: function(phone) {
            var isnum = /^\d{9,}$/.test(phone);
            if (isnum) {
                return true;
            }

            var m = phone.match(/^[\s()+-]*([0-9][\s()+-]*){10,20}(( x| ext)\d{1,5}){0,1}$/);
            return ((m!=null) && (m.length>0));
        },
        /**
         * isValidURL
         *
         * @memberOf common
         * @name common#isValidURL
         * @method
         *
         * @param {string}  url
         * @returns {boolean}
         */
        isValidURL : function(url) {
            // http://stackoverflow.com/questions/1303872/trying-to-validate-url-using-javascript
            var re = /^(https?|ftp):\/\/([a-zA-Z0-9.-]+(:[a-zA-Z0-9.&%$-]+)*@)*((25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9][0-9]?)(\.(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])){3}|([a-zA-Z0-9-]+\.)*[a-zA-Z0-9-]+\.(com|edu|gov|int|mil|net|org|biz|arpa|info|name|pro|aero|coop|museum|[a-zA-Z]{2}))(:[0-9]+)*(\/($|[a-zA-Z0-9.,?'\\+&%$#=~_-]+))*$/;
            return re.test(url);
        }
    };
});