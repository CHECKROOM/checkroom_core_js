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
	     * Incomplete 		=> if 1 item in the kit is at a different location
		 * 
		 * @memberOf common
		 * @name  common#getKitStatus
		 * @method
		 * 
		 * @param  status
		 * @return {string}        
		 */
		/*getKitStatus: function(items) {
	        var statuses = {};
            var orders = {};
            var locations = {};

            var itemStatuses = [];
            var itemOrders = [];
            var itemLocations = []; 

            $.each(items, function(i, item){  
                if(!_statuses[item.status]){  
                    _statuses[item.status] = true;
                    itemStatuses.push(item.status);
                } 

                if(!_orders[item.order]){
                    _orders[item.order] = true;
                    itemOrders.push(item.order);
                }
            });

             //all items in the kit have the same status AND
            //all items are in the same order or arn't in an order
            if(itemStatuses.length == 1 && itemOrders.length <= 1){
                return itemStatuses[0];
            }else{
                return "incomplete";
            }
	    }*/
	};
});