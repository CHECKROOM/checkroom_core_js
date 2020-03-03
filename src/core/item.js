/**
 * The Item module
 * @module item
 * @copyright CHECKROOM NV 2015
 */
define([
    'jquery',
    'common',
    'base'], /** @lends Base */ function ($, common, Base) {

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
            residualValue: 0,
            location: "",
            category: "",
            geo: [DEFAULT_LAT,DEFAULT_LONG],
            address: "",
            order: null,
            kit: null,
            custody: null,
            cover: "",
            catalog: null,
            canReserve: 'available',
            canOrder: 'available',
            canCustody: 'available',
            allowReserve: true,
            allowOrder: true,
            allowCustody: true,
            flagged: null,
            expired: null
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
        this.residualValue = spec.residualValue || DEFAULTS.residualValue;
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

        this.allowReserve = spec.allowReserve !== undefined ? spec.allowReserve : DEFAULTS.allowReserve;
        this.allowCheckout = spec.allowOrder !== undefined ? spec.allowOrder : DEFAULTS.allowOrder;
        this.allowCustody = spec.allowCustody !== undefined ? spec.allowCustody : DEFAULTS.allowCustody;
        this._canReserve = spec.canReserve !== undefined ? spec.canReserve : DEFAULTS.canReserve;
        this._canCheckout = spec.canOrder !== undefined ? spec.canOrder : DEFAULTS.canOrder;
        this._canCustody = spec.canCustody !== undefined ? spec.canCustody : DEFAULTS.canCustody;
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
        (this.residualValue==DEFAULTS.residualValue) &&
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
            this._isDirtyResidualValue() ||
            this._isDirtyCategory() ||
            this._isDirtyLocation() ||
            this._isDirtyGeo() || 
            this._isDirtyFlag() ||
            this._isDirtyPermissions()
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
        data.residualValue = this.residualValue || DEFAULTS.residualValue;
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

        if(data.allowOrder === undefined) data.allowOrder = DEFAULTS.allowOrder;
        if(data.allowReserve === undefined) data.allowReserve = DEFAULTS.allowReserve;
        if(data.allowCustody === undefined) data.allowCustody = DEFAULTS.allowCustody;

        return Base.prototype._fromJson.call(this, data, options)
            .then(function() {
                that.name = data.name || DEFAULTS.name;
                that.status = data.status || DEFAULTS.status;
                that.brand = data.brand || DEFAULTS.brand;
                that.model = data.model || DEFAULTS.model;
                that.warrantyDate = data.warrantyDate || DEFAULTS.warrantyDate;
                that.purchaseDate = data.purchaseDate || DEFAULTS.purchaseDate;
                that.purchasePrice = data.purchasePrice || DEFAULTS.purchasePrice;
                that.residualValue = data.residualValue || DEFAULTS.residualValue;
                that.codes = data.codes || DEFAULTS.codes;
                that.address = data.address || DEFAULTS.address;
                that.geo = data.geo || DEFAULTS.geo.slice();
                that.cover = data.cover || DEFAULTS.cover;
                that.catalog = data.catalog || DEFAULTS.catalog;
                that.flagged = data.flagged || DEFAULTS.flagged;
                that.expired = data.expired || DEFAULTS.expired;

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

                that._canReserve = data.canReserve !== undefined ? data.canReserve: DEFAULTS.canReserve;
                that._canOrder = data.canOrder !== undefined ? data.canOrder : DEFAULTS.canOrder;
                that._canCustody = data.canCustody !== undefined ? data.canCustody : DEFAULTS.canCustody;
                that.allowReserve = data.allowReserve !== undefined ? data.allowReserve : DEFAULTS.allowReserve;
                that.allowCheckout = data.allowOrder !== undefined ? data.allowOrder : DEFAULTS.allowOrder;
                that.allowCustody = data.allowCustody !== undefined ? data.allowCustody : DEFAULTS.allowCustody;

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
    Item.prototype._isDirtyName = function() {
        return this._isDirtyStringProperty("name");
    };

    Item.prototype._isDirtyBrand = function() {
        return this._isDirtyStringProperty("brand");
    };

    Item.prototype._isDirtyModel = function() {
        return this._isDirtyStringProperty("model");
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

    Item.prototype._isDirtyResidualValue = function() {
        return this._isDirtyProperty("residualValue");
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

    Item.prototype._isDirtyPermissions = function(){
        if(this.raw){
            var allowReserve = this.raw.allowReserve,
                allowCheckout = this.raw.allowOrder,
                allowCustody = this.raw.allowCustody;

            return (this.allowReserve != allowReserve) ||
                    (this.allowCheckout != allowCheckout) ||
                    (this.allowCustody != allowCustody);
        }else{
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

    Item.prototype._isDirtyFlag = function() {
        if(this.raw){
            return this.raw.flag != this.flag;
        }else{
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
            dfdPermissions = $.Deferred(),
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
                    (that._isDirtyPurchasePrice()) ||
                    (that._isDirtyResidualValue())) {
                    dfdBasic = that.updateBasicFields(that.name, that.brand, that.model, that.warrantyDate, that.purchaseDate, that.purchasePrice, that.residualValue);
                } else {
                    dfdBasic.resolve();
                }

                if(that._isDirtyPermissions()){
                    dfdPermissions = that.updateAllowedActions(that.allowReserve, that.allowCheckout, that.allowCustody);
                }else{
                    dfdPermissions.resolve();
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
        if (data.model != null) {
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
     * Checks if we can go to the checkout of an item (based on status)
     * @name Item#canGoToCheckout
     * @returns {boolean}
     */
    Item.prototype.canGoToCheckout = function() {
        return common.itemCanGoToCheckout(this) && !$.isEmptyObject(this.order);
    };

    /**
     * Checks if an item can be checked in (based on status)
     * @name Item#canCheckin
     * @returns {boolean}
     */
    Item.prototype.canCheckin = function() {
        return common.itemCanCheckin(this);
    };

    /**
     * Checks if an item can be expired (based on status)
     * @name Item#canExpire
     * @returns {boolean}
     */
    Item.prototype.canExpire = function() {
        return common.itemCanExpire(this);
    };

    /**
     * Checks if an item can be made available again (based on status)
     * @name Item#canUndoExpire
     * @returns {boolean}
     */
    Item.prototype.canUndoExpire = function() {
        return common.itemCanUndoExpire(this);
    };

    /**
     * Checks if an item can be deleted
     * @name Item#canDelete
     * @returns {boolean}
     */
    Item.prototype.canDelete = function() {
        var can = Base.prototype.canDelete.call(this);
        return can && common.itemCanDelete(this);
    };

    /**
     * Expires an item, puts it in the *expired* status
     * @name Item#expire
     * @param message
     * @param skipRead
     * @returns {promise}
     */
    Item.prototype.expire = function(message, skipRead) {
        return this._doApiCall({method: 'expire', params:{ message: message || "" }, skipRead: skipRead});
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
    Item.prototype.updateBasicFields = function(name, brand, model, warrantyDate, purchaseDate, purchasePrice, residualValue, skipRead) {
        var that = this,
            params = {};

        if( (name!=null) &&
            (name!=this.raw.name)) {
            params["name"] = name;
        }
        if( (brand!=null) &&
            (brand!=this.raw.brand)) {
            params["brand"] = brand;
        }
        if( (model!=null) &&
            (model!=this.raw.model)) {
            params["model"] = model;
        }
        if( (warrantyDate!=null)){
            // Update date or clear date?
            if(typeof(warrantyDate) === "object" && warrantyDate.isValid()){
                // Only update if date changed
                if(!warrantyDate.isSame(this.raw.warrantyDate)){
                    params["warrantyDate"] = warrantyDate;
                }
            }else{
                params["warrantyDate"] = "";  
            }
        }
        if( (purchaseDate!=null)) {
            // Update date or clear date
            if(typeof(purchaseDate) === "object" && purchaseDate.isValid()){
                // Only update if date changed
                if(!purchaseDate.isSame(this.raw.purchaseDate)){
                    params["purchaseDate"] = purchaseDate;
                }
            }else{
                params["purchaseDate"] = "";
            }
        }
        if( (purchasePrice!=null) &&
            (purchasePrice!=this.raw.purchasePrice)) {
            params["purchasePrice"] = purchasePrice;
        }
        if( (residualValue!=null) &&
            (residualValue!=this.raw.residualValue)) {
            params["residualValue"] = residualValue;
        }

        // Remove values of null during create
        // Avoids: 422 Unprocessable Entity
        // ValidationError (Item:TZe33wVKWwkKkpACp6Xy5T) (FloatField only accepts float values: ['purchasePrice'])
        //for (var k in params) {
        //    if (params[k] == null) {
        //        delete params[k];
        //    }
        //}

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
            skipRead: true,  // the response is a hash with results and conflicts
            _fields: "*"
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

    Item.prototype.updateAllowedActions = function(canReserve, canCheckout, canCustody, skipRead) {
        return this._doApiCall({ 
            method: 'setAllowedActions',
            params: { reserve: canReserve, order: canCheckout, custody: canCustody  },
            skipRead: skipRead
        });
    }

    /**
     * Checks if an item can be reserved (based on status)
     * @name Item#canReserve
     * @returns {boolean}
     */
    Item.prototype.canReserve = function() {
        return common.itemCanReserve(this.raw);
    };

    /**
     * Checks if an item can be checked out (based on status)
     * @name Item#canCheckout
     * @returns {boolean}
     */
    Item.prototype.canCheckout = function() {
        return common.itemCanCheckout(this.raw);
    };


    /**
     * Checks if custody can be taken for an item (based on status)
     * @name Item#canTakeCustody
     * @returns {boolean}
     */
    Item.prototype.canTakeCustody = function() {
        return common.itemCanTakeCustody(this.raw);
    };

    /**
     * Checks if custody can be released for an item (based on status)
     * @name Item#canReleaseCustody
     * @returns {boolean}
     */
    Item.prototype.canReleaseCustody = function() {
        return common.itemCanReleaseCustody(this.raw);
    };

    /**
     * Checks if custody can be transferred for an item (based on status)
     * @name Item#canTransferCustody
     * @returns {boolean}
     */
    Item.prototype.canTransferCustody = function() {
        return common.itemCanTransferCustody(this.raw);
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

    /**
     * Get a list depreciations 
     * 
     * @name Item#getDepreciation
     * @param frequancy
     * @returns {promise}
     */
    Item.prototype.getDepreciation = function(frequency) {
        return this.ds.call(this.id, 'getDepreciation', {frequency: frequency || "quarterly" });
    };

    return Item;
});
