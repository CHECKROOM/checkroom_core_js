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

    return Helper;

});