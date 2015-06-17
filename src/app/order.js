/**
 * The Order module
 * @module module
 * @copyright CHECKROOM NV 2015
 */
define([
    "jquery",
    "api",
    "transaction",
    "conflict"], /** @lends Transaction */  function ($, api, Transaction, Conflict) {

    // Allow overriding the ctor during inheritance
    // http://stackoverflow.com/questions/4152931/javascript-inheritance-call-super-constructor-or-use-prototype-chain
    var tmp = function() {};
    tmp.prototype = Transaction.prototype;

    /**
     * @name Order
     * @class Order
     * @constructor
     * @extends Transaction
     */
    var Order = function(opt) {
        var spec = $.extend({
            crtype: "cheqroom.types.order",
            fields: ["*"]
        }, opt);
        Transaction.call(this, spec);
    };

    Order.prototype = new tmp();
    Order.prototype.constructor = Order;

    //
    // Date helpers; we'll need these for sliding from / to dates during a long user session
    //

    /**
     * Overwrite only getMinDate, max date stays one year from now
     * @method
     * @name Order#getMindDate
     * @returns {*}
     */
    Order.prototype.getMinDate = function() {
        // Reservations can only start from the next timeslot at the earliest
        var profileHelper = this._getHelper();
        var now = profileHelper.getNow();
        var next = profileHelper.roundTimeFrom(now);
        return next;
    };

    //
    // Document overrides
    //
    Order.prototype._toJson = function(options) {
        var data = Transaction.prototype._toJson.call(this, options);
        data.fromDate = (this.fromDate!=null) ? this.fromDate.toJSONDate() : "null";
        data.toDate = (this.toDate!=null) ? this.toDate.toJSONDate() : "null";
        data.due = (this.due!=null) ? this.due.toJSONDate() : "null";
        return data;
    };

    Order.prototype._fromJson = function(data, options) {
        var that = this;
        return Transaction.prototype._fromJson.call(this, data, options)
            .then(function() {
                that.from = ((data.started==null) || (data.started=="null")) ? null : data.started;
                that.to = ((data.finished==null) || (data.finished=="null")) ? null : data.finished;
                that.due = ((data.due==null) || (data.due=="null")) ? null: data.due;
                $.publish("order.fromJson", data);
                return data;
            });
    };

    //
    // Helpers
    //
    /**
     * Gets a friendly order duration or empty string
     * @method
     * @name Order#getFriendlyDuration
     * @returns {string}
     */
    Order.prototype.getFriendlyDuration = function() {
        var duration = this.getDuration();
        return (duration!=null) ? this._getDateHelper().getFriendlyDuration(duration) : "";
    };

    /**
     * Gets a moment duration object
     * @method
     * @name Order#getDuration
     * @returns {*}
     */
    Order.prototype.getDuration = function() {
        if (this.from!=null) {
            var to = (this.status=="closed") ? this.to : this.due;
            if (to) {
                return moment.duration(to - this.from);
            }
        }
        return null;
    };

    /**
     * Checks if a PDF document can be generated
     * @method
     * @name Order#canGenerateAgreement
     * @returns {boolean}
     */
    Order.prototype.canGenerateAgreement = function() {
        return (this.status=="open") || (this.status=="closed");
    };

    /**
     * Checks if order can be checked in
     * @method
     * @name Order#canCheckin
     * @returns {boolean}
     */
    Order.prototype.canCheckin = function() {
        return (this.status=="open");
    };

    /**
     * Checks if order can be checked out
     * @method
     * @name Order#canCheckout
     * @returns {boolean}
     */
    Order.prototype.canCheckout = function() {
        return (
            (this.status=="creating") &&
            (this.location) &&
            (this.contact) &&
            (this.due) &&
            (this.items) &&
            (this.items.length));
    };

    /**
     * Checks if order can undo checkout
     * @method
     * @name Order#canUndoCheckout
     * @returns {boolean}
     */
    Order.prototype.canUndoCheckout = function() {
        return (this.status=="open");
    };

    //
    // Base overrides
    //

    //
    // Transaction overrides
    //
    /**
     * Gets a list of Conflict objects
     * used during Transaction._fromJson
     * @returns {promise}
     * @private
     */
    Order.prototype._getConflicts = function() {
        var conflicts = [];

        // Only orders which are incomplete,
        // but have items and / or due date can have conflicts
        if( (this.status=="creating") &&
            (this.items.length>0)) {

            // Check if all the items are at the right location
            var locId = this._getId(this.location);
            if (locId) {
                $.each(this.items, function(i, item) {
                    if (item.location != locId) {
                        conflicts.push(new Conflict({
                            kind: "location",
                            item: item._id,
                            itemName: item.name,
                            locationCurrent: item.location,
                            locationDesired: locId
                        }));
                    }
                });
            }

            // If we have a due date,
            // check if it conflicts with any reservations
            if (this.due) {
                var that = this;
                var kind = "";
                var transItem = null;

                // Get the availabilities for these items
                return this.dsItems.call(null, "getAvailabilities", {
                    items: $.map(this.items, function(item) { return item._id; }),
                    fromDate: this.from,
                    toDate: this.due})
                    .then(function(data) {

                        // Run over unavailabilties for these items
                        $.each(data, function(i, av) {
                            // Lookup the more complete item object via transaction.items
                            // It has useful info like item.name we can use in the conflict message
                            transItem = _.find(that.items, function(item) { return item._id == av.item});

                            // Order cannot conflict with itself
                            if (av.order != that.id) {
                                kind = "";
                                kind = kind || (av.order) ? "order" : "";
                                kind = kind || (av.reservation) ? "reservation" : "";

                                conflicts.push(new Conflict({
                                    kind: kind,
                                    item: transItem._id,
                                    itemName: transItem.name,
                                    fromDate: av.fromDate,
                                    toDate: av.toDate,
                                    doc: av.order || av.reservation
                                }));
                            }
                        });

                        return conflicts;
                    });
            }
        }

        return $.Deferred().resolve(conflicts);
    };

    /**
     * Sets the Order from and due date in a single call
     * @method
     * @name Order#setFromDueDate
     * @param from
     * @param due (optional) if null, we'll take the default average checkout duration as due date
     * @param skipRead
     * @returns {promise}
     */
    Order.prototype.setFromDueDate = function(from, due, skipRead) {
        if (this.status!="creating") {
            return $.Deferred().reject(new api.ApiUnprocessableEntity("Cannot set order from / due date, status is "+this.status));
        }

        var that = this;
        var roundedFromDate = this._getHelper().roundTimeFrom(from);
        var roundedDueDate = (due) ?
            this._getHelper().roundTimeTo(due) :
            this._getHelper().addAverageDuration(roundedFromDate);


        return this._checkFromDueDate(roundedFromDate, roundedDueDate)
            .then(function() {
                that.from = roundedFromDate;
                that.due = roundedDueDate;
                return that._handleTransaction(skipRead);
            });
    };

    /**
     * Sets the Order from date
     * @method
     * @name Order#setFromDate
     * @param date
     * @param skipRead
     * @returns {promise}
     */
    Order.prototype.setFromDate = function(date, skipRead) {
        if (this.status!="creating") {
            return $.Deferred().reject(new api.ApiUnprocessableEntity("Cannot set order from date, status is "+this.status));
        }

        var that = this;
        var roundedFromDate = this._getHelper().roundTimeFrom(date);

        return this._checkFromDueDate(roundedFromDate, this.due)
            .then(function() {
                that.from = roundedFromDate;
                return that._handleTransaction(skipRead);
            });
    };

    /**
     * Clears the order from date
     * @method
     * @name Order#clearFromDate
     * @param skipRead
     * @returns {promise}
     */
    Order.prototype.clearFromDate = function(skipRead) {
        if (this.status!="creating") {
            return $.Deferred().reject(new api.ApiUnprocessableEntity("Cannot clear order from date, status is "+this.status));
        }

        this.from = null;

        return this._handleTransaction(skipRead);
    };

    /**
     * Sets the order due date
     * @method
     * @name Order#setDueDate
     * @param due
     * @param skipRead
     * @returns {promise}
     */
    Order.prototype.setDueDate = function(due, skipRead) {
        // Cannot change the to-date of a reservation that is not in status "creating"
        if( (this.status!="creating") &&
            (this.status!="open")){
            return $.Deferred().reject(new api.ApiUnprocessableEntity("Cannot set order due date, status is "+this.status));
        }

        // The to date must be:
        // 1) at least 30 minutes into the feature
        // 2) at least 15 minutes after the from date (if set)
        var that = this;
        var roundedDueDate = this._getHelper().roundTimeTo(due);

        // Don't use _checkFromDueDate,
        // Use _checkDateBetweenMinMax directly, so it works extending order.due on "open" orders
        var min = this.getMinDate();
        var max = this.getMaxDate();
        return this._checkDateBetweenMinMax(roundedDueDate, min, max)
            .then(function() {
                that.due = roundedDueDate;
                return that._handleTransaction(skipRead);
            });
    };

    /**
     * Clears the order due date
     * @method
     * @name Order#clearDueDate
     * @param skipRead
     * @returns {*}
     */
    Order.prototype.clearDueDate = function(skipRead) {
        if (this.status!="creating") {
            return $.Deferred().reject(new api.ApiUnprocessableEntity("Cannot clear order due date, status is "+this.status));
        }

        this.due = null;

        return this._handleTransaction(skipRead);
    };

    Order.prototype.setToDate = function(date, skipRead) {
        throw "Order.setToDate not implemented, it is set during order close";
    };

    Order.prototype.clearToDate = function(date, skipRead) {
        throw "Order.clearToDate not implemented, it is set during order close";
    };

    //
    // Business logic calls
    //
    /**
     * Searches for items that could match this order
     * @method
     * @name Order#searchItems
     * @param params
     * @param useAvailabilies
     * @param onlyUnbooked
     * @param skipItems
     * @returns {*}
     */
    Order.prototype.searchItems = function(params, useAvailabilies, onlyUnbooked, skipItems) {
        return this._searchItems(params, "available", useAvailabilies, onlyUnbooked, skipItems || this.items);
    };

    /**
     * Checks in the order
     * @method
     * @name Order#checkin
     * @param itemIds
     * @param skipRead
     * @returns {promise}
     */
    Order.prototype.checkin = function(itemIds, skipRead) {
        return this._doApiCall({method: "checkin", params: {items: itemIds}, skipRead: skipRead});
    };

    /**
     * Checks out the order
     * @method
     * @name Order#checkout
     * @param skipRead
     * @returns {*}
     */
    Order.prototype.checkout = function(skipRead) {
        return this._doApiCall({method: "checkout", skipRead: skipRead});
    };

    /**
     * Undoes the order checkout
     * @method
     * @name Order#undoCheckout
     * @param skipRead
     * @returns {*}
     */
    Order.prototype.undoCheckout = function(skipRead) {
        return this._doApiCall({method: "undoCheckout", skipRead: skipRead});
    };

    /**
     * Generates a PDF agreement for the order
     * @method
     * @name Order#generateAgreement
     * @param skipRead
     * @returns {*}
     */
    Order.prototype.generateAgreement = function(skipRead) {
        return this._doApiCall({method: "generateAgreement", skipRead: skipRead});
    };

    //
    // Implementation
    //
    Order.prototype._checkFromDueDate = function(from, due) {
        var dateHelper = this._getDateHelper();
        var roundedFromDate = from; //(from) ? this._getHelper().roundTimeFrom(from) : null;
        var roundedDueDate = due; //(due) ? this._getHelper().roundTimeTo(due) : null;

        if (roundedFromDate && roundedDueDate) {
            return $.when(
                this._checkDateBetweenMinMax(roundedFromDate),
                this._checkDateBetweenMinMax(roundedDueDate)
            )
                .then(function(fromRes, dueRes) {
                    var interval = dateHelper.roundMinutes;
                    if (roundedDueDate.diff(roundedFromDate, "minutes") < interval) {
                        return $.Deferred().reject(new api.ApiUnprocessableEntity("Cannot set order from date, after (or too close to) to date "+roundedDueDate.toJSONDate()));
                    }
                    if (roundedFromDate.diff(roundedDueDate, "minutes") > interval) {
                        return $.Deferred().reject(new api.ApiUnprocessableEntity("Cannot set order due date, before (or too close to) from date "+roundedFromDate.toJSONDate()));
                    }
                });
        } else if (roundedFromDate) {
            return this._checkDateBetweenMinMax(roundedFromDate);
        } else if (roundedDueDate) {
            return this._checkDateBetweenMinMax(roundedDueDate);
        } else {
            return $.Deferred().reject(new api.ApiUnprocessableEntity("Cannot from/due date, both are null"));
        }
    };

    return Order;
    
});
