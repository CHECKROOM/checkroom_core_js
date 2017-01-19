/**
 * The Contact module
 * Contact class inherits from Base so it supports KeyValues (Attachment, Comment)
 * @module contact
 * @copyright CHECKROOM NV 2015
 */
define([
    'jquery',
    'base',
    'common',
    'user'], /** @lends Contact */ function ($, Base, common, User) {

    var DEFAULTS = {
        name: "",
        email: "",
        status: "active",
        user: {},
        kind: "contact"
    };

    // Allow overriding the ctor during inheritance
    // http://stackoverflow.com/questions/4152931/javascript-inheritance-call-super-constructor-or-use-prototype-chain
    var tmp = function() {};
    tmp.prototype = Base.prototype;

    /**
     * Contact class
     * @name  Contact
     * @class
     * @constructor
     * @extends Base
     */
    var Contact = function(opt) {
        var spec = $.extend({
            _fields: ['*'],
            crtype: 'cheqroom.types.customer'
        }, opt);
        Base.call(this, spec);

        this.name = spec.name || DEFAULTS.name;
        this.email = spec.email || DEFAULTS.email;
        this.status = spec.status || DEFAULTS.status;
        this.user = spec.user || DEFAULTS.user;
        this.kind = spec.kind || DEFAULTS.kind;
    };

    Contact.prototype = new tmp();
    Contact.prototype.constructor = Contact;

    //
    // Specific validators
    /**
     * Checks if name is valid
     * @name Contact#isValidName
     * @method
     * @return {Boolean} [description]
     */
    Contact.prototype.isValidName = function() {
        this.name = $.trim(this.name);
        return (this.name.length>=3);
    };

    /**
     * Check is email is valid
     * @name  Contact#isValidEmail
     * @method
     * @return {Boolean} [description]
     */
    Contact.prototype.isValidEmail = function() {
        this.email = $.trim(this.email);
        return common.isValidEmail(this.email);
    };

    //
    // Business logic
    //
    /**
     * Checks if a contact can be used in a reservation (based on status)
     * @name Contact#canReserve
     * @returns {boolean}
     */
    Contact.prototype.canReserve = function() {
        return (this.status=="active");
    };

    /**
     * Checks if a contact can be used in a checkout (based on status)
     * @name Contact#canCheckout
     * @returns {boolean}
     */
    Contact.prototype.canCheckout = function() {
        return (this.status=="active");
    };

    /**
     * Checks if a contact can be archived (based on status)
     * @name Contact#canArchive
     * @returns {boolean}
     */
    Contact.prototype.canArchive = function() {
        return (this.status=="active");
    };

    /**
     * Checks if a contact can be unarchived (based on status)
     * @name Contact#canUndoArchive
     * @returns {boolean}
     */
    Contact.prototype.canUndoArchive = function() {
        return (this.status=="archived");
    };

    /**
     * Checks if we can generate a document for this contact (based on status)
     * @name Contact#canGenerateDocument
     * @returns {boolean}
     */
    Contact.prototype.canGenerateDocument = function() {
        return (this.status=="active");
    };

    /**
     * Archive a contact
     * @name Contact#archive
     * @param skipRead
     * @returns {promise}
     */
    Contact.prototype.archive = function(skipRead) {
        return this.ds.call(this.id, 'archive', {}, skipRead);
    };

    /**
     * Undo archive of a contact
     * @name Contact#undoArchive
     * @param skipRead
     * @returns {promise}
     */
    Contact.prototype.undoArchive = function(skipRead) {
        return this.ds.call(this.id, 'undoArchive', {}, skipRead);
    };

    /**
     * Generates a PDF document for the reservation
     * @method
     * @name Contact#generateDocument
     * @param {string} template id
     * @param {bool} skipRead
     * @returns {promise}
     */
    Contact.prototype.generateDocument = function(template, skipRead) {
        return this._doApiCall({method: "generateDocument", params: {template: template}, skipRead: skipRead});
    };

    //
    // Base overrides
    //

    /**
     * Checks if the contact has any validation errors
     * @name Contact#isValid
     * @method
     * @returns {boolean}
     * @override
     */
    Contact.prototype.isValid = function() {
        return this.isValidName() && this.isValidEmail();
    };

    /**
     * Checks if the contact is empty
     * @returns {boolean}
     * @override
     */
    Contact.prototype.isEmpty = function() {
        return (
            (Base.prototype.isEmpty.call(this)) &&
                (this.name==DEFAULTS.name) &&
                (this.email==DEFAULTS.email));
    };

    /**
     * Checks if the contact is dirty and needs saving
     * @returns {boolean}
     * @override
     */
    Contact.prototype.isDirty = function() {
        var isDirty = Base.prototype.isDirty.call(this);
        if( (!isDirty) &&
            (this.raw)) {
            isDirty = this._isDirtyStringProperty("name") || this._isDirtyStringProperty("email");
        }
        return isDirty;
    };

    Contact.prototype._getDefaults = function() {
        return DEFAULTS;
    };

    Contact.prototype._toJson = function(options) {
        var data = Base.prototype._toJson.call(this, options);
        data.name = this.name || DEFAULTS.name;
        data.email = this.email || DEFAULTS.email;
        return data;
    };

    Contact.prototype._fromJson = function(data, options) {
        var that = this;
        return Base.prototype._fromJson.call(this, data, options)
            .then(function(data) {
                that.name = data.name || DEFAULTS.name;
                that.email = data.email || DEFAULTS.email;
                that.status = data.status || DEFAULTS.status;
                that.user = data.user || DEFAULTS.user;
                that.kind = data.kind || DEFAULTS.kind;
                
                $.publish('contact.fromJson', data);
                return data;
            });
    };

    Contact.prototype._create = function(skipRead) {
        // We override create because we also want
        // to set possible `fields` during the `create` command
        var that = this,
            data = $.extend({}, this._toJson(), this._toJsonFields());

        delete data.id;

        return this.ds.create(data, this._fields)
            .then(function(data) {
                return (skipRead==true) ? data : that._fromJson(data);
            });
    };

    return Contact;

});