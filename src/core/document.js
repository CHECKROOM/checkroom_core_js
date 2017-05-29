/**
 * The Document module
 * a base class for all documents from the CHECKROOM API
 * @module document
 * @copyright CHECKROOM NV 2015
 */
define([
    'jquery',
    'common',
    'api'], /** @lends Document */function ($, common, api) {

    // Some constant values
    var DEFAULTS = {
        id: ""
    };

    /**
     * @name Document
     * @class
     * @constructor
     * @property {ApiDataSource}  ds        - The documents primary key
     * @property {array}  _fields           - The raw, unprocessed json response
     * @property {string}  id               - The documents primary key
     * @property {string}  raw              - The raw, unprocessed json response
     */
    var Document = function(spec) {
        this.raw = null;                                                // raw json object
        this.id = spec.id || DEFAULTS.id;                               // doc _id
        this.ds = spec.ds;                                              // ApiDataSource object
        this._fields = spec._fields;                                    // e.g. [*]
    };

    /**
     * Resets the object
     * @name  Document#reset
     * @method
     * @returns {promise}
     */
    Document.prototype.reset = function() {
        // By default, reset just reads from the DEFAULTS dict again
        return this._fromJson(this._getDefaults(), null);
    };

    /**
     * Checks if the document exists in the database
     * @name  Document#existsInDb
     * @method
     * @returns {boolean}
     */
    Document.prototype.existsInDb = function() {
        // Check if we have a primary key
        return (this.id!=null) && (this.id.length>0);
    };

    /**
     * Checks if the object is empty
     * @name  Document#isEmpty
     * @method
     * @returns {boolean}
     */
    Document.prototype.isEmpty = function() {
        return true;
    };

    /**
     * Checks if the object needs to be saved
     * We don't check any of the keyvalues (or comments, attachments) here
     * @name  Document#isDirty
     * @method
     * @returns {boolean}
     */
    Document.prototype.isDirty = function() {
        return false;
    };

    /**
     * Checks if the object is valid
     * @name  Document#isValid
     * @method
     * @returns {boolean}
     */
    Document.prototype.isValid = function() {
        return true;
    };

    /**
     * Discards any changes made to the object from the previously loaded raw response
     * or resets it when no old raw response was found
     * @name  Document#discardChanges
     * @method
     * @returns {promise}
     */
    Document.prototype.discardChanges = function() {
        return (this.raw) ? this._fromJson(this.raw, null) : this.reset();
    };

    /**
     * Reloads the object from db
     * @name  Document#reload
     * @method
     * @param _fields
     * @returns {promise}
     */
    Document.prototype.reload = function(_fields) {
        if (this.existsInDb()) {
            return this.get(_fields);
        } else {
            return $.Deferred().reject(new api.ApiError('Cannot reload document, id is empty or null'));
        }
    };

    /**
     * Gets an object by the default api.get
     * @name  Document#get
     * @method
     * @param _fields
     * @returns {promise}
     */
    Document.prototype.get = function(_fields) {
        if (this.existsInDb()) {
            var that = this;
            return this.ds.get(this.id, _fields || this._fields)
                .then(function(data) {
                    return that._fromJson(data);
                });
        } else {
            return $.Deferred().reject(new api.ApiError('Cannot get document, id is empty or null'));
        }
    };

    /**
     * Creates an object by the default api.create
     * @name  Document#create
     * @method
     * @param skipRead skips reading the response via _fromJson (false)
     * @returns {promise}
     */
    Document.prototype.create = function(skipRead) {
        if (this.existsInDb()) {
            return $.Deferred().reject(new Error("Cannot create document, already exists in database"));
        }
        if (this.isEmpty()) {
            return $.Deferred().reject(new Error("Cannot create empty document"));
        }
        if (!this.isValid()) {
            return $.Deferred().reject(new Error("Cannot create, invalid document"));
        }
        return this._create(skipRead);
    };

    /**
     * Updates an object by the default api.update
     * @name  Document#update
     * @method
     * @param skipRead skips reading the response via _fromJson (false)
     * @returns {promise}
     */
    Document.prototype.update = function(skipRead) {
        if (!this.existsInDb()) {
            return $.Deferred().reject(new Error("Cannot update document without id"));
        }
        if (this.isEmpty()) {
            return $.Deferred().reject(new Error("Cannot update to empty document"));
        }
        if (!this.isValid()) {
            return $.Deferred().reject(new Error("Cannot update, invalid document"));
        }
        return this._update(skipRead);
    };

    /**
     * Deletes an object by the default api.delete
     * @name  Document#delete
     * @method
     * @returns {promise}
     */
    Document.prototype.delete = function() {
        // Call the api /delete on this document
        if (this.existsInDb()) {
            return this._delete();
        } else {
            return $.Deferred().reject(new Error("Document does not exist"));
        }
    };

    // toJson, fromJson
    // ----
    Document.prototype._getDefaults = function() {
        return DEFAULTS;
    };

    /**
     * _toJson, makes a dict of this object
     * Possibly inheriting classes will override this method,
     * because not all fields can be set during create / update
     * @method
     * @param options
     * @returns {{}}
     * @private
     */
    Document.prototype._toJson = function(options) {
        return {
            id: this.id
        };
    };

    /**
     * _fromJson: in this implementation we'll only read
     * the data.keyValues into: comments, attachments, keyValues
     * @method
     * @param {object} data the json response
     * @param {object} options dict
     * @private
     */
    Document.prototype._fromJson = function(data, options) {
        this.raw = data;
        this.id = data._id || DEFAULTS.id;
        return $.Deferred().resolve(data);
    };

    // Implementation stuff
    // ---
    /**
     * The actual _create implementation (after all the checks are done)
     * @param skipRead
     * @returns {*}
     * @private
     */
    Document.prototype._create = function(skipRead) {
        var that = this;
        var data = this._toJson();
        delete data.id;
        return this.ds.create(data, this._fields)
            .then(function(data) {
                return (skipRead==true) ? data : that._fromJson(data);
            });
    };

    /**
     * The actual _update implementation (after all the checks are done)
     * @param skipRead
     * @returns {*}
     * @private
     */
    Document.prototype._update = function(skipRead) {
        var that = this;
        var data = this._toJson();
        delete data.id;
        return this.ds.update(this.id, data, this._fields)
            .then(function(data) {
                return (skipRead==true) ? data : that._fromJson(data);
            });
    };

    /**
     * The actual _delete implementation (after all the checks are done)
     * @returns {*}
     * @private
     */
    Document.prototype._delete = function() {
        var that = this;
        return this.ds.delete(this.id)
            .then(function() {
                return that.reset();
            });
    };

    /**
     * Helper for checking if a simple object property is dirty
     * compared to the original raw result
     * @param prop
     * @returns {boolean}
     * @private
     */
    Document.prototype._isDirtyProperty = function(prop) {
        return (this.raw) ? (this[prop]!=this.raw[prop]) : false;
    };

    /**
     * Helper for checking if a simple object property is dirty
     * compared to the original raw result
     * Because we know that the API doesn't return empty string properties,
     * we do a special, extra check on that.
     * @param prop
     * @returns {boolean}
     * @private
     */
    Document.prototype._isDirtyStringProperty = function(prop) {
        if (this.raw) {
            var same = (this[prop]==this.raw[prop]) || ((this[prop]=="") && (this.raw[prop]==null));
            return !same;
        } else {
            return false;
        }
    };

    /**
     * Helper for checking if a simple object property is dirty
     * compared to the original raw result
     * @param prop
     * @returns {boolean}
     * @private
     */
    Document.prototype._isDirtyMomentProperty = function(prop) {
        if (this.raw) {
            var newVal = this[prop],
                oldVal = this.raw[prop];
            if (newVal==null && oldVal==null) {
                return false;
            } else if (newVal && oldVal) {
                return !newVal.isSame(oldVal);
            } else {
                return true;
            }
        } else {
            return false;
        }
    };

    /**
     * Gets the id of a document
     * @param obj
     * @param prop
     * @returns {string}
     * @private
     */
    Document.prototype._getId = function(obj, prop) {
        return (typeof obj === 'string') ? obj : obj[prop || "_id"];
    };

    Document.prototype._getIds = function(objs, prop) {
        return objs.map(function(obj){
            return typeof(obj) == "string"? obj: obj[prop || "_id"];
        });
    };

    /**
     * Wrapping the this.ds.call method
     * {pk: '', method: '', params: {}, _fields: '', timeOut: null, usePost: null, skipRead: null}
     * @method
     * @param spec
     * @returns {promise}
     * @private
     */
    Document.prototype._doApiCall = function(spec) {
        var that = this;
        return this.ds.call(
                (spec.collectionCall==true) ? null : (spec.pk || this.id),
                spec.method,
                spec.params,
                spec._fields || this._fields,
                spec.timeOut,
                spec.usePost)
            .then(function(data) {
                return (spec.skipRead==true) ? data : that._fromJson(data);
            });
    };

    /**
     * Wrapping the this.ds.call method with a longer timeout
     * {pk: '', method: '', params: {}, _fields: '', timeOut: null, usePost: null, skipRead: null}
     * @method
     * @param spec
     * @returns {promise}
     * @private
     */
    Document.prototype._doApiLongCall = function(spec) {
        spec.timeOut = spec.timeOut || 30000;
        return this._doApiCall(spec);
    };

    return Document;

});
