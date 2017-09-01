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
        active: true,
        isOwner: false,
        archived: null,
        restrictLocations: []
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

        this.name = spec.name || DEFAULTS.name;
        this.picture = spec.picture || DEFAULTS.picture;
        this.email = spec.email || DEFAULTS.email;
        this.role = spec.role || DEFAULTS.role;
        this.group = spec.group || DEFAULTS.group;
        this.active = (spec.active!=null) ? spec.active : DEFAULTS.active;
        this.isOwner = (spec.isOwner!=null) ? spec.isOwner : DEFAULTS.isOwner;
        this.archived = spec.archived || DEFAULTS.archived;
        this.restrictLocations = spec.restrictLocations?spec.restrictLocations.slice():DEFAULTS.restrictLocations.slice();

        this.dsAnonymous = spec.dsAnonymous;
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

    User.prototype.emailExists = function() {
        if (this.isValidEmail()) {
            // Don't check for emailExists for exisiting user
            if(this.id != null && this.email == this.raw.email){
                return $.Deferred().resolve(false);
            }

            return this.dsAnonymous.call('emailExists', {email: this.email})
                .then(function(resp) {
                    return resp.result;
                });
        } else {
            return $.Deferred().resolve(false);
        }
    };

    User.prototype.isValidPassword = function() {
        this.password = $.trim(this.password);
        return common.isValidPassword(this.password);
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
            (this.role==DEFAULTS.role) &&
            (this.restrictLocations && this.restrictLocations.length == 0));
    };

    User.prototype._isDirtyInfo = function(){
        if((this.raw)) {
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
        return false;
    };

    User.prototype._isDirtyRestrictLocations = function(){
        if((this.raw)) {
            var that = this,
                restrictLocations = this.raw.restrictLocations || DEFAULTS.restrictLocations;
            
            // Check if other locations have been selected
            return this.restrictLocations.filter(function(x){ return restrictLocations.indexOf(x) < 0; }).length > 0 ||
                    restrictLocations.filter(function(x){ return that.restrictLocations.indexOf(x) < 0; }).length > 0;
        }
        return false;
    };


    /**
     * Checks if the user is dirty and needs saving
     * @method
     * @name User#isDirty
     * @returns {boolean}
     */
    User.prototype.isDirty = function() {
        var isDirty = Base.prototype.isDirty.call(this);
        return isDirty || this._isDirtyInfo() || this._isDirtyRestrictLocations();
    };

    /**
     * Gets a url for a user avatar
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

    //
    // Business logic
    //

    /**
     * Checks if a user can be activated
     * @returns {boolean}
     */
    User.prototype.canActivate = function() {
        return (!this.active) && (this.archived==null);
    };

    /**
     * Checks if a user can be deactivated
     * @returns {boolean}
     */
    User.prototype.canDeactivate = function() {
        // TODO: We should also check if we're not deactivating the last or only user
        return (this.active) && (this.archived==null) && (!this.isOwner);
    };

    /**
     * Checks if a user can be archived
     * @returns {boolean}
     */
    User.prototype.canArchive = function() {
        // TODO: We should also check if we're not deactivating the last or only user
        return (this.archived==null) && (!this.isOwner);
    };

    /**
     * Checks if a user can be unarchived
     * @returns {boolean}
     */
    User.prototype.canUndoArchive = function() {
        return (this.archived!=null);
    };

    /**
     * Checks if a user can be owner
     * @returns {boolean}
     */
    User.prototype.canBeOwner = function() {
        return (this.archived==null) && (this.active) && (!this.isOwner) && (this.role=="admin");
    };

    /**
     * Activates a user
     * @param skipRead
     * @returns {promise}
     */
    User.prototype.activate = function(skipRead) {
        if (!this.existsInDb()) {
            return $.Deferred().reject("User does not exist in database");
        }
        return this._doApiCall({method: 'activate', skipRead: skipRead});
    };

    /**
     * Deactivates a user
     * @param skipRead
     * @returns {promise}
     */
    User.prototype.deactivate = function(skipRead) {
        if (!this.existsInDb()) {
            return $.Deferred().reject("User does not exist in database");
        }
        return this._doApiCall({method: 'deactivate', skipRead: skipRead});
    };

    /**
     * Archives a user
     * @param skipRead
     * @returns {promise}
     */
    User.prototype.archive = function(skipRead) {
        if (!this.existsInDb()) {
            return $.Deferred().reject("User does not exist in database");
        }
        return this._doApiCall({method: 'archive', skipRead: skipRead});
    };

    /**
     * Unarchives a user
     * @param skipRead
     * @returns {promise}
     */
    User.prototype.undoArchive = function(skipRead) {
        if (!this.existsInDb()) {
            return $.Deferred().reject("User does not exist in database");
        }
        return this._doApiCall({method: 'undoArchive', skipRead: skipRead});
    };

    /**
     * Restrict user access to specific location(s)
     * @param locations
     * @param skipRead
     * @returns {promise}
     */
    User.prototype.setRestrictLocations = function(locations, skipRead) {
        if (!this.existsInDb()) {
            return $.Deferred().reject("User does not exist in database");
        }
        return this._doApiCall({method: 'setRestrictLocations', params: { restrictLocations: locations }, skipRead: skipRead});
    };

    /**
     * Clear user location(s) access (makes all location accessible for the user)
     * @param skipRead
     * @returns {promise}
     */
    User.prototype.clearRestrictLocations = function(skipRead) {
        if (!this.existsInDb()) {
            return $.Deferred().reject("User does not exist in database");
        }
        return this._doApiCall({method: 'clearRestrictLocations', skipRead: skipRead});
    };

     /**
     * Updates the user
     * @param skipRead
     * @returns {*}
     */
    User.prototype.update = function(skipRead) {
        if (this.isEmpty()) {
            return $.Deferred().reject(new Error("Cannot update to empty user"));
        }
        if (!this.existsInDb()) {
            return $.Deferred().reject(new Error("Cannot update user without id"));
        }
        if (!this.isValid()) {
            return $.Deferred().reject(new Error("Cannot update, invalid user"));
        }

        var that = this,
            dfdRestrictLocations = $.Deferred(),
            dfdInfo = $.Deferred();

        if(this._isDirtyInfo()){
            dfdInfo = this.ds.update(this.id, this._toJson(), this._fields);
        }else{
            dfdInfo.resolve();
        }              

        if(this._isDirtyRestrictLocations()){
            if(this.restrictLocations.length != 0){
                dfdRestrictLocations = this.setRestrictLocations(this.restrictLocations, true);
            } else{
                dfdRestrictLocations = this.clearRestrictLocations(true);
            }
        }else{
            dfdRestrictLocations.resolve();
        }

        return $.when(dfdInfo, dfdRestrictLocations);
            
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
                that.isOwner = (data.isOwner!=null) ? data.isOwner : DEFAULTS.isOwner;
                that.archived = data.archived || DEFAULTS.archived;
                that.restrictLocations = data.restrictLocations?data.restrictLocations.slice():DEFAULTS.restrictLocations.slice();

                $.publish('user.fromJson', data);
                return data;
            });
    };

    return User;
    
});