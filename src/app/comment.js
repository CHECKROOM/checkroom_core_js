/**
 * The Comment module
 * a helper class that can read a Comment KeyValue
 * Comment inherits from KeyValue and adds some specifics to it
 * @module comment
 * @copyright CHECKROOM NV 2015
 */
define([
    'jquery',
    'keyvalue'], function ($, KeyValue) {

    var KEY = "cheqroom.Comment";
    var DEFAULTS = {
    };

    // Allow overriding the ctor during inheritance
    // http://stackoverflow.com/questions/4152931/javascript-inheritance-call-super-constructor-or-use-prototype-chain
    var tmp = function() {};
    tmp.prototype = KeyValue.prototype;

    /**
     * @class Comment
     * @constructor
     * @extends KeyValue
     */
    var Comment = function(spec) {
        KeyValue.call(this, spec);
    };

    Comment.prototype = new tmp();
    Comment.prototype.constructor = Comment;

//    Comment.prototype._fromJson = function(json) {
//        return KeyValue.prototype._fromJson.call(this, json)
//            .then(function() {
//                this.comment(json.value || DEFAULTS.comment);
//            });
//    };
//
//    Comment.prototype.isEmpty = function() {
//        // Comments have a special call for determining if they're empty or not
//        var comment = $.trim(this.comment());
//        return (comment.length == 0);
//    };
//
//    Comment.prototype.canDelete = function(by) {
//        // TODO: Comments can only be deleted by the same user that made them
//        return true;
//    };
//
//    Comment.prototype.canEdit = function(by) {
//        // TODO: Comments can only be edited by the same user that made them
//        return true;
//    };
//
//    /**
//    Managing document KeyValues
//     */
//    Comment.prototype.addComment = function() {
//        if (this.isEmpty()) {
//            return $.Deferred().reject(new Error("addComment cannot add empty comment"));
//        }
//        return KeyValue.prototype._addKeyValue(KEY, this.comment(), 'string');
//    };
//
//    Comment.prototype.updateComment = function() {
//        if (this.isEmpty()) {
//            return $.Deferred().reject(new Error("updateComment cannot update to empty comment"));
//        }
//        return KeyValue.prototype._updateKeyValue(KEY, this.comment(), 'string');
//    };
//
//    Comment.prototype.deleteComment = function() {
//        return KeyValue.prototype._removeKeyValue();
//    };

    return Comment;
});