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
            var re = /^([\w-\+]+(?:\.[\w-\+]+)*)@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$/i;
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
        isValidPhone: function(phone){
            var isnum = /^\d{9,}$/.test(phone);
            if (isnum) {
                return true;
            }

            var m = phone.match(/^[\s()+-]*([0-9][\s()+-]*){10,20}(( x| ext)\d{1,5}){0,1}$/);
            return ((m!=null) && (m.length>0));
        }
    };
});