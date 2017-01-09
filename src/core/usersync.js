/**
 * The UserSync module
 * @module usersync
 * @copyright CHECKROOM NV 2017
 */
define([
    'jquery',
    'base',
    'common'],  /** @lends UserSync */ function ($, Base, common) {

    var DEFAULTS = {
        kind: "ldap",
        name: "",
        enabled: false,
        host: "ldap://yourdomain.com",
        port: 389,
        timeOut: 10,
        login: "",
        password: "",
        newUsers: "ignore",
        existingUsers: "ignore",
        missingUsers: "ignore",
        autoSync: false,
        role: "selfservice",
        query: "(cn=*)",
        base: "ou=team,dc=yourdomain,dc=com",
        loginField: "uid",
        nameField: "cn",
        emailField: "mail"
    };

    // Allow overriding the ctor during inheritance
    // http://stackoverflow.com/questions/4152931/javascript-inheritance-call-super-constructor-or-use-prototype-chain
    var tmp = function() {};
    tmp.prototype = Base.prototype;

    /**
     * @name UserSync
     * @class UserSync
     * @constructor
     * @extends Base
     * @property {string} kind                  - The kind
     * @property {string} name                  - The name
     * @property {boolean} enabled              - Is the usersync active?
     * @property {string} host                  - The url of the host
     * @property {int} port                     - The port number
     * @property {int} timeOut                  - The timeOut in seconds
     * @property {string} login                 - The login for the host
     * @property {string} password              - The password for the host
     * @property {string} newUsers              - What to with new Users (ignore, create)
     * @property {string} existingUsers         - What to with existing Users (ignore, update)
     * @property {string} missingUsers          - What to with missing Users (ignore, archive, deactivate)
     * @property {boolean} autoSync             - Do a nightly sync automatically?
     * @property {string} role                  - Sync users under which role? (selfservice, user, admin)
     * @property {string} query                 - The query
     * @property {string} base                  - The base
     * @property {string} loginField            - The loginField
     * @property {string} nameField             - The nameField
     * @property {string} emailField            - The emailField
     */
    var UserSync = function(opt) {
        var spec = $.extend({
            _fields: ['*']
        }, opt);
        Base.call(this, spec);

        this.helper = spec.helper;

        this.kind = spec.kind || DEFAULTS.kind;
        this.name = spec.name || DEFAULTS.name;
        this.enabled = (spec.enabled!=null) ? spec.enabled : DEFAULTS.enabled;
        this.host = spec.host || DEFAULTS.host;
        this.port = spec.port || DEFAULTS.port;
        this.timeOut = spec.timeOut || DEFAULTS.timeOut;
        this.login = spec.login || DEFAULTS.login;
        this.password = spec.password || DEFAULTS.password;
        this.newUsers = spec.newUsers || DEFAULTS.newUsers;
        this.existingUsers = spec.existingUsers || DEFAULTS.existingUsers;
        this.missingUsers = spec.missingUsers || DEFAULTS.missingUsers;
        this.autoSync = (spec.autoSync!=null) ? spec.autoSync : DEFAULTS.autoSync;
        this.role = spec.role || DEFAULTS.role;
        this.query = spec.query || DEFAULTS.query;
        this.base = spec.base || DEFAULTS.base;
        this.loginField = spec.loginField || DEFAULTS.loginField;
        this.nameField = spec.nameField || DEFAULTS.nameField;
        this.emailField = spec.emailField || DEFAULTS.emailField;
    };

    UserSync.prototype = new tmp();
    UserSync.prototype.constructor = UserSync;

    //
    // Document overrides
    //
    UserSync.prototype.isValidName = function() {
        this.name = $.trim(this.name);
        return (this.name.length>=3);
    };

    UserSync.prototype.isValidRole = function() {
        switch(this.role) {
            case "user":
            case "admin":
            case "selfservice":
                return true;
            default:
                return false;
        }
    };

    /**
     * Checks if the usersync is valid
     * @method
     * @name UserSync#isValid
     * @returns {boolean}
     */
    UserSync.prototype.isValid = function() {
        return (
            this.isValidName() &&
            this.isValidRole());
    };

    /**
     * Checks if the user is empty
     * @method
     * @name UserSync#isEmpty
     * @returns {boolean}
     */
    UserSync.prototype.isEmpty = function() {
        return (
            (Base.prototype.isEmpty.call(this)) &&
            (this.kind==DEFAULTS.kind) &&
            (this.name==DEFAULTS.name) &&
            (this.enabled==DEFAULTS.enabled) &&
            (this.host==DEFAULTS.host) &&
            (this.port==DEFAULTS.port) &&
            (this.timeOut==DEFAULTS.timeOut) &&
            (this.login==DEFAULTS.login) &&
            (this.password==DEFAULTS.password) &&
            (this.newUsers==DEFAULTS.newUsers) &&
            (this.existsingUsers==DEFAULTS.existingUsers) &&
            (this.missingUsers==DEFAULTS.missingUsers) &&
            (this.autoSync==DEFAULTS.autoSync) &&
            (this.role==DEFAULTS.role) &&
            (this.query==DEFAULTS.query) &&
            (this.base==DEFAULTS.base) &&
            (this.loginField==DEFAULTS.loginField) &&
            (this.nameField==DEFAULTS.nameField) &&
            (this.emailField==DEFAULTS.emailField));
    };

    /**
     * Checks if the user is dirty and needs saving
     * @method
     * @name UserSync#isDirty
     * @returns {boolean}
     */
    UserSync.prototype.isDirty = function() {
        var isDirty = Base.prototype.isDirty.call(this);
        if( (!isDirty) &&
            (this.raw)) {
            var kind = this.raw.kind || DEFAULTS.kind;
            var name = this.raw.name || DEFAULTS.name;
            var enabled = (this.raw.enabled!=null) ? this.raw.enabled : DEFAULTS.enabled;
            var host = this.raw.host || DEFAULTS.host;
            var port = this.raw.port || DEFAULTS.port;
            var timeOut = this.raw.timeOut || DEFAULTS.timeOut;
            var login = this.raw.login || DEFAULTS.login;
            var password = this.raw.password || DEFAULTS.password;
            var newUsers = this.raw.newUsers || DEFAULTS.newUsers;
            var existingUsers = this.raw.existingUsers || DEFAULTS.existingUsers;
            var missingUsers = this.raw.missingUsers || DEFAULTS.missingUsers;
            var autoSync = (this.raw.autoSync!=null) ? this.raw.autoSync : DEFAULTS.autoSync;
            var role = this.raw.role || DEFAULTS.role;
            var query = this.raw.query || DEFAULTS.query;
            var base = this.raw.base || DEFAULTS.base;
            var loginField = this.raw.loginField || DEFAULTS.loginField;
            var nameField = this.raw.nameField || DEFAULTS.nameField;
            var emailField = this.raw.emailField || DEFAULTS.emailField;
            return (
                (this.kind!=kind) ||
                (this.name!=name) ||
                (this.enabled!=enabled) ||
                (this.host!=host) ||
                (this.port!=port) ||
                (this.timeOut!=timeOut) ||
                (this.login!=login) ||
                (this.password!=password) ||
                (this.newUsers!=newUsers) ||
                (this.existingUsers!=existingUsers) ||
                (this.missingUsers!=missingUsers) ||
                (this.autoSync!=autoSync) ||
                (this.role!=role) ||
                (this.query!=query) ||
                (this.base!=base) ||
                (this.loginField!=loginField) ||
                (this.nameField!=nameField) ||
                (this.emailField!=emailField)
            );
        }
        return isDirty;
    };

    UserSync.prototype._getDefaults = function() {
        return DEFAULTS;
    };
    
    //
    // Business logic
    //
    /**
     * Clones the template to a new one
     * @name UserSync#clone
     * @returns {promise}
     */
    UserSync.prototype.clone = function() {
        return this.ds.call(this.id, "clone");
    };
    
    /**
     * Writes the usersync to a json object
     * @param options
     * @returns {object}
     * @private
     */
    UserSync.prototype._toJson = function(options) {
        var data = Base.prototype._toJson.call(this, options);
        data.kind = this.kind || DEFAULTS.kind;
        data.name = this.name || DEFAULTS.name;
        data.enabled = (this.enabled!=null) ? this.enabled : DEFAULTS.enabled;
        data.host = this.host || DEFAULTS.host;
        data.port = this.port || DEFAULTS.port;
        data.timeOut = this.timeOut || DEFAULTS.timeOut;
        data.login = this.login || DEFAULTS.login;
        data.password = this.password || DEFAULTS.password;
        data.newUsers = this.newUsers || DEFAULTS.newUsers;
        data.existingUsers = this.existingUsers || DEFAULTS.existingUsers;
        data.missingUsers = this.missingUsers || DEFAULTS.missingUsers;
        data.autoSync = (this.autoSync!=null) ? this.autoSync : DEFAULTS.autoSync;
        data.role = this.role || DEFAULTS.role;
        data.query = this.query || DEFAULTS.query;
        data.base = this.base || DEFAULTS.base;
        data.loginField = this.loginField || DEFAULTS.loginField;
        data.nameField = this.nameField || DEFAULTS.nameField;
        data.emailField = this.emailField || DEFAULTS.emailField;
        return data;
    };

    /**
     * Reads the usersync from the json object
     * @param data
     * @param options
     * @returns {promise}
     * @private
     */
    UserSync.prototype._fromJson = function(data, options) {
        var that = this;
        return Base.prototype._fromJson.call(this, data, options)
            .then(function() {
                // Read the group id from group or group._id
                // depending on the fields
                that.kind = data.kind || DEFAULTS.kind;
                that.name = data.name || DEFAULTS.name;
                that.enabled = (data.enabled!=null) ? data.enabled : DEFAULTS.enabled;
                that.host = data.host || DEFAULTS.host;
                that.port = data.port || DEFAULTS.port;
                that.timeOut = data.timeOut || DEFAULTS.timeOut;
                that.login = data.login || DEFAULTS.login;
                that.password = data.password || DEFAULTS.password;
                that.newUsers = data.newUsers || DEFAULTS.newUsers;
                that.existingUsers = data.existingUsers || DEFAULTS.existingUsers;
                that.missingUsers = data.missingUsers || DEFAULTS.missingUsers;
                that.autoSync = (data.autoSync!=null) ? data.autoSync : DEFAULTS.autoSync;
                that.role = data.role || DEFAULTS.role;
                that.query = data.query || DEFAULTS.query;
                that.base = data.base || DEFAULTS.base;
                that.loginField = data.loginField || DEFAULTS.loginField;
                that.nameField = data.nameField || DEFAULTS.nameField;
                that.emailField = data.emailField || DEFAULTS.emailField;
                $.publish('usersync.fromJson', data);
                return data;
            });
    };

    return UserSync;
    
});