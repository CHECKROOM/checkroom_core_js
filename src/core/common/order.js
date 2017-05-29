/*
 * Order helpers
 */
define(['moment'], function (moment) {
	return {
		/**
		 * getFriendlyOrderStatus
		 *
		 * @memberOf common
		 * @name  common#getFriendlyOrderStatus
		 * @method
		 * 
		 * @param  {string} status
		 * @return {string}        
		 */
		getFriendlyOrderStatus: function(status) {
	        // ORDER_STATUS = ('creating', 'open', 'closed')
	        switch(status) {
	            case 'creating': return 'Draft';
	            case 'open': return 'Open';
	            case 'closed': return 'Completed';
	            default: return 'Unknown';
	        }
	    },
	    /**
	     * getFriendlyOrderCss
	     *
	     * @memberOf common
	     * @name  common#getFriendlyOrderCss
	     * @method
	     * 
	     * @param  {string} status 
	     * @return {string}        
	     */
	    getFriendlyOrderCss: function(status) {
	        switch(status) {
	            case 'creating': return 'label-creating';
	            case 'open': return 'label-open';
	            case 'closed': return 'label-closed';
	            default: return '';
	        }
	    },
	    /**
	     * getFriendlyOrderSize
	     *
	     * @memberOf common
	     * @name  common#getFriendlyOrderSize
	     * @method
	     * 
	     * @param  {object} order
	     * @return {string}      
	     */
	    getFriendlyOrderSize: function(order) {
	        if( (order.items) &&
	            (order.items.length>0)) {
	            var str = order.items.length + ' item';
	            if (order.items.length>1) {
	                str += 's';
	            }
	            return str;
	        } else {
	            return "No items";
	        }
	    },
	    /**
	     * isOrderOverdue
	     *
	     * @memberOf common
	     * @name  common#isOrderOverdue
	     * @method
	     * 
	     * @param  {object}  order 
	     * @param  {moment}  now   
	     * @return {Boolean}       
	     */
	    isOrderOverdue: function(order, now) {
        	now = now || moment();
        	return (order.status=="open") && (now.isAfter(order.due));
    	},
    	/**
	     * isOrderArchived
	     *
	     * @memberOf common
	     * @name  common#isOrderArchived
	     * @method
	     * 
	     * @param  {object}  order 
	     * @return {Boolean}       
	     */
	    isOrderArchived: function(order) {
        	return order && order.archived != null;
    	},
    	/**
    	 * getOrderStatus
    	 *
    	 * @memberOf common
    	 * @name  common#getOrderStatus
    	 * @method
    	 * 
    	 * @param  {object} order 
    	 * @param  {moment} now   
    	 * @return {string}       
    	 */
    	getOrderStatus: function(order, now) {
        	now = now || moment();
        	if (this.isOrderOverdue(order, now)) {
				return "Overdue";
			} else if(this.isOrderArchived(order)) {
				return "Archived";
			} else {
				return this.getFriendlyOrderStatus(order.status);
			}
    	},
    	/**
    	 * getOrderCss
    	 *
    	 * @memberOf common
    	 * @name  common#getOrderCss
    	 * @method
    	 * 
    	 * @param  {object} order 
    	 * @param  {moment} now   
    	 * @return {string}       
    	 */
    	getOrderCss: function(order, now) {
        	now = now || moment();

        	if(this.isOrderOverdue(order, now)) {
        		return "label-overdue";
        	} else if(this.isOrderArchived(order)) {
        		return this.getFriendlyOrderCss(order.status) + " label-striped";
        	} else {
        		return this.getFriendlyOrderCss(order.status);
        	}
    	}
	};
});