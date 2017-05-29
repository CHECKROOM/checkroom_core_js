/**
 * The Group module
 * @copyright CHECKROOM NV 2015
 * @module group
 */
define([
    'jquery',
    'common',
    'api',
    'document'],  /** @lends Document */ function ($, common, api, Document) {

    // Some constant values
    var DEFAULTS = {
        id: "",
        name: "",
        itemFlags: [],
        kitFlags: [],
        customerFlags: [],
        orderFlags: [],
        reservationFlags: [],
        itemFields: [],
        kitFields: [],
        customerFields: [],
        orderFields: [],
        reservationFields: [],
        cancelled: null
    };

    // Allow overriding the ctor during inheritance
    // http://stackoverflow.com/questions/4152931/javascript-inheritance-call-super-constructor-or-use-prototype-chain
    var tmp = function(){};
    tmp.prototype = Document.prototype;

    /**
     * Group describes a group which can trigger on certain events (signals)
     * @name  Group
     * @class
     * @property {string} name              the group name
     * @property {array} itemFlags          the groups item flags
     * @property {array} kitFlags           the groups kit flags
     * @property {array} customerFlags      the groups customer flags
     * @property {array} orderFlags         the groups order flags
     * @property {array} reservationFlags   the groups reservation flags
     * @property {array} itemFields         the groups item fields
     * @property {array} kitFields          the groups kit fields
     * @property {array} customerFields     the groups customer fields
     * @property {array} reservationFields  the groups reservation fields
     * @property {array} orderFields        the groups order fields
     * @constructor
     * @extends Document
     */
    var Group = function(opt) {
        var spec = $.extend({}, opt);
        Document.call(this, spec);

        this.name = spec.name || DEFAULTS.name;
        this.itemFlags = spec.itemFlags || DEFAULTS.itemFlags.slice();
        this.kitFlags = spec.kitFlags || DEFAULTS.kitFlags.slice();
        this.customerFlags = spec.customerFlags || DEFAULTS.customerFlags.slice();
        this.orderFlags = spec.orderFlags || DEFAULTS.orderFlags.slice();
        this.reservationFlags = spec.reservationFlags || DEFAULTS.reservationFlags.slice();
        this.itemFields = spec.itemFields || DEFAULTS.itemFields.slice();
        this.kitFields = spec.kitFields || DEFAULTS.kitFields.slice();
        this.customerFields = spec.customerFields || DEFAULTS.customerFields.slice();
        this.reservationFields = spec.reservationFields || DEFAULTS.reservationFields.slice();
        this.orderFields = spec.orderFields || DEFAULTS.orderFields.slice();
    };

    Group.prototype = new tmp();
    Group.prototype.constructor = Group;

    // Business logic
    // ----
    /**
     * Sets the name for a group
     * @param name
     * @returns {promise}
     */
    Group.prototype.updateName = function(name) {
        return this._doApiCall({
            pk: this.id,
            method: "updateName",
            location: name
        });
    };

    /**
     * Gets the stats (for a specific location)
     * @param locationId
     * @returns {promise}
     */
    Group.prototype.getStats = function(locationId) {
        return this._doApiCall({
            pk: this.id,
            method: "getStats",
            location: locationId
        });
    };

    /**
     * Updates the flags for a certain collection of documents
     * @param collection (items, kits, customers, reservations, orders)
     * @param flags
     * @param skipRead
     * @returns {promise}
     */
    Group.prototype.updateFlags = function(collection, flags, skipRead) {
        return this._doApiCall({
            pk: this.id,
            method: "updateFlags",
            collection: collection,
            flags: flags,
            skipRead: skipRead
        });
    };

    /**
     * Creates a field definition for a certain collection of documents
     * @param collection (items, kits, customers, reservations, orders)
     * @param name
     * @param kind
     * @param required
     * @param form
     * @param unit
     * @param editor
     * @param description
     * @param skipRead
     * @returns {promise}
     */
    Group.prototype.createField = function(collection, name, kind, required, form, unit, editor, description, skipRead) {
        return this._doApiCall({
            pk: this.id,
            method: "createField",
            skipRead: skipRead,
            params: {
                collection: collection,
                name: name,
                kind: kind,
                required: required,
                form: form,
                unit: unit,
                editor: editor,
                description: description}
        });
    };

    /**
     * Updates a field definition for a certain collection of documents
     * Also renames the field key on each of the documents that contain that field
     * @param collection (items, kits, customers, reservations, orders)
     * @param name
     * @param newName
     * @param kind
     * @param required
     * @param form
     * @param unit
     * @param editor
     * @param description
     * @param skipRead
     * @returns {promise}
     */
    Group.prototype.updateField = function(collection, name, newName, kind, required, form, unit, editor, description, skipRead) {
        return this._doApiCall({
            pk: this.id,
            method: "updateField",
            skipRead: skipRead,
            params: {
                collection: collection,
                name: name,
                newName: newName,
                kind: kind,
                required: required,
                form: form,
                unit: unit,
                editor: editor,
                description: description
            }
        });
    };

    /**
     * Deletes a field definition for a certain collection of documents
     * It will remove the field on all documents of that type
     * @param collection (items, kits, customers, reservations, orders)
     * @param name
     * @param skipRead
     * @returns {promise}
     */
    Group.prototype.deleteField = function(collection, name, skipRead) {
        return this._doApiCall({
            pk: this.id,
            method: "deleteField",
            skipRead: skipRead,
            params: {
                collection: collection,
                name: name
            }
        });
    };

    /**
     * Moves a field definition for a certain collection of documents
     * @param collection (items, kits, customers, reservations, orders)
     * @param oldPos
     * @param newPos
     * @param skipRead
     * @returns {promise}
     */
    Group.prototype.moveField = function(collection, oldPos, newPos, skipRead) {
        return this._doApiCall({
            pk: this.id,
            method: "moveField",
            skipRead: skipRead,
            params: {
                collection: collection,
                oldPos: oldPos,
                newPos: newPos
            }
        });
    };

    /**
     * Buys a single product from our in-app store
     * @param productId
     * @param quantity
     * @param shipping
     * @returns {promise}
     */
    Group.prototype.buyProduct = function(productId, quantity, shipping) {
        return this._doApiCall({
            pk: this.id,
            method: "buyProduct",
            skipRead: true,
            params: {
                productId: productId,
                quantity: quantity,
                shipping: shipping
            }
        });
    };

    /**
     * Buys multiple products from our in-app store
     * @param listOfProductQtyTuples
     * @param shipping
     * @returns {promise}
     */
    Group.prototype.buyProducts = function(listOfProductQtyTuples, shipping) {
        return this._doApiCall({
            pk: this.id,
            method: "buyProducts",
            skipRead: true,
            params: {
                products: listOfProductQtyTuples,
                shipping: shipping
            }
        });
    };

    /**
     * Add tags
     * @param {Array} tags 
     */
    Group.prototype.addTags = function(tags){
        return this._doApiCall({
            pk: this.id,
            method: 'addTags',
            skipRead: true,
            params:{
                tags: tags
            }
        })
    };

    /**
     * Remove tags
     * @param {Array} tags 
     */
    Group.prototype.removeTags = function(tags){
        return this._doApiCall({
            pk: this.id,
            method: 'removeTags',
            skipRead: true,
            params:{
                tags: tags
            }
        })
    };

    // Helpers
    // ----

    /**
     * Helper method that gets all known fields for a certain collection of documents
     * @param coll
     * @param form
     * @returns {Array}
     */
    Group.prototype.getFieldsForCollection = function(coll, form) {
        var fields = [];

        switch (coll) {
            case "items":
                fields = this.itemFields;
                break;
            case "kits":
                fields = this.kitFields;
                break;
            case "contacts":
            case "customers":
                fields = this.customerFields;
                break;
            case "reservations":
                fields = this.reservationFields;
                break;
            case "checkouts":
            case "orders":
                fields = this.orderFields;
                break;
            default:
                break;
        }

        if (form != null) {
            fields = $.grep(fields, function (f, i) {
                return (f.form == form);
            })
        }

        return fields;
    };

    /**
     * Helper method that gets all known flags for a certain collection of documents
     * @param coll
     * @returns {Array}
     */
    Group.prototype.getFlagsForCollection = function(coll) {
        switch (coll) {
            case "items":
                return this.itemFlags;
            case "kits":
                return this.kitFlags;
            case "contacts":
            case "customers":
                return this.customerFlags;
            case "reservations":
                return this.reservationFlags;
            case "checkouts":
            case "orders":
                return this.orderFlags;
            default:
                return [];
        }
    };

    //
    // Specific validators
    /**
     * Checks if name is valid
     * @name Group#isValidName
     * @method
     * @return {Boolean}
     */
    Group.prototype.isValidName = function() {
        this.name = $.trim(this.name);
        return (this.name.length>=3);
    };

    // toJson, fromJson
    // ----

    /**
     * _toJson, makes a dict of params to use during create / update
     * @param options
     * @returns {{}}
     * @private
     */
    Group.prototype._toJson = function(options) {
        var data = Document.prototype._toJson.call(this, options);
        data.name = this.name;
        return data;
    };

    /**
     * _fromJson: read some basic information
     * @method
     * @param {object} data the json response
     * @param {object} options dict
     * @returns {promise}
     * @private
     */
    Group.prototype._fromJson = function(data, options) {
        var that = this;
        return Document.prototype._fromJson.call(this, data, options)
            .then(function() {
                that.name = data.name || DEFAULTS.name;
                that.itemFlags = data.itemFlags || DEFAULTS.itemFlags.slice();
                that.kitFlags = data.kitFlags || DEFAULTS.kitFlags.slice();
                that.customerFlags = data.customerFlags || DEFAULTS.customerFlags.slice();
                that.orderFlags = data.orderFlags || DEFAULTS.orderFlags.slice();
                that.reservationFlags = data.reservationFlags || DEFAULTS.reservationFlags.slice();
                that.itemFields = data.itemFields || DEFAULTS.itemFields.slice();
                that.kitFields = data.kitFields || DEFAULTS.kitFields.slice();
                that.customerFields = data.customerFields || DEFAULTS.customerFields.slice();
                that.reservationFields = data.reservationFields || DEFAULTS.reservationFields.slice();
                that.orderFields = data.orderFields || DEFAULTS.orderFields.slice();
                that.cancelled = data.cancelled || DEFAULTS.cancelled;
                
                return data;
            });
    };

    return Group;

});
