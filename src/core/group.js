/**
 * The Group module
 * @copyright CHECKROOM NV 2015
 * @module group
 */
define([
    'jquery',
    'common',
    'api',
    'document'],  /** @lends Document */ function ($, common, api, Document) {

    // Some constant values
    var DEFAULTS = {
        id: "",
        name: "",
        itemFlags: [],
        kitFlags: [],
        customerFlags: [],
        orderFlags: [],
        reservationFlags: [],
        itemFields: [],
        kitFields: [],
        customerFields: [],
        orderFields: [],
        reservationFields: [],
        itemLabels: [],
        kitLabels: [],
        customerLabels: [],
        reservationLabels: [],
        orderLabels: [],
        businessHours: [],
        cancelled: null,
        calendarTemplate: '{{number}}: {{name_or_summary}} - {{contact.name}}'
    };

    // Allow overriding the ctor during inheritance
    // http://stackoverflow.com/questions/4152931/javascript-inheritance-call-super-constructor-or-use-prototype-chain
    var tmp = function(){};
    tmp.prototype = Document.prototype;

    /**
     * Group describes a group which can trigger on certain events (signals)
     * @name  Group
     * @class
     * @property {string} name              the group name
     * @property {array} itemFlags          the groups item flags
     * @property {array} kitFlags           the groups kit flags
     * @property {array} customerFlags      the groups customer flags
     * @property {array} orderFlags         the groups order flags
     * @property {array} reservationFlags   the groups reservation flags
     * @property {array} itemFields         the groups item fields
     * @property {array} kitFields          the groups kit fields
     * @property {array} customerFields     the groups customer fields
     * @property {array} reservationFields  the groups reservation fields
     * @property {array} orderFields        the groups order fields
     * @property {array} itemLabels         the groups item labels
     * @property {array} kitLabels          the groups kit labels
     * @property {array} customerLabels     the groups customer labels
     * @property {array} reservationLabels  the groups reservation labels
     * @property {array} orderLabels        the groups order labels
     * @property {array} businessHours      the groups business hours
     * @property {string} calendarTemplate  the group calendar event title template
     * @constructor
     * @extends Document
     */
    var Group = function(opt) {
        var spec = $.extend({}, opt);
        Document.call(this, spec);

        this.name = spec.name || DEFAULTS.name;
        this.itemFlags = spec.itemFlags || DEFAULTS.itemFlags.slice();
        this.kitFlags = spec.kitFlags || DEFAULTS.kitFlags.slice();
        this.customerFlags = spec.customerFlags || DEFAULTS.customerFlags.slice();
        this.orderFlags = spec.orderFlags || DEFAULTS.orderFlags.slice();
        this.reservationFlags = spec.reservationFlags || DEFAULTS.reservationFlags.slice();
        this.itemFields = spec.itemFields || DEFAULTS.itemFields.slice();
        this.kitFields = spec.kitFields || DEFAULTS.kitFields.slice();
        this.customerFields = spec.customerFields || DEFAULTS.customerFields.slice();
        this.reservationFields = spec.reservationFields || DEFAULTS.reservationFields.slice();
        this.orderFields = spec.orderFields || DEFAULTS.orderFields.slice();
        this.itemLabels = spec.itemLabels || DEFAULTS.itemLabels.slice();
        this.kitLabels = spec.kitLabels || DEFAULTS.kitLabels.slice();
        this.customerLabels = spec.customerLabels || DEFAULTS.customerLabels.slice();
        this.reservationLabels = spec.reservationLabels || DEFAULTS.reservationLabels.slice();
        this.orderLabels = spec.orderLabels || DEFAULTS.orderLabels.slice();
        this.businessHours = spec.businessHours || DEFAULTS.businessHours.slice();
        this.calendarTemplate = spec.calendarTemplate || DEFAULTS.calendarTemplate;
    };

    Group.prototype = new tmp();
    Group.prototype.constructor = Group;

    // Business logic
    // ----
    /**
     * Sets the name for a group
     * @param name
     * @returns {promise}
     */
    Group.prototype.updateName = function(name) {
        return this._doApiCall({
            pk: this.id,
            method: "updateName",
            location: name
        });
    };

    /**
     * Gets the stats (for a specific location)
     * @param locationId
     * @returns {promise}
     */
    Group.prototype.getStats = function(locationId) {
        return this._doApiCall({
            pk: this.id,
            method: "getStats",
            location: locationId
        });
    };

    /**
     * Updates the flags for a certain collection of documents
     * @param collection (items, kits, customers, reservations, orders)
     * @param flags
     * @param skipRead
     * @returns {promise}
     */
    Group.prototype.updateFlags = function(collection, flags, skipRead) {
        return this._doApiCall({
            pk: this.id,
            method: "updateFlags",
            collection: collection,
            flags: flags,
            skipRead: skipRead
        });
    };

    /**
     * Creates a field definition for a certain collection of documents
     * @param collection (items, kits, customers, reservations, orders)
     * @param name
     * @param kind
     * @param required
     * @param form
     * @param unit
     * @param editor
     * @param description
     * @param select
     * @param skipRead
     * @returns {promise}
     */
    Group.prototype.createField = function(collection, name, kind, required, form, unit, editor, description, select, search, skipRead) {
        var params = {
            collection: collection,
            name: name,
            kind: kind,
            required: required,
            form: form,
            unit: unit,
            editor: editor,
            description: description,
            search: search
        };
        if(select && select.length > 0){
            params.select = select;
        }

        return this._doApiCall({
            pk: this.id,
            method: "createField",
            skipRead: skipRead,
            params: params
        });
    };

    /**
     * Updates a field definition for a certain collection of documents
     * Also renames the field key on each of the documents that contain that field
     * @param collection (items, kits, customers, reservations, orders)
     * @param name
     * @param newName
     * @param kind
     * @param required
     * @param form
     * @param unit
     * @param editor
     * @param description
     * @param select
     * @param skipRead
     * @returns {promise}
     */
    Group.prototype.updateField = function(collection, name, newName, kind, required, form, unit, editor, description, select, search, skipRead) {
        var params = {
            collection: collection,
            name: name,
            kind: kind,
            required: required,
            form: form,
            unit: unit,
            editor: editor,
            description: description,
            search: search
        }
        if(select && select.length > 0){
            params.select = select;
        }

        return this._doApiCall({
            pk: this.id,
            method: "updateField",
            skipRead: skipRead,
            params: params
        });
    };

    /**
     * Deletes a field definition for a certain collection of documents
     * It will remove the field on all documents of that type
     * @param collection (items, kits, customers, reservations, orders)
     * @param name
     * @param skipRead
     * @returns {promise}
     */
    Group.prototype.deleteField = function(collection, name, skipRead) {
        return this._doApiCall({
            pk: this.id,
            method: "deleteField",
            skipRead: skipRead,
            params: {
                collection: collection,
                name: name
            }
        });
    };

    /**
     * Moves a field definition for a certain collection of documents
     * @param collection (items, kits, customers, reservations, orders)
     * @param oldPos
     * @param newPos
     * @param skipRead
     * @returns {promise}
     */
    Group.prototype.moveField = function(collection, oldPos, newPos, skipRead) {
        return this._doApiCall({
            pk: this.id,
            method: "moveField",
            skipRead: skipRead,
            params: {
                collection: collection,
                oldPos: oldPos,
                newPos: newPos
            }
        });
    };

    /**
     * Add document label
     * @param collection (items, kits, customers, reservations, orders)
     * @param labelColor
     * @param labelName
     * @param labelDefault
     * @param skipRead
     * @returns {promise}
     */
    Group.prototype.createLabel = function(collection, labelColor, labelName, labelDefault, skipRead) {
        return this._doApiCall({
            pk: this.id,
            method: "createLabel",
            skipRead: skipRead,
            params: {
                collection: collection,
                labelColor: labelColor,
                labelName: labelName,
                labelDefault: labelDefault
            }
        });
    };

    /**
     * Updates document label
     * @param collection (items, kits, customers, reservations, orders)
     * @param labelId
     * @param labelColor
     * @param labelName
     * @param skipRead
     * @returns {promise}
     */
    Group.prototype.updateLabel = function(collection, labelId, labelColor, labelName, labelDefault, skipRead) {
        return this._doApiCall({
            pk: this.id,
            method: "updateLabel",
            skipRead: skipRead,
            params: {
                collection: collection,
                labelId: labelId,
                labelColor: labelColor,
                labelName: labelName,
                labelDefault: labelDefault
            }
        });
    };

     /**
     * Removes document label
     * @param collection (items, kits, customers, reservations, orders)
     * @param labelId
     * @param labelColor
     * @param labelName
     * @param skipRead
     * @returns {promise}
     */
    Group.prototype.deleteLabel = function(collection, labelId, skipRead) {
        return this._doApiCall({
            pk: this.id,
            method: "deleteLabel",
            skipRead: skipRead,
            params: {
                collection: collection,
                labelId: labelId
            }
        });
    };

    /**
     * Buys a single product from our in-app store
     * @param productId
     * @param quantity
     * @param shipping
     * @returns {promise}
     */
    Group.prototype.buyProduct = function(productId, quantity, shipping) {
        return this._doApiCall({
            pk: this.id,
            method: "buyProduct",
            skipRead: true,
            params: {
                productId: productId,
                quantity: quantity,
                shipping: shipping
            }
        });
    };

    /**
     * Buys multiple products from our in-app store
     * @param listOfProductQtyTuples
     * @param shipping
     * @returns {promise}
     */
    Group.prototype.buyProducts = function(listOfProductQtyTuples, shipping, coupon) {
        return this._doApiCall({
            pk: this.id,
            method: "buyProducts",
            skipRead: true,
            params: {
                products: listOfProductQtyTuples,
                shipping: shipping,
                coupon: coupon
            }
        });
    };

    /**
     * Add tags
     * @param {Array} tags 
     */
    Group.prototype.addTags = function(tags){
        return this._doApiCall({
            pk: this.id,
            method: 'addTags',
            skipRead: true,
            params:{
                tags: tags
            }
        })
    };

    /**
     * Remove tags
     * @param {Array} tags 
     */
    Group.prototype.removeTags = function(tags){
        return this._doApiCall({
            pk: this.id,
            method: 'removeTags',
            skipRead: true,
            params:{
                tags: tags
            }
        })
    };

    // Helpers
    // ----

    /**
     * Helper method that gets all known fields for a certain collection of documents
     * @param coll
     * @param form
     * @returns {Array}
     */
    Group.prototype.getFieldsForCollection = function(coll, form) {
        var fields = [];

        switch (coll) {
            case "items":
                fields = this.itemFields;
                break;
            case "kits":
                fields = this.kitFields;
                break;
            case "contacts":
            case "customers":
                fields = this.customerFields;
                break;
            case "reservations":
                fields = this.reservationFields;
                break;
            case "checkouts":
            case "orders":
                fields = this.orderFields;
                break;
            default:
                break;
        }

        if (form != null) {
            fields = $.grep(fields, function (f, i) {
                return (f.form == form);
            })
        }

        return fields;
    };

    /**
     * Helper method that gets all known flags for a certain collection of documents
     * @param coll
     * @returns {Array}
     */
    Group.prototype.getFlagsForCollection = function(coll) {
        switch (coll) {
            case "items":
                return this.itemFlags;
            case "kits":
                return this.kitFlags;
            case "contacts":
            case "customers":
                return this.customerFlags;
            case "reservations":
                return this.reservationFlags;
            case "checkouts":
            case "orders":
                return this.orderFlags;
            default:
                return [];
        }
    };

    /**
     * Helper method that returns the business days
     * @returns {Array}
     */
    Group.prototype.getBusinessDays = function(){
        return this.businessHours.map(function(bh){
            //server side: 0 => monday - 6 => sunday
            //client side: 1 => monday - 7 => sunday
            return bh.isoWeekday; 
        });
    };

    /**
     * Helper method that returns the business hours for a given iso day
     * @returns {Array}
     */
    Group.prototype.getBusinessHoursForIsoWeekday = function(isoDay){
        return this.businessHours.filter(function(bh){
            //server side: 0 => monday - 6 => sunday
            //client side: 1 => monday - 7 => sunday
            return bh.isoWeekday == isoDay; 
        });
    };

    /**
     * setBusinessHours: translate iso weekdays back to server days
     * @param {array} businessHours 
     * @param {boolean} skipRead      
     */
    Group.prototype.setBusinessHours = function(businessHours, skipRead){
        var that = this;

        businessHours = businessHours || [];

        // Make copy of array
        businessHours = businessHours.slice().map(function(bh){ 
            // BUGFIX clone object!!!!
            var newBh = $.extend({}, bh);

            newBh.dayOfWeek = bh.isoWeekday - 1; //server side 0-6 Mon-Sun

            delete newBh.isoWeekday;

            return newBh;
        })

        return this._doApiCall({
            method: "setBusinessHours", 
            params: { businessHours: businessHours, _fields: this._fields }, 
            skipRead: skipRead, 
            usePost: true
        });
    }

    /**
     * getDefaultBusinessHours: in iso weekdays
     * @return {array}
     * setCalendarTemplate
     * @param {string} template 
     * @param {string} kind      
     */
    Group.prototype.getDefaultBusinessHours = function(){
        return [
            { isoWeekday: 1, openTime: 540, closeTime: 1020},
            { isoWeekday: 2, openTime: 540, closeTime: 1020},
            { isoWeekday: 3, openTime: 540, closeTime: 1020},
            { isoWeekday: 4, openTime: 540, closeTime: 1020},
            { isoWeekday: 5, openTime: 540, closeTime: 1020}
        ];
    };

    /**
     * setCalendarTemplate
     * @param {string} template 
     * @param {string} kind      
     */
    Group.prototype.setCalendarTemplate = function(template, kind){
        return this._doApiCall({
            method: "setCalendarTemplate", 
            params: { template: template, kind: kind }, 
            skipRead: true,
            usePost: true
        });
    };

    /**
     * setCalendarTemplate      
     */
    Group.prototype.clearCalendarTemplate = function(){
        return this._doApiCall({
            method: "clearCalendarTemplate",
            skipRead: true
        });
    };

    /**
     * getCalendarTemplatePreview
     * @param {string} template 
     * @param {string} kind     
     */
    Group.prototype.getCalendarTemplatePreview = function(template, kind){
        return this._doApiCall({
            method: "getCalendarTemplatePreview",
            params: { template: template, kind: kind }, 
            skipRead: true,
            usePost: true
        });
    };

    /**
     * getDefaultCalendarTemplate
     */
    Group.prototype.getDefaultCalendarTemplate = function(){
        return DEFAULTS.calendarTemplate;
    };

    //
    // Specific validators
    /**
     * Checks if name is valid
     * @name Group#isValidName
     * @method
     * @return {Boolean}
     */
    Group.prototype.isValidName = function() {
        this.name = $.trim(this.name);
        return (this.name.length>=3);
    };

    // toJson, fromJson
    // ----

    /**
     * _toJson, makes a dict of params to use during create / update
     * @param options
     * @returns {{}}
     * @private
     */
    Group.prototype._toJson = function(options) {
        var data = Document.prototype._toJson.call(this, options);
        data.name = this.name;
        return data;
    };

    /**
     * _fromJson: read some basic information
     * @method
     * @param {object} data the json response
     * @param {object} options dict
     * @returns {promise}
     * @private
     */
    Group.prototype._fromJson = function(data, options) {
        var that = this;
        return Document.prototype._fromJson.call(this, data, options)
            .then(function() {
                that.name = data.name || DEFAULTS.name;
                that.itemFlags = data.itemFlags || DEFAULTS.itemFlags.slice();
                that.kitFlags = data.kitFlags || DEFAULTS.kitFlags.slice();
                that.customerFlags = data.customerFlags || DEFAULTS.customerFlags.slice();
                that.orderFlags = data.orderFlags || DEFAULTS.orderFlags.slice();
                that.reservationFlags = data.reservationFlags || DEFAULTS.reservationFlags.slice();
                that.itemFields = data.itemFields || DEFAULTS.itemFields.slice();
                that.kitFields = data.kitFields || DEFAULTS.kitFields.slice();
                that.customerFields = data.customerFields || DEFAULTS.customerFields.slice();
                that.reservationFields = data.reservationFields || DEFAULTS.reservationFields.slice();
                that.orderFields = data.orderFields || DEFAULTS.orderFields.slice();
                that.cancelled = data.cancelled || DEFAULTS.cancelled;
                that.businessHours = data.businessHours || DEFAULTS.businessHours.slice();
                that.calendarTemplate = data.calendarTemplate || DEFAULTS.calendarTemplate;

                return that._fromColorLabelsJson(data, options).then(function(data){
                    return that._fromBusinessHoursJson(data, options);
                });                
            });
    };

    /**
     * _fromBusinessHoursJson: client side uses iso weekdays
     * @param  {object} data    
     * @param  {object} options 
     * @return {object}         
     */
    Group.prototype._fromBusinessHoursJson = function(data, options){
        data.businessHours = data.businessHours.map(function(bh){
            if(!bh.isoWeekday){
                bh.isoWeekday = bh.dayOfWeek + 1; // 1-7 Mon - Sun
            }

            delete bh.dayOfWeek;

            return bh;
        })

        return $.Deferred().resolve(data);
    };

    /**
     * _fromColorLabelsJson: reads the document labels
     * @param data
     * @param options
     * @returns {*}
     * @private
     */
    Group.prototype._fromColorLabelsJson = function(data, options) {
         var obj = null,
            that = this;

        $.each(['itemLabels', 'kitLabels', 'customerLabels', 'reservationLabels', 'orderLabels'], function(i, labelsKey){
            that[labelsKey] = DEFAULTS[labelsKey].slice();
            
            if(labelsKey == "orderLabels"){
                that[labelsKey].push(that._getColorLabel({ readonly: true, default: !data[labelsKey].some(function(l){ return l.default === true; }), name: "Unlabeled", color: "SlateGray" }, options));
            }
            if(labelsKey == "reservationLabels"){
                that[labelsKey].push(that._getColorLabel({ readonly: true, default: !data[labelsKey].some(function(l){ return l.default === true; }), name: "Unlabeled", color: "LimeGreen" }, options));
            }

            if( (data[labelsKey]) &&
                (data[labelsKey].length>0)) {
                $.each(data[labelsKey], function(i, label) {
                    obj = that._getColorLabel(label, options);
                    if (obj) {
                        that[labelsKey].push(obj);
                    }
                });
            }
        });

        return $.Deferred().resolve(data);
    };

    return Group;

});
