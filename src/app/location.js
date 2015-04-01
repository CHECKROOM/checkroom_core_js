/**
 * The Location module
 * Location class inherits from Base so it supports KeyValues (Attachment, Comment)
 * @module location
 * @copyright CHECKROOM NV 2015
 */
define([
    'jquery',
    'base'], function ($, Base) {

    var DEFAULTS = {
        name: '',
        address: ''
    };

    // Allow overriding the ctor during inheritance
    // http://stackoverflow.com/questions/4152931/javascript-inheritance-call-super-constructor-or-use-prototype-chain
    var tmp = function() {};
    tmp.prototype = Base.prototype;

    /**
     * @class Location
     * @constructor
     * @extends Base
     */
    var Location = function(opt) {
        var spec = $.extend({
            fields: ['*']
        }, opt);
        Base.call(this, spec);

        this.name = spec.name || DEFAULTS.name;
        this.address = spec.address || DEFAULTS.address;
    };

    Location.prototype = new tmp();
    Location.prototype.constructor = Location;

    //
    // Document overrides
    //

    /**
     * Checks if the location is empty
     * @returns {boolean}
     */
    Location.prototype.isEmpty = function() {
        return (
            (Base.prototype.isEmpty.call(this)) &&
            (this.name==DEFAULTS.name) &&
            (this.address==DEFAULTS.address));
    };

    /**
     * Checks if the location is dirty and needs saving
     * @returns {boolean}
     */
    Location.prototype.isDirty = function() {
        var isDirty = Base.prototype.isDirty.call(this);
        if( (!isDirty) &&
            (this.raw)) {
            var name = this.raw.name || DEFAULTS.name;
            var address = this.raw.address || DEFAULTS.address;
            return (
                (this.name!=name) ||
                (this.address!=address));
        }
        return isDirty;
    };

    Location.prototype._getDefaults = function() {
        return DEFAULTS;
    };

    Location.prototype._toJson = function(options) {
        var data = Base.prototype._toJson.call(this, options);
        data.name = this.name || DEFAULTS.name;
        data.address = this.address || DEFAULTS.address;
        return data;
    };

    Location.prototype._fromJson = function(data, options) {
        var that = this;
        return Base.prototype._fromJson.call(this, data, options)
            .then(function() {
                that.name = data.name || DEFAULTS.name;
                that.address = data.address || DEFAULTS.address;
                $.publish('contact.fromJson', data);
                return data;
            });
    };

    return Location;
    
});