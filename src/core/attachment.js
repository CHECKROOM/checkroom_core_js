/**
 * The Attachment module
 * an Attachment class inheriting from KeyValue
 * @module attachment
 * @copyright CHECKROOM NV 2015
 */
define([
    'jquery',
    'helper',
    'keyvalue'], /** @lends Attachment */ function ($, Helper, KeyValue) {

    var EXT = /(?:\.([^.]+))?$/;
    var IMAGES = ['jpg', 'png'];
    var PREVIEWS = ['jpg', 'png', 'doc', 'docx', 'pdf'];
    var DEFAULTS = {
        isCover: false,
        canBeCover: true
    };

    // Allow overriding the ctor during inheritance
    // http://stackoverflow.com/questions/4152931/javascript-inheritance-call-super-constructor-or-use-prototype-chain
    var tmp = function() {};
    tmp.prototype = KeyValue.prototype;

    /**
     * @name  Attachment
     * @class
     * @property {bool} isCover        is this the cover image of a document
     * @property {bool} canBeCover     can this attachment be the cover of a document?
     * @constructor
     * @extends KeyValue
     */
    var Attachment = function(spec) {
        KeyValue.call(this, spec);

        this.ds = spec.ds;
        this.isCover = (spec.isCover!=null) ? spec.isCover : DEFAULTS.isCover;
        this.canBeCover = (spec.canBeCover!=null) ? spec.canBeCover : DEFAULTS.canBeCover;
    };

    Attachment.prototype = new tmp();
    Attachment.prototype.constructor = Attachment;

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
        return (this.hasPreview()) ? new Helper().getImageUrl(this.ds, this.id, size || 'S') : "";
    };

    /**
     * Gets the url where the attachment can be downloaded
     * @name Attachment#getDownloadUrl
     * @method
     * @returns {string}
     */
    Attachment.prototype.getDownloadUrl = function() {
        return this.ds.getBaseUrl() + this.id + '?download=True';
    };

    /**
     * Gets the extension part of a filename
     * @name  Attachment#getExt
     * @method
     * @param name
     * @returns {string}
     */
    Attachment.prototype.getExt = function(name) {
        name = name || this.getName();
        return EXT.exec(name)[1] || "";
    };

    /**
     * Checks if the attachment is an image
     * @name  Attachment#isImage
     * @method
     * @returns {boolean}
     */
    Attachment.prototype.isImage = function() {
        var name = this.getName();
        var ext = this.getExt(name);
        return ($.inArray(ext, IMAGES) >= 0);
    };

    /**
     * Checks if the attachment has a preview
     * @name  Attachment#hasPreview
     * @method
     * @returns {boolean}
     */
    Attachment.prototype.hasPreview = function() {
        var name = this.getName();
        var ext = this.getExt(name);
        return ($.inArray(ext, PREVIEWS) >= 0);
    };

    return Attachment;
});