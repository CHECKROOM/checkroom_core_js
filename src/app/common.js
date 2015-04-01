/**
 * Provides some common helper functions
 * @module common
 * @copyright CHECKROOM NV 2015
 */
define([], function () {

    // Extending the string type with some helpers
    // ----
    String.prototype.startsWith = function (str){
        return this.indexOf(str) == 0;
    };

    String.prototype.endsWith = function (str){
        if (this.length<str.length) {
            return false;
        } else {
            return this.lastIndexOf(str) == (this.length-str.length);
        }
    };

    String.prototype.pluralize = function (count, suffix) {
        if( (this == 'is') && (count!=1)) {
            return 'are';
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

    String.prototype.capitalize = function() {
        return this.charAt(0).toUpperCase() + this.slice(1);
    };

    String.prototype.truncate = function(len){
        len = (len!=null) ? len : 25;
        var re = this.match(RegExp("^.{0,"+len+"}[\S]*"));
        var l = re[0].length;
        re = re[0].replace(/\s$/,'');
        if(l < this.length) {
            re = re + "&hellip;";
        }
        return re;
    };

    // Other helpers
    // ----
    return {
        getUrlParam: function(name) {
            name = name.replace(/[\[]/,"\\\[").replace(/[\]]/,"\\\]");
            var regexS = "[\\?&]"+name+"=([^&#]*)";
            var regex = new RegExp( regexS );
            var results = regex.exec( window.location.href );
            return (results) ? decodeURIComponent(results[1].replace(/\+/g, " ")) : null;
        }
    };

});