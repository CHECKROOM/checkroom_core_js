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
            
            // Make dictionary of different item statuses
            $.each(items, function(i, item){  
                if(!statuses[item.status]){  
                    statuses[item.status] = true;
                    itemStatuses.push(item.status);
                }
            });

            if(itemStatuses.length == 1){
                // All items in the kit have the same status
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
        }
	};
});