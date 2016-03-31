/*
 * Kit helpers
 */
define(['jquery', 'common/item'], function ($, itemHelpers) {
	return {
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
		getKitStatus: function(items) {
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
	    },
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
        getFriendlyKitStatus: function(status) {
            if(status == "incomplete"){
                return "Incomplete";
            }

            return itemHelpers.getFriendlyItemStatus(status);
        },
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
        getKitStatusCss: function(status) {
            if(status == "incomplete"){
                return "label-incomplete";
            }

            return itemHelpers.getItemStatusCss(status);
        },
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
        getKitIds: function(items){
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
        }
	};
});