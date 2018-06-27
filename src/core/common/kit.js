/*
 * Kit helpers
 */
define(['jquery', 'common/item'], function ($, itemHelpers) {
    var that = {};

    /**
     * Checks if a kit can be checked out (any items available)
     * @memberOf common
     * @name common#kitCanCheckout
     * @method
     * @param kit
     * @returns {boolean}
     */
    that.kitCanCheckout = function(kit) {
        return common.getAvailableItems(kit.items || []).length > 0;
    };

    /**
     * Checks if a kit can be reserved (any items active)
     * @memberOf common
     * @name common#kitCanReserve
     * @method
     * @param kit
     * @returns {boolean}
     */
    that.kitCanReserve = function(kit) {
        return common.getActiveItems(kit.items || []).length > 0;
    };

    /**
     * Checks if custody can be taken for a kit (based on status)
     * @memberOf common
     * @name common#kitCanTakeCustody
     * @method
     * @param kit
     * @returns {boolean}
     */
    that.kitCanTakeCustody = function(kit) {
        return (kit.status=="available");
    };

    /**
     * Checks if custody can be released for a kit (based on status)
     * @memberOf common
     * @name common#kitCanReleaseCustody
     * @method
     * @param kit
     * @returns {boolean}
     */
    that.kitCanReleaseCustody = function(kit) {
        return (kit.status=="in_custody");
    };

    /**
     * Checks if custody can be transferred for a kit (based on status)
     * @memberOf common
     * @name common#kitCanTransferCustody
     * @method
     * @param kit
     * @returns {boolean}
     */
    that.kitCanTransferCustody = function(kit) {
        return (kit.status=="in_custody");
    };

    /**
     * getKitStatus
     * Available 		=> if all items in the kit are available
     * Checking out 	=> if all item in the kit is checking out
     * Checked out 		=> if all item in the kit is checked out
     * Expired			=> if all item in the kit is expired
     * Unknown          => if not all items in the kit have the same status
     *
     * @memberOf common
     * @name  common#getKitStatus
     * @method
     *
     * @param  status
     * @return {string}
     */
    that.getKitStatus = function(items) {
        var statuses = {};
        var itemStatuses = [];
        var orders = {};
        var itemOrders = [];

        // Make dictionary of different item statuses
        $.each(items, function(i, item){
            // Unique item statuses
            if(!statuses[item.status]){
                statuses[item.status] = true;
                itemStatuses.push(item.status);
            }

            // Unique item orders
            if(!orders[item.order]){
                orders[item.order] = true;
                itemOrders.push(item.order);
            }
        });

        if(itemStatuses.length == 1 && itemOrders.length <= 1){
            // All items in the kit have the same status and are in the same order
            return itemStatuses[0];
        } else {
            // Kit has items with different statuses
            return "incomplete";
        }
    };

    /**
     * getFriendlyKitStatus
     *
     * @memberOf common
     * @name  common#getFriendlyKitStatus
     * @method
     *
     * @param  status
     * @return {string}
     */
    that.getFriendlyKitStatus = function(status) {
        if(status == "incomplete"){
            return "Incomplete";
        }

        return itemHelpers.getFriendlyItemStatus(status);
    };

    /**
     * getKitStatusCss
     *
     * @memberOf common
     * @name  common#getKitStatusCss
     * @method
     *
     * @param  status
     * @return {string}
     */
    that.getKitStatusCss = function(status) {
        if(status == "incomplete"){
            return "label-incomplete";
        }

        return itemHelpers.getItemStatusCss(status);
    };

    /**
     * getKitStatusIcon
     *
     * @memberOf common
     * @name  common#getKitStatusIcon
     * @method
     * 
     * @param  status
     * @return {string}       
     */
    that.getKitStatusIcon = function(status) {
        switch(status) {
            case 'available': return 'fa fa-check-circle';
            case 'checkedout': return 'fa fa-times-circle';
            case 'await_checkout': return 'fa fa-ellipsis-h';
            case 'incomplete': return 'fa fa-warning';
            case 'empty': return 'fa fa-ellipsis-h';
            case 'in_transit': return 'fa fa-truck';
            case 'in_custody': return 'fa fa-exchange';
            case 'maintenance': return 'fa fa-wrench';
            case 'repair': return 'fa fa-wrench';
            case 'inspection': return 'fa fa-stethoscope';
            case 'expired': return 'fa fa-bug';
            default: return '';
        }
    };

    /**
     * getKitIds
     *
     * @memberOf common
     * @name  common#getKitIds
     * @method
     *
     * @param  items
     * @return {array}
     */
    that.getKitIds = function(items){
        var kitDictionary = {};
        var ids = [];

        $.each(items, function(i, item){
            if(item.kit){
                var kitId = typeof(item.kit) == "string"?item.kit:item.kit._id;
                if(!kitDictionary[kitId]){
                    kitDictionary[kitId] = true;
                    ids.push(kitId);
                }
            }
        });

        return ids;
    };

    return that;
});