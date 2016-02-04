/**
 * The OrderTransfer module
 * @module orderTransfer
 * @copyright CHECKROOM NV 2015
 */
define([
    'jquery',
    'base'], /** @lends Base */ function ($, Base) {

    var DEFAULTS = {
        by: null,
        created: null,
        modified: null,
        status : "creating",
        items: [],
        started: null,
        accepted: null,
        fromOrder: null,
        toOrder: null,
        startedBy: null
    };

    // Allow overriding the ctor during inheritance
    // http://stackoverflow.com/questions/4152931/javascript-inheritance-call-super-constructor-or-use-prototype-chain
    var tmp = function() {};
    tmp.prototype = Base.prototype;

    /**
     * OrderTransfer
     * @name OrderTransfer
     * @class OrderTransfer
     * @constructor
     * @property {string} id            short UUID
     * @property {cr.User} by           who created this doc
     * @property {Date} created         when was this doc created
     * @property {Date} modified        when was this doc last modified
     * @property {string} status        creating, open, closed
     * @property {Array} items          list of items
     * @property {Date} started         when was the transfer started
     * @property {Date} accepted        when was the transfer accepted
     * @property {Date} fromOrder       from order
     * @property {Date} toOrder         to order    
     * @property {cr.User} startedBy    who started the transfer    
     * @extends Base
     */
    var OrderTransfer = function(opt) {
        var spec = $.extend({
            fields: ['*'],
            crtype: 'cheqroom.types.reservation.ordertransfer'
        }, opt);
        Base.call(this, spec);

        this.by = spec.by || DEFAULTS.by;
        this.created = spec.created || DEFAULTS.created;
        this.modified = spec.modified || DEFAULTS.modified;
        this.status = spec.status || DEFAULTS.status;
        this.items = spec.items || DEFAULTS.items;
        this.started = spec.started || DEFAULTS.started;
        this.accepted = spec.accepted || DEFAULTS.accepted;
        this.fromOrder = spec.fromOrder || DEFAULTS.fromOrder;
        this.toOrder = spec.toOrder || DEFAULTS.toOrder;
        this.startedBy = spec.startedBy || DEFAULTS.startedBy;
    };

    OrderTransfer.prototype = new tmp();
    OrderTransfer.prototype.constructor = OrderTransfer;

    // Base overrides
    // ----
    
    /**
     * Checks if the order transfer is empty
     * @name OrderTransfer#isEmpty
     * @returns {boolean}
     */
    OrderTransfer.prototype.isEmpty = function() {
        return false;
    };

    OrderTransfer.prototype._toJson = function(options) {
        // Writes out; id, items
        var data = Base.prototype._toJson.call(this, options);
        data.items = this.items || DEFAULTS.items;
        return data;
    };

    OrderTransfer.prototype._fromJson = function(data, options) {
        var that = this;
        return Base.prototype._fromJson.call(this, data, options)
            .then(function() {
                that.by = data.by || DEFAULTS.by;
                that.created = data.created || DEFAULTS.created;
                that.modified = data.modified || DEFAULTS.modified;
                that.items = data.items || DEFAULTS.items;
                that.status = data.status || DEFAULTS.status;
                that.started = data.started || DEFAULTS.started;
                that.accepted = data.accepted || DEFAULTS.accepted;
                that.fromOrder = data.fromOrder || DEFAULTS.fromOrder;
                that.toOrder = data.toOrder || DEFAULTS.toOrder;
                that.startedBy = data.startedBy || DEFAULTS.startedBy;

                return data;
            });
    };

    // Business logic
    // ----
    
    /**
     * addItems adds items to transfer from an order (must be items of the same order)
     *
     * @name OrderTransfer#addItems
     * @returns {promise}
     */
    OrderTransfer.prototype.addItems = function(items, skipRead){
        return this._doApiCall({method: 'addItems', params: { items: items }, skipRead: skipRead});
    }

    /**
     * removeItems removes items from transfer
     * 
     * @name OrderTransfer#removeItems
     * @returns {promise}
     */
    OrderTransfer.prototype.removeItems = function(items, skipRead){
        return this._doApiCall({method: 'removeItems', params: { items: items }, skipRead: skipRead});
    }

    /**
     * start puts the transfer in status "open"
     * 
     * @name OrderTransfer#start
     * @return {promise}
     */
    OrderTransfer.prototype.start = function(skipRead){
        return this._doApiCall({method: 'start', params: {}, skipRead: skipRead});
    }

    /**
     * undoStart puts the transfer in status "creating" again
     * 
     * @name OrderTransfer#undoStart
     * @return {promise}
     */
    OrderTransfer.prototype.undoStart = function(skipRead){
        return this._doApiCall({method: 'undoStart', params: {}, skipRead: skipRead});
    }

    /**
     * accept transfers the items to another customer
     * 
     * @name OrderTransfer#accept
     * @return {promise}
     */
    OrderTransfer.prototype.accept = function(params, skipRead){
        return this._doApiCall({method: 'accept', params: params, skipRead: skipRead});
    }

    /**
     * getQRUrl returns path to transfer qr code
     * 
     * @name OrderTransfer#qr
     * @return {string}
     */
    OrderTransfer.prototype.getQRUrl = function(size){
        return this.ds._baseUrl + "/" + this.id + "/call/qr?size=" + (size || 300);
    }

    return OrderTransfer;
});
