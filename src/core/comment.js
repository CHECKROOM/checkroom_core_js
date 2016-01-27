/**
 * The Comment module
 * a helper class that can read a Comment KeyValue
 * Comment inherits from KeyValue and adds some specifics to it
 * @module comment
 * @copyright CHECKROOM NV 2015
 */
define([
    'jquery',
    'keyvalue'],/** Comment */ function ($, KeyValue) {

    var KEY = "cheqroom.Comment";

    // Allow overriding the ctor during inheritance
    // http://stackoverflow.com/questions/4152931/javascript-inheritance-call-super-constructor-or-use-prototype-chain
    var tmp = function() {};
    tmp.prototype = KeyValue.prototype;

    /**
     * @name  Comment
     * @class
     * @constructor
     * @extends KeyValue
     */
    var Comment = function(spec) {
        spec = spec || {};
        spec.key = KEY;
        spec.kind = "string";
        KeyValue.call(this, spec);
    };

    Comment.prototype = new tmp();
    Comment.prototype.constructor = Comment;

    return Comment;
});