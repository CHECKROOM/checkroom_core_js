/**
 * The Contact module
 * Contact class inherits from Base so it supports KeyValues (Attachment, Comment)
 * @module contact
 * @copyright CHECKROOM NV 2015
 */
define([
    'jquery',
    'base',
    'helper'], /** @lends Contact */ function ($, Base, Helper) {

    var DEFAULTS = {
        name: "",
        company: "",
        phone: "",
        email: ""
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
            fields: ['*'],
            crtype: 'cheqroom.types.customer'
        }, opt);
        Base.call(this, spec);

        this.name = spec.name || DEFAULTS.name;
        this.company = spec.company || DEFAULTS.company;
        this.phone = spec.phone || DEFAULTS.phone;
        this.email = spec.email || DEFAULTS.email;
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
     * Checks if company is valid
     * @name  Contact#isValidCompany
     * @method
     * @return {Boolean} [description]
     */
    Contact.prototype.isValidCompany = function() {
        this.company = $.trim(this.company);
        return (this.company.length>=3);
    };

    /**
     * Checks if phone is valid
     * @name  Contact#isValidPhone
     * @method
     * @return {Boolean} [description]
     */
    Contact.prototype.isValidPhone = function() {
        this.phone = $.trim(this.phone);
        return new Helper().isValidPhone(this.phone);
    };

    /**
     * Check is email is valid
     * @name  Contact#isValidEmail
     * @method
     * @return {Boolean} [description]
     */
    Contact.prototype.isValidEmail = function() {
        this.email = $.trim(this.email);
        return new Helper().isValidEmail(this.email);
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
        return this.isValidName() &&
            this.isValidCompany() &&
            this.isValidPhone() &&
            this.isValidEmail();
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
                (this.company==DEFAULTS.company) &&
                (this.phone==DEFAULTS.phone) &&
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
            isDirty = (
                (this.name!=this.raw.name)||
                    (this.company!=this.raw.company)||
                    (this.phone!=this.raw.phone)||
                    (this.email!=this.raw.email)
                );
        }
        return isDirty;
    };

    Contact.prototype._getDefaults = function() {
        return DEFAULTS;
    };

    Contact.prototype._toJson = function(options) {
        var data = Base.prototype._toJson.call(this, options);
        data.name = this.name || DEFAULTS.name;
        data.company = this.company || DEFAULTS.company;
        data.phone = this.phone || DEFAULTS.phone;
        data.email = this.email || DEFAULTS.email;
        return data;
    };

    Contact.prototype._fromJson = function(data, options) {
        var that = this;
        return Base.prototype._fromJson.call(this, data, options)
            .then(function(data) {
                that.name = data.name || DEFAULTS.name;
                that.company = data.company || DEFAULTS.company;
                that.phone = data.phone || DEFAULTS.phone;
                that.email = data.email || DEFAULTS.email;
                $.publish('contact.fromJson', data);
                return data;
            });
    };

    return Contact;

});