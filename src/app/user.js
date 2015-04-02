/**
 * The User module
 * @module user
 * @copyright CHECKROOM NV 2015
 */
define([
    'jquery',
    'base'],  /** @lends User */ function ($, Base) {

    var DEFAULTS = {
        name: '',
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
            fields: ['*']
        }, opt);
        Base.call(this, spec);

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
     * @method
     * @name User#isEmpty
     * @returns {boolean}
     */
    User.prototype.isEmpty = function() {
        // We check: name, role
        return (
            (Base.prototype.isEmpty.call(this)) &&
            (this.name==DEFAULTS.name) &&
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
            var active = (this.raw.active!=null) ? this.raw.active : DEFAULTS.active;
            return (
                (this.name!=name) ||
                (this.role!=role) ||
                (this.active!=active)
            );
        }
        return isDirty;
    };


    User.prototype._getDefaults = function() {
        return DEFAULTS;
    };

    /**
     * Writes the user to a json object
     * @param options
     * @returns {*}
     * @private
     */
    User.prototype._toJson = function(options) {
        var data = Base.prototype._toJson.call(this, options);
        data.name = this.name || DEFAULTS.name;
        data.role = this.role || DEFAULTS.role;
        data.active = this.active || DEFAULTS.active;
        return data;
    };

    /**
     * Reads the user from the json object
     * @param data
     * @param options
     * @returns {*}
     * @private
     */
    User.prototype._fromJson = function(data, options) {
        var that = this;
        return Base.prototype._fromJson.call(this, data, options)
            .then(function() {
                that.name = data.name || DEFAULTS.name;
                that.role = data.role || DEFAULTS.role;
                that.active = (data.active!=null) ? data.active : DEFAULTS.active;
                $.publish('user.fromJson', data);
                return data;
            });
    };

    return User;
    
});