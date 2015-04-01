/**
 * The Helper module
 * a Helper class which allows you to call helpers based on the settings in group.profile and user.profile
 * @module helper
 * @copyright CHECKROOM NV 2015
 */
define(["jquery", "moment", "dateHelper"], function ($, moment, DateHelper) {

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
     * @param settings
     * @param groupId
     * @param attachmentId
     * @param size
     * @returns {string}
     */
    Helper.prototype.getImageCDNUrl = function(settings, groupId, attachmentId, size) {
        // https://cheqroom-cdn.s3.amazonaws.com/app-staging/groups/nose/b00f1ae1-941c-11e3-9fc5-1040f389c0d4-M.jpg
        var url = "https://cheqroom-cdn.s3.amazonaws.com/" + settings.amazonBucket + "/groups/" + groupId + "/" + attachmentId;
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

    return Helper;

});