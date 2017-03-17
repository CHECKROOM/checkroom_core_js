/**
 * The Order module
 * @module module
 * @copyright CHECKROOM NV 2015
 */
define([
    "jquery",
    "api",
    "transaction",
    "conflict",
    "common"], /** @lends Transaction */  function ($, api, Transaction, Conflict, common) {

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
            _fields: ["*"]
        }, opt);
        Transaction.call(this, spec);

        this.dsReservations = spec.dsReservations;
    };

    Order.prototype = new tmp();
    Order.prototype.constructor = Order;

    //
    // Date helpers; we'll need these for sliding from / to dates during a long user session
    //
    // getMinDateFrom (overwritten)
    // getMaxDateFrom (default)
    // getMinDateDue (default, same as getMinDateTo)
    // getMaxDateDue (default, same as getMinDateTo)

    /**
     * Overwrite min date for order so it is rounded by default
     * Although it's really the server who sets the actual date
     * While an order is creating, we'll always overwrite its from date
     */
    Order.prototype.getMinDateFrom = function() {
        return this.getNowRounded();
    };

    /**
     * Overwrite how the Order.due min date works
     * We want "open" orders to be set due at least 1 timeslot from now
     */
    Order.prototype.getMinDateDue = function() {
        if (this.status=="open") {
            // Open orders can set their date to be due
            // at least 1 timeslot from now,
            // we can just call the default getMinDateTo function
            return this.getNextTimeSlot();
        } else {
            return Transaction.prototype.getMinDateDue.call(this);
        }
    };

    //
    // Document overrides
    //
    Order.prototype._toJson = function(options) {
        // Should only be used during create
        // and never be called on order update
        // since most updates are done via setter methods
        var data = Transaction.prototype._toJson.call(this, options);
        data.fromDate = (this.fromDate!=null) ? this.fromDate.toJSONDate() : "null";
        data.toDate = (this.toDate!=null) ? this.toDate.toJSONDate() : "null";
        data.due = (this.due!=null) ? this.due.toJSONDate() : "null";
        return data;
    };

    Order.prototype._fromJson = function(data, options) {
        var that = this;

        // Already set the from, to and due dates
        // Transaction._fromJson might need it during _getConflicts
        that.from = ((data.started==null) || (data.started=="null")) ? null : data.started;
        that.to = ((data.finished==null) || (data.finished=="null")) ? null : data.finished;
        that.due = ((data.due==null) || (data.due=="null")) ? null: data.due;
        that.reservation = data.reservation || null;

        return Transaction.prototype._fromJson.call(this, data, options)
            .then(function() {
                $.publish("order.fromJson", data);
                return data;
            });
    };

    Order.prototype._fromKeyValuesJson = function(data, options) {
        var that = this;

        // Also parse reservation comments?
        if( (that.dsReservations) &&
            (data.reservation) &&
            (data.reservation.keyValues) &&
            (data.reservation.keyValues.length > 0)){

            // Parse Reservation keyValues
            return Transaction.prototype._fromKeyValuesJson.call(that, data.reservation, $.extend(options, {
                ds: that.dsReservations
            })).then(function(){
                var reservationComments = that.comments;
                var reservationAttachments = that.attachments;

                // Parse Order keyValues
                return Transaction.prototype._fromKeyValuesJson.call(that, data, options).then(function(){
                    // Add reservation comments/attachments to order keyvalues
                    that.comments = that.comments.concat(reservationComments).sort(function(a, b) {
                        return b.modified > a.modified;
                    });
                    that.attachments = that.attachments.concat(reservationAttachments).sort(function(a, b) {
                        return b.modified > a.modified;
                    });
                });
            });
        }

        // Use Default keyValues parser
        return Transaction.prototype._fromKeyValuesJson.call(that, data, options);
    };

    //
    // Helpers
    //
    /**
     * Gets a moment duration object
     * @method
     * @name Order#getDuration
     * @returns {duration}
     */
    Order.prototype.getDuration = function() {
        return common.getOrderDuration(this.raw);
    };

    /**
     * Gets a friendly order duration or empty string
     * @method
     * @name Order#getFriendlyDuration
     * @returns {string}
     */
    Order.prototype.getFriendlyDuration = function() {
        return common.getFriendlyOrderDuration(this.raw, this._getDateHelper());
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
     * Checks if due date is valid for an creating order
     * oterwise return true
     *
     * @name Order#isValidDueDate
     * @return {Boolean} 
     */
    Order.prototype.isValidDueDate = function(){
        var due = this.due,
            now = this.getNow(),
            status = this.status;

        if(status == "creating"){
            return due!=null && due.isAfter(now);
        }

        return true;
    }

    /**
     * Checks if order can be checked out
     * @method
     * @name Order#canCheckout
     * @returns {boolean}
     */
    Order.prototype.canCheckout = function() {
        var that = this;
        return (
            (this.status=="creating") &&
            (this.location!=null) &&
            ((this.contact!=null) &&
            (this.contact.status == "active")) &&
            (this.isValidDueDate()) &&
            ((this.items) &&
            (this.items.length > 0) &&
            (this.items.filter(function(item){ return that.id == that.helper.ensureId(item.order); }).length > 0))
        );
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

    /**
     * Checks if the order can be deleted (based on status)
     * @method
     * @name Order#canDelete
     * @returns {boolean}
     */
    Order.prototype.canDelete = function() {
        return (this.status=="creating");
    };

    /**
     * Checks if items can be added to the checkout (based on status)
     * @method
     * @name Order#canAddItems
     * @returns {boolean}
     */
    Order.prototype.canAddItems = function() {
        return (this.status=="creating");
    };

    /**
     * Checks if items can be removed from the checkout (based on status)
     * @method
     * @name Order#canRemoveItems
     * @returns {boolean}
     */
    Order.prototype.canRemoveItems = function() {
        return (this.status=="creating");
    };

    /**
     * Checks if items can be swapped in the checkout (based on status)
     * @method
     * @name Order#canSwapItems
     * @returns {boolean}
     */
    Order.prototype.canSwapItems = function() {
        return (this.status=="creating");
    };

    /**
     * Checks if we can generate a document for this order (based on status)
     * @name Order#canGenerateDocument
     * @returns {boolean}
     */
    Order.prototype.canGenerateDocument = function() {
        return (this.status=="open") || (this.status=="closed");
    };

    //
    // Base overrides
    //

    //
    // Transaction overrides
    //
    Order.prototype._getConflictsForExtend = function() {
        var conflicts = [];

        // Only orders which are incomplete,
        // but have items and / or due date can have conflicts
        if (this.status=="open") {

            // Only check for new conflicts on the items
            // that are still checked out under this order
            var items = [],
                that = this;
            $.each(this.items, function(i, item) {
                if( (item.status == "checkedout") &&
                    (item.order == that.id)) {
                    items.push(item);
                }
            });

            // If we have a due date,
            // check if it conflicts with any reservations
            if (this.due) {
                return this._getServerConflicts(
                    this.items,
                    this.from,
                    this.due,
                    this.id,  // orderId
                    this.helper.ensureId(this.reservation))  // reservationId
                    .then(function(serverConflicts) {
                        return conflicts.concat(serverConflicts);
                    });
            }
        }

        return $.Deferred().resolve(conflicts);
    };

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

            // Get some conflicts we can already calculate on the client side
            conflicts = this._getClientConflicts();

            // If we have a due date,
            // check if it conflicts with any reservations
            if (this.due) {
                return this._getServerConflicts(
                    this.items,
                    this.from,
                    this.due,
                    this.id,  // orderId
                    this.helper.ensureId(this.reservation))  // reservationId
                    .then(function(serverConflicts) {
                        return conflicts.concat(serverConflicts);
                    });
            }
        }

        return $.Deferred().resolve(conflicts);
    };

    /**
     * Get server side conflicts for items between two dates
     * Also pass extra info like own order and reservation
     * so we can avoid listing conflicts with ourselves
     * @param items array of item objects (not just the ids)
     * @param fromDate
     * @param dueDate
     * @param orderId
     * @param reservationId
     * @returns {*}
     * @private
     */
    Order.prototype._getServerConflicts = function(items, fromDate, dueDate, orderId, reservationId) {
        var conflicts = [],
            kind = "",
            transItem = null,
            itemIds = common.getItemIds(items);

        // Get the availabilities for these items
        return this.dsItems.call(null, "getAvailabilities", {
            items: itemIds,
            fromDate: fromDate,
            toDate: dueDate})
            .then(function(data) {

                // Run over unavailabilties for these items
                $.each(data, function(i, av) {

                    // Find back the more complete item object via the `items` param
                    // It has useful info like item.name we can use in the conflict message
                    // $.grep returns an array with 1 item,
                    // we need reference to the 1st item for transItem
                    transItem = $.grep(items, function(item) { return item._id == av.item});
                    if( (transItem) &&
                        (transItem.length > 0)) {
                        transItem = transItem[0];
                    }

                    if( (transItem!=null) &&
                        (transItem.status!="expired")) {

                        // Order cannot conflict with itself
                        // or with the Reservation from which it was created
                        if( (av.order != orderId) &&
                            (av.reservation != reservationId)) {
                            kind = "";
                            kind = kind || ((av.order) ? "order" : "");
                            kind = kind || ((av.reservation) ? "reservation" : "");

                            conflicts.push(new Conflict({
                                kind: kind,
                                item: transItem._id,
                                itemName: transItem.name,
                                fromDate: av.fromDate,
                                toDate: av.toDate,
                                doc: av.order || av.reservation
                            }));
                        }
                    }
                });

                return conflicts;
            });
    };

    Order.prototype._getClientConflicts = function() {
        // Some conflicts can be checked already on the client
        // We can check if all the items are:
        // - at the right location
        // - not expired
        var conflicts = [],
            locId = this.helper.ensureId(this.location || "");

        $.each(this.items, function(i, item) {
            if (item.status == "expired") {
                conflicts.push(new Conflict({
                    kind: "expired",
                    item: item._id,
                    itemName: item.name,
                    locationCurrent: item.location,
                    locationDesired: locId
                }));
                // If order location is defined, check if item
                // is at the right location
            } else if (locId && item.location != locId) {
                conflicts.push(new Conflict({
                    kind: "location",
                    item: item._id,
                    itemName: item.name,
                    locationCurrent: item.location,
                    locationDesired: locId
                }));
            }
        });

        return conflicts;
    };

    /**
     * Sets the Order from and due date in a single call
     * _checkFromDueDate will handle the special check for when the order is open
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
        var roundedFromDate = this.getMinDateFrom();
        var roundedDueDate = (due) ?
            this._getDateHelper().roundTimeTo(due) :
            this._getDateHelper().addAverageDuration(roundedFromDate);

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

        var roundedFromDate = this._getDateHelper().roundTimeFrom(date);

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
     * _checkFromDueDate will handle the special check for when the order is open
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
        // 1) at least 30 minutes into the future
        // 2) at least 15 minutes after the from date (if set)
        var that = this;
        var roundedDueDate = this._getDateHelper().roundTimeTo(due);

        this.from = this.getMinDateFrom();

        return this._checkDueDateBetweenMinMax(roundedDueDate)
            .then(function() {
                that.due = roundedDueDate;

                //If order doesn't exist yet, we set due date in create call
                //otherwise use setDueDate to update transaction
                if(!that.existsInDb()){
                    return that._createTransaction(skipRead);
                } else{
                    // If status is open when due date is changed, 
                    // we need to check for conflicts
                    if(that.status == "open"){
                        return that.canExtend(roundedDueDate).then(function(resp){
                            if(resp && resp.result == true){
                                return that.extend(roundedDueDate, skipRead);
                            }else{
                                return $.Deferred().reject("Cannot extend order to given date because it has conflicts.", resp);
                            }
                        })
                    }else{
                        return that._doApiCall({method: "setDueDate", params: {due: roundedDueDate}, skipRead: skipRead});
                    }
                }
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
        return this._doApiCall({method: "clearDueDate", skipRead: skipRead});
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
     * @returns {promise}
     */
    Order.prototype.searchItems = function(params, useAvailabilies, onlyUnbooked, skipItems, listName) {
        return this._searchItems(params, listName != null?listName:"available", useAvailabilies, onlyUnbooked, skipItems || this.items);
    };

    /**
     * Checks in the order
     * @method
     * @name Order#checkin
     * @param itemIds
     * @param location
     * @param skipRead
     * @returns {promise}
     */
    Order.prototype.checkin = function(itemIds, location, skipRead) {
        return this._doApiCall({method: "checkin", params: {items: itemIds, location: location}, skipRead: skipRead});
    };

    /**
     * Checks out the order
     * @method
     * @name Order#checkout
     * @param skipRead
     * @returns {promise}
     */
    Order.prototype.checkout = function(skipRead) {
        return this._doApiCall({method: "checkout", skipRead: skipRead});
    };

    /**
     * Undoes the order checkout
     * @method
     * @name Order#undoCheckout
     * @param skipRead
     * @returns {promise}
     */
    Order.prototype.undoCheckout = function(skipRead) {
        return this._doApiCall({method: "undoCheckout", skipRead: skipRead});
    };

    /**
     * Checks of order due date can be extended to given date
     * @param  {moment} due
     * @param  {bool} skipRead
     * @return {promise}
     */
    Order.prototype.canExtend = function(due){
        //return this._doApiCall({ method: "canExtend", params: { due: due }, skipRead: true });

        // TODO CHANGE THIS
        // Currently always allow order to be extended
        return $.Deferred().resolve({ result: true });
    }

    /**
     * Extends order due date
     * @param  {moment} due
     * @param  {bool} skipRead
     * @return {promise}
     */
    Order.prototype.extend = function(due, skipRead){
        return this._doApiCall({ method: "extend", params: { due: due }, skipRead: skipRead });
    };

    /**
     * Generates a PDF document for the order
     * @method
     * @name Order#generateDocument
     * @param {string} template id
     * @param {string} signature (base64)
     * @param {bool} skipRead
     * @returns {promise}
     */
    Order.prototype.generateDocument = function(template, signature, skipRead) {
        return this._doApiCall({method: "generateDocument", params: {template: template, signature: signature}, skipRead: skipRead});
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
