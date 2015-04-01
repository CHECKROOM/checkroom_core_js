/**
 * The KeyValue module
 * a helper class that can read KeyValues
 * @module KeyValue
 * @copyright CHECKROOM NV 2015
 */
define(['jquery'], function ($) {

    var DEFAULTS = {
        id: '',
        pk: '',
        key: '',
        kind: 'string',
        value: null,
        modified: null,
        by: null
    };

    /**
     * KeyValue class
     * @param spec
     * @class KeyValue
     * @constructor
     */
    var KeyValue = function(spec) {
        this.ds = spec.ds;
        this.fields = spec.fields;

        this.raw = null; // the raw json object
        this.id = spec.id || DEFAULTS.id;
        this.pk = spec.pk || DEFAULTS.pk;
        this.key = spec.key || DEFAULTS.key;
        this.kind = spec.kind || DEFAULTS.kind;  // string, int, float, bool, date, attachment
        this.value = spec.value || DEFAULTS.value;
        this.modified = spec.modified || DEFAULTS.modified;
        this.by = spec.by || DEFAULTS.by;
    };

    /**
     * Checks if the document exists in the database
     * @method existsInDb
     * @returns {boolean}
     */
    KeyValue.prototype.existsInDb = function() {
        return (this.id!=null) && (this.id.length>0);
    };

    /**
     * Gets the name for this keyValue
     * @method getName
     * @returns {string}
     */
    KeyValue.prototype.getName = function() {
        // cheqroom.prop.Warranty+date
        // cheqroom.prop.Buy+price;EUR
        var keyParts = this.key.split(";");
        var noUnit = keyParts[0]
        return noUnit.split('.').pop().split('+').join(' ');
    };

    /**
     * Gets the unit for this keyValue, if no unit returns ""
     * @method getUnit
     * @returns {string}
     */
    KeyValue.prototype.getUnit = function() {
        var keyParts = this.key.split(";");
        return (keyParts.length==2) ? keyParts[1] : "";
    };

    /**
     * Checks if the object is empty
     * after calling reset() isEmpty() should return true
     * @method isEmpty
     * @returns {boolean}
     */
    KeyValue.prototype.isEmpty = function() {
        return (
            (this.id == DEFAULTS.id) &&
            (this.pk == DEFAULTS.pk) &&
            (this.key == DEFAULTS.key) &&
            (this.kind == DEFAULTS.kind) &&
            (this.value == DEFAULTS.value) &&
            (this.modified == DEFAULTS.modified) &&
            (this.by == DEFAULTS.by));
    };

    /**
     * Checks if the object has changed
     * @method isDirty
     * @returns {boolean}
     */
    KeyValue.prototype.isDirty = function() {
        return false;
    };

    /**
     * Checks if the object is valid
     * @method isValid
     * @returns {boolean}
     */
    KeyValue.prototype.isValid = function() {
        return true;
    };

    /**
     * Resets the object
     * @method reset
     * @returns promise
     */
    KeyValue.prototype.reset = function() {
        return this._fromJson(DEFAULTS, null);
    };

    /**
     * _toJson, makes a dict of the object
     * @method _toJson
     * @param options
     * @returns {object}
     * @private
     */
    KeyValue.prototype._toJson = function(options) {
        return {
            id: this.id,
            pk: this.pk,
            key: this.key,
            kind: this.kind,
            value: this.value,
            modified: this.modified,
            by: this.by
        };
    };

    /**
     * _fromJson: in this implementation we'll only read
     * the data.keyValues into: comments, attachments, keyValues
     * @method _fromJson
     * @param {object} data the json response
     * @param {object} options dict
     * @returns promise
     * @private
     */
    KeyValue.prototype._fromJson = function(data, options) {
        this.raw = data;
        this.id = data.id || DEFAULTS.id;
        this.pk = data.pk || DEFAULTS.pk;
        this.key = data.key || DEFAULTS.key;
        this.kind = data.kind || DEFAULTS.kind;
        this.value = data.value || DEFAULTS.value;
        this.modified = data.modified || DEFAULTS.modified;
        this.by = data.by || DEFAULTS.by;
        return $.Deferred().resolve(data);
    };

    return KeyValue;

});