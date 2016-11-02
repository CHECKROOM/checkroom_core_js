/**
 * The Attachment module
 * an Attachment class inheriting from KeyValue
 * @module attachment
 * @copyright CHECKROOM NV 2015
 */
define(['jquery'], /** Attachment */ function ($) {

    var EXT = /(?:\.([^.]+))?$/;
    var IMAGES = ['jpg', 'jpeg', 'png'];
    var PREVIEWS = ['jpg', 'jpeg', 'png', 'doc', 'docx', 'pdf'];
    var DEFAULTS = {
        fileName: '',
        fileSize: 0,
        isCover: false,
        canBeCover: true
    };

    /**
     * @name  Attachment
     * @class
     * @property {ApiDataSource} ds    attachments datasource
     * @property {bool} isCover        is this the cover image of a document
     * @property {bool} canBeCover     can this attachment be the cover of a document?
     * @constructor
     */
    var Attachment = function(spec) {
        spec = spec || {};
        this.ds = spec.ds;
        this.raw = null; // the raw json object

        this.fileName = spec.fileName || DEFAULTS.fileName;
        this.fileSize = spec.fileSize || DEFAULTS.fileSize;
        this.value = spec.value || DEFAULTS.value;
        this.created = spec.created || DEFAULTS.created;
        this.by = spec.by || DEFAULTS.by;
        this.isCover = (spec.isCover!=null) ? spec.isCover : DEFAULTS.isCover;
        this.canBeCover = (spec.canBeCover!=null) ? spec.canBeCover : DEFAULTS.canBeCover;
    };

    /**
     * Gets the url of a thumbnail
     * "XS": 32,
     * "S": 64,
     * "M": 128,
     * "L": 256,
     * "XL": 512
     * "orig": original size
     * @name Attachment#getThumbnailUrl
     * @method
     * @param size
     * @returns {string}
     */
    Attachment.prototype.getThumbnailUrl = function(size) {
        return (this.hasPreview()) ? this.helper.getImageUrl(this.ds, this.value, size || 'S') : "";
    };

    /**
     * Gets the url where the attachment can be downloaded
     * @name Attachment#getDownloadUrl
     * @method
     * @returns {string}
     */
    Attachment.prototype.getDownloadUrl = function() {
        return this.ds.getBaseUrl() + this.value + '?download=True';
    };

    /**
     * Gets the extension part of a filename
     * @name  Attachment#getExt
     * @method
     * @param fileName
     * @returns {string}
     */
    Attachment.prototype.getExt = function(fileName) {
        fileName = fileName || this.fileName;
        return EXT.exec(fileName)[1] || "";
    };

    /**
     * Checks if the attachment is an image
     * @name  Attachment#isImage
     * @method
     * @returns {boolean}
     */
    Attachment.prototype.isImage = function() {
        var ext = this.getExt(this.fileName);
        return ($.inArray(ext, IMAGES) >= 0);
    };

    /**
     * Checks if the attachment has a preview
     * @name  Attachment#hasPreview
     * @method
     * @returns {boolean}
     */
    Attachment.prototype.hasPreview = function() {
        var ext = this.getExt(this.fileName);
        return ($.inArray(ext, PREVIEWS) >= 0);
    };

    /**
     * _toJson, makes a dict of the object
     * @method
     * @param options
     * @returns {object}
     * @private
     */
    Attachment.prototype._toJson = function(options) {
        return {
            fileName: this.fileName,
            fileSize: this.fileSize,
            value: this.value,
            created: this.created,
            by: this.by
        };
    };

    /**
     * _fromJson: reads the Attachment object from json
     * @method
     * @param {object} data the json response
     * @param {object} options dict
     * @returns promise
     * @private
     */
    Attachment.prototype._fromJson = function(data, options) {
        this.raw = data;
        this.fileName = data.fileName || DEFAULTS.fileName;
        this.fileSize = data.fileSize || DEFAULTS.fileSize;
        this.value = data.value || DEFAULTS.value;
        this.created = data.created || DEFAULTS.created;
        this.by = data.by || DEFAULTS.by;
        return $.Deferred().resolve(data);
    };

    return Attachment;
});