/*
 * Util helpers
 */
define(['jquery'], function ($) {
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
        },
        /**
         * getParsedLines 
         *
         * @memberOf common
         * @name  common#getParsedLines
         * @method
         * 
         * @param  {string} text 
         * @return {Array}      
         */
        getParsedLines: function(text){
            if( (text) &&
                (text.length > 0)) {
                var customs = text.split(/\s*([,;\r\n]+|\s\s)\s*/);
                return customs.filter(function(cust, idx, arr) {
                    return (
                        (cust.length>0) &&
                        (cust.indexOf(',')<0) &&
                        (cust.indexOf(';')<0) &&
                        ($.trim(cust).length>0) &&
                        (arr.indexOf(cust) >= idx));
                    });
            }else{
                return [];
            }
        }      
    };
});