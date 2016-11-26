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
            brand: "",
            model: "",
            warrantyDate: null,
            purchaseDate: null,
            purchasePrice: null,
            location: "",
            category: "",
            geo: [DEFAULT_LAT,DEFAULT_LONG],
            address: "",
            order: null,
            kit: null,
            custody: null,
            cover: "",
            catalog: null
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
     * @property {string} name              the name of the item
     * @property {string} status            the status of the item in an order, or expired
     * @property {string} brand             the item brand
     * @property {string} model             the item model
     * @property {moment} warrantyDate      the item warranty date
     * @property {moment} purchaseDate      the item purchase date
     * @property {string} purchasePrice     the item purchase price
     * @property {Array} codes              the item qr codes
     * @property {string} location          the item location primary key (empty if in_custody)
     * @property {string} category          the item category primary key
     * @property {Array} geo                the item geo position in lat lng array
     * @property {string} address           the item geo position address
     * @property {string} order             the order pk, if the item is currently in an order
     * @property {string} kit               the kit pk, if the item is currently in a kit
     * @property {string} custody           the customer pk, if the item is currently in custody of someone
     * @property {string} cover             the attachment pk of the main image
     * @property {string} catalog           the catalog pk, if the item was made based on a product in the catalog
     * @extends Base
     */
    var Item = function(opt) {
        var spec = $.extend({
            _fields: ['*'],
            crtype: 'cheqroom.types.item'
        }, opt);
        Base.call(this, spec);

        this.name = spec.name || DEFAULTS.name;
        this.status = spec.status || DEFAULTS.status;
        this.brand = spec.brand || DEFAULTS.brand;
        this.model = spec.model || DEFAULTS.model;
        this.warrantyDate = spec.warrantyDate || DEFAULTS.warrantyDate;
        this.purchaseDate = spec.purchaseDate || DEFAULTS.purchaseDate;
        this.purchasePrice = spec.purchasePrice || DEFAULTS.purchasePrice;
        this.codes = spec.codes || DEFAULTS.codes;
        this.location = spec.location || DEFAULTS.location;     // location._id
        this.category = spec.category || DEFAULTS.category;     // category._id
        this.geo = spec.geo || DEFAULTS.geo.slice();            // null or an array with 2 floats
        this.address = spec.address || DEFAULTS.address;
        this.order = spec.order || DEFAULTS.order;
        this.kit = spec.kit || DEFAULTS.kit;
        this.custody = spec.custody || DEFAULTS.custody;
        this.cover = spec.cover || DEFAULTS.cover;
        this.catalog = spec.catalog || DEFAULTS.catalog;
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
            ((this.status=="in_custody") ? true : this.isValidLocation())
        );
    };

    /**
     * Checks if the item is empty
     * @name Item#isEmpty
     * @returns {boolean}
     */
    Item.prototype.isEmpty = function() {
        // Checks for: name, status, brand, model, purchaseDate, purchasePrice, codes, location, category
        return (
        (Base.prototype.isEmpty.call(this)) &&
        (this.name==DEFAULTS.name) &&
        (this.status==DEFAULTS.status) &&
        (this.brand==DEFAULTS.brand) &&
        (this.model==DEFAULTS.model) &&
        (this.warrantyDate==DEFAULTS.warrantyDate) &&
        (this.purchaseDate==DEFAULTS.purchaseDate) &&
        (this.purchasePrice==DEFAULTS.purchasePrice) &&
        (this.codes.length==0) &&  // not DEFAULTS.codes? :)
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
            this._isDirtyBrand() ||
            this._isDirtyModel() ||
            this._isDirtyWarrantyDate() ||
            this._isDirtyPurchaseDate() ||
            this._isDirtyPurchasePrice() ||
            this._isDirtyCategory() ||
            this._isDirtyLocation() ||
            this._isDirtyGeo()
        );
    };

    Item.prototype._getDefaults = function() {
        return DEFAULTS;
    };

    Item.prototype._toJson = function(options) {
        // Writes out: id, name,
        //             brand, model, purchaseDate, purchasePrice
        //             category, location, catalog
        var data = Base.prototype._toJson.call(this, options);
        data.name = this.name || DEFAULTS.name;
        data.brand = this.brand || DEFAULTS.brand;
        data.model = this.model || DEFAULTS.model;
        data.warrantyDate = this.warrantyDate || DEFAULTS.warrantyDate;
        data.purchaseDate = this.purchaseDate || DEFAULTS.purchaseDate;
        data.purchasePrice = this.purchasePrice || DEFAULTS.purchasePrice;
        data.category = this.category || DEFAULTS.category;
        data.location = this.location || DEFAULTS.location;
        data.catalog = this.catalog || DEFAULTS.catalog;

        // Remove values of null during create
        // Avoids: 422 Unprocessable Entity
        // ValidationError (Item:TZe33wVKWwkKkpACp6Xy5T) (FloatField only accepts float values: ['purchasePrice'])
        for (var k in data) {
            if (data[k] == null) {
                delete data[k];
            }
        }

        return data;
    };

    Item.prototype._fromJson = function(data, options) {
        var that = this;
        return Base.prototype._fromJson.call(this, data, options)
            .then(function() {
                that.name = data.name || DEFAULTS.name;
                that.status = data.status || DEFAULTS.status;
                that.brand = data.brand || DEFAULTS.brand;
                that.model = data.model || DEFAULTS.model;
                that.warrantyDate = data.warrantyDate || DEFAULTS.warrantyDate;
                that.purchaseDate = data.purchaseDate || DEFAULTS.purchaseDate;
                that.purchasePrice = data.purchasePrice || DEFAULTS.purchasePrice;
                that.codes = data.codes || DEFAULTS.codes;
                that.address = data.address || DEFAULTS.address;
                that.geo = data.geo || DEFAULTS.geo.slice();
                that.cover = data.cover || DEFAULTS.cover;
                that.catalog = data.catalog || DEFAULTS.catalog;

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

                $.publish('item.fromJson', data);
                return data;
            });
    };

    // Deprecated
    Item.prototype._toJsonKeyValues = function(){
        var that = this;
        var params = {};

        if( (this.keyValues!=null) &&
            (this.keyValues.length>0)) {
            $.each(this.keyValues, function(i, kv) {
                var param = 'keyValues__' + kv.key;
                params[param + "__kind"] = kv.kind;
                params[param + "__value"] = kv.value;
            });
        }

        return params;
    };

    // Deprecated
    Item.prototype._getKeyValue = function(kv, options) {
        // Flag is a special keyvalue, we won't read it into keyValues
        // but set it via _fromJsonFlag
        return (kv.key == FLAG) ? null : Base.prototype._getKeyValue(kv, options);
    };

    Item.prototype._isDirtyName = function() {
        return this._isDirtyProperty("name");
    };

    Item.prototype._isDirtyBrand = function() {
        return this._isDirtyProperty("brand");
    };

    Item.prototype._isDirtyModel = function() {
        return this._isDirtyProperty("model");
    };

    Item.prototype._isDirtyWarrantyDate = function() {
        return this._isDirtyMomentProperty("warrantyDate");
    };

    Item.prototype._isDirtyPurchaseDate = function() {
        return this._isDirtyMomentProperty("purchaseDate");
    };

    Item.prototype._isDirtyPurchasePrice = function() {
        return this._isDirtyProperty("purchasePrice");
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

    /**
     * updates the Item
     * We override because Item.update does not support updating categories
     * @param skipRead
     * @returns {*}
     */
    Item.prototype.update = function(skipRead) {
        if (this.isEmpty()) {
            return $.Deferred().reject(new Error("Cannot update to empty document"));
        }
        if (!this.existsInDb()) {
            return $.Deferred().reject(new Error("Cannot update document without id"));
        }
        if (!this.isValid()) {
            return $.Deferred().reject(new Error("Cannot update, invalid document"));
        }

        var that = this,
            dfdCheck = $.Deferred(),
            dfdCategory = $.Deferred(),
            dfdLocation = $.Deferred(),
            dfdFields = $.Deferred(),
            dfdBasic = $.Deferred();

        if (this._isDirtyCategory()) {
            this.canChangeCategory(this.category)
                .done(function(data) {
                    if (data.result) {
                        dfdCheck.resolve();
                    } else {
                        dfdCheck.reject(new Error("Unable to change item category"));
                    }
                });
        } else {
            dfdCheck.resolve();
        }

        return dfdCheck
            .then(function() {
                if (that._isDirtyCategory()) {
                    dfdCategory = that.changeCategory(that.category);
                } else {
                    dfdCategory.resolve();
                }

                if (that._isDirtyLocation()) {
                    dfdLocation = that.changeLocation(that.location);
                } else {
                    dfdLocation.resolve();
                }

                if (that._isDirtyFields()) {
                    dfdFields = that._updateFields();
                } else {
                    dfdFields.resolve();
                }

                if( (that._isDirtyName()) ||
                    (that._isDirtyBrand()) ||
                    (that._isDirtyModel()) ||
                    (that._isDirtyWarrantyDate()) ||
                    (that._isDirtyPurchaseDate()) ||
                    (that._isDirtyPurchasePrice())) {
                    dfdBasic = that.updateBasicFields(that.name, that.brand, that.model, that.warrantyDate, that.purchaseDate, that.purchasePrice);
                } else {
                    dfdBasic.resolve();
                }

                return $.when(dfdCategory, dfdLocation, dfdFields, dfdBasic);
            });
    };

    /**
     * Creates an Item
     * @name  Item#create
     * @method
     * @param skipRead skips reading the response via _fromJson (false)
     * @returns {promise}
     */
    Item.prototype.create = function(skipRead) {
        if (this.existsInDb()) {
            return $.Deferred().reject(new Error("Cannot create document, already exists in database"));
        }
        if (this.isEmpty()) {
            return $.Deferred().reject(new Error("Cannot create empty document"));
        }
        if (!this.isValid()) {
            return $.Deferred().reject(new Error("Cannot create, invalid document"));
        }

        var that = this,
            data = $.extend(this._toJson(), this._toJsonFields());

        delete data.id;

        return this.ds.create(data, this._fields)
            .then(function(data) {
                return (skipRead==true) ? data : that._fromJson(data);
            });
    };

    /**
     * Creates multiple instances of the same item
     * @name  Item#createMultiple
     * @method
     * @param  times
     * @param  autoNumber
     * @param  startFrom
     * @return {promise}
     */
    Item.prototype.createMultiple = function(times, autoNumber, startFrom, skipRead){
        if (this.existsInDb()) {
            return $.Deferred().reject(new Error("Cannot create document, already exists in database"));
        }
        if (this.isEmpty()) {
            return $.Deferred().reject(new Error("Cannot create empty document"));
        }
        if (!this.isValid()) {
            return $.Deferred().reject(new Error("Cannot create, invalid document"));
        }

        var that = this;
        var data = $.extend(this._toJson(), this._toJsonFields(), {
            times: times || 1,
            autoNumber: autoNumber || false,
            startFrom: startFrom
        });
        delete data.id;

        // BUGFFIX model name clash issue
        // model == Item property
        // model == database model
        if(!data.model || $.trim(data.model) == ""){
            data.brandModel = data.model;
            delete data.model;
        }

        return this._doApiCall({
            method: 'createMultiple',
            params: data
        }).then(function(data) {
            var dfd = (skipRead==true) ? $.Deferred().resolve(data[0]) : that._fromJson(data[0]);
            return dfd.then(function(){
                return data;
            });
        });
    };

    /**
     * Duplicates an item a number of times
     * @name Item#duplicate
     * @param times
     * @param location
     * @returns {promise}
     */
    Item.prototype.duplicate = function(times, location, autoNumber, startFrom) {
        return this._doApiCall({
            method: 'duplicate',
            params: {
                times: times,
                location: location,
                autoNumber: autoNumber,
                startFrom: startFrom
            },
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
     * Gets the last number for items with this name
     * @name Item#getLastNumber
     * @returns {promise}
     */
    Item.prototype.getLastNumber = function() {
        // Do a collection API call to get the last number for items with this name
        return this.ds.call(null, "getLastItemNumber", {name: this.name});
    };

    /**
     * Updates the basic fields of an item
     * @name Item#updateBasicFields
     * @param name
     * @param skipRead
     * @returns {promise}
     */
    Item.prototype.updateBasicFields = function(name, brand, model, warrantyDate, purchaseDate, purchasePrice, skipRead) {
        var that = this,
            params = {
                name: name,
                brand: brand,
                model: model,
                warrantyDate: warrantyDate,
                purchaseDate: purchaseDate,
                purchasePrice: purchasePrice
            };

        // Remove values of null during create
        // Avoids: 422 Unprocessable Entity
        // ValidationError (Item:TZe33wVKWwkKkpACp6Xy5T) (FloatField only accepts float values: ['purchasePrice'])
        for (var k in params) {
            if (params[k] == null) {
                delete params[k];
            }
        }

        return this.ds.update(this.id, params, this._fields)
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
     * Takes custody of an item
     * Puts it in the *in_custody* status
     * @name Item#takeCustody
     * @param customerId (when null, we'll take the customer of the user making the API call)
     * @param skipRead
     * @returns {promise}
     */
    Item.prototype.takeCustody = function(customerId, skipRead) {
        return this._doApiCall({method: 'takeCustody', params: {customer: customerId}, skipRead: skipRead});
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
     * @param customerId (when null, we'll take the customer of the user making the API call)
     * @param skipRead
     * @returns {promise}
     */
    Item.prototype.transferCustody = function(customerId, skipRead) {
        return this._doApiCall({method: 'transferCustody', params: {customer: customerId}, skipRead: skipRead});
    };

    return Item;
});
