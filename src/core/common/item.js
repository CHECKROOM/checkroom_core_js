/*
 * Item helpers
 */
define(function () {
	var that = {};
	
	that.itemCanTakeCustody = function(item) {
		return (item.status=="available");
	};
	
	that.itemCanReleaseCustody = function(item) {
		return (item.status=="in_custody");
	};
	
	that.itemCanTransferCustody = function(item) {
		return (item.status=="in_custody");
	};
	
	that.itemCanReserve = function(item) {
		return (item.status!="expired") && (item.status!="in_custody");
	};
	
	that.itemCanCheckout = function(item) {
		return (item.status=="available");
	};
	
	that.itemCanGoToCheckout = function(item) {
		return (item.status=="checkedout") || (item.status=="await_checkout");
	};
	
	that.itemCanCheckin = function(item) {
		return (item.status=="checkedout");
	};
	
	that.itemCanExpire = function(item) {
		return (item.status=="available");
	};
	
	that.itemCanUndoExpire = function(item) {
		return (item.status=="expired");
	};
	
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
	that.getFriendlyItemStatus = function(status) {
		// ITEM_STATUS = ('available', 'checkedout', 'await_checkout', 'in_transit', 'maintenance', 'repair', 'inspection', 'expired')
		switch(status) {
			case 'available': return 'Available';
			case 'checkedout': return 'Checked out';
			case 'await_checkout': return 'Checking out';
			case 'in_transit': return 'In transit';
			case 'in_custody': return 'In custody';
			case 'maintenance': return 'Maintenance';
			case 'repair': return 'Repair';
			case 'inspection': return 'Inspection';
			case 'expired': return 'Expired';
			default: return 'Unknown';
		}
	};

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
	that.getItemStatusCss = function(status) {
		switch(status) {
			case 'available': return 'label-available';
			case 'checkedout': return 'label-checkedout';
			case 'await_checkout': return 'label-awaitcheckout';
			case 'in_transit': return 'label-transit';
			case 'in_custody': return 'label-custody';
			case 'maintenance': return 'label-maintenance';
			case 'repair': return 'label-repair';
			case 'inspection': return 'label-inspection';
			case 'expired': return 'label-expired';
			default: return '';
		}
	};

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
	that.getItemStatusIcon = function(status) {
		switch(status) {
			case 'available': return 'fa fa-check-circle';
			case 'checkedout': return 'fa fa-times-circle';
			case 'await_checkout': return 'fa fa-ellipsis-h';
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
	 * getItemsByStatus
	 *
	 * @memberOf common
	 * @name  common#getItemsByStatus
	 * @method
	 * 
	 * @param  {Array} 			 items      
	 * @param  {string|function} comparator 
	 * @return {Array}           
	 */
	that.getItemsByStatus = function(items, comparator){
		if(!items) return [];

		return items.filter(function(item){
			if(typeof(comparator) == "string"){
				//filter items on status
				return item.status == comparator;
			}else{
				//use custom comparator to filter items
				return comparator(item); 
			} 
		});
	};
	
	/**
	 * getAvailableItems
	 * 
	 * @memberOf common
	 * @name  common#getAvailableItems
	 * @method
	 * 
	 * @param  {Array} items 
	 * @return {Array}       
	 */
	that.getAvailableItems = function(items){
		return this.getItemsByStatus(items, "available");
	};

	/**
	 * getActiveItems
	 * 
	 * @memberOf common
	 * @name  common#getActiveItems
	 * @method
	 * 
	 * @param  {Array} items 
	 * @return {Array}       
	 */
	that.getActiveItems = function(items){
		return this.getItemsByStatus(items, function(item){
			return item.status != "expired" && item.status != "in_custody";
		});
	};
	
	 /**
	 * getItemIds
	 *
	 * @memberOf common
	 * @name  common#getItemIds
	 * @method
	 * 
	 * @param  items 
	 * @return {array}       
	 */
	that.getItemIds = function(items){
		return items.map(function(item){ return typeof(item) === "string"?item:item._id; });
	};
	
	return that;
	
});