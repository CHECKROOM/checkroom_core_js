/**
 * The Order module
 * @module module
 * @copyright CHECKROOM NV 2015
 */
define([
    "jquery",
    "api",
    "transaction"], function ($, api, Transaction) {

    // Allow overriding the ctor during inheritance
    // http://stackoverflow.com/questions/4152931/javascript-inheritance-call-super-constructor-or-use-prototype-chain
    var tmp = function() {};
    tmp.prototype = Transaction.prototype;

    /**
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
    // Date helpers; we"ll need these for sliding from / to dates during a long user session
    //

    /**
     * Overwrite only getMinDate, max date stays one year from now
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
    Order.prototype.getFriendlyDuration = function() {
        var duration = this.getDuration();
        return (duration!=null) ? this._getDateHelper().getFriendlyDuration(duration) : "";
    };

    Order.prototype.getDuration = function() {
        if (this.from!=null) {
            var to = (this.status=="closed") ? this.to : this.due;
            if (to) {
                return moment.duration(to - this.from);
            }
        }
        return null;
    };

    Order.prototype.canGenerateAgreement = function() {
        return (this.status=="open") || (this.status=="closed");
    };

    Order.prototype.canCheckin = function() {
        return (this.status=="open");
    };

    Order.prototype.canCheckout = function() {
        return (
            (this.status=="creating") &&
            (this.location) &&
            (this.contact) &&
            (this.due) &&
            (this.items) &&
            (this.items.length));
    };

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
     * Sets the Order from and due date in a single call
     * @param from
     * @param due (optional) if null, we'll take the default average checkout duration as due date
     * @param skipRead
     * @returns {*}
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
     * @param date
     * @param skipRead
     * @returns {*}
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

    Order.prototype.clearFromDate = function(skipRead) {
        if (this.status!="creating") {
            return $.Deferred().reject(new api.ApiUnprocessableEntity("Cannot clear order from date, status is "+this.status));
        }

        this.from = null;

        return this._handleTransaction(skipRead);
    };

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

        return this._checkFromDueDate(this.from, roundedDueDate)
            .then(function() {
                that.due = roundedDueDate;
                return that._handleTransaction(skipRead);
            });
    };

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
    Order.prototype.searchItems = function(params, useAvailabilies, onlyUnbooked, skipItems) {
        return this._searchItems(params, "available", useAvailabilies, onlyUnbooked, skipItems || this.items);
    };

    Order.prototype.checkin = function(itemIds, skipRead) {
        return this._doApiCall({method: "checkin", items:itemIds, skipRead: skipRead});
    };

    Order.prototype.checkout = function(skipRead) {
        return this._doApiCall({method: "checkout", skipRead: skipRead});
    };

    Order.prototype.undoCheckout = function(skipRead) {
        return this._doApiCall({method: "undoCheckout", skipRead: skipRead});
    };

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
