/**
 * The Helper module
 * 
 * @module helper
 * @copyright CHECKROOM NV 2015
 */
define(["jquery", "settings", "common"], /** @lends Helper */ function ($, defaultSettings, common) {

     /**
     * Allows you to call helpers based on the settings file 
     * and also settings in group.profile and user.profile
     * @name Helper
     * @class Helper
     * @constructor
     * @property {object} settings         
     */
    return function(settings){
        settings = settings || defaultSettings;

        return {
            /**
             * getSettings return settings file which helper uses internally
             * @return {object}
             */
            getSettings: function(){
                return settings;
            },
            /**
             * getImageCDNUrl gets an image by using the path to a CDN location
             *
             * @memberOf helper
             * @method
             * @name  helper#getImageCDNUrl
             * 
             * @param groupId
             * @param attachmentId
             * @param size
             * @returns {string}
             */
            getImageCDNUrl: function(groupId, attachmentId, size) {
                return common.getImageCDNUrl(settings, groupId, attachmentId, size);
            },
            /**
             * getImageUrl gets an image by using the datasource /get style and a mimeType
             * 'XS': (64, 64),
             * 'S': (128, 128),
             * 'M': (256, 256),
             * 'L': (512, 512)
             *
             * @memberOf helper
             * @method
             * @name  helper#getImageUrl
             * 
             * @param ds
             * @param pk
             * @param size
             * @param bustCache
             * @returns {string}
             */
            getImageUrl: function(ds, pk, size, bustCache) {
                var url = ds.getBaseUrl() + pk + '?mimeType=image/jpeg';
                if (size && size != 'orig') {
                    url += '&size=' + size;
                }
                if (bustCache) {
                    url += '&_bust=' + new Date().getTime();
                }
                return url;
            },
            getICalUrl: function(urlApi, userId, userPublicKey, orderLabels, reservationLabels, customerId, locationId) {
                orderLabels = orderLabels || [];
                reservationLabels = reservationLabels || [];

                var url = urlApi + "/ical/" + userId + "/" + userPublicKey + "/public/locations/call/ical",
                    parts = [];

                if (locationId) {
                    parts.push("locations[]=" + locationId);
                }
                if (customerId) {
                    parts.push("customer=" + customerId);
                }

                var selectedReservationLabels = reservationLabels.filter(function(lbl){ return lbl.selected; }).map(function(lbl){ return lbl.id || ""; });
                if (selectedReservationLabels.length == 0) {
                    parts.push("skipOpenReservations=true");
                }else{
                    // Only pass reservationLabels if user has made a custom selection
                    if(selectedReservationLabels.length != reservationLabels.length){
                        parts.push($.param({ "rlab": selectedReservationLabels }));
                    }
                }

                var selectedOrderLabels = orderLabels.filter(function(lbl){ return lbl.selected; }).map(function(lbl){ return lbl.id || ""; });
                if (selectedOrderLabels.length == 0) {
                    parts.push("skipOpenOrders=true");
                }else{
                    // Only pass orderLabels if user has made a custom selection
                    if(selectedOrderLabels.length != orderLabels.length){
                        parts.push($.param({ "olab": selectedOrderLabels }));
                    }
                }                              

                return (parts.length>0) ? url + "?" + parts.join("&") : url;
            },

            /**
             * getQRCodeUrl 
             *
             * @memberOf helper
             * @method
             * @name  helper#getQRCodeUrl
             * 
             * @param  {string} code 
             * @param  {number} size 
             * @return {string}      
             */
            getQRCodeUrl: function(code, size){
                return common.getQRCodeUrl(settings.urlApi, code, size);
            },
            /**
             * getBarcodeUrl 
             *
             * @memberOf helper
             * @method
             * @name  helper#getBarcodeUrl
             * 
             * @param  {string} code 
             * @param  {number} size 
             * @return {string}      
             */
            getBarcodeUrl: function(code, width, height){
                return common.getBarcodeUrl(settings.urlApi, code, width, height);
            },

            /**
             * getNumItemsLeft
             *
             * @memberOf helper
             * @method
             * @name  helper#getNumItemsLeft
             * 
             * @param limits
             * @param stats 
             * @return {Number}
             */
            getNumItemsLeft: function(limits, stats) {
                var itemsPerStatus = this.getStat(stats, "items", "status");
                return limits.maxItems - this.getStat(stats, "items", "total")  + itemsPerStatus.expired;
            },
            /**
             * getNumUsersLeft
             *
             * @memberOf helper
             * @method
             * @name  helper#getNumUsersLeft
             *  
             * @param limits
             * @param stats 
             * @return {Number}
             */
            getNumUsersLeft: function(limits, stats) {
                var usersPerStatus = this.getStat(stats, "users", "status");
                return limits.maxUsers - usersPerStatus.active;
            },
            /**
             * getStat for location
             *
             * @memberOf helper
             * @method
             * @name  helper#getStat
             *
             * @param stats
             * @param location
             * @param type
             * @param name
             * @param mode
             * @return {object}         number or object
             */
            getStat: function(stats, type, name, location, mode){
                // make sure stats object isn't undefined
                stats = stats || {};

                //if no stats for given location found, use all stats object
                stats = stats[(location && location != "null")?location:"all"] || stats["all"]; 
                
                if(stats === undefined) throw "Invalid stats"; 

                // load stats for given mode (defaults to production)
                stats = stats[mode || 'production'];

                var statType = stats[type];

                if(statType === undefined) throw "Stat doesn't exist";
                if(!name) return statType;

                var statTypeValue = statType[name];
                if(statTypeValue === undefined) throw "Stat value doesn't exist";

                return statTypeValue;      
            },
            /**
             * ensureValue, returns specific prop value of object or if you pass a string it returns that exact string 
             * 
             * @memberOf helper
             * @method
             * @name  helper#ensureValue 
             * 
             * @param  obj   
             * @param  prop        
             * @return {string}       
             */
            ensureValue: function(obj, prop){
                if (typeof obj === 'string') { 
                    return obj;
                }else if(obj && obj.hasOwnProperty(prop)){
                    return obj[prop]; 
                }else{
                    return obj;
                }
            },
            /**
             * ensureId, returns id value of object or if you pass a string it returns that exact string 
             * For example:
             * ensureId("abc123") --> "abc123"
             * ensureId({ id:"abc123", name:"example" }) --> "abc123"
             *
             * @memberOf helper
             * @method
             * @name  helper#ensureId 
             * 
             * @param  obj   
             * @return {string}       
             */
            ensureId: function(obj){
                return this.ensureValue(obj, "_id");
            }       
        };
    };
});