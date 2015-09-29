/**
 * The Kit module
 * Kit class inherits from Base so it supports KeyValues (Attachment, Comment)
 * @module kit
 * @copyright CHECKROOM NV 2015
 */
define([
    'jquery',
    'base',
    'common'], /** @lends Kit */ function ($, Base, common) {

    var DEFAULTS = {
        name: "",
        items: []
    };

    // Allow overriding the ctor during inheritance
    // http://stackoverflow.com/questions/4152931/javascript-inheritance-call-super-constructor-or-use-prototype-chain
    var tmp = function() {};
    tmp.prototype = Base.prototype;

    /**
     * Kit class
     * @name  Kit
     * @class
     * @constructor
     * @extends Base
     */
    var Kit = function(opt) {
        var spec = $.extend({
            fields: ['*'],
            crtype: 'cheqroom.types.kit'
        }, opt);
        Base.call(this, spec);

        this.name = spec.name || DEFAULTS.name;
        this.items = spec.items || DEFAULTS.items.slice();
    };

    Kit.prototype = new tmp();
    Kit.prototype.constructor = Kit;

    //
    // Specific validators
    /**
     * Checks if name is valid
     * @name Kit#isValidName
     * @method
     * @return {Boolean} [description]
     */
    Kit.prototype.isValidName = function() {
        this.name = $.trim(this.name);
        return (this.name.length>=3);
    };

    //
    // Base overrides
    //

    /**
     * Checks if the Kit has any validation errors
     * @name Kit#isValid
     * @method
     * @returns {boolean}
     * @override
     */
    Kit.prototype.isValid = function() {
        return this.isValidName();
    };

    /**
     * Checks if the Kits is dirty and needs saving
     * @name Kit#isDirty
     * @returns {boolean}
     * @override
     */
    Kit.prototype.isDirty = function() {
        var isDirty = Base.prototype.isDirty.call(this);
        if( (!isDirty) &&
            (this.raw)) {
            isDirty = (this.name!=this.raw.name);
        }
        return isDirty;
    };

    //
    // Business logic
    //
    /**
     * addItems; adds a bunch of Items to the transaction using a list of item ids
     * It creates the transaction if it doesn't exist yet
     * @name Kit#addItems
     * @method
     * @param items
     * @param skipRead
     * @returns {promise}
     */
    Kit.prototype.addItems = function(items, skipRead) {
        if (!this.existsInDb()) {
            return $.Deferred().reject(new Error("Cannot removeItems from document without id"));
        }

        return this._doApiCall({
            method: 'addItems',
            params: {items: items},
            skipRead: skipRead
        });
    };

    /**
     * removeItems; removes a bunch of Items from the transaction using a list of item ids
     * It deletes the transaction if it's empty afterwards and autoCleanup is true
     * @name Kit#removeItems
     * @method
     * @param items (can be null)
     * @param skipRead
     * @returns {promise}
     */
    Kit.prototype.removeItems = function(items, skipRead) {
        if (!this.existsInDb()) {
            return $.Deferred().reject(new Error("Cannot removeItems from document without id"));
        }

        return this._doApiCall({
            method: 'removeItems',
            params: {items: items},
            skipRead: skipRead
        });
    };

    //
    // Implementation stuff
    //

    Kit.prototype._getDefaults = function() {
        return DEFAULTS;
    };

    Kit.prototype._toJson = function(options) {
        var data = Base.prototype._toJson.call(this, options);
        data.name = this.name || DEFAULTS.name;
        //data.items --> not via update
        return data;
    };

    Kit.prototype._fromJson = function(data, options) {
        var that = this;
        return Base.prototype._fromJson.call(this, data, options)
            .then(function(data) {
                that.name = data.name || DEFAULTS.name;
                that.items = data.items || DEFAULTS.items.slice();
                $.publish('Kit.fromJson', data);
                return data;
            });
    };

    return Kit;

});