/**
 * The Reservation module
 * @module reservation
 * @copyright CHECKROOM NV 2015
 */
define([
    "jquery",
    "api",
    "transaction",
    "conflict"],  /** @lends Transaction */ function ($, api, Transaction, Conflict) {

    // Allow overriding the ctor during inheritance
    // http://stackoverflow.com/questions/4152931/javascript-inheritance-call-super-constructor-or-use-prototype-chain
    var tmp = function() {};
    tmp.prototype = Transaction.prototype;

    /**
     * @name Reservation
     * @class Reservation
     * @constructor
     * @extends Transaction
     * @propery {Array}  conflicts               - The reservation conflicts
     */
    var Reservation = function(opt) {
        var spec = $.extend({
            crtype: "cheqroom.types.reservation",
            fields: ["*"]
        }, opt);
        Transaction.call(this, spec);

        this.conflicts = [];
    };

    Reservation.prototype = new tmp();
    Reservation.prototype.constructor = Reservation;

    //
    // Date helpers; we'll need these for sliding from / to dates during a long user session
    //

    /**
     * Overwrite only the getMinDate, max date is one year from now
     * @method
     * @name Reservation#getMinDate
     * @returns {moment}
     */
    Reservation.prototype.getMinDate = function() {
        // Reservations can only start from the next timeslot at the earliest
        var dateHelper = this._getDateHelper();
        var now = dateHelper.getNow();
        var next = dateHelper.roundTimeUp(now, dateHelper.roundMinutes);
        if (next==now) {
            next = next.add(dateHelper.roundMinutes, "minutes");
        }
        return next;
    };

    //
    // Helpers
    //
    /**
     * Checks if the reservation can be booked
     * @method
     * @name Reservation#canReserve
     * @returns {boolean}
     */
    Reservation.prototype.canReserve = function() {
        return (
            (this.status=="creating") &&
                (this.location) &&
                (this.contact) &&
                (this.from) &&
                (this.to) &&
                (this.items) &&
                (this.items.length));
    };

    /**
     * Checks if the reservation can be cancelled
     * @method
     * @name Reservation#canCancel
     * @returns {boolean}
     */
    Reservation.prototype.canCancel = function() {
        return (this.status=="open");
    };

    /**
     * Checks if the reservation can be edited
     * @method
     * @name Reservation#canEdit
     * @returns {boolean}
     */
    Reservation.prototype.canEdit = function() {
        return (this.status=="creating");
    };

    /**
     * Checks if the reservation can be deleted
     * @method
     * @name Reservation#canDelete
     * @returns {boolean}
     */
    Reservation.prototype.canDelete = function() {
        return (this.status=="creating");
    };

    /**
     * Checks if the reservation can be turned into an order
     * @method
     * @name Reservation#canMakeOrder
     * @returns {boolean}
     */
    Reservation.prototype.canMakeOrder = function() {
        if (this.status=="open") {
            var unavailable = this._getUnavailableItems();
            var len = $.map(unavailable, function(n, i) { return i; }).length;
            return (len==0);
        } else {
            return false;
        }
    };

    //
    // Document overrides
    //
    Reservation.prototype._toJson = function(options) {
        var data = Transaction.prototype._toJson.call(this, options);
        data.fromDate = (this.from!=null) ? this.from.toJSONDate() : "null";
        data.toDate = (this.to!=null) ? this.to.toJSONDate() : "null";
        return data;
    };

    Reservation.prototype._fromJson = function(data, options) {
        var that = this;
        return Transaction.prototype._fromJson.call(this, data, options)
            .then(function() {
                if (that.existsInDb()) {
                    return that._loadConflicts(data, options)
                        .then(function() {
                            that.from = ((data.fromDate==null) || (data.fromDate=="null")) ? null : data.fromDate;
                            that.to = ((data.toDate==null) || (data.toDate=="null")) ? null : data.toDate;
                            that.due = null;
                            $.publish("reservation.fromJson", data);
                        });
                } else {
                    that.from = ((data.fromDate==null) || (data.fromDate=="null")) ? null : data.fromDate;
                    that.to = ((data.toDate==null) || (data.toDate=="null")) ? null : data.toDate;
                    that.due = null;
                    $.publish("reservation.fromJson", data);
                }
            });
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
    Reservation.prototype._getConflicts = function() {
        var conflicts = [];
        var conflict = null;

        // Reservations can only have conflicts
        // when we have a (location OR (from AND to)) AND at least 1 item
        if( (this.items) &&
            (this.items.length) &&
            ((this.location) || (this.from && this.to))) {

            if (this.status == "open") {
                // Reservations in "open" status,
                // can use the Items' current status and location
                // to see if there are any conflicts for fullfilling into an Order
                var locId = this._getId(this.location);

                $.each(this.items, function(i, item) {
                    if (item.status!="available") {
                        conflicts.push(new Conflict({
                            kind: "status",
                            item: item._id,
                            itemName: item.name,
                            doc: item.order
                        }));
                    } else if (item.location!=locId) {
                        conflicts.push(new Conflict({
                            kind: "location",
                            item: item._id,
                            itemName: item.name,
                            locationCurrent: item.location,
                            locationDesired: locId,
                            doc: item.order
                        }));
                    }
                });

            } else if (this.status == "creating") {
                var that = this;

                // Reservations in "creating" status,
                // use a server side check
                return this.ds.call(this.id, "getConflicts")
                    .then(function(cnflcts) {
                        if( (cnflcts) &&
                            (cnflcts.length)) {

                            // Now we have the conflicts for this reservation
                            // run over the items again and find the conflict for each item
                            $.each(that.items, function(i, item) {
                                conflict = $.grep(cnflcts, function(c) { return c.item==item._id});
                                if (conflict) {
                                    var kind = "";
                                    kind = kind || (conflict.order) ? "order" : "";
                                    kind = kind || (conflict.reservation) ? "reservation" : "";

                                    conflicts.push(new Conflict({
                                        kind: kind,
                                        item: item._id,
                                        itemName: item.name,
                                        doc: conflict.conflictsWith
                                    }));
                                }
                            });
                        }
                    });
            }
        }

        return $.Deferred().resolve(conflicts);
    };

    /**
     * Sets the reservation from / to dates in a single call
     * @method
     * @name Reservation#setFromToDate
     * @param from
     * @param to (optional) if null, we'll take the default average checkout duration as due date
     * @param skipRead
     * @returns {*}
     */
    Reservation.prototype.setFromToDate = function(from, to, skipRead) {
        if (this.status!="creating") {
            return $.Deferred().reject(new api.ApiUnprocessableEntity("Cannot set reservation from / to date, status is "+this.status));
        }

        var that = this;
        var roundedFromDate = this._getHelper().roundTimeFrom(from);
        var roundedToDate = (to) ?
            this._getHelper().roundTimeTo(to) :
            this._getHelper().addAverageDuration(roundedFromDate);

        return this._checkFromToDate(roundedFromDate, roundedToDate)
            .then(function() {
                that.from = roundedFromDate;
                that.to = roundedToDate;
                return that._handleTransaction(skipRead);
            });
    };

    /**
     * setFromDate
     * The from date must be:
     * - bigger than minDate
     * - smaller than maxDate
     * - at least one interval before .to date (if set)
     * @method
     * @name Reservation#setFromDate
     * @param date
     * @param skipRead
     * @returns {*}
     */
    Reservation.prototype.setFromDate = function(date, skipRead) {
        if (this.status!="creating") {
            return $.Deferred().reject(new api.ApiUnprocessableEntity("Cannot set reservation from date, status is "+this.status));
        }

        var that = this;
        var dateHelper = this._getDateHelper();
        var interval = dateHelper.roundMinutes;
        var roundedFromDate = this._getHelper().roundTimeFrom(date);

        return this._checkDateBetweenMinMax(roundedFromDate)
            .then(function() {
                // Must be at least 1 interval before to date, if it's already set
                if( (that.to) &&
                    (that.to.diff(roundedFromDate, "minutes") < interval)) {
                    return $.Deferred().reject(new api.ApiUnprocessableEntity("Cannot set reservation from date, after (or too close to) to date "+that.to.toJSONDate()));
                }

                that.from = roundedFromDate;

                return that._handleTransaction(skipRead);
            });
    };

    /**
     * Clear the reservation from date
     * @method
     * @name Reservation#clearFromDate
     * @param skipRead
     * @returns {*}
     */
    Reservation.prototype.clearFromDate = function(skipRead) {
        if (this.status!="creating") {
            return $.Deferred().reject(new api.ApiUnprocessableEntity("Cannot clear reservation from date, status is "+this.status));
        }

        this.from = null;

        return this._handleTransaction(skipRead);
    };

    /**
     * setToDate
     * The to date must be:
     * - bigger than minDate
     * - smaller than maxDate
     * - at least one interval after the .from date (if set)
     * @method
     * @name Reservation#setToDate
     * @param date
     * @param skipRead
     * @returns {*}
     */
    Reservation.prototype.setToDate = function(date, skipRead) {
        // Cannot change the to-date of a reservation that is not in status "creating"
        if (this.status!="creating") {
            return $.Deferred().reject(new api.ApiUnprocessableEntity("Cannot set reservation to date, status is "+this.status));
        }

        // The to date must be:
        // 1) at least 30 minutes into the feature
        // 2) at least 15 minutes after the from date (if set)
        var that = this;
        var dateHelper = this._getDateHelper();
        var interval = dateHelper.roundMinutes;
        var roundedToDate = this._getHelper().roundTimeTo(date);

        return this._checkDateBetweenMinMax(roundedToDate)
            .then(function() {
                if( (that.from) &&
                    (that.from.diff(roundedToDate, "minutes") > interval)) {
                    return $.Deferred().reject(new api.ApiUnprocessableEntity("Cannot set reservation to date, before (or too close to) to date "+that.from.toJSONDate()));
                }

                that.to = roundedToDate;

                return that._handleTransaction(skipRead);
            });
    };

    /**
     * Clears the reservation to date
     * @method
     * @name Reservation#clearToDate
     * @param skipRead
     * @returns {*}
     */
    Reservation.prototype.clearToDate = function(skipRead) {
        if (this.status!="creating") {
            return $.Deferred().reject(new api.ApiUnprocessableEntity("Cannot clear reservation to date, status is "+this.status));
        }

        this.to = null;

        return this._handleTransaction(skipRead);
    };

// Reservation does not use due dates
    Reservation.prototype.clearDueDate = function(skipRead) {
        throw "Reservation.clearDueDate not implemented";
    };

    Reservation.prototype.setDueDate = function(date, skipRead) {
        throw "Reservation.setDueDate not implemented";
    };

//
// Business logic calls
//

    /**
     * Searches for Items that are available for this reservation
     * @method
     * @name Reservation#searchItems
     * @param params
     * @param useAvailabilies (should always be true, we only use this flag for Order objects)
     * @param onlyUnbooked
     * @returns {*}
     */
    Reservation.prototype.searchItems = function(params, useAvailabilies, onlyUnbooked, skipItems) {
        return this._searchItems(params, null, true, onlyUnbooked, skipItems || this.items);
    };

    /**
     * Books the reservation and sets the status to `open`
     * @method
     * @name Reservation#reserve
     * @param skipRead
     * @returns {*}
     */
    Reservation.prototype.reserve = function(skipRead) {
        return this._doApiCall({method: "reserve", skipRead: skipRead});
    };

    /**
     * Unbooks the reservation and sets the status to `creating` again
     * @method
     * @name Reservation#undoReserve
     * @param skipRead
     * @returns {*}
     */
    Reservation.prototype.undoReserve = function(skipRead) {
        return this._doApiCall({method: "undoReserve", skipRead: skipRead});
    };

    /**
     * Cancels the booked reservation and sets the status to `cancelled`
     * @method
     * @name Reservation#cancel
     * @param skipRead
     * @returns {*}
     */
    Reservation.prototype.cancel = function(skipRead) {
        return this._doApiCall({method: "cancel", skipRead: skipRead});
    };

    /**
     * Turns an open reservation into an order (which still needs to be checked out)
     * @method
     * @name Reservation#makeOrder
     * @returns {*}
     */
    Reservation.prototype.makeOrder = function() {
        return this._doApiCall({method: "makeOrder", skipRead: true});  // response is an Order object!!
    };

//
// Implementation
//
    Reservation.prototype._checkFromToDate = function(from, to) {
        var dateHelper = this._getDateHelper();
        var roundedFromDate = from; //(from) ? this._getHelper().roundTimeFrom(from) : null;
        var roundedToDate = to; //(due) ? this._getHelper().roundTimeTo(due) : null;

        if (roundedFromDate && roundedToDate) {
            return $.when(
                    this._checkDateBetweenMinMax(roundedFromDate),
                    this._checkDateBetweenMinMax(roundedToDate)
                )
                .then(function(fromRes, toRes) {
                    var interval = dateHelper.roundMinutes;
                    if (roundedToDate.diff(roundedFromDate, "minutes") < interval) {
                        return $.Deferred().reject(new api.ApiUnprocessableEntity("Cannot set order from date, after (or too close to) to date "+roundedToDate.toJSONDate()));
                    }
                    if (roundedFromDate.diff(roundedToDate, "minutes") > interval) {
                        return $.Deferred().reject(new api.ApiUnprocessableEntity("Cannot set order due date, before (or too close to) from date "+roundedFromDate.toJSONDate()));
                    }
                });
        } else if (roundedFromDate) {
            return this._checkDateBetweenMinMax(roundedFromDate);
        } else if (roundedToDate) {
            return this._checkDateBetweenMinMax(roundedToDate);
        } else {
            return $.Deferred().reject(new api.ApiUnprocessableEntity("Cannot from/due date, both are null"));
        }
    };

    Reservation.prototype._getUnavailableItems = function() {
        var unavailable = {};

        if( (this.status=="open") &&
            (this.location) &&
            (this.items!=null) &&
            (this.items.length>0)) {
            $.each(this.items, function(i, item) {
                if (item.status!="available") {
                    unavailable["status"] = unavailable["status"] || [];
                    unavailable["status"].push(item._id);
                } else if (item.location!=location._id) {
                    unavailable["location"] = unavailable["location"] || [];
                    unavailable["location"].push(item._id);
                }
            });
        }

        return unavailable;
    };

    Reservation.prototype._loadConflicts = function(data, options) {
        // Only load conflicts when it"s possible to have conflicts
        // location, at least 1 date and at least 1 item
        var that = this;
        var hasLocation = (this.location!=null);
        var hasAnyDate = (this.from!=null) || (this.to!=null);
        var hasAnyItem = (this.items!=null) && (this.items.length>0);
        var hasNonConflictStatus = (this.status!="creating") && (this.status!="open");

        if( (hasNonConflictStatus) ||
            (!hasLocation && !hasAnyDate && !hasAnyItem)) {

            // We cannot have conflicts, so make the conflicts array empty
            this.conflicts = [];
            return $.Deferred().resolve(data);

        } else if (this.status == "creating") {

            // We can have conflicts,
            // so we better check the server if there are any
            return this.ds.call(this.id, "getConflicts")
                .then(function(conflicts) {
                    that.conflicts = conflicts || [];
                });

        } else if (this.status == "open") {

            this.conflicts = [];

            // The reservation is already open,
            // so the only conflicts we can have
            // are for turning it into an order
            $.each(this.raw.items, function(i, item) {
                if (item.status=="expired") {
                    that.conflicts.push({
                        item: (item._id) ? item._id : item,
                        kind: "status",
                        friendlyKind: "Item is expired"
                    });
                } else if (item.status!="available") {
                    that.conflicts.push({
                        item: (item._id) ? item._id : item,
                        kind: "status",
                        friendlyKind: "Item is checked out in an order"
                    });
                } else if(item.location!=that.location) {
                    that.conflicts.push({
                        item: (item._id) ? item._id : item,
                        kind: "location",
                        friendlyKind: "Item is at wrong location"
                    });
                }
            });

            return $.Deferred().resolve(data);

        } else {

            // We should never get here :)
            this.conflicts = [];
            return $.Deferred().resolve(data);

        }
    };

    return Reservation;

});