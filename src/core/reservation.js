/**
 * The Reservation module
 * @module reservation
 * @copyright CHECKROOM NV 2015
 */
define([
    "jquery",
    "api",
    "transaction",
    "conflict",
    "common"],  /** @lends Transaction */ function ($, api, Transaction, Conflict, common) {

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
            _fields: ["*"]
        }, opt);
        Transaction.call(this, spec);

        this.conflicts = [];
        this.order = null;
    };

    Reservation.prototype = new tmp();
    Reservation.prototype.constructor = Reservation;

    //
    // Date helpers; we'll need these for sliding from / to dates during a long user session
    //
    // getMinDateFrom (overwritten)
    // getMaxDateFrom (default)
    // getMinDateTo (overwritten)
    // getMaxDateTo (default)

    /**
     * Overwrite how we get a min date for reservation
     * Min date is a timeslot after now
     */
    Reservation.prototype.getMinDateFrom = function() {
        return this.getNextTimeSlot();
    };

    Reservation.prototype.getMinDateTo = function() {
        return this.getNextTimeSlot(this.from && this.from.isBefore(this.getNowRounded())?null:this.from);
    };

    //
    // Helpers
    //
    /**
     * Gets a moment duration object
     * @method
     * @name Reservation#getDuration
     * @returns {duration}
     */
    Reservation.prototype.getDuration = function() {
        return common.getReservationDuration(this.raw);
    };

    /**
     * Gets a friendly order duration or empty string
     * @method
     * @name Reservation#getFriendlyDuration
     * @returns {string}
     */
    Reservation.prototype.getFriendlyDuration = function() {
        return common.getFriendlyReservationDuration(this.raw, this._getDateHelper());
    };

    /**
     * Checks if from date is valid for open/creating reservation
     * otherwise return always true
     *
     * @return {Boolean}
     */
    Reservation.prototype.isValidFromDate = function(){
        var from = this.from,
            status = this.status,
            now = this.getNow();

        if((status == "creating" || status == "open")){
            return from != null && from.isAfter(now);
        }

        return true;
    };

    /**
     * Checks if to date is valid for open/creating reservation
     * otherwise return always true
     *
     * @return {Boolean}
     */
    Reservation.prototype.isValidToDate = function(){
        var from = this.from,
            to = this.to,
            status = this.status,
            now = this.getNow();

        if((status == "creating" || status == "open")){
            return to != null && to.isAfter(from) && to.isAfter(now);
        }

        return true;
    }

    /**
     * Checks if the reservation can be spotchecked
     * @method
     * @name Reservation#canSpotcheck
     * @returns {boolean}
     */
    Reservation.prototype.canSpotcheck = function() {
        return common.canReservationSpotcheck(this.raw);
    };

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
        ((this.contact) &&
        (this.contact.status == "active")) &&
        (this.isValidFromDate()) &&
        (this.isValidToDate()) &&
        (this.items) &&
        (this.items.length));
    };

    /**
     * Checks if the reservation can be undone (based on status)
     * @method
     * @name Reservation#canUndoReserve
     * @returns {boolean}
     */
    Reservation.prototype.canUndoReserve = function() {
        return (this.status=="open");
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
     * Checks if the reservation can be closed
     * @method
     * @name Reservation#canClose
     * @returns {boolean}
     */
    Reservation.prototype.canClose = function() {
        return (this.status=="open");
    };

    /**
     * Checks if the reservation can be unclosed
     * @method
     * @name Reservation#canUndoClose
     * @returns {boolean}
     */
    Reservation.prototype.canUndoClose = function() {
        return (this.status=="closed_manually") &&
                ((this.contact) &&
                 (this.contact.status == "active"));
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
     * Checks if items can be added to the reservation (based on status)
     * @method
     * @name Reservation#canAddItems
     * @returns {boolean}
     */
    Reservation.prototype.canAddItems = function() {
        return (this.status=="creating");
    };

    /**
     * Checks if items can be removed from the reservation (based on status)
     * @method
     * @name Reservation#canRemoveItems
     * @returns {boolean}
     */
    Reservation.prototype.canRemoveItems = function() {
        return (this.status=="creating");
    };

    /**
     * Checks if items can be swapped in the reservation (based on status)
     * @method
     * @name Reservation#canSwapItems
     * @returns {boolean}
     */
    Reservation.prototype.canSwapItems = function() {
        return (this.status=="creating") || (this.status=="open");
    };

    /**
     * Checks if the reservation can be turned into an order
     * @method
     * @name Reservation#canMakeOrder
     * @returns {boolean}
     */
    Reservation.prototype.canMakeOrder = function() {
        // Only reservations that meet the following conditions can be made into an order
        // - status: open
        // - to date: is in the future
        // - items: all are available
        if( (this.status=="open") &&
            ((this.contact) &&
             (this.contact.status == "active")) &&
            (this.to!=null) &&
            (this.to.isAfter(this.getNow()))) {
            var unavailable = this._getUnavailableItems();
            var len = $.map(unavailable, function(n, i) { return i; }).length;  // TODO: Why do we need this?
            return (len==0);
        } else {
            return false;
        }
    };

    /**
     * Checks if the reservation has an order linked to it
     * @method
     * @name Reservation#canGoToOrder
     * @returns {boolean}
     */
    Reservation.prototype.canGoToOrder = function(){
        return this.order != null;
    }

    /**
     * Checks if the reservation can be reserved again (based on status)
     * @method
     * @name Reservation#canReserveAgain
     * @returns {boolean}
     */
    Reservation.prototype.canReserveAgain = function() {
        return ((this.status == "open") || 
                (this.status == "closed") || 
                (this.status == "closed_manually") ||
                (this.status == "cancelled")) &&
               ((this.contact) &&
                (this.contact.status == "active"));
    };

    /**
     * Checks if the reservation can be into recurring reservations (based on status)
     * @method
     * @name Reservation#canReserveRepeat
     * @returns {boolean}
     */
    Reservation.prototype.canReserveRepeat = function() {
        return ((this.status == "open") || 
                (this.status == "closed") || 
                (this.status == "closed_manually")) &&
               ((this.contact) &&
                (this.contact.status == "active"));
    };

    /**
     * Checks if we can generate a document for this reservation (based on status)
     * @name Reservation#canGenerateDocument
     * @returns {boolean}
     */
    Reservation.prototype.canGenerateDocument = function() {
        return (this.status=="open") || (this.status=="closed") || (this.status=="closed_manually");
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

        // Already set the from, to and due dates
        // Transaction._fromJson might need it during _getConflicts
        that.from = ((data.fromDate==null) || (data.fromDate=="null")) ? null : data.fromDate;
        that.to = ((data.toDate==null) || (data.toDate=="null")) ? null : data.toDate;
        that.due = null;
        that.order = data.order || null;
        that.repeatId = data.repeatId || null;
        that.repeatFrequency = data.repeatFrequency || "";

        return Transaction.prototype._fromJson.call(this, data, options)
            .then(function() {
                $.publish("reservation.fromJson", data);
                return data;
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
        var that = this,
            conflicts = [],
            conflict = null;

        // Reservations can only have conflicts
        // when status open OR creating and we have a (location OR (from AND to)) AND at least 1 item 
        // So we'll only hit the server if there are possible conflicts.
        //
        // However, some conflicts only start making sense when the reservation fields filled in
        // When you don't have any dates set yet, it makes no sense to show "checked out" conflict
        if( (['creating', 'open'].indexOf(this.status) != -1) &&
            (this.items) &&
            (this.items.length) &&
            ((this.location) || (this.from && this.to) || (this.items.filter(function(it){ return it.canReserve !== "available"; })))) {

            var locId = this.location ? this._getId(this.location) : null;
            var showOrderConflicts = (this.from && this.to && this.status=="open");
            var showLocationConflicts = (locId!=null);
            var showStatusConflicts = true; // always show conflicts for expired, custody
            var showPermissionConflicts = true; // always show permission conflicts (canReserve)
            var showFlagConflicts = !(this.contact != null && this.contact.status == 'active' && this.contact.kind == 'maintenance'); // always show flag conflicts except for maintenance contact (flag unavailable settings)

            return this.ds.call(this.id, "getConflicts")
                .then(function(cnflcts) {
                    cnflcts = cnflcts || [];

                    // Now we have 0 or more conflicts for this reservation
                    // run over the items again and find the conflict for each item
                    $.each(that.items, function(i, item) {
                        conflict = cnflcts.find(function(conflictObj){
                            return conflictObj.item == item._id;
                        });

                        // Does this item have a server-side conflict?
                        if (conflict) {
                            var kind = conflict.kind || "";
                            kind = kind || (conflict.order ? "order" : "");
                            kind = kind || (conflict.reservation ? "reservation" : "");

                            // skip to next
                            if(kind == "flag" && !showFlagConflicts) return true;

                            conflicts.push(new Conflict({
                                kind: kind,
                                item: item._id,
                                itemName: item.name,
                                doc: conflict.conflictsWith,
                                fromDate: conflict.fromDate,
                                toDate: conflict.toDate,
                                locationCurrent: conflict.locationCurrent,
                                locationDesired: conflict.locationDesired
                            }));
                        } else {
                            if( (showFlagConflicts) &&
                                (that.unavailableFlagHelper(item.flag))){
                                conflicts.push(new Conflict({
                                    kind: "flag",
                                    item: item._id,
                                    flag: item.flag,
                                    doc: item.order
                                }))
                            } else if( (showPermissionConflicts) &&
                                (item.canReserve=="unavailable_allow")){
                                conflicts.push(new Conflict({
                                    kind: "not_allowed_reservation",
                                    item: item._id,
                                    itemName: item.name
                                }));
                            } else if(that.status == 'open' && showPermissionConflicts && item.canOrder=="unavailable_allow"){
                                conflicts.push(new Conflict({
                                    kind: "not_allowed_order",
                                    item: item._id,
                                    itemName: item.name
                                }));
                            } else if( (showStatusConflicts) &&
                                (item.status=="expired")) {
                                conflicts.push(new Conflict({
                                    kind: "expired",
                                    item: item._id,
                                    itemName: item.name,
                                    doc: item.order
                                }));
                            } else if (
                                (showStatusConflicts) &&
                                (item.status == "in_custody")) {
                                conflicts.push(new Conflict({
                                    kind: "custody",
                                    item: item._id,
                                    itemName: item.name,
                                    doc: item.order
                                }));
                            } else if (
                                (showOrderConflicts) &&
                                (item.status!="available")) {
                                conflicts.push(new Conflict({
                                    kind: "order",
                                    item: item._id,
                                    itemName: item.name,
                                    doc: item.order
                                }));
                            } else if (
                                (showLocationConflicts) &&
                                (item.location!=locId)) {
                                conflicts.push(new Conflict({
                                    kind: "location",
                                    item: item._id,
                                    itemName: item.name,
                                    locationCurrent: item.location,
                                    locationDesired: locId,
                                    doc: item.order
                                }));
                            }
                        }
                    });

                    return conflicts;
                });
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
        var roundedFromDate = this._getDateHelper().roundTimeFrom(from);
        var roundedToDate = (to) ?
            this._getDateHelper().roundTimeTo(to) :
            this._getDateHelper().addAverageDuration(roundedFromDate);

        return this._checkFromToDate(roundedFromDate, roundedToDate)
            .then(function() {
                that.from = roundedFromDate;
                that.to = roundedToDate;

                return that._doApiCall({method: "setFromToDate", params: { fromDate: roundedFromDate, toDate: roundedToDate }, skipRead: skipRead});
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
        var roundedFromDate = dateHelper.roundTimeFrom(date);

        return this._checkFromDateBetweenMinMax(roundedFromDate)
            .then(function() {
                // TODO: Should never get here
                // Must be at least 1 interval before to date, if it's already set
                if( (that.to) &&
                    (that.to.diff(roundedFromDate, "minutes") < interval)) {
                    return $.Deferred().reject(new api.ApiUnprocessableEntity("Cannot set reservation from date, after (or too close to) to date "+that.to.toJSONDate()));
                }

                that.from = roundedFromDate;

                //If reservation doesn't exist yet, we set from date in create call
                //otherwise use setFromDate to update transaction
                if(!that.existsInDb()){
                    return that._createTransaction(skipRead);
                } else{
                    return that._doApiCall({method: "setFromDate", params: {fromDate: roundedFromDate}, skipRead: skipRead});
                }
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
        return this._doApiCall({method: "clearFromDate", skipRead: skipRead});
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
        var roundedToDate = dateHelper.roundTimeTo(date);

        return this._checkToDateBetweenMinMax(roundedToDate)
            .then(function() {
                if( (that.from) &&
                    (that.from.diff(roundedToDate, "minutes") > interval)) {
                    return $.Deferred().reject(new api.ApiUnprocessableEntity("Cannot set reservation to date, before (or too close to) to date "+that.from.toJSONDate()));
                }

                that.to = roundedToDate;

                //If reservation doesn't exist yet, we set to date in create call
                //otherwise use setToDate to update transaction
                if(!that.existsInDb()){
                    return that._createTransaction(skipRead);
                } else{
                    return that._doApiCall({method: "setToDate", params: {toDate: roundedToDate}, skipRead: skipRead});
                }
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
        return this._doApiCall({method: "clearToDate", skipRead: skipRead});
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
     * @param skipErrorHandling
     * @returns {*}
     */
    Reservation.prototype.reserve = function(skipRead, skipErrorHandling) {
        var that = this;
        return this._doApiCall({method: "reserve", skipRead: skipRead})
            .then(function(resp){ 
                return resp; 
            },function(err){
                if(!skipErrorHandling){
                    if( (err) && 
                        (err.code == 422) && 
                        (err.opt && err.opt.detail.indexOf('reservation has status open') != -1)){
                        return that.get();
                    }
                }

                //IMPORTANT
                //Need to return a new deferred reject because otherwise
                //done would be triggered in parent deferred
                return $.Deferred().reject(err);
            });
    };

    /**
     * Unbooks the reservation and sets the status to `creating` again
     * @method
     * @name Reservation#undoReserve
     * @param skipRead
     * @param skipErrorHandling
     * @returns {*}
     */
    Reservation.prototype.undoReserve = function(skipRead, skipErrorHandling) {
        var that = this;
        return this._doApiCall({method: "undoReserve", skipRead: skipRead})
            .then(function(resp){ 
                return resp; 
            },function(err){
                if(!skipErrorHandling){
                    if( (err) && 
                        (err.code == 422) && 
                        (err.opt && err.opt.detail.indexOf('reservation has status creating') != -1)){
                        return that.get();
                    }
                }

                //IMPORTANT
                //Need to return a new deferred reject because otherwise
                //done would be triggered in parent deferred
                return $.Deferred().reject(err);
            });
    };

    /**
     * Cancels the booked reservation and sets the status to `cancelled`
     * @method
     * @name Reservation#cancel
     * @param message
     * @param skipRead
     * @param skipErrorHandling
     * @returns {*}
     */
    Reservation.prototype.cancel = function(message, skipRead, skipErrorHandling) {
        var that = this;
        return this._doApiCall({method: "cancel", params:{ message: message || "" }, skipRead: skipRead})
            .then(function(resp){ 
                return resp; 
            },function(err){
                if(!skipErrorHandling){
                    if( (err) && 
                        (err.code == 422) && 
                        (err.opt && err.opt.detail.indexOf('reservation has status cancelled') != -1)){
                        return that.get();
                    }
                }

                //IMPORTANT
                //Need to return a new deferred reject because otherwise
                //done would be triggered in parent deferred
                return $.Deferred().reject(err);
            });
    };

    /**
     * Cancels repeated reservations and sets the status to `cancelled`
     * @method
     * @name Reservation#cancelRepeat
     * @param message
     * @param skipRead
     * @param skipErrorHandling
     * @returns {*}
     */
    Reservation.prototype.cancelRepeat = function(message, skipRead, skipErrorHandling) {
        var that = this;
        return this._doApiCall({method: "cancelRepeat", params:{ message: message || "" }, skipRead: skipRead})
            .then(function(resp){ 
                return resp; 
            },function(err){
                if(!skipErrorHandling){
                    if( (err) && 
                        (err.code == 422) && 
                        (err.opt && err.opt.detail.indexOf('reservation has status cancelled') != -1)){
                        return that.get();
                    }
                }

                //IMPORTANT
                //Need to return a new deferred reject because otherwise
                //done would be triggered in parent deferred
                return $.Deferred().reject(err);
            });
    };


    /**
     * Closes the booked reservation and sets the status to `closed_manually`
     * @method
     * @name Reservation#close
     * @param message
     * @param skipRead
     * @param skipErrorHandling
     * @returns {*}
     */
    Reservation.prototype.close = function(message, skipRead, skipErrorHandling) {
        var that = this;
        return this._doApiCall({method: "close", params:{ message: message || "" }, skipRead: skipRead})
            .then(function(resp){ 
                return resp; 
            },function(err){
                if(!skipErrorHandling){
                    if( (err) && 
                        (err.code == 422) && 
                        (err.opt && err.opt.detail.indexOf('reservation has status closed_manually') != -1)){
                        return that.get();
                    }
                }

                //IMPORTANT
                //Need to return a new deferred reject because otherwise
                //done would be triggered in parent deferred
                return $.Deferred().reject(err);
            });
    };

    /**
     * Uncloses the reservation and sets the status to `open` again
     * @method
     * @name Reservation#undoClose
     * @param skipRead
     * @param skipErrorHandling
     * @returns {*}
     */
    Reservation.prototype.undoClose = function(skipRead, skipErrorHandling) {
        var that = this;
        return this._doApiCall({method: "undoClose", skipRead: skipRead})
            .then(function(resp){ 
                return resp; 
            },function(err){
                if(!skipErrorHandling){
                    if( (err) && 
                        (err.code == 422) && 
                        (err.opt && err.opt.detail.indexOf('reservation has status open') != -1)){
                        return that.get();
                    }
                }

                //IMPORTANT
                //Need to return a new deferred reject because otherwise
                //done would be triggered in parent deferred
                return $.Deferred().reject(err);
            });
    };    

    /**
     * Turns an open reservation into an order (which still needs to be checked out)
     * @method
     * @name Reservation#makeOrder
     * @param skipErrorHandling
     * @returns {*}
     */
    Reservation.prototype.makeOrder = function(skipErrorHandling) {
        var that = this;
        return this._doApiCall({method: "makeOrder", skipRead: true})
            .then(function(resp){ 
                return resp; 
            },function(err){
                if(!skipErrorHandling){
                    if( (err) && 
                        (err.code == 422) && 
                        (err.opt && err.opt.detail.indexOf('reservation has status closed') != -1)){
                        return that.get().then(function(resp){
                            var orderId = that._getId(resp.order);

                            // need to return fake order object
                            return { _id: orderId };
                        });
                    }
                }

                //IMPORTANT
                //Need to return a new deferred reject because otherwise
                //done would be triggered in parent deferred
                return $.Deferred().reject(err);
            });
    };

    /**
     * Switch reservation to order
     * @method
     * @name Reservation#switchToOrder
     * @return {*}
     */
    Reservation.prototype.switchToOrder = function() {
        return this._doApiCall({method: "switchToOrder", skipRead: true});
    };

    /**
     * Generates a PDF document for the reservation
     * @method
     * @name Reservation#generateDocument
     * @param {string} template id
     * @param {string} signature (base64)
     * @param {bool} skipRead
     * @returns {promise}
     */
    Reservation.prototype.generateDocument = function(template, signature, skipRead) {
        return this._doApiLongCall({method: "generateDocument", params: {template: template, signature: signature}, skipRead: skipRead});
    };

    /**
     * Creates a new, incomplete reservation with the same info
     * as the original reservation but other fromDate, toDate
     * Important; the response will be another Reservation document!
     * @method
     * @name Reservation#reserveAgain
     * @param fromDate
     * @param toDate
     * @param customer
     * @param location
     * @param skipRead
     * @returns {promise}
     */
    Reservation.prototype.reserveAgain = function(fromDate, toDate, customer, location, skipRead) {
        var params =  {
            location: location,
            customer: customer
        };

        if(fromDate){
            params.fromDate = fromDate;
        }

        if(toDate){
            params.toDate = toDate;
        }

        return this._doApiLongCall({method: "reserveAgain", params: params, skipRead: skipRead});
    };

    /**
     * Creates a list of new reservations with `open` status
     * as the original reservation but other fromDate, toDate
     * Important; the response will be a list of other Reservation documents
     * @method
     * @name Reservation#reserveRepeat
     * @param frequency (days, weeks, weekdays, months)
     * @param customer
     * @param location
     * @param until
     * @returns {promise}
     */
    Reservation.prototype.reserveRepeat = function(frequency, until, customer, location) {
        return this._doApiLongCall({method: "reserveRepeat", params: {
            frequency: frequency,
            until: until,
            customer: customer,
            location: location}, skipRead: true}); // response is a array of reservations
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
                this._checkFromDateBetweenMinMax(roundedFromDate),
                this._checkToDateBetweenMinMax(roundedToDate)
            )
                .then(function(fromRes, toRes) {
                    var interval = dateHelper.roundMinutes;
                    // TODO: We should never get here
                    if (roundedToDate.diff(roundedFromDate, "minutes") < interval) {
                        return $.Deferred().reject(new api.ApiUnprocessableEntity("Cannot set order from date, after (or too close to) to date "+roundedToDate.toJSONDate()));
                    }
                    if (roundedFromDate.diff(roundedToDate, "minutes") > interval) {
                        return $.Deferred().reject(new api.ApiUnprocessableEntity("Cannot set order due date, before (or too close to) from date "+roundedFromDate.toJSONDate()));
                    }
                });
        } else if (roundedFromDate) {
            return this._checkFromDateBetweenMinMax(roundedFromDate);
        } else if (roundedToDate) {
            return this._checkToDateBetweenMinMax(roundedToDate);
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
            var that = this;
            var locId = that._getId(that.location);
            $.each(this.items, function(i, item) {
                if (item.status!="available") {
                    unavailable["status"] = unavailable["status"] || [];
                    unavailable["status"].push(item._id);
                }
            });
        }

        return unavailable;
    };

    return Reservation;

});