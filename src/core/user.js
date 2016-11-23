/**
 * The User module
 * @module user
 * @copyright CHECKROOM NV 2015
 */
define([
    'jquery',
    'base',
    'common'],  /** @lends User */ function ($, Base, common) {

    var DEFAULTS = {
        name: '',
        email: '',
        group: '',  // groupid
        picture: '',
        role: 'user',  // user, admin
        active: true
    };

    // Allow overriding the ctor during inheritance
    // http://stackoverflow.com/questions/4152931/javascript-inheritance-call-super-constructor-or-use-prototype-chain
    var tmp = function() {};
    tmp.prototype = Base.prototype;

    /**
     * @name User
     * @class User
     * @constructor
     * @extends Base
     * @property {string}  name               - The name
     * @property {string}  role               - The role (admin, user)
     * @property {boolean} active             - Is the user active?
     */
    var User = function(opt) {
        var spec = $.extend({
            _fields: ['*', 'group', 'picture']
        }, opt);
        Base.call(this, spec);

        this.helper = spec.helper;

        /*
        from API:

        login = StringField(primary_key=True, min_length=4)
        role = StringField(required=True, choices=USER_ROLE)
        group = ReferenceField(Group)
        password = StringField(min_length=4)
        name = StringField(min_length=4)
        email = EmailField(required=True, unique=True)
        lastLogin = DateTimeField()
        profile = EmbeddedDocumentField(UserProfile)
        active = BooleanField(default=True)
        picture = ReferenceField(Attachment)
        timezone = StringField(default="Etc/GMT")  # stored as
        */

        this.name = spec.name || DEFAULTS.name;
        this.picture = spec.picture || DEFAULTS.picture;
        this.email = spec.email || DEFAULTS.email;
        this.role = spec.role || DEFAULTS.role;
        this.group = spec.group || DEFAULTS.group;
        this.active = (spec.active!=null) ? spec.active : DEFAULTS.active;
    };

    User.prototype = new tmp();
    User.prototype.constructor = User;

    //
    // Document overrides
    //
    User.prototype.isValidName = function() {
        this.name = $.trim(this.name);
        return (this.name.length>=4);
    };

    User.prototype.isValidEmail = function() {
        this.email = $.trim(this.email);
        return common.isValidEmail(this.email);
    };

    User.prototype.isValidRole = function() {
        switch(this.role) {
            case "user":
            case "admin":
            case "root":
            case "selfservice":
                return true;
            default:
                return false;
        }
    };

    User.prototype.isValidPassword = function() {
        this.password = $.trim(this.password);
        var length = this.password.length;
        var hasDigit = this.password.match(/[0-9]/);
        return (length>=4) && (hasDigit);
    };

    /**
     * Checks if the user is valid
     * @returns {boolean}
     */
    User.prototype.isValid = function() {
        return (
            this.isValidName() &&
            this.isValidEmail() &&
            this.isValidRole());
    };

    /**
     * Checks if the user is empty
     * @method
     * @name User#isEmpty
     * @returns {boolean}
     */
    User.prototype.isEmpty = function() {
        // We check: name, role
        return (
            (Base.prototype.isEmpty.call(this)) &&
            (this.name==DEFAULTS.name) &&
            (this.email==DEFAULTS.email) &&
            (this.role==DEFAULTS.role));
    };

    /**
     * Checks if the user is dirty and needs saving
     * @method
     * @name User#isDirty
     * @returns {boolean}
     */
    User.prototype.isDirty = function() {
        var isDirty = Base.prototype.isDirty.call(this);
        if( (!isDirty) &&
            (this.raw)) {
            var name = this.raw.name || DEFAULTS.name;
            var role = this.raw.role || DEFAULTS.role;
            var email = this.raw.email || DEFAULTS.email;
            var active = (this.raw.active!=null) ? this.raw.active : DEFAULTS.active;
            return (
                (this.name!=name) ||
                (this.email!=email) ||
                (this.role!=role) ||
                (this.active!=active)
            );
        }
        return isDirty;
    };

    /**
     * Gets an url for a user avatar
     * 'XS': (64, 64),
     * 'S': (128, 128),
     * 'M': (256, 256),
     * 'L': (512, 512)
     * @param size {string} default null is original size
     * @param bustCache {boolean}
     * @returns {string}
     */
    User.prototype.getImageUrl = function(size, bustCache) {
        return (
            (this.picture!=null) &&
            (this.picture.length>0)) ?
            this.helper.getImageCDNUrl(this.group, this.picture, size, bustCache) :
            this.helper.getImageUrl(this.ds, this.id, size, bustCache);
    };

    User.prototype._getDefaults = function() {
        return DEFAULTS;
    };

    // OVERRIDE BASE: addKeyValue not implemented
    User.prototype.addKeyValue = function(key, value, kind, skipRead) {
        return $.Deferred().reject("Not implemented for User, use setPicture instead?");
    };

    // OVERRIDE BASE: addKeyValue not implemented
    User.prototype.addKeyValue = function(id, key, value, kind, skipRead) {
        return $.Deferred().reject("Not implemented for User, use setPicture instead?");
    };

    // OVERRIDE BASE: removeKeyValue not implemented
    User.prototype.removeKeyValue = function(id, skipRead) {
        return $.Deferred().reject("Not implemented for User, use clearPicture instead?");
    };

    User.prototype.setPicture = function(attachmentId, skipRead) {
        if (!this.existsInDb()) {
            return $.Deferred().reject("User does not exist in database");
        }
        this.picture = attachmentId;
        return this._doApiCall({
            method: 'setPicture',
            params: {attachment: attachmentId},
            skipRead: skipRead
        });
    };

    User.prototype.clearPicture = function(skipRead) {
        if (!this.existsInDb()) {
            return $.Deferred().reject("User does not exist in database");
        }
        return this._doApiCall({
            method: 'clearPicture',
            skipRead: skipRead
        });
    };

    /**
     * Writes the user to a json object
     * @param options
     * @returns {object}
     * @private
     */
    User.prototype._toJson = function(options) {
        var data = Base.prototype._toJson.call(this, options);
        data.name = this.name || DEFAULTS.name;
        data.email = this.email || DEFAULTS.email;
        data.group = this.group || DEFAULTS.group;
        data.role = this.role || DEFAULTS.role;
        data.active = this.active || DEFAULTS.active;
        return data;
    };

    /**
     * Reads the user from the json object
     * @param data
     * @param options
     * @returns {promise}
     * @private
     */
    User.prototype._fromJson = function(data, options) {
        var that = this;
        return Base.prototype._fromJson.call(this, data, options)
            .then(function() {
                // Read the group id from group or group._id
                // depending on the fields
                that.group = ((data.group) && (data.group._id!=null)) ? data.group._id : (data.group || DEFAULTS.group);
                that.name = data.name || DEFAULTS.name;
                that.picture = data.picture || DEFAULTS.picture;
                that.email = data.email || DEFAULTS.email;
                that.role = data.role || DEFAULTS.role;
                that.active = (data.active!=null) ? data.active : DEFAULTS.active;
                $.publish('user.fromJson', data);
                return data;
            });
    };

    return User;
    
});