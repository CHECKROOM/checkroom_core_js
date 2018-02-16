/*
 * Util helpers
 */
define(['jquery'], function ($) {

    var utils = {};

    /**
     * Sorts a given fields dict based on a list of fieldDefs
     * @memberOf utils
     * @name utils#sortFields
     * @param {object} fields
     * @param {Array} fieldDefs
     * @param {Boolean} onlyFormFields (optional)
     * @param {int} limit (optional)
     * @return {Array} list of dicts
     */
    utils.sortFields = function(fields, fieldDefs, onlyFormFields, limit) {
        var sortedFields = [],
            fieldDef = null,
            fieldValue = null,
            fieldText = null;

        // Work on copy of fieldDefs array
        fieldDefs = fieldDefs.slice();

        // Return only form field definitions?
        if (onlyFormFields!=null) {
            fieldDefs = fieldDefs.filter(function(def) { return (def.form==onlyFormFields); });
        }

        // Create a Field dict for each field definition
        for (var i=0;i<fieldDefs.length;i++) {
            fieldDef = fieldDefs[i];
            fieldValue = fields[fieldDef.name];
            sortedFields.push($.extend({value: fieldValue}, fieldDef));

            if( (limit!=null) &&
                (sortedFields.length>=limit)) {
                break;
            }
        }

        return sortedFields;
    };

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
    utils.stringifyOrdered = function(obj) {
        keys = [];
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
    utils.areEqual = function(obj1, obj2) {
        return utils.stringifyOrdered(obj1 || {}) == utils.stringifyOrdered(obj2 || {});
    };

    /**
     * Turns an integer into a compact text to show in a badge
     * @memberOf  utils
     * @name  utils#badgeify
     * @method
     * @param  {int} count
     * @return {string}
     */
    utils.badgeify = function(count) {
        if (count>100) {
            return "99+";
        } else if (count>10) {
            return "10+";
        } else if (count>0) {
            return ""+count;
        } else {
            return "";
        }
    };

    /**
     * Turns a firstName lastName into a fistname.lastname login
     * @memberOf utils
     * @name  utils#getLoginName
     * @method
     * @param  {string} firstName
     * @param  {string} lastName
     * @return {string}
     */
    utils.getLoginName = function(firstName, lastName) {
        var patt = /[\s-]*/igm;
        return  firstName.latinise().toLowerCase().replace(patt, '') + "." + lastName.latinise().toLowerCase().replace(patt, '');
    };

    /**
     * Gets a parameter from the querystring (returns null if not found)
     * @memberOf utils
     * @name  utils#getUrlParam
     * @method
     * @param  {string} name
     * @param {string} default
     * @return {string}
     */
    utils.getUrlParam = function(name, def) {
        name = name.replace(/[\[]/,"\\\[").replace(/[\]]/,"\\\]");
        var regexS = "[\\?&]"+name+"=([^&#]*)";
        var regex = new RegExp( regexS );
        var results = regex.exec( window.location.href );
        return (results) ? decodeURIComponent(results[1].replace(/\+/g, " ")) : def;
    };

    // jQuery extension method
    $.urlParam = utils.getUrlParam;

    /**
     * getParsedLines
     * @memberOf utils
     * @name  utils#getParsedLines
     * @method
     * @param  {string} text
     * @return {Array}
     */
    utils.getParsedLines = function(text){
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
    utils.getFriendlyFileName = function(name){
        return name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    }

    /**
     * getFriendlyKind
     * @memberOf utils
     * @name  utils#getFriendlyKind
     * @method
     * @param {object} kind
     * @return {string}
     */
    utils.getFriendlyKind = function(kind){
        var friendlyKind = kind;

        if(kind == "string") {
            friendlyKind = "single line text";
        }

        if(kind == "text") {
           friendlyKind = "multi line text";
        }

        if(kind == "select") {
            friendlyKind = "dropdown list"
        }

        return friendlyKind;
     };

     return utils;

});
