/*
 * Kit helpers
 */
define(['jquery'], function ($) {
	return {
		/**
		 * getKitStatus 
		 * Available 		=> if all items in the kit are available
	     * Checking out 	=> if 1 item in the kit is checking out
	     * Checked out 		=> if 1 item in the kit is checked out 
	     * Expired			=> if 1 item in the kit is expired
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
                if(!_statuses[item.status]){  
                    _statuses[item.status] = true;
                    itemStatuses.push(item.status);
                }
            });

            // First check if all items in the kit are available
            // if not check by status importance 
            // Expired > Checked out > checking out
            if(itemStatuses.length == 1 && itemStatuses["available"]){
                // all items in the kit are available
                return "available";
            }else if (itemStatuses["expired"]){
                // 1 item in the kit is expired
                return "expired";
            }else if (itemStatuses["checkedout"]){
                // 1 item in the kit is checked out
                return "checkedout";
            }else if (itemStatuses["await_checkout"]){
                // 1 item in the kit is awaiting checkout
                return "await_checkout";
            }else{
                return "unknown";
            }
	    }
	};
});