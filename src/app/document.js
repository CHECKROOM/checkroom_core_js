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
     */
    var Document = function(spec) {
        this.ds = spec.ds;                                              // ApiDataSource object
        this.fields = spec.fields;                                      // e.g. [*]

        this.raw = null;                                                // raw json object
        this.id = spec.id || DEFAULTS.id;                               // doc _id
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
     * @param fields
     * @returns {promise}
     */
    Document.prototype.reload = function(fields) {
        if (this.existsInDb()) {
            return this.get(fields);
        } else {
            return $.Deferred().reject(new api.ApiError('Cannot reload document, id is empty or null'));
        }
    };

    /**
     * Gets an object by the default api.get
     * @name  Document#get
     * @method
     * @param fields
     * @returns {promise}
     */
    Document.prototype.get = function(fields) {
        if (this.existsInDb()) {
            var that = this;
            return this.ds.get(this.id, fields || this.fields)
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

        var that = this;
        var data = this._toJson();
        delete data.id;
        return this.ds.create(data, this.fields)
            .then(function(data) {
                return (skipRead==true) ? data : that._fromJson(data);
            });
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

        var that = this;
        var data = this._toJson();
        delete data.id;
        return this.ds.update(this.id, data, this.fields)
            .then(function(data) {
                return (skipRead==true) ? data : that._fromJson(data);
            });
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
            var that = this;
            return this.ds.delete(this.id)
                .then(function() {
                    return that.reset();
                });
        } else {
            return $.Deferred().reject(new Error("Contact does not exist"));
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
     * Wrapping the this.ds.call method
     * {pk: '', method: '', params: {}, fields: '', timeOut: null, usePost: null, skipRead: null}
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
                spec.fields || this.fields,
                spec.timeOut,
                spec.usePost)
            .then(function(data) {
                return (spec.skipRead==true) ? data : that._fromJson(data);
            });
    };

    return Document;

});
