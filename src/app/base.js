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
    'keyvalue'],  /** @lends Base */ function ($, common, api, Document, Comment, Attachment, KeyValue) {

    // Some constant values
    var COMMENT = "cheqroom.Comment",
        ATTACHMENT = "cheqroom.Attachment",
        IMAGE = "cheqroom.prop.Image",
        IMAGE_OTHER = "cheqroom.attachment.Image",
        DEFAULTS = {
            id: "",
            modified: null,
            cover: null,
            comments: [],
            attachments: [],
            keyValues: []
        };

    // Allow overriding the ctor during inheritance
    // http://stackoverflow.com/questions/4152931/javascript-inheritance-call-super-constructor-or-use-prototype-chain
    var tmp = function(){};
    tmp.prototype = Document.prototype;

    /**
     * @name  Base
     * @class
     * @constructor
     * @extends Document
     */
    var Base = function(opt) {
        var spec = $.extend({}, opt);
        Document.call(this, spec);

        this.crtype = spec.crtype;                                              // e.g. cheqroom.types.customer
        this.modified = spec.modified || DEFAULTS.modified;                     // last modified timestamp in momentjs
        this.comments = spec.comments || DEFAULTS.comments.slice();             // comments array
        this.attachments = spec.attachments || DEFAULTS.attachments.slice();    // attachments array
        this.keyValues = spec.keyValues || DEFAULTS.keyValues.slice();          // keyValues array
        this.cover = spec.cover || DEFAULTS.cover;                              // cover attachment id, default null
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
     * We'll only check for comments, attachments, keyValues here
     * @name  Base#isEmpty
     * @method
     * @returns {boolean}
     * @override
     */
    Base.prototype.isEmpty = function() {
        return (
            ((this.comments==null) || (this.comments.length==0)) &&
                ((this.attachments==null) || (this.attachments.length==0)) &&
                ((this.keyValues==null) || (this.keyValues.length==0))
            );
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
            return this.ds.call(this.id, 'canDelete')
                .then(function(resp) {
                    return resp.result;
                });
        } else {
            return $.Deferred().resolve(false);
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
        return this.addKeyValue(COMMENT, comment, "string", skipRead);
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
        return this.updateKeyValue(id, COMMENT, comment, "string", skipRead);
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
        return this.removeKeyValue(id, skipRead);
    };

    // KeyValue stuff
    // ----
    /**
     * Adds a key value
     * @name  Base#addKeyValue
     * @method
     * @param key
     * @param value
     * @param kind
     * @param skipRead
     * @returns {promise}
     */
    Base.prototype.addKeyValue = function(key, value, kind, skipRead) {
        return this._doApiCall({
            method: 'addKeyValue',
            params: {key: key, value: value, kind: kind},
            skipRead: skipRead
        });
    };

    /**
     * Updates a keyvalue by id
     * @name  Base#updateKeyValue
     * @method
     * @param id
     * @param key
     * @param value
     * @param kind
     * @param skipRead
     * @returns {promise}
     */
    Base.prototype.updateKeyValue = function(id, key, value, kind, skipRead) {
        return this._doApiCall({
            method: 'updateKeyValue',
            params: {id: id, key: key, value: value, kind: kind},
            skipRead: skipRead
        });
    };

    /**
     * Removes a keyvalue by id
     * @name  Base#removeKeyValue
     * @method
     * @param id
     * @param skipRead
     * @returns {promise}
     */
    Base.prototype.removeKeyValue = function(id, skipRead) {
        return this._doApiCall({
            method: 'removeKeyValue',
            params: {id: id},
            skipRead: skipRead
        });
    };

    /**
     * Sets a keyvalue by id
     * @name  Base#setKeyValue
     * @method
     * @param id
     * @param key
     * @param value
     * @param kind
     * @param skipRead
     * @returns {promise}
     */
    Base.prototype.setKeyValue = function(id, key, value, kind, skipRead) {
        var params = {key: key, value: value, kind: kind};
        if( (id!=null) &&
            (id.length>0)) {
            params.id = id;
        }
        return this._doApiCall({
            method: 'setKeyValue',
            params: params,
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
     * changes the cover image to another Attachment
     * @name  Base#setCover
     * @method
     * @param att
     * @param skipRead
     * @returns {promise}
     */
    Base.prototype.setCover = function(att, skipRead) {
        return this._doApiCall({
            method: 'setCover',
            params: {kvId: att.id},
            skipRead: skipRead
        });
    };

    /**
     * attaches an image Attachment file, shortcut to attach
     * @name  Base#attachImage
     * @method
     * @param att
     * @param skipRead
     * @returns {promise}
     */
    Base.prototype.attachImage = function(att, skipRead) {
        return this.attach(att, IMAGE, skipRead);
    };

    /**
     * attaches an Attachment file, shortcut to attach
     * @name  Base#attachFile
     * @method
     * @param att
     * @param skipRead
     * @returns {promise}
     */
    Base.prototype.attachFile = function(att, skipRead) {
        return this.attach(att, ATTACHMENT, skipRead);
    };

    /**
     * attaches an Attachment object
     * @name  Base#attach
     * @method
     * @param att
     * @param key
     * @param skipRead
     * @returns {promise}
     */
    Base.prototype.attach = function(att, key, skipRead) {
        if (this.existsInDb()) {
            return this._doApiCall({
                method: 'attach',
                params: {attachments: [att._id], key: key},
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
     * @param keyId
     * @param skipRead
     * @returns {promise}
     */
    Base.prototype.detach = function(keyId, skipRead) {
        if (this.existsInDb()) {
            return this._doApiCall({
                method: 'detach',
                params: {attachments: [keyId], kvId: keyId},
                skipRead: skipRead
            });
        } else {
            return $.Deferred().reject(new api.ApiError('Cannot detach attachment, id is empty or null'));
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
                that.modified = data.modified || DEFAULTS.modified;
                return that._fromKeyValuesJson(data, options);
            });
    };

    /**
     * _fromKeyValuesJson: reads the data.keyValues
     * @method
     * @param data
     * @param options
     * @returns {*}
     * @private
     */
    Base.prototype._fromKeyValuesJson = function(data, options) {
        // Read only the .keyValues part of the response
        var obj = null;
        var that = this;

        this.comments = DEFAULTS.comments.slice();
        this.attachments = DEFAULTS.attachments.slice();
        this.keyValues = DEFAULTS.keyValues.slice();
        this.cover = data.cover || DEFAULTS.cover;

        if( (data.keyValues) &&
            (data.keyValues.length)) {

            // Reverse sorting with underscorejs
            //var kvs = _.sortBy(data.keyValues, function(kv) { return kv.modified});
            //kvs.reverse();

            // TODO?
            // Sort so the newest keyvalues are first in the array
            var kvs = data.keyValues.sort(function(a, b) {
                return b.modified > a.modified;
            });

            $.each(kvs, function(i, kv) {
                switch(kv.key) {
                    case COMMENT:
                        obj = that._getComment(kv, options);
                        if (obj) {
                            that.comments = that.comments || [];
                            that.comments.push(obj);
                        }
                        break;
                    case IMAGE:
                    case ATTACHMENT:
                    case IMAGE_OTHER:
                        obj = that._getAttachment(kv, options);
                        if (obj) {
                            that.attachments = that.attachments || [];
                            that.attachments.push(obj);
                        }
                        break;
                    default:
                        obj = that._getKeyValue(kv, options);
                        if (obj) {
                            that.keyValues = that.keyValues || [];
                            that.keyValues.push(obj);
                        }
                        break;
                }
            });
        }

        return $.Deferred().resolve(data);
    };

    Base.prototype._getComment = function(kv, options) {
        var spec = $.extend({
                ds: this.ds,
                fields: this.fields},
            options || {},
            kv);
        return new Comment(spec);
    };

    Base.prototype._getAttachment = function(kv, options) {
        var spec = $.extend({
                ds: this.ds,
                fields: this.fields},
            options || {},  // can contain; isCover, canBeCover
            kv);
        return new Attachment(spec);
    };

    Base.prototype._getKeyValue = function(kv, options) {
        var spec = $.extend({
                ds: this.ds,
                fields: this.fields},
            options || {},
            kv);
        return new KeyValue(spec);
    };

    return Base;

});
