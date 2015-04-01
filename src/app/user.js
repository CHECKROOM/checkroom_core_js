/**
 * The User module
 * @module user
 * @copyright CHECKROOM NV 2015
 */
define([
    'jquery',
    'base'], function ($, Base) {

    var DEFAULTS = {
        name: '',
        email: '',
        group: '',  // groupid
        role: 'user',  // user, admin
        active: true
    };

    // Allow overriding the ctor during inheritance
    // http://stackoverflow.com/questions/4152931/javascript-inheritance-call-super-constructor-or-use-prototype-chain
    var tmp = function() {};
    tmp.prototype = Base.prototype;

    /**
     * @class User
     * @constructor
     * @extends Base
     */
    var User = function(opt) {
        var spec = $.extend({
            fields: ['*','group']
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
        this.email = spec.email || DEFAULTS.email;
        this.role = spec.role || DEFAULTS.role;
        this.active = (spec.active!=null) ? spec.active : DEFAULTS.active;
    };

    User.prototype = new tmp();
    User.prototype.constructor = User;

    //
    // Document overrides
    //

    /**
     * Checks if the user is empty
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
            this.helper.getImageCDNUrl({}, "groupid", this.picture, size, bustCache) :
            this.helper.getImageUrl(this.ds, this.id, size, bustCache);
    };

    User.prototype._getDefaults = function() {
        return DEFAULTS;
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
                that.email = data.email || DEFAULTS.email;
                that.role = data.role || DEFAULTS.role;
                that.active = (data.active!=null) ? data.active : DEFAULTS.active;
                $.publish('user.fromJson', data);
                return data;
            });
    };

    return User;
    
});