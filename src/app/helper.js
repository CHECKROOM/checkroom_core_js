/**
 * The Helper module
 * a Helper class which allows you to call helpers based on the settings in group.profile and user.profile
 * @module helper
 * @copyright CHECKROOM NV 2015
 */
define(["jquery", "moment", "dateHelper", "settings"], function ($, moment, DateHelper, settings) {

    var Helper = function(spec) {
        this.dateHelper = new DateHelper({});
    };

    /**
     * Convenience method that calls the DateHelper.getNow
     * @returns {*}
     */
    Helper.prototype.getNow = function() {
        return this.dateHelper.getNow();
    };

    Helper.prototype.roundTimeFrom = function(m) {
        return this.dateHelper.roundTimeFrom(m);
    };

    Helper.prototype.roundTimeTo = function(m) {
        return this.dateHelper.roundTimeTo(m);
    };

    Helper.prototype.addAverageDuration = function(m) {
        // TODO: Read the average order duration from the group.profile
        // add it to the date that was passed
        return m.clone().add(1, 'day');
    };

    /**
     * getImageCDNUrl gets an image by using the path to a CDN location
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
     * isValidEmail checks if an email address is valid
     * @param email
     * @returns {boolean}
     */
    Helper.prototype.isValidEmail = function(email) {
        var re = /^([\w-\+]+(?:\.[\w-\+]+)*)@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$/i;
        return re.test(email);
    };

    /**
     * isValidPhone checks if a phone number is valid
     * @param phone
     * @returns {boolean}
    */
    Helper.prototype.isValidPhone = function(phone) {
        var isnum = /^\d{9,}$/.test(phone);
        if (isnum) {
            return true;
        }

        var m = phone.match(/^[\s()+-]*([0-9][\s()+-]*){10,20}(( x| ext)\d{1,5}){0,1}$/);
        return ((m!=null) && (m.length>0));
    };

    /**
     * getNumItemsLeft
     * @param limits {maxItems: 100, ...}
     * @param stats {detailed: {production: {items: {expired: 10, total: 100}}}
     * @return {Number}
     */
    Helper.prototype.getNumItemsLeft = function(limits, stats) {
        return limits.maxItems - stats.detailed.production.items.total + stats.detailed.production.items.expired;
    };

    /**
     * getNumUsersLeft
     * @param limits {maxUsers: 10, ...}
     * @param stats {detailed: {production: {users: {active: 3}}}
     * @return {Number}
     */
    Helper.prototype.getNumUsersLeft = function(limits, stats) {
        return limits.maxUsers - stats.detailed.production.users.active;
    };

    /**
     * getAccessRights returns access rights based on the user role, profile settings 
     * and account limits 
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
                updateLocation: isRootOrAdmin
            },
            orders: {
                create: true,
                remove: true,
                update: true,
                updateContact: (role != "selfservice"),
                updateLocation: true,
                generatePdf: useOrderAgreements && isRootOrAdmin
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
            }
        }
    };

    return Helper;

});