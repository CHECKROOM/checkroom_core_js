/**
 * The Conflict module
 * a helper class that can read Conflicts
 * @module Conflict
 * @copyright CHECKROOM NV 2015
 */
define(['jquery'], /** @lends Conflict */ function ($) {

    var DEFAULTS = {
        kind: '',
        doc: '',
        item: '',
        itemName: '',
        locationCurrent: '',
        locationDesired: '',
        fromDate: null,
        toDate: null
    };

    /**
     * Conflict class
     * @name  Conflict
     * @class    
     * @constructor
     * 
     * @param spec
     * @property {string}  kind                   - The conflict kind (status, order, reservation, location)
     * @property {string}  doc                    - The id of the document with which it conflicts
     * @property {string}  item                   - The Item id for this conflict
     * @property {string}  itemName               - The Item name for this conflict
     * @property {string}  locationCurrent        - The Location the item is now
     * @property {string}  locationDesired        - The Location where the item should be
     * @property {moment}  fromDate               - From when does the conflict start
     * @property {moment}  toDate                 - Until when does the conflict end
     */
    var Conflict = function(spec) {
        this.ds = spec.ds;
        this._fields = spec._fields;

        this.raw = null; // the raw json object
        this.kind = spec.kind || DEFAULTS.kind;
        this.doc = spec.doc || DEFAULTS.doc;
        this.item = spec.item || DEFAULTS.item;
        this.itemName = spec.itemName || DEFAULTS.itemName;
        this.locationCurrent = spec.locationCurrent || DEFAULTS.locationCurrent;
        this.locationDesired = spec.locationDesired || DEFAULTS.locationDesired;
        this.fromDate = spec.fromDate || DEFAULTS.fromDate;
        this.toDate = spec.toDate || DEFAULTS.toDate;
    };

    /**
     * _toJson, makes a dict of the object
     * @method
     * @param {object} opt dict
     * @returns {object}
     * @private
     */
    Conflict.prototype._toJson = function(opt) {
        return {
            kind: this.kind,
            doc: this.doc,
            item: this.item,
            itemName: this.itemName,
            locationCurrent: this.locationCurrent,
            locationDesired: this.locationDesired,
            fromDate: this.fromDate,
            toDate: this.toDate
        };
    };

    /**
     * _fromJson
     * @method
     * @param {object} data the json response
     * @param {object} opt dict
     * @returns promise
     * @private
     */
    Conflict.prototype._fromJson = function(data, opt) {
        this.raw = data;
        this.kind = data.kind || DEFAULTS.kind;
        this.item = data.item || DEFAULTS.item;
        this.itemName = data.itemName || DEFAULTS.itemName;
        this.fromDate = data.fromDate || DEFAULTS.fromDate;
        this.toDate = data.toDate || DEFAULTS.toDate;
        return $.Deferred().resolve(data);
    };

    return Conflict;

});