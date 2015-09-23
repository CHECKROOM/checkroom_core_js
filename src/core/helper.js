/**
 * The Helper module
 * a Helper class which allows you to call helpers based on the settings in group.profile and user.profile
 * @module Helper
 * @copyright CHECKROOM NV 2015
 */
define(["jquery",
        "settings"], /** @lends Helper */ function ($, settings) {

    /**
     * @name Helper
     * @class
     * @constructor
     */
    var Helper = function(spec) {};

    /**
     * getImageCDNUrl gets an image by using the path to a CDN location
     * @method
     * @name  Helper#getImageCDNUrl
     * @param groupId
     * @param attachmentId
     * @param size
     * @returns {string}
     */
    Helper.prototype.getImageCDNUrl = function(groupId, attachmentId, size) {
        // https://cheqroom-cdn.s3.amazonaws.com/app-staging/groups/nose/b00f1ae1-941c-11e3-9fc5-1040f389c0d4-M.jpg
        var url = settings.cdn + "/" + settings.amazonBucket + "/groups/" + groupId + "/" + attachmentId;
        if( (size) &&
            (size.length>0)) {
            var parts = url.split('.');
            var ext = parts.pop();  // pop off the extension, we'll change it
            url = parts.join('.') + "-" + size + ".jpg";  // resized images are always jpg
        }
        return url;
    };

    /**
     * getImageUrl gets an image by using the datasource /get style and a mimeType
     * 'XS': (64, 64),
     * 'S': (128, 128),
     * 'M': (256, 256),
     * 'L': (512, 512)
     * @method
     * @name  Helper#getImageUrl
     * @param ds
     * @param pk
     * @param size
     * @param bustCache
     * @returns {string}
     */
    Helper.prototype.getImageUrl = function(ds, pk, size, bustCache) {
        var url = ds.getBaseUrl() + pk + '?mimeType=image/jpeg';
        if (size) {
            url += '&size=' + size;
        }
        if (bustCache) {
            url += '&_bust=' + new Date().getTime();
        }
        return url;
    };

    /**
     * getNumItemsLeft
<<<<<<< HEAD:src/app/helper.js
     * @param limits
     * @param stats
=======
     * @method
     * @name  Helper#getNumItemsLeft
     * @param limits
     * @param stats 
>>>>>>> feature/use_common_library:src/core/helper.js
     * @return {Number}
     */
    Helper.prototype.getNumItemsLeft = function(limits, stats) {
        return limits.maxItems - stats.detailed.production.items.total + stats.detailed.production.items.expired;
    };

    /**
     * getNumUsersLeft
<<<<<<< HEAD:src/app/helper.js
     * @param limits
     * @param stats
=======
     * @method
     * @name  Helper#getNumUsersLeft 
     * @param limits
     * @param stats 
>>>>>>> feature/use_common_library:src/core/helper.js
     * @return {Number}
     */
    Helper.prototype.getNumUsersLeft = function(limits, stats) {
        return limits.maxUsers - stats.detailed.production.users.active;
    };

    /**
     * getAccessRights returns access rights based on the user role, profile settings 
     * and account limits 
     * @method
     * @name  Helper#getAccessRights 
     * @param  role   
     * @param  profile 
     * @param  limits
     * @return {object}       
     */
    Helper.prototype.getAccessRights = function(role, profile, limits) {
        var isRootOrAdmin =         (role == "root") || (role == "admin");
        var isRootOrAdminOrUser =   (role == "root") || (role == "admin") || (role == "user");
        var useReservations = (limits.allowReservations) && (profile.useReservations);
        var useOrderAgreements = (limits.allowGeneratePdf) && (profile.useOrderAgreements);
        var useWebHooks = (limits.allowWebHooks);

        return {
            contacts: {
                create: isRootOrAdminOrUser,
                remove: isRootOrAdminOrUser,
                update: true
            },
            items: {
                create: isRootOrAdmin,
                remove: isRootOrAdmin,
                update: isRootOrAdmin,
                updateFlag: isRootOrAdmin,
                updateLocation: isRootOrAdmin,
                updateGeo: true
            },
            orders: {
                create: true,
                remove: true,
                update: true,
                updateContact: (role != "selfservice"),
                updateLocation: true,
                generatePdf: useOrderAgreements && isRootOrAdminOrUser
            },
            reservations: {
                create: useReservations,
                remove: useReservations,
                update: useReservations,
                updateContact: useReservations && (role != "selfservice"),
                updateLocation: useReservations
            },
            locations: {
                create: isRootOrAdmin,
                remove: isRootOrAdmin,
                update: isRootOrAdmin
            },
            users: {
                create: isRootOrAdmin,
                remove: isRootOrAdmin,
                update: isRootOrAdmin,
                updateOther: isRootOrAdmin,
                updateOwn: true
            },
            webHooks: {
                create: useWebHooks && isRootOrAdmin,
                remove: useWebHooks && isRootOrAdmin,
                update: useWebHooks && isRootOrAdmin
            },
            stickers: {
                print: isRootOrAdmin,
                buy: isRootOrAdmin
            },
            categories: {
                create: isRootOrAdmin,
                update: isRootOrAdmin
            },
            account: {
                update: isRootOrAdmin
            }
        }
    };

    /**
     * ensureValue, returns specific prop value of object or if you pass a string it returns that exact string 
     * @method
     * @name  Helper#ensureValue 
     * @param  obj   
     * @param  prop        
     * @return {string}       
     */
    Helper.prototype.ensureValue = function(obj, prop){
        return typeof obj === 'string'?obj:obj[prop]; 
    }

    /**
     * ensureId, returns id value of object or if you pass a string it returns that exact string 
     * For example:
     * ensureId("abc123") --> "abc123"
     * ensureId({ id:"abc123", name:"example" }) --> "abc123"
     *
     * @method
     * @name  Helper#ensureId 
     * @param  obj   
     * @return {string}       
     */
    Helper.prototype.ensureId = function(obj){
        return this.ensureValue(obj, "_id");
    }

    return Helper;

});