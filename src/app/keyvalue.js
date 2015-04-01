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
        value: null,
        modified: null,
        by: null
    };

    /**
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
        var keyParts = this.key.split(";");
        return keyParts[0].split('.').pop().split('+').join(' ');
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
     * @returns {{}}
     * @private
     */
    KeyValue.prototype._toJson = function(options) {
        return {
            id: this.id,
            pk: this.pk,
            key: this.key,
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
     */
    KeyValue.prototype._fromJson = function(data, options) {
        this.raw = data;
        this.id = data.id || DEFAULTS.id;
        this.pk = data.pk || DEFAULTS.pk;
        this.key = data.key || DEFAULTS.key;
        this.value = data.value || DEFAULTS.value;
        this.modified = data.modified || DEFAULTS.modified;
        this.by = data.by || DEFAULTS.by;
        return $.Deferred().resolve(data);
    };

//
//    KeyValue.prototype.canDelete = function(by) {
//        // Inheriting classes can do something useful with this
//        return true;
//    };
//
//    KeyValue.prototype.canEdit = function(by) {
//        // Inheriting classes can do something useful with this
//        return true;
//    };
//
//    /**
//     Managing document KeyValues
//     */
//
//    /**
//     * _addKeyValue adds a KeyValue by its key and a value
//     * @param key
//     * @param value
//     * @param kind
//     * @returns {*}
//     * @private
//     */
//    KeyValue.prototype._addKeyValue = function(key, value, kind) {
//        if (this.existsInDb()) {
//            return $.Deferred().reject(new Error("_addKeyValue cannot add if it already exists in the database"));
//        }
//
//        var that = this;
//        this.isBusy(true);
//        return this.ds.call(this.pk, 'addKeyValue', {key: key, value: value, kind: kind, _fields: this.fields})
//            .then(function() {
//                that.reset();
//            })
//            .always(function() {
//                that.isBusy(false);
//            });
//    };
//
//    /**
//     * _updateKeyValue updates a KeyValue by its key and a new value
//     * @param key
//     * @param value
//     * @param kind
//     * @returns {*}
//     * @private
//     */
//    KeyValue.prototype._updateKeyValue = function(key, value, kind) {
//        if (!this.existsInDb()) {
//            return $.Deferred().reject(new Error("_updateKeyValue cannot update if it doesn't exist in the database"));
//        }
//
//        var that = this;
//        this.isBusy(true);
//        return this.ds.call(this.pk, 'updateKeyValue', {key: key, value: value, kind: kind, _fields: this.fields})
//            .then(function() {
//                that.reset();
//            })
//            .always(function() {
//                that.isBusy(false);
//            });
//    };
//
//    /**
//     * _removeKeyValue removes a KeyValue by its guid id
//     * @returns {*}
//     * @private
//     */
//    KeyValue.prototype._removeKeyValue = function() {
//        if (!this.existsInDb()) {
//            return $.Deferred().reject(new Error("_removeKeyValue cannot remove keyvalue if it doesn't exist in the database"));
//        }
//
//        if (!this.canDelete(this.by)) {
//            return $.Deferred().reject(new Error("_removeKeyValue cannot remove keyvalue"));
//        }
//
//        var that = this;
//        this.isBusy(true);
//        this.isDeleting(true);
//        return this.ds.call(this.pk, 'removeKeyValue', {id: this.id, _fields: this.fields})
//            .then(function() {
//                that.reset();
//            })
//            .always(function() {
//                that.isBusy(false);
//                that.isDeleting(false);
//            });
//    };

    return KeyValue;
});