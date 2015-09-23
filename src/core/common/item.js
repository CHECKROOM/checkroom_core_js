/*
 * Item helpers
 */
define(function () {
	return {
		/**
		 * getFriendlyItemStatus 
		 *
		 * @memberOf common
		 * @name  common#getFriendlyItemStatus
		 * @method
		 * 
		 * @param  status
		 * @return {string}        
		 */
		getFriendlyItemStatus: function(status) {
	        // ITEM_STATUS = ('available', 'checkedout', 'await_checkout', 'in_transit', 'maintenance', 'repair', 'inspection', 'expired')
	        switch(status) {
	            case 'available': return 'Available';
	            case 'checkedout': return 'Checked out';
	            case 'await_checkout': return 'Checking out';
	            case 'in_transit': return 'In transit';
	            case 'maintenance': return 'Maintenance';
	            case 'repair': return 'Repair';
	            case 'inspection': return 'Inspection';
	            case 'expired': return 'Expired';
	            default: return 'Unknown';
	        }
	    },
	    /**
	     * getItemStatusCss
	     *
	     * @memberOf common
	     * @name  common#getItemStatusCss
	     * @method
	     * 
	     * @param  status 
	     * @return {string}       
	     */
	    getItemStatusCss: function(status) {
	        switch(status) {
	            case 'available': return 'label-available';
	            case 'checkedout': return 'label-checkedout';
	            case 'await_checkout': return 'label-awaitcheckout';
	            case 'in_transit': return 'label-transit';
	            case 'maintenance': return 'label-maintenance';
	            case 'repair': return 'label-repair';
	            case 'inspection': return 'label-inspection';
	            case 'expired': return 'label-expired';
	            default: return '';
	        }
	    },
	    /**
	     * getItemStatusIcon
	     *
	     * @memberOf common
	     * @name  common#getItemStatusIcon
	     * @method
	     * 
	     * @param  status
	     * @return {string}       
	     */
	    getItemStatusIcon: function(status) {
	        switch(status) {
	            case 'available': return 'fa fa-check-circle';
	            case 'checkedout': return 'fa fa-times-circle';
	            case 'await_checkout': return 'fa fa-ellipsis-h';
	            case 'in_transit': return 'fa fa-truck';
	            case 'maintenance': return 'fa fa-wrench';
	            case 'repair': return 'fa fa-wrench';
	            case 'inspection': return 'fa fa-stethoscope';
	            case 'expired': return 'fa fa-bug';
	            default: return '';
	        }
	    }
	};
});