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
        items: [],
        status: "unknown",
        cover: ""
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
            _fields: ['*'],
            crtype: 'cheqroom.types.kit'
        }, opt);
        Base.call(this, spec);

        this.name = spec.name || DEFAULTS.name;
        this.items = spec.items || DEFAULTS.items.slice();
        this.codes = [];
        this.conflicts = [];
        this.status = spec.status || DEFAULTS.status;
        this.cover = spec.cover || DEFAULTS.cover;
    };

    Kit.prototype = new tmp();
    Kit.prototype.constructor = Kit;

    //
    // Specific validators
    /**
     * Checks if name is valid
     * @name Kit#isValidName
     * @method
     * @return {Boolean} 
     */
    Kit.prototype.isValidName = function() {
        this.name = $.trim(this.name);
        return (this.name.length>=3);
    };

    /**
     * Check if name is valid and isn't already used
     * @name Kit#isValidNameAsync
     * @method
     * @return {promise} 
     */
    Kit.prototype.isNameAvailableAsync = function(){
        // When existing kit is edited, we don't want 
        // to check its current name 
        if(this.id != null && this.raw != null && this.name == this.raw.name){
            return $.Deferred().resolve(true);
        }

        // If a previous name available check is pending, abort it
        if(this._dfdNameAvailable){ this._dfdNameAvailable.abort(); }

        this._dfdNameAvailable = this.ds.search({name: $.trim(this.name) }, "_id");
            
        return this._dfdNameAvailable.then(function(resp) {
            return resp.count == 0;
        }, function(error) {
            return false;
        });
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
     * Checks if the kit is empty
     * @name Kit#isEmpty
     * @returns {boolean}
     */
    Kit.prototype.isEmpty = function() {
        // Checks for: name
        return (
            (Base.prototype.isEmpty.call(this)) &&
            (this.name==DEFAULTS.name));
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
    // KIT_STATUS = ( 'available', 'checkedout', 'await_checkout', 'in_transit', 'maintenance', 'repair', 'inspection', 'expired', 'in_custody', 'empty', 'incomplete')

    /**
     * Checks if a Kit can be checked out (based on status)
     * @name Kit#canCheckout
     * @method
     * @returns {boolean}
     */
    Kit.prototype.canCheckout = function() {
        return (this.status=="available") || (this.status=="incomplete");
    };

    /**
     * Checks if a Kit can be reserved (based on status)
     * @name Kit#canReserve
     * @method
     * @returns {boolean}
     */
    Kit.prototype.canReserve = function() {
        return (this.status!="expired") && (this.status!="in_custody") && (this.status!="empty");
    };

    /**
     * addItems; adds a bunch of Items to the transaction using a list of item ids
     * @name Kit#addItems
     * @method
     * @param items
     * @param skipRead
     * @returns {promise}
     */
    Kit.prototype.addItems = function(items, skipRead) {
        if (!this.existsInDb()) {
            return $.Deferred().reject(new Error("Cannot addItems from document without id"));
        }

        return this._doApiCall({
            method: 'addItems',
            params: {items: items},
            skipRead: skipRead
        });
    };

    /**
     * removeItems; removes a bunch of Items from the transaction using a list of item ids
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

    /**
     * moveItem; moves an Item in a kit to another position
     * @name Kit#moveItem
     * @method
     * @param item
     * @param toPos
     * @param skipRead
     * @returns {promise}
     */
    Kit.prototype.moveItem = function(item, toPos, skipRead) {
        if (!this.existsInDb()) {
            return $.Deferred().reject(new Error("Cannot moveItem from document without id"));
        }

        return this._doApiCall({
            method: 'moveItem',
            params: {item: item, toPos: toPos},
            skipRead: skipRead
        });
    };

    /**
     * Adds a QR code to the kit
     * @name Kit#addCode
     * @param code
     * @param skipRead
     * @returns {promise}
     */
    Kit.prototype.addCode = function(code, skipRead) {
        return this._doApiCall({method: 'addCodes', params: {codes: [code]}, skipRead: skipRead});
    };

    /**
     * Removes a QR code from the kit
     * @name Kit#removeCode
     * @param code
     * @param skipRead
     * @returns {promise}
     */
    Kit.prototype.removeCode = function(code, skipRead) {
        return this._doApiCall({method: 'removeCodes', params: {codes: [code]}, skipRead: skipRead});
    };

    /**
     * Duplicates an item a number of times
     * @name Kit#duplicate
     * @param  {int} times
     * @return {promise}      
     */
    Kit.prototype.duplicate = function(times, location, skipRead){
        return this._doApiCall({method: 'duplicate', params: {times: times, location: location}, skipRead: skipRead || true });
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
                that.codes = data.codes || [];
                that.status = data.status || DEFAULTS.status;
                that.cover = data.cover || DEFAULTS.cover;

                that._loadConflicts(that.items);

                $.publish('Kit.fromJson', data);
                return data;
            });
    };

    // Override create method so we can pass items
    // We don't override _toJson to include items, because this would
    // mean that on an update items would also be passed
    Kit.prototype.create = function(skipRead){
        if (this.existsInDb()) {
            return $.Deferred().reject(new Error("Cannot create document, already exists in database"));
        }
        
        // Don't check for isEmpty/isValid, if no name is given,
        // that we automatically generate a name on the server
        //if (this.isEmpty()) {
        //    return $.Deferred().reject(new Error("Cannot create empty document"));
        //}
        //if (!this.isValid()) {
        //    return $.Deferred().reject(new Error("Cannot create, invalid document"));
        //}

        var that = this,
            data = {
            name: this.name,
            items: this._getIds(this.items)
        };

        // Also add any possible fields we need during `create`
        $.extend(data, this._toJsonFields());

        delete data.id;

        return this.ds.create(data, this._fields)
            .then(function(data) {
                return (skipRead==true) ? data : that._fromJson(data);
            });
    };

    Kit.prototype._loadConflicts = function(items) {
        var conflicts = [];
        var kitStatus = common.getKitStatus(items);
        
        // Kit has only conflicts when it's status is incomplete  
        if(kitStatus == "incomplete") {
            $.each(items, function(i, item){
                 switch(item.status){
                    case "await_checkout":
                        conflicts.push({
                            kind: "status",
                            item: item._id,
                            itemName: item.name,
                            itemStatus: item.status,
                            order: item.order
                        });
                        break;
                    case "checkedout":
                        conflicts.push({
                            kind: "order",
                            item: item._id,
                            itemName: item.name,
                            itemStatus: item.status,
                            order: item.order
                        });
                        break;
                    case "expired":
                        conflicts.push({
                            kind: "status",
                            item: item._id,
                            itemName: item.name,                            
                            itemStatus: item.status
                        });
                        break;
                }
            });
        }
            
        this.conflicts = conflicts;
    };

    return Kit;

});