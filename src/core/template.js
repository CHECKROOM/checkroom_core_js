/**
 * The Template module
 * @copyright CHECKROOM NV 2015
 * @module template
 */
define([
    'jquery',
    'common',
    'api',
    'document'],  /** @lends Document */ function ($, common, api, Document) {

    // Some constant values
    var DEFAULTS = {
        id: "",
        status: "inactive",
        name: "",
        subject: "",
        body: "",
        format: "",
        dialect: "",
        kind: "",
        width: 0.0,
        height: 0.0,
        unit: "inch",
        askSignature: false,
        system: true,
        createdBy: null,
        createdOn: null,
        modifiedBy: null,
        modifiedOn: null
    };

    // Allow overriding the ctor during inheritance
    // http://stackoverflow.com/questions/4152931/javascript-inheritance-call-super-constructor-or-use-prototype-chain
    var tmp = function(){};
    tmp.prototype = Document.prototype;

    /**
     * Template serves as a starting point for a document or asset label
     * @name  Template
     * @class
     * @property {string} name          the name
     * @property {string} status        the status
     * @property {string} subject       the subject (only for format `email`)
     * @property {string} body          the body (in html, text, ... depending on the `dialect`)
     * @property {string} format        the format (pdf, label, email)
     * @property {string} dialect       the dialect (text, html, dymo)
     * @property {string} kind          the kind of pdf (order, reservation, customer)
     * @property {boolean} askSignature should we ask for a signature when generating a pdf
     * @property {float} width          the width of the template
     * @property {float} height         the height of the template
     * @property {string} unit          this unit that is used for dimensions (mm, inch)
     * @property {boolean} system       is it a system template which cannot be changed?
     * @property {string} createdBy     the user that created the template (null for system templates)
     * @property {Moment} createdOn     when the template was created
     * @property {string} modifiedBy    the user that modified the template (null for system templates)
     * @property {Moment} modifiedOn    when the template was modified
     * @constructor
     * @extends Document
     */
    var Template = function(opt) {
        var spec = $.extend({}, opt);
        Document.call(this, spec);

        this.name = spec.name || DEFAULTS.name;
        this.status = spec.status || DEFAULTS.status;
        this.subject = spec.subject || DEFAULTS.subject;
        this.body = spec.body || DEFAULTS.body;
        this.format = spec.format || DEFAULTS.format;
        this.dialect = spec.dialect || DEFAULTS.dialect;
        this.kind = spec.kind || DEFAULTS.kind;
        this.askSignature = (spec.askSignature!=null) ? (spec.askSignature==true) : DEFAULTS.askSignature;
        this.width = spec.width || DEFAULTS.width;
        this.height = spec.height || DEFAULTS.height;
        this.unit = spec.unit || DEFAULTS.unit;
        this.system = (spec.system!=null) ? (spec.system==true) : DEFAULTS.system;
        this.createdBy = spec.createdBy || DEFAULTS.createdBy;
        this.createdOn = spec.createdOn || DEFAULTS.createdOn;
        this.modifiedBy = spec.modifiedBy || DEFAULTS.modifiedBy;
        this.modifiedOn = spec.modifiedOn || DEFAULTS.modifiedOn;
    };

    Template.prototype = new tmp();
    Template.prototype.constructor = Template;

    //
    // Specific validators
    /**
     * Checks if name is valid
     * @name Template#isValidName
     * @method
     * @return {Boolean}
     */
    Template.prototype.isValidName = function() {
        this.name = $.trim(this.name);
        return (this.name.length>=3);
    };
    
    //
    // Document overrides
    //
    /**
     * Checks if the template has any validation errors
     * @name Template#isValid
     * @method
     * @returns {boolean}
     * @override
     */
    Template.prototype.isValid = function() {
        // TODO: Check if the format, kind, etc is correct
        return this.isValidName();
    };

    Template.prototype._getDefaults = function() {
        return DEFAULTS;
    };

    /**
     * Checks if the object is empty, it never is
     * @name  Template#isEmpty
     * @method
     * @returns {boolean}
     * @override
     */
    Template.prototype.isEmpty = function() {
        return (
            (Document.prototype.isEmpty.call(this)) &&
                (this.name==DEFAULTS.name));
    };

    /**
     * Checks if the template is dirty and needs saving
     * @returns {boolean}
     * @override
     */
    Template.prototype.isDirty = function() {
        var isDirty = Document.prototype.isDirty.call(this);
        if( (!isDirty) &&
            (this.raw)) {
            isDirty = (
                (this.name!=this.raw.name)||
                (this.subject!=this.raw.subject)||
                (this.body!=this.raw.body)||
                (this.format!=this.raw.format)||
                (this.dialect!=this.raw.dialect)||
                (this.kind!=this.raw.kind)||
                (this.askSignature!=this.raw.askSignature)||
                (this.width!=this.raw.width)||
                (this.height!=this.raw.height)||
                (this.unit!=this.raw.unit));
        }
        return isDirty;
    };

    //
    // Business logic
    //
    /**
     * Clones the template to a new one
     * @name Template#clone
     * @returns {promise}
     */
    Template.prototype.clone = function() {
        return this.ds.call(this.id, "clone");
    };

    /**
     * Archives this template
     * @name Template#archive
     * @returns {promise}
     */
    Template.prototype.archive = function() {
        return this.ds.call(this.id, "archive");
    };

    /**
     * Unarchives this template
     * @name Template#undoArchive
     * @returns {promise}
     */
    Template.prototype.undoArchive = function() {
        return this.ds.call(this.id, "undoArchive");
    };

    /**
     * Activates this template
     * @name Template#activate
     * @returns {promise}
     */
    Template.prototype.activate = function() {
        return this.ds.call(this.id, "activate");
    };

    /**
     * Deactivates this template
     * @name Template#deactivate
     * @returns {promise}
     */
    Template.prototype.deactivate = function() {
        return this.ds.call(this.id, "deactivate");
    };

    /**
     * Checks if we can delete the Template document
     * @name  Template#canDelete
     * @method
     * @returns {boolean}
     * @override
     */
    Template.prototype.canDelete = function() {
        return (!this.system);
    };

    /**
     * Checks if we can activate a template
     * @name Template#canActivate
     * @returns {boolean}
     */
    Template.prototype.canActivate = function() {
        return (this.status=="inactive");
    };

    /**
     * Checks if we can deactivate a template
     * @name Template#canDeactivate
     * @returns {boolean}
     */
    Template.prototype.canDeactivate = function() {
        return (this.status=="active");
    };

    /**
     * Checks if we can archive a template
     * @name Template#canArchive
     * @returns {boolean}
     */
    Template.prototype.canArchive = function() {
        return (this.status!="archived");
    };

    /**
     * Checks if we can undoArchive a template
     * @name Template#canUndoArchive
     * @returns {boolean}
     */
    Template.prototype.canUndoArchive = function() {
        return (this.status=="archived");
    };

    // toJson, fromJson
    // ----

    /**
     * _toJson, makes a dict of params to use during create / update
     * @param options
     * @returns {{}}
     * @private
     */
    Template.prototype._toJson = function(options) {
        var data = Document.prototype._toJson.call(this, options);
        data.name = this.name;
        data.subject = this.subject;
        data.body = this.body;
        data.format = this.format;
        data.dialect = this.dialect;
        data.kind = this.kind;
        data.askSignature = this.askSignature;
        data.width = this.width;
        data.height = this.height;
        data.unit = this.unit;
        // don't write out fields for:
        // - status
        // - system
        // - created, modified
        return data;
    };

    /**
     * _fromJson: read some basic information
     * @method
     * @param {object} data the json response
     * @param {object} options dict
     * @returns {Promise}
     * @private
     */
    Template.prototype._fromJson = function(data, options) {
        var that = this;
        return Document.prototype._fromJson.call(this, data, options)
            .then(function() {
                that.name = data.name || DEFAULTS.name;
                that.subject = data.subject || DEFAULTS.subject;
                that.body = data.body || DEFAULTS.body;
                that.format = data.format || DEFAULTS.format;
                that.dialect = data.dialect || DEFAULTS.dialect;
                that.kind = data.kind || DEFAULTS.kind;
                that.askSignature = (data.askSignature!=null) ? (data.askSignature==true) : DEFAULTS.askSignature;
                that.width = data.width || DEFAULTS.width;
                that.height = data.height || DEFAULTS.height;
                that.unit = data.unit || DEFAULTS.unit;
                that.system = (data.system!=null) ? (data.system==true) : DEFAULTS.system;
                that.createdBy = data.createdBy || DEFAULTS.createdBy;
                that.createdOn = data.createdOn || DEFAULTS.createdOn;
                that.modifiedBy = data.modifiedBy || DEFAULTS.modifiedBy;
                that.modifiedOn = data.modifiedOn || DEFAULTS.modifiedOn;
                return data;
            });
    };

    return Template;

});
