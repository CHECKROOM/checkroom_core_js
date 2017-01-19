/**
 * The Base module
 * a base class for all documents that have: comments, attachments, other keyvalues
 * it inherits from Document to support some basic actions
 * @copyright CHECKROOM NV 2015
 * @module base
 */
define([
    'jquery',
    'common',
    'api',
    'document',
    'comment',
    'attachment',
    'field'],  /** @lends Base */ function ($, common, api, Document, Comment, Attachment, Field) {

    // Some constant values
    var DEFAULTS = {
        id: "",
        modified: null,
        cover: null,
        flag: null,
        fields: {},
        comments: [],
        attachments: [],
        barcodes: []
    };

    // Allow overriding the ctor during inheritance
    // http://stackoverflow.com/questions/4152931/javascript-inheritance-call-super-constructor-or-use-prototype-chain
    var tmp = function(){};
    tmp.prototype = Document.prototype;

    /**
     * @name  Base
     * @class
     * @property {ApiDataSource} dsAttachments   attachments datasource
     * @property {string} crtype                 e.g. cheqroom.types.customer
     * @property {moment} modified               last modified timestamp
     * @property {string} flag                   the document flag
     * @property {object} fields                 dictionary of document fields
     * @property {array} comments                array of Comment objects
     * @property {array} attachments             array of Attachment objects
     * @property {string} cover                  cover attachment id, default null
     * @constructor
     * @extends Document
     */
    var Base = function(opt) {
        var spec = $.extend({}, opt);
        Document.call(this, spec);

        this.dsAttachments = spec.dsAttachments;                                // ApiDataSource for the attachments coll
        this.crtype = spec.crtype;                                              // e.g. cheqroom.types.customer
        this.modified = spec.modified || DEFAULTS.modified;                     // last modified timestamp in momentjs
        this.flag = spec.flag || DEFAULTS.flag;                                 // flag
        this.fields = spec.fields || $.extend({}, DEFAULTS.fields);             // fields dictionary
        this.comments = spec.comments || DEFAULTS.comments.slice();             // comments array
        this.attachments = spec.attachments || DEFAULTS.attachments.slice();    // attachments array
        this.cover = spec.cover || DEFAULTS.cover;                              // cover attachment id, default null
        this.barcodes = spec.barcodes || DEFAULTS.barcodes.slice();             // barcodes array
    };

    Base.prototype = new tmp();
    Base.prototype.constructor = Base;

    //
    // Document overrides
    //
    Base.prototype._getDefaults = function() {
        return DEFAULTS;
    };

    /**
     * Checks if the object is empty
     * after calling reset() isEmpty() should return true
     * We'll only check for fields, comments, attachments here
     * @name  Base#isEmpty
     * @method
     * @returns {boolean}
     * @override
     */
    Base.prototype.isEmpty = function() {
        return (
            (this.flag==DEFAULTS.flag) &&
            ((this.fields==null) || (Object.keys(this.fields).length==0)) &&
            ((this.comments==null) || (this.comments.length==0)) &&
            ((this.attachments==null) || (this.attachments.length==0))
        );
    };

    /**
     * Checks if the base is dirty and needs saving
     * @name Base#isDirty
     * @returns {boolean}
     */
    Base.prototype.isDirty = function() {
        return (
        (this._isDirtyFlag()) ||
        (this._isDirtyFields()));
    };

    /**
     * Checks via the api if we can delete the document
     * @name  Base#canDelete
     * @method
     * @returns {promise}
     * @override
     */
    Base.prototype.canDelete = function() {
        // Documents can only be deleted when they have a pk
        if (this.existsInDb()) {
            return this.ds.call(this.id, 'canDelete');
        } else {
            return $.Deferred().resolve({result: false, message: ''});
        }
    };

    // Comments
    // ----
    /**
     * Adds a comment by string
     * @name  Base#addComment
     * @method
     * @param comment
     * @param skipRead
     * @returns {promise}
     */
    Base.prototype.addComment = function(comment, skipRead) {
        return this._doApiCall({
            method: 'addComment',
            params: {comment: comment},
            skipRead: skipRead
        });
    };

    /**
     * Updates a comment by id
     * @name  Base#updateComment
     * @method
     * @param id
     * @param comment
     * @param skipRead
     * @returns {promise}
     */
    Base.prototype.updateComment = function(id, comment, skipRead) {
        return this._doApiCall({
            method: 'updateComment',
            params: {commentId: id, comment: comment},
            skipRead: skipRead
        });
    };

    /**
     * Deletes a Comment by id
     * @name  Base#deleteComment
     * @method
     * @param id
     * @param skipRead
     * @returns {promise}
     */
    Base.prototype.deleteComment = function(id, skipRead) {
        return this._doApiCall({
            method: 'removeComment',
            params: {commentId: id},
            skipRead: skipRead
        });
    };

    // Field stuff
    // ----
    /**
     * Sets a custom field
     * @name Base#setField
     * @method
     * @param field
     * @param value
     * @param skipRead
     * @returns {promise}
     */
    Base.prototype.setField = function(field, value, skipRead) {
        return this._doApiCall({
            method: 'setField',
            params: {field: field, value: value},
            skipRead: skipRead
        });
    };

    /**
     * Clears a custom field
     * @name Base#clearField
     * @method
     * @param field
     * @param skipRead
     */
    Base.prototype.clearField = function(field, skipRead) {
        return this._doApiCall({
            method: 'clearField',
            params: {field: field},
            skipRead: skipRead
        });
    };

    /**
     * Adds a barcode
     * @name Base#addBarcode
     * @param code
     * @param skipRead
     * @returns {promise}
     */
    Base.prototype.addBarcode = function(code, skipRead) {
        return this._doApiCall({
            method: 'addBarcode', 
            params: {barcode: code}, 
            skipRead: skipRead
        });
    };

    /**
     * Removes a barcode
     * @name Item#removeBarcode
     * @param code
     * @param skipRead
     * @returns {promise}
     */
    Base.prototype.removeBarcode = function(code, skipRead) {
        return this._doApiCall({
            method: 'removeBarcode', 
            params: {barcode: code}, 
            skipRead: skipRead
        });
    };

    // Attachments stuff
    // ----
    /**
     * Gets an url for a user avatar
     * 'XS': (64, 64),
     * 'S': (128, 128),
     * 'M': (256, 256),
     * 'L': (512, 512)
     * @param size {string} default null is original size
     * @param groupId {string} Group primary key (only when you're passing an attachment)
     * @param att {string} attachment primary key, by default we take the cover
     * @param bustCache {boolean}
     * @returns {string}
     */
    Base.prototype.getImageUrl = function(size, groupId, att, bustCache) {
        var attachment = att || this.cover;
        return (
        (attachment!=null) &&
        (attachment.length>0)) ?
            this.helper.getImageCDNUrl(groupId, attachment, size) :
            this.helper.getImageUrl(this.ds, this.id, size, bustCache);
    };

    /**
     * Set the cover image to an Attachment
     * @name  Base#setCover
     * @method
     * @param att
     * @param skipRead
     * @returns {promise}
     */
    Base.prototype.setCover = function(att, skipRead) {
        return this._doApiCall({
            method: 'setCover',
            params: {attachmentId: att._id},
            skipRead: skipRead
        });
    };

    /**
     * Clears the cover image
     * @name  Base#clearCover
     * @method
     * @param skipRead
     * @returns {promise}
     */
    Base.prototype.clearCover = function(skipRead) {
        return this._doApiCall({
            method: 'clearCover',
            params: {},
            skipRead: skipRead
        });
    };

    /**
     * attaches an Attachment object
     * @name  Base#attach
     * @method
     * @param attachmentId
     * @param skipRead
     * @returns {promise}
     */
    Base.prototype.attach = function(attachmentId, skipRead) {
        if (this.existsInDb()) {
            return this._doApiCall({
                method: 'attach',
                params: {attachments: [attachmentId]},
                skipRead: skipRead
            });
        } else {
            return $.Deferred().reject(new api.ApiError('Cannot attach attachment, id is empty or null'));
        }
    };

    /**
     * detaches an Attachment by kvId (guid)
     * @name  Base#detach
     * @method
     * @param attachmentId
     * @param skipRead
     * @returns {promise}
     */
    Base.prototype.detach = function(attachmentId, skipRead) {
        if (this.existsInDb()) {
            return this._doApiCall({
                method: 'detach',
                params: {attachments: [attachmentId]},
                skipRead: skipRead
            });
        } else {
            return $.Deferred().reject(new api.ApiError('Cannot detach attachment, id is empty or null'));
        }
    };

    // Flags stuff
    // ----

    /**
     * Sets the flag of an item
     * @name Base#setFlag
     * @param flag
     * @param skipRead
     * @returns {promise}
     */
    Base.prototype.setFlag = function(flag, skipRead) {
        return this._doApiCall({
            method: 'setFlag',
            params: { flag: flag },
            skipRead: skipRead});
    };

    /**
     * Clears the flag of an item
     * @name Base#clearFlag
     * @param skipRead
     * @returns {promise}
     */
    Base.prototype.clearFlag = function (skipRead) {
        return this._doApiCall({
            method: 'clearFlag',
            params: {},
            skipRead: skipRead
        });
    };

    /**
     * Returns a list of Field objects
     * @param fieldDefs         array of field definitions
     * @param onlyFormFields    should return only form fields
     * @param limit             return no more than x fields
     * @return {Array}
     */
    Base.prototype.getSortedFields = function(fieldDefs, onlyFormFields, limit) {
        var that = this,
            fields = [],
            fieldDef = null,
            fieldValue = null;

        // Work on copy of fieldDefs array
        fieldDefs = fieldDefs.slice();

        // Return only form field definitions?
        fieldDefs = fieldDefs.filter(function(def) { return onlyFormFields == true ? def.form : true; });

        // Create a Field object for each field definition
        for (var i=0;i<fieldDefs.length;i++) {
            fieldDef = fieldDefs[i];
            fieldValue = that.fields[fieldDef.name];

            if( (limit==null) ||
                (limit>fields.length)) {
                fields.push(that._getField($.extend({ value: fieldValue }, fieldDef)));
            }
        }

        return fields;
    };

    /**
     * Update item fields based on the given Field objects
     * @param {Array} fields    array of Field objects
     */
    Base.prototype.setSortedFields = function(fields) {
        for (var i=0;i<fields.length;i++) {
            var field = fields[i];
            if(field.isEmpty()){
                delete this.fields[field.name];
            }else{
                this.fields[field.name] = field.value;
            }
        }
    };

    /**
     * Checks if all item fields are valid
     * @param  {Array}  fields
     * @return {Boolean}        
     */
    Base.prototype.validateSortedFields = function(fields) {
        for (var i=0;i<fields.length;i++) {
            if (!fields[i].isValid()) {
                return false;
            }
        }
        return true;
    };

    // Implementation
    // ----

    /**
     * Checks if the flag is dirty compared to the raw response
     * @returns {boolean}
     * @private
     */
    Base.prototype._isDirtyFlag = function() {
        if (this.raw) {
            return (this.flag != this.raw.flag);
        } else {
            return false;
        }
    };

    /**
     * Checks if the fields are dirty compared to the raw response
     * @returns {boolean}
     * @private
     */
    Base.prototype._isDirtyFields = function() {
        if (this.raw) {
            return !(common.areEqual(this.fields, this.raw.fields));
        } else {
            return false;
        }
    };

    /**
     * Runs over the fields that are dirty and calls `setField
     * @returns {*}
     * @private
     */
    Base.prototype._updateFields = function() {
        var calls = [];

        if (this.raw) {
            for (var key in this.fields) {
                if (this.fields[key] != this.raw.fields[key]) {
                    calls.push(this.setField(key, this.fields[key], true));
                }
            }
        }

        if (calls.length>0) {
            return $.when(calls);
        } else {
            return $.Deferred().resolve(this);
        }
    };

    // toJson, fromJson
    // ----

    /**
     * _toJson, makes a dict of params to use during create / update
     * @param options
     * @returns {{}}
     * @private
     */
    Base.prototype._toJson = function(options) {
        return Document.prototype._toJson.call(this, options);
    };

    /**
     * _fromJson: read some basic information
     * @method
     * @param {object} data the json response
     * @param {object} options dict
     * @private
     */
    Base.prototype._fromJson = function(data, options) {
        var that = this;
        return Document.prototype._fromJson.call(this, data, options)
            .then(function() {
                that.flag = data.flag || DEFAULTS.flag;
                that.fields = (data.fields!=null) ? $.extend({}, data.fields) : $.extend({}, DEFAULTS.fields);
                that.modified = data.modified || DEFAULTS.modified;
                that.barcodes = data.barcodes || DEFAULTS.barcodes;

                return that._fromCommentsJson(data, options)
                    .then(function() {
                        return that._fromAttachmentsJson(data, options);
                    });
            });
    };

    /**
     * _toJsonFields: makes json which can be used to set fields during `create`
     * @method
     * @param options
     * @returns {{}}
     * @private
     */
    Base.prototype._toJsonFields = function(options) {
        var fields = {};
        if (this.fields) {
            for (var key in this.fields) {
                fields["fields__"+key] = this.fields[key];
            }
        }
        return fields;
    };

    /**
     * _fromCommentsJson: reads the data.comments
     * @param data
     * @param options
     * @returns {*}
     * @private
     */
    Base.prototype._fromCommentsJson = function(data, options) {
        var obj = null,
            that = this;

        this.comments = DEFAULTS.comments.slice();

        if( (data.comments) &&
            (data.comments.length>0)) {
            $.each(data.comments, function(i, comment) {
                obj = that._getComment(comment, options);
                if (obj) {
                    that.comments.push(obj);
                }
            });
        }

        return $.Deferred().resolve(data);
    };

    /**
     * _fromAttachmentsJson: reads the data.attachments
     * @param data
     * @param options
     * @returns {*}
     * @private
     */
    Base.prototype._fromAttachmentsJson = function(data, options) {
        var obj = null,
            that = this;

        this.attachments = DEFAULTS.attachments.slice();

        if( (data.attachments) &&
            (data.attachments.length>0)) {
            $.each(data.attachments, function(i, att) {
                obj = that._getAttachment(att, options);
                if (obj) {
                    that.attachments.push(obj);
                }
            });
        }

        return $.Deferred().resolve(data);
    };

    Base.prototype._getComment = function(data, options) {
        var spec = $.extend({ds: this.ds}, options || {}, data);
        return new Comment(spec);
    };

    Base.prototype._getAttachment = function(data, options) {
        var spec = $.extend({ds: this.ds}, options || {}, data);
        return new Attachment(spec);
    };

    Base.prototype._getField = function(data, options){
        var spec = $.extend({}, options || {}, data);
        return new Field(spec);
    };

    return Base;

});
