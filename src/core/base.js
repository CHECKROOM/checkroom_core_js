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
    var ATTACHMENT = "cheqroom.Attachment",
        IMAGE = "cheqroom.prop.Image",
        IMAGE_OTHER = "cheqroom.attachment.Image",
        DEFAULTS = {
            id: "",
            modified: null,
            cover: null,
            flag: null,
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
     * @property {ApiDataSource} dsAttachments   attachments datasource
     * @property {string} crtype                 e.g. cheqroom.types.customer
     * @property {moment} modified               last modified timestamp
     * @property {string} flag                   the item flag
     * @property {array} comments                array of Comment objects
     * @property {array} attachments             array of Attachment objects
     * @property {array} keyValues               array of KeyValue objects
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
            (this.flag==DEFAULTS.flag) &&
            ((this.comments==null) || (this.comments.length==0)) &&
            ((this.attachments==null) || (this.attachments.length==0)) &&
            ((this.keyValues==null) || (this.keyValues.length==0))
        );
    };

    /**
     * Checks if the base is dirty and needs saving
     * @name Base#isDirty
     * @returns {boolean}
     */
    Base.prototype.isDirty = function() {
        if (this.raw) {
            return (this.flag != this.raw.flag);
        } else {
            return false;
        }
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
            params: {
                commentId: id,
                comment: comment
            },
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
            params: {
                commentId: id
            },
            skipRead: skipRead
        });
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
    Base.prototype.removeKeyValue = function(id, key, kind, skipRead) {
        return this._doApiCall({
            method: 'removeKeyValue',
            params: {id: id, key: key, kind: kind},
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

    /**
     * Moves a keyvalue by its id to a new position
     * @name Base#moveKeyValueIndex
     * @method
     * @param id
     * @param pos
     * @returns {promise}
     */
    Base.prototype.moveKeyValueIndex = function(id, pos, key, kind, skipRead) {
        return this._doApiCall({
            method: 'moveKeyValueById',
            params: {id: id, toPos: pos, key: key, kind: kind},
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
            params: {kvId: att._id},
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
     * @param keyId (usually the attachment._id)
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
                that.modified = data.modified || DEFAULTS.modified;
                return that._fromCommentsJson(data, options)
                    .then(function() {
                        return that._fromKeyValuesJson(data, options);
                    });
            });
    };

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

        this.attachments = DEFAULTS.attachments.slice();
        this.keyValues = DEFAULTS.keyValues.slice();
        this.cover = data.cover || DEFAULTS.cover;

        if( (data.keyValues) &&
            (data.keyValues.length)) {

            $.each(data.keyValues, function(i, kv) {
                kv.index = i;  // original index needed for sorting, swapping positions

                switch(kv.key) {
                    case COMMENT:
                        // This moved to a normal comments array
                        // It's no longer stored as keyvalues
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

        that.attachments.sort(function (a, b) {
            return b.modified > a.modified;
        });

        return $.Deferred().resolve(data);
    };

    Base.prototype._getComment = function(data, options) {
        var spec = $.extend({ds: this.ds}, options || {}, data);
        return new Comment(spec);
    };

    Base.prototype._getAttachment = function(kv, options) {
        var spec = $.extend({
                ds: this.dsAttachments,
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
