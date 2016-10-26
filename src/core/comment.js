/**
 * The Comment module
 * @module comment
 * @copyright CHECKROOM NV 2015
 */
define(['jquery'], /** Comment */ function ($) {

    var DEFAULTS = {
        id: '',
        value: null,
        created: null,
        modified: null,
        by: null
    };

    /**
     * @name  Comment
     * @class
     * @param spec
     * @constructor
     */
    var Comment = function(spec) {
        spec = spec || {};
        this.ds = spec.ds;
        this.raw = null; // the raw json object

        this.id = spec.id || DEFAULTS.id;
        this.value = spec.value || DEFAULTS.value;
        this.created = spec.created || DEFAULTS.created;
        this.modified = spec.modified || DEFAULTS.modified;
        this.by = spec.by || DEFAULTS.by;
    };

    /**
     * _toJson, makes a dict of the object
     * @method
     * @param options
     * @returns {object}
     * @private
     */
    Comment.prototype._toJson = function(options) {
        return {
            id: this.id,
            value: this.value,
            created: this.created,
            modified: this.modified,
            by: this.by
        };
    };

    /**
     * _fromJson: reads the Comment object from json
     * @method
     * @param {object} data the json response
     * @param {object} options dict
     * @returns promise
     * @private
     */
    Comment.prototype._fromJson = function(data, options) {
        this.raw = data;
        this.id = data.id || DEFAULTS.id;
        this.value = data.value || DEFAULTS.value;
        this.created = data.created || DEFAULTS.created;
        this.modified = data.modified || DEFAULTS.modified;
        this.by = data.by || DEFAULTS.by;
        return $.Deferred().resolve(data);
    };

    return Comment;
});