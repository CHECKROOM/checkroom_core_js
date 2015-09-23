/*
 * Util helpers
 */
define(function () {
    return {
        /**
         * Turns an integer into a compact text to show in a badge
         *
         * @memberOf  common
         * @name  common#badgeify
         * @method         
         * 
         * @param  {int} count 
         * @return {string}       
         */
        badgeify: function(count) {
            if (count>100) {
                return "100+";
            } else if (count>10) {
                return "10+";
            } else if (count>0) {
                return ""+count;
            } else {
                return "";
            }
        },
        /**
         * getLoginName
         *
         * @memberOf common
         * @name  common#getLoginName
         * @method
         * 
         * @param  {string} firstName 
         * @param  {string} lastName  
         * @return {string}           
         */
        getLoginName: function(firstName, lastName){
            var patt = /[\s-]*/igm;
            return  firstName.latinise().toLowerCase().replace(patt, '') + "." + lastName.latinise().toLowerCase().replace(patt, '');   
        },
        /**
         * getUrlParam
         *
         * @memberOf common
         * @name  common#getUrlParam
         * @method
         * 
         * @param  {string} name 
         * @return {string}      
         */
        getUrlParam: function(name) {
            name = name.replace(/[\[]/,"\\\[").replace(/[\]]/,"\\\]");
            var regexS = "[\\?&]"+name+"=([^&#]*)";
            var regex = new RegExp( regexS );
            var results = regex.exec( window.location.href );
            return (results) ? decodeURIComponent(results[1].replace(/\+/g, " ")) : null;
        }       
    };
});