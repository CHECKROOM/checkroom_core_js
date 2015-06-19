/**
 * The Transaction module
 * a base class for Reservations and Orders
 * Share similar manipulating of: status, dates, items, contacts, locations, comments, attachments
 * @module transaction
 * @implements Base
 * @copyright CHECKROOM NV 2015
 */
define([
    "jquery",
    "api",
    "base",
    "location"], /** @lends Base */ function ($, api, Base, Location) {

    var DEFAULTS = {
        status: "creating",
        from: null,
        to: null,
        due: null,
        contact: "",
        location: "",
        items: [],
        conflicts: []
    };

    // Allow overriding the ctor during inheritance
    // http://stackoverflow.com/questions/4152931/javascript-inheritance-call-super-constructor-or-use-prototype-chain
    var tmp = function(){};
    tmp.prototype = Base.prototype;

    /**
     * @name Transaction
     * @class Transaction
     * @constructor
     * @extends Base
     * @property {boolean}  autoCleanup               - Automatically cleanup the transaction if it becomes empty?
     * @property {Helper}  helper                     - A Helper object ref
     * @property {string}  status                     - The transaction status
     * @property {moment}  from                       - The transaction from date
     * @property {moment}  to                         - The transaction to date
     * @property {moment}  due                        - The transaction due date
     * @property {string}  contact                    - The Contact.id for this transaction
     * @property {string}  location                   - The Location.id for this transaction
     * @property {Array}  items                       - A list of Item.id strings
     * @property {Array}  conflicts                   - A list of conflict hashes
     */
    var Transaction = function(opt) {
        var spec = $.extend({}, opt);
        Base.call(this, spec);

        this.dsItems = spec.dsItems;                        // we'll also access the /items collection

        // should we automatically delete the transaction from the database?
        this.autoCleanup = (spec.autoCleanup!=null) ? spec.autoCleanup : false;
        this.helper = spec.helper;

        this.status = spec.status || DEFAULTS.status;                     // the status of the order or reservation
        this.from = spec.from || DEFAULTS.from;                           // a date in the future
        this.to = spec.to || DEFAULTS.to;                                 // a date in the future
        this.due = spec.due || DEFAULTS.due;                              // a date even further in the future, we suggest some standard avg durations
        this.contact = spec.contact || DEFAULTS.contact;                  // a contact id
        this.location = spec.location || DEFAULTS.location;               // a location id
        this.items = spec.items || DEFAULTS.items.slice();                // an array of item ids
        this.conflicts = spec.conflicts || DEFAULTS.conflicts.slice();    // an array of Conflict objects
    };

    Transaction.prototype = new tmp();
    Transaction.prototype.constructor = Location;

    //
    // Date helpers (possibly overwritten)
    //

    /**
     * Gets the lowest possible date to start this transaction
     * @method
     * @name Transaction#getMinDate
     * @returns {Moment} min date
     */
    Transaction.prototype.getMinDate = function() {
        var helper = this._getHelper();
        var now = helper.getNow();
        return now;
    };

    /**
     * Gets the latest possible date to end this transaction
     * @method
     * @name Transaction#getMaxDate
     * @returns {Moment} max date
     */
    Transaction.prototype.getMaxDate = function() {
        var helper = this._getHelper();
        var now = helper.getNow();
        var next = helper.roundTimeTo(now);
        return next.add(365, "day"); // TODO: Is this a sensible date?
    };

    /**
     * suggestEndDate, makes a new moment() object with a suggested end date,
     * already rounded up according to the group.profile settings
     * @method suggestEndDate
     * @name Transaction#suggestEndDate
     * @param {Moment} m a suggested end date for this transaction
     * @returns {*}
     */
    Transaction.prototype.suggestEndDate = function(m) {
        var helper = this._getHelper();
        var end = helper.addAverageDuration(m || helper.getNow());
        return helper.roundTimeTo(end);
    };

    //
    // Base overrides
    //
    /**
     * Checks if the transaction is empty
     * @method isEmpty
     * @name Transaction#isEmpty
     * @returns {*|boolean|boolean|boolean|boolean|boolean|boolean|boolean}
     */
    Transaction.prototype.isEmpty = function() {
        return (
            (Base.prototype.isEmpty.call(this)) &&
            (this.status==DEFAULTS.status) &&
            (this.from==DEFAULTS.from) &&
            (this.to==DEFAULTS.to) &&
            (this.due==DEFAULTS.due) &&
            (this.contact==DEFAULTS.contact) &&
            (this.location==DEFAULTS.location) &&
            (this.items.length==0)  // not DEFAULTS.items? :)
        );
    };

    /**
     * Checks if the transaction is dirty and needs saving
     * @method
     * @name Transaction#isDirty
     * @returns {*|boolean|boolean|boolean|boolean|boolean|boolean|boolean}
     */
    Transaction.prototype.isDirty = function() {
        return (
            Base.prototype.isDirty.call(this) || 
            this._isDirtyBasic() ||
            this._isDirtyDates() ||
            this._isDirtyLocation() ||
            this._isDirtyContact() ||
            this._isDirtyItems()
        );
    };

    Transaction.prototype._isDirtyBasic = function() {
        if (this.raw) {
            var status = this.raw.status || DEFAULTS.status;
            return (this.status!=status);
        } else {
            return false;
        }
    };

    Transaction.prototype._isDirtyDates = function() {
        if (this.raw) {
            var from = this.raw.from || DEFAULTS.from;
            var to = this.raw.to || DEFAULTS.to;
            var due = this.raw.due || DEFAULTS.due;
            return (
                (this.from!=from) ||
                (this.to!=to) || 
                (this.due!=due));
        } else {
            return false;
        }
    };

    Transaction.prototype._isDirtyLocation = function() {
        if (this.raw) {
            var location = DEFAULTS.location;
            if (this.raw.location) {
                location = (this.raw.location._id) ? this.raw.location._id : this.raw.location;
            }
            return (this.location!=location);
        } else {
            return false;
        }
    };

    Transaction.prototype._isDirtyContact = function() {
        if (this.raw) {
            var contact = DEFAULTS.contact;
            if (this.raw.customer) {
                contact = (this.raw.customer._id) ? this.raw.customer._id : this.raw.customer;
            }
            return (this.contact!=contact);
        } else {
            return false;
        }
    };

    Transaction.prototype._isDirtyItems = function() {
        if (this.raw) {
            var items = DEFAULTS.items.slice();
            if (this.raw.items) {
                // TODO!!
            }
            return false;
        } else {
            return false;
        }
    };

    Transaction.prototype._getDefaults = function() {
        return DEFAULTS;
    };

    /**
     * Writes out some shared fields for all transactions
     * Inheriting classes will probably add more to this
     * @param options
     * @returns {object}
     * @private
     */
    Transaction.prototype._toJson = function(options) {
        var data = Base.prototype._toJson.call(this, options);
        //data.started = this.from;  // VT: Will be set during checkout
        //data.finished = this.to;  // VT: Will be set during final checkin
        data.due = this.due;
        if (this.location) {
            // Make sure we send the location as id, not the entire object
            data.location = this._getId(this.location);
        }
        if (this.contact) {
            // Make sure we send the contact as id, not the entire object
            // VT: It's still called the "customer" field on the backend!
            data.customer = this._getId(this.contact);
        }
        return data;
    };

    /**
     * Reads the transaction from a json object
     * @param data
     * @param options
     * @returns {promise}
     * @private
     */
    Transaction.prototype._fromJson = function(data, options) {
        var that = this;
        return Base.prototype._fromJson.call(this, data, options)
            .then(function() {
                that.status = data.status || DEFAULTS.status;
                that.location = data.location || DEFAULTS.location;
                that.contact = data.customer || DEFAULTS.contact;
                that.items = data.items || DEFAULTS.items.slice();
                return that._getConflicts()
                    .then(function(conflicts) {
                        that.conflicts = conflicts;
                    });
            });
    };

    Transaction.prototype._toLog = function(options) {
        var obj = this._toJson(options);
        obj.minDate = this.getMinDate().toJSONDate();
        obj.maxDate = this.getMaxDate().toJSONDate();
        console.log(obj);
    };

    // Setters
    // ----
    
    // From date setters

    /**
     * Clear the transaction from date
     * @method
     * @name Transaction#clearFromDate
     * @param skipRead
     * @returns {promise}
     */
    Transaction.prototype.clearFromDate = function(skipRead) {
        this.from = DEFAULTS.from;
        return this._handleTransaction(skipRead);
    };

    /**
     * Sets the transaction from date
     * @method
     * @name Transaction#setFromDate
     * @param date
     * @param skipRead
     * @returns {promise}
     */
    Transaction.prototype.setFromDate = function(date, skipRead) {
        this.from = this.helper.roundTimeFrom(date);
        return this._handleTransaction(skipRead);
    };

    // To date setters

    /**
     * Clear the transaction to date
     * @method
     * @name Transaction#clearToDate
     * @param skipRead
     * @returns {promise}
     */
    Transaction.prototype.clearToDate = function(skipRead) {
        this.to = DEFAULTS.to;
        return this._handleTransaction(skipRead);
    };

    /**
     * Sets the transaction to date
     * @method
     * @name Transaction#setToDate
     * @param date
     * @param skipRead
     * @returns {promise}
     */
    Transaction.prototype.setToDate = function(date, skipRead) {
        this.to = this.helper.roundTimeTo(date);
        return this._handleTransaction(skipRead);
    };

    // Due date setters

    /**
     * Clear the transaction due date
     * @method
     * @name Transaction#clearDueDate
     * @param skipRead
     * @returns {promise}
     */
    Transaction.prototype.clearDueDate = function(skipRead) {
        this.due = DEFAULTS.due;
        return this._handleTransaction(skipRead);
    };

    /**
     * Set the transaction due date
     * @method
     * @name Transaction#setDueDate
     * @param date
     * @param skipRead
     * @returns {promise}
     */
    Transaction.prototype.setDueDate = function(date, skipRead) {
        this.due = this.helper.roundTimeTo(date);
        return this._handleTransaction(skipRead);
    };

    // Location setters
    /**
     * Sets the location for this transaction
     * @method
     * @name Transaction#setLocation
     * @param locationId
     * @param skipRead skip parsing the returned json response into the transaction
     * @returns {promise}
     */
    Transaction.prototype.setLocation = function(locationId, skipRead) {
        this.location = locationId;
        if (this.existsInDb()) {
            return this._doApiCall({method: 'setLocation', params: {location: locationId}, skipRead: skipRead});
        } else {
            return this._createTransaction(skipRead);
        }
    };

    /**
     * Clears the location for this transaction
     * @method
     * @name Transaction#clearLocation
     * @param skipRead skip parsing the returned json response into the transaction
     * @returns {promise}
     */
    Transaction.prototype.clearLocation = function(skipRead) {
        var that = this;
        this.location = DEFAULTS.location;
        return this._doApiCall({method: 'clearLocation', skipRead: skipRead})
            .then(function() {
                return that._ensureTransactionDeleted();
            });
    };

    // Contact setters

    /**
     * Sets the contact for this transaction
     * @method
     * @name Transaction#setContact
     * @param contactId
     * @param skipRead skip parsing the returned json response into the transaction
     * @returns {promise}
     */
    Transaction.prototype.setContact = function(contactId, skipRead) {
        this.contact = contactId;
        if (this.existsInDb()) {
            return this._doApiCall({method: 'setCustomer', params: {customer: contactId}, skipRead: skipRead});
        } else {
            return this._createTransaction(skipRead);
        }
    };

    /**
     * Clears the contact for this transaction
     * @method
     * @name Transaction#clearContact
     * @param skipRead skip parsing the returned json response into the transaction
     * @returns {promise}
     */
    Transaction.prototype.clearContact = function(skipRead) {
        var that = this;
        this.contact = DEFAULTS.contact;
        return this._doApiCall({method: 'clearCustomer', skipRead: skipRead})
            .then(function() {
                return that._ensureTransactionDeleted();
            });
    };

    // Business logic
    // ----

    // Inheriting classes will use the setter functions below to update the object in memory
    // the _handleTransaction will create, update or delete the actual document via the API

    /**
     * addItems; adds a bunch of Items to the transaction using a list of item ids
     * It creates the transaction if it doesn't exist yet
     * @name Transaction#addItems
     * @method addItems
     * @param items
     * @param skipRead
     * @returns {promise}
     */
    Transaction.prototype.addItems = function(items, skipRead) {
        var that = this;
        return this._ensureTransactionExists(skipRead)
            .then(function() {
                return that._doApiCall({
                    method: 'addItems',
                    params: {items: items},
                    skipRead: skipRead
                });
            });
    };

    /**
     * removeItems; removes a bunch of Items from the transaction using a list of item ids
     * It deletes the transaction if it's empty afterwards and autoCleanup is true
     * @name Transaction#removeItems
     * @method removeItems
     * @param items
     * @param skipRead
     * @returns {promise}
     */
    Transaction.prototype.removeItems = function(items, skipRead) {
        if (!this.existsInDb()) {
            return $.Deferred().reject(new Error("Cannot removeItems from document without id"));
        }

        var that = this;
        return this._doApiCall({
            method: 'removeItems',
            params: {items: items},
            skipRead: skipRead
        })
            .then(function() {
                return that._ensureTransactionDeleted();
            });
    };

    /**
     * clearItems; removes all Items from the transaction
     * It deletes the transaction if it's empty afterwards and autoCleanup is true
     * @name Transaction#clearItems
     * @method clearItems
     * @param skipRead
     * @returns {promise}
     */
    Transaction.prototype.clearItems = function(skipRead) {
        if (!this.existsInDb()) {
            return $.Deferred().reject(new Error("Cannot clearItems from document without id"));
        }

        var that = this;
        return this._doApiCall({
            method: 'clearItems',
            skipRead: skipRead
        })
            .then(function() {
                return that._ensureTransactionDeleted();
            });
    };

    /**
     * swapItem; swaps one item for another in a transaction
     * @name Transaction#swapItem
     * @method swapItem
     * @param fromItem
     * @param toItem
     * @param skipRead
     * @returns {promise}
     */
    Transaction.prototype.swapItem = function(fromItem, toItem, skipRead) {
        if (!this.existsInDb()) {
            return $.Deferred().reject(new Error("Cannot clearItems from document without id"));
        }

        // swapItem cannot create or delete a transaction
        return this._doApiCall({
            method: 'swapItem',
            params: {fromItem: fromItem, toItem: toItem},
            skipRead: skipRead
        });
    };

    //
    // Implementation stuff
    //
    /**
     * Gets a list of Conflict objects for this transaction
     * Will be overriden by inheriting classes
     * @returns {promise}
     * @private
     */
    Transaction.prototype._getConflicts = function() {
        return $.Deferred().resolve([]);
    };

    Transaction.prototype._getHelper = function() {
        return this.helper;
    };

    Transaction.prototype._getDateHelper = function() {
        return this._getHelper().dateHelper;
    };

    /**
     * Searches for Items that are available for this transaction
     * @param params: a dict with params, just like items/search
     * @param listName: restrict search to a certain list
     * @param useAvailabilities (uses items/searchAvailable instead of items/search)
     * @param onlyUnbooked (true by default, only used when useAvailabilities=true)
     * @param skipItems array of item ids that should be skipped
     * @private
     * @returns {*}
     */
    Transaction.prototype._searchItems = function(params, listName, useAvailabilities, onlyUnbooked, skipItems) {
        if (this.dsItems==null) {
            return $.Deferred().reject(new api.ApiBadRequest(this.crtype+" has no DataSource for items"));
        }

        // Restrict the search to just the Items that are:
        // - at this location
        // - in the specified list (if any)
        params = params || {};
        params.location = this._getId(this.location);

        if( (listName!=null) &&
            (listName.length>0)) {
            params.listName = listName
        }

        // Make sure we only pass the item ids,
        // and not the entire items
        var that = this;
        var skipList = null;
        if( (skipItems) &&
            (skipItems.length)) {
            skipList = skipItems.slice(0);
            $.each(skipList, function(i, item) {
                skipList[i] = that._getId(item);
            });
        }

        if (useAvailabilities==true) {
            // We'll use a more advanced API call /items/searchAvailable
            // It's a bit slower and the .count result is not usable

            // It requires some more parameters to be set
            params.onlyUnbooked = (onlyUnbooked!=null) ? onlyUnbooked : true;
            params.fromDate = this.from;
            params.toDate = this.to;
            params._limit = 20;  // TODO
            params._skip = 0;  // TODO
            if( (skipList) &&
                (skipList.length)) {
                params.skipItems = skipList;
            }

            return this.dsItems.call(null, 'searchAvailable', params);
        } else {
            // We don't need to use availabilities,
            // we should better use the regular /search
            // it's faster and has better paging :)
            if( (skipList) &&
                (skipList.length)) {
                params.pk__nin = skipList;
            }
            return this.dsItems.search(params);
        }
    };

    /**
     * Returns a rejected promise when a date is not between min and max date
     * Otherwise the deferred just resolves to the date
     * It's used to do some quick checks of transaction dates
     * @param date
     * @returns {*}
     * @private
     */
    Transaction.prototype._checkDateBetweenMinMax = function(date, minDate, maxDate) {
        minDate = minDate || this.getMinDate();
        maxDate = maxDate || this.getMaxDate();
        if( (date<minDate) || 
            (date>maxDate)) {
            var msg = "date is outside of min max range " + minDate.toJSONDate() +"->" + maxDate.toJSONDate();
            return $.Deferred().reject(new api.ApiUnprocessableEntity(msg));
        } else {
            return $.Deferred().resolve(date);
        }
    };

    /**
     * _handleTransaction: creates, updates or deletes a transaction document
     * @returns {*}
     * @private
     */
    Transaction.prototype._handleTransaction = function(skipRead) {
        var isEmpty = this.isEmpty();
        if (this.existsInDb()) {
            if (isEmpty) {
                if (this.autoCleanup) {
                    return this._deleteTransaction();
                } else {
                    return $.Deferred().resolve();
                }
            } else {
                return this._updateTransaction(skipRead);
            }
        } else if (!isEmpty) {
            return this._createTransaction(skipRead);
        } else {
            return $.Deferred().resolve();
        }
    };

    Transaction.prototype._deleteTransaction = function() {
        return this.delete();
    };

    Transaction.prototype._updateTransaction = function(skipRead) {
        return this.update(skipRead);
    };

    Transaction.prototype._createTransaction = function(skipRead) {
        return this.create(skipRead);
    };

    Transaction.prototype._ensureTransactionExists = function(skipRead) {
        return (!this.existsInDb()) ? this._createTransaction(skipRead) : $.Deferred().resolve();
    };

    Transaction.prototype._ensureTransactionDeleted = function() {
        return ((this.isEmpty()) && (this.autoCleanup)) ? this._deleteTransaction() : $.Deferred().resolve();
    };

    return Transaction;
});
