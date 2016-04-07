/**
 * The Item module
 * @module item
 * @copyright CHECKROOM NV 2015
 */
define([
    'jquery',
    'base'], /** @lends Base */ function ($, Base) {

    var FLAG = "cheqroom.prop.Custom",
        DEFAULT_LAT = 0.0,
        DEFAULT_LONG = 0.0,
        DEFAULTS = {
        name: "",
        status: "",
        codes: [],
        flag: "",
        location: "",
        category: "",
        geo: [DEFAULT_LAT,DEFAULT_LONG],
        address: "",
        order: null,
        kit: null,
        custody: null
    };

    // Allow overriding the ctor during inheritance
    // http://stackoverflow.com/questions/4152931/javascript-inheritance-call-super-constructor-or-use-prototype-chain
    var tmp = function() {};
    tmp.prototype = Base.prototype;

    /**
     * Item represents a single piece of equipment
     * @name Item
     * @class Item
     * @constructor
     * @property {string} name         the name of the item
     * @property {status} status       the status of the item in an order, or expired
     * @property {string} flag         the item flag
     * @property {string} location     the item location primary key (empty if in_custody)
     * @property {string} category     the item category primary key
     * @property {Array} geo           the item geo position in lat lng array
     * @property {string} address      the item geo position address
     * @property {string} order        the order pk, if the item is currently in an order
     * @property {string} custody      the user pk, if the item is currently in custody of someone
     * @extends Base
     */
    var Item = function(opt) {
        var spec = $.extend({
            fields: ['*'],
            crtype: 'cheqroom.types.item'
        }, opt);
        Base.call(this, spec);

        this.name = spec.name || DEFAULTS.name;
        this.status = spec.status || DEFAULTS.status;
        this.codes = spec.codes || DEFAULTS.codes;
        this.flag = spec.flag || DEFAULTS.flag;
        this.location = spec.location || DEFAULTS.location;     // location._id
        this.category = spec.category || DEFAULTS.category;     // category._id
        this.geo = spec.geo || DEFAULTS.geo.slice();            // null or an array with 2 floats
        this.address = spec.address || DEFAULTS.address;
        this.order = spec.order || DEFAULTS.order;
        this.kit = spec.kit || DEFAULTS.kit;
        this.custody = spec.custody || DEFAULTS.custody;
    };

    Item.prototype = new tmp();
    Item.prototype.constructor = Item;

    //
    // Base overrides
    //
    Item.prototype.isValidName = function() {
        this.name = $.trim(this.name);
        return (this.name.length>=3);
    };

    Item.prototype.isValidCategory = function() {
        return ($.trim(this.category).length>0);
    };

    Item.prototype.isValidLocation = function() {
        return ($.trim(this.location).length>0);
    };

    Item.prototype.isValid = function() {
        return (
            this.isValidName() &&
            this.isValidCategory() &&
            this.isValidLocation());
    };

    /**
     * Checks if the item is empty
     * @name Item#isEmpty
     * @returns {boolean}
     */
    Item.prototype.isEmpty = function() {
        // Checks for: name, status, codes, flag, location, category
        return (
            (Base.prototype.isEmpty.call(this)) &&
            (this.name==DEFAULTS.name) &&
            (this.status==DEFAULTS.status) &&
            (this.codes.length==0) &&  // not DEFAULTS.codes? :)
            (this.flag==DEFAULTS.flag) &&
            (this.location==DEFAULTS.location) &&
            (this.category==DEFAULTS.category));
    };

    /**
     * Checks if the item is dirty and needs saving
     * @name Item#isDirty
     * @returns {boolean}
     */
    Item.prototype.isDirty = function() {
        return (
            Base.prototype.isDirty.call(this) || 
            this._isDirtyName() ||
            this._isDirtyCategory() ||
            this._isDirtyLocation() ||
            this._isDirtyFlag() ||
            this._isDirtyGeo());
    };

    Item.prototype._getDefaults = function() {
        return DEFAULTS;
    };

    Item.prototype._toJson = function(options) {
        // Writes out; id, name, category, location
        var data = Base.prototype._toJson.call(this, options);
        data.name = this.name || DEFAULTS.name;
        data.category = this.category || DEFAULTS.category;
        data.location = this.location || DEFAULTS.location;
        return data;
    };

    Item.prototype._fromJson = function(data, options) {
        var that = this;
        return Base.prototype._fromJson.call(this, data, options)
            .then(function() {
                that.name = data.name || DEFAULTS.name;
                that.status = data.status || DEFAULTS.status;
                that.codes = data.codes || DEFAULTS.codes;
                that.address = data.address || DEFAULTS.address;
                that.geo = data.geo || DEFAULTS.geo.slice();

                // Depending on the fields we'll need to get the _id directly or from the dicts
                var locId = DEFAULTS.location;
                if (data.location) {
                    locId = (data.location._id) ? data.location._id : data.location;
                }
                that.location = locId;

                var catId = DEFAULTS.category;
                if (data.category) {
                    catId = (data.category._id) ? data.category._id : data.category;
                }
                that.category = catId;

                var orderId = DEFAULTS.order;
                if (data.order) {
                    orderId = (data.order._id) ? data.order._id : data.order;
                }
                that.order = orderId;

                var kitId = DEFAULTS.kit;
                if (data.kit) {
                    kitId = (data.kit._id) ? data.kit._id : data.kit;
                }
                that.kit = kitId;

                var custodyId = DEFAULTS.custody;
                if (data.custody) {
                    custodyId = (data.custody._id) ? data.custody._id : data.custody;
                }
                that.custody = custodyId;

                // Read the flag from the keyvalues
                return that._fromJsonFlag(data, options)
                    .then(function() {
                        $.publish('item.fromJson', data);
                        return data;
                    });
            });
    };

    Item.prototype._fromJsonFlag = function(data, options) {
        var that = this;
        this.flag = DEFAULTS.flag;

        if( (data.keyValues!=null) &&
            (data.keyValues.length>0)) {
            $.each(data.keyValues, function(i, kv) {
                 if (kv.key == FLAG) {
                     that.flag = kv.value;
                     return false;
                 }
            });
        }

        return $.Deferred().resolve(data);
    };

    Item.prototype._getKeyValue = function(kv, options) {
        // Flag is a special keyvalue, we won't read it into keyValues
        // but set it via _fromJsonFlag
        return (kv.key == FLAG) ? null : Base.prototype._getKeyValue(kv, options);
    };

    Item.prototype._isDirtyName = function() {
        if (this.raw) {
            return (this.name!=this.raw.name);
        } else {
            return false;
        }
    };

    Item.prototype._isDirtyLocation = function() {
        if (this.raw) {
            var locId = DEFAULTS.location;
            if (this.raw.location) {
                locId = (this.raw.location._id) ? this.raw.location._id : this.raw.location;
            }
            return (this.location!=locId);
        } else {
            return false;
        }
    };

    Item.prototype._isDirtyCategory = function() {
        if (this.raw) {
            var catId = DEFAULTS.category;
            if (this.raw.category) {
                catId = (this.raw.category._id) ? this.raw.category._id : this.raw.category;
            }
            return (this.category!=catId);
        } else {
            return false;
        }
    };

    Item.prototype._isDirtyFlag = function() {
        if (this.raw) {
            var flag = DEFAULTS.flag;
            if( (this.raw.keyValues) &&
                (this.raw.keyValues.length)) {
                $.each(this.raw.keyValues, function(i, kv) {
                     if (kv.key == FLAG) {
                         flag = kv.value;
                         return false;
                     }
                });
            }
            return (this.flag!=flag);
        } else {
            return false;
        }
    };

    Item.prototype._isDirtyGeo = function() {
        if (this.raw) {
            var address = this.raw.address || DEFAULTS.address;
            var geo = this.raw.geo || DEFAULTS.geo.slice();
            return (
                (this.address!=address) ||
                (this.geo[0]!=geo[0]) ||
                (this.geo[1]!=geo[1]));
        } else {
            return false;
        }
    };

    //
    // Business logic
    //
    /**
     * Checks if the Item is unavailable between from / to dates (optional)
     * @name Item#getAvailabilities
     * @param {Moment} from       the from date (optional)
     * @param {Moment} to         the to date (optional)
     * @returns {promise}
     */
    Item.prototype.getAvailabilities = function(from, to) {
        return this.ds.call(this.id, 'getAvailability', {fromDate: from, toDate: to});
    };

//    /**
//     * updates the Item
//     * We override because Item.update does not support updating categories
//     * @param skipRead
//     * @returns {*}
//     */
//    Item.prototype.update = function(skipRead) {
//        if (this.isEmpty()) {
//            return $.Deferred().reject(new Error("Cannot update to empty document"));
//        }
//        if (!this.existsInDb()) {
//            return $.Deferred().reject(new Error("Cannot update document without id"));
//        }
//        if (!this.isValid()) {
//            return $.Deferred().reject(new Error("Cannot update, invalid document"));
//        }
//
//        var that = this;
//        this.isBusy(true);
//        var pk = this.id;
//        var data = this._toJson();
//
//        // Category is not allowed during update
//        delete data.category;
//
//        return this.ds.update(pk, data, this.fields)
//            .then(function(data) {
//                return (skipRead==true) ? data : that._fromJson(data);
//            }).always(function() {
//                that.isBusy(false);
//            });
//    };
//
//    /**
//     * save
//     */
//    Item.prototype.save = function() {
//        // Works for: name, location, category, flag & geo
//
//        // Avoid doing saves if we try to change a category and it's not allowed
//        var isDirtyCategory = this._isDirtyCategory();
//        var okCategory = null;
//        if (isDirtyCategory) {
//            okCategory = this.canChangeCategory();
//        } else {
//            okCategory = $.Deferred().resolve({result: true});
//        }
//
//        okCategory
//            .done(function(resp) {
//
//            });
//
//        var isNameDirty = this._isDirtyName();
//        var isLocationDirty = this._isDirtyLocation();
//        var isDirtyFlag = this._isDirtyFlag();
//        var isDirtyGeo = this._isDirtyGeo();
//    };

    //
    // TODO: Function calls specific for Item
    //

    /**
     * Duplicates an item a number of times
     * @name Item#duplicate
     * @param times
     * @returns {promise}
     */
    Item.prototype.duplicate = function(times) {
        return this._doApiCall({
            method: 'duplicate',
            params: {times: times},
            skipRead: true  // response is an array of new Item objects!!
        });
    };

    /**
     * Expires an item, puts it in the *expired* status
     * @name Item#expire
     * @param skipRead
     * @returns {promise}
     */
    Item.prototype.expire = function(skipRead) {
        return this._doApiCall({method: 'expire', skipRead: skipRead});
    };

    /**
     * Un-expires an item, puts it in the *available* status again
     * @name Item#undoExpire
     * @param skipRead
     * @returns {promise}
     */
    Item.prototype.undoExpire = function(skipRead) {
        return this._doApiCall({method: 'undoExpire', skipRead: skipRead});
    };

    /**
     * Change the location of an item
     * @name Item#changeLocation
     * @param skipRead
     * @returns {promise}
     */
    Item.prototype.changeLocation = function(locationId, skipRead) {
        return this._doApiCall({method: 'changeLocation', params: {location: locationId}, skipRead: skipRead});
    };

    /**
     * Adds a QR code to the item
     * @name Item#addCode
     * @param code
     * @param skipRead
     * @returns {promise}
     */
    Item.prototype.addCode = function(code, skipRead) {
        return this._doApiCall({method: 'addCodes', params: {codes: [code]}, skipRead: skipRead});
    };

    /**
     * Removes a QR code from the item
     * @name Item#removeCode
     * @param code
     * @param skipRead
     * @returns {promise}
     */
    Item.prototype.removeCode = function(code, skipRead) {
        return this._doApiCall({method: 'removeCodes', params: {codes: [code]}, skipRead: skipRead});
    };

    /**
     * Updates the geo position of an item
     * @name Item#updateGeo
     * @param lat
     * @param lng
     * @param address
     * @param skipRead
     * @returns {promise}
     */
    Item.prototype.updateGeo = function(lat, lng, address, skipRead) {
        return this._doApiCall({method: 'updateGeo', params: {lat: lat, lng: lng, address: address}, skipRead: skipRead});
    };

    /**
     * Updates the name of an item
     * @name Item#updateName
     * @param name
     * @param skipRead
     * @returns {promise}
     */
    Item.prototype.updateName = function(name, skipRead) {
        var that = this;
        return this.ds.update(this.id, {name: name}, this.fields)
            .then(function(data) {
                return (skipRead==true) ? data : that._fromJson(data);
            });
    };

    /**
     * Checks if the item can be moved to another category
     * @name Item#canChangeCategory
     * @param category
     * @returns {promise}
     */
    Item.prototype.canChangeCategory = function(category) {
        return this._doApiCall({
            collectionCall: true,  // it's a collection call, not an Item call
            method: 'canChangeCategory',
            params: {pks:[this.id], category: category},
            skipRead: true  // the response is a hash with results and conflicts
        });
    };

    /**
     * Moves the item to another category
     * @name Item#changeCategory
     * @param category
     * @param skipRead
     * @returns {promise}
     */
    Item.prototype.changeCategory = function(category, skipRead) {
        var that = this;
        return this._doApiCall({
            collectionCall: true,  // it's a collection call, not an Item call
            method: 'changeCategory',
            params: {pks:[this.id], category: category},
            skipRead: true  // the response is a list of changed Items
        })
            .then(function(data) {
                return (skipRead==true) ? data : that._fromJson(data[0]);
            });
    };

    /**
     * Sets the flag of an item
     * @name Item#setFlag
     * @param flag
     * @param skipRead
     * @returns {promise}
     */
    Item.prototype.setFlag = function(flag, skipRead) {
        return this._doApiCall({
            method: 'setFlag', 
            params: { flag: flag }, 
            skipRead: skipRead});
    };

    /**
     * Clears the flag of an item
     * @name Item#clearFlag
     * @param skipRead
     * @returns {promise}
     */
    Item.prototype.clearFlag = function(skipRead) {
        return this._doApiCall({method: 'clearFlag', skipRead: skipRead});
    };

    /**
     * Takes custody of an item
     * Puts it in the *in_custody* status
     * @name Item#takeCustody
     * @param userId (when null, we'll take the user making the API call)
     * @param skipRead
     * @returns {promise}
     */
    Item.prototype.takeCustody = function(userId, skipRead) {
        return this._doApiCall({method: 'takeCustody', params: {user: userId}, skipRead: skipRead});
    };

    /**
     * Releases custody of an item at a certain location
     * Puts it in the *available* status again
     * @name Item#releaseCustody
     * @param locationId
     * @param skipRead
     * @returns {promise}
     */
    Item.prototype.releaseCustody = function(locationId, skipRead) {
        return this._doApiCall({method: 'releaseCustody', params: {location: locationId}, skipRead: skipRead});
    };

    /**
     * Transfers custody of an item
     * Keeps it in the *in_custody* status
     * @name Item#transferCustody
     * @param userId (when null, we'll take the user making the API call)
     * @param skipRead
     * @returns {promise}
     */
    Item.prototype.transferCustody = function(userId, skipRead) {
        return this._doApiCall({method: 'transferCustody', params: {user: userId}, skipRead: skipRead});
    };

    return Item;
});
