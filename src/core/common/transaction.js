/*
 * Transaction helpers
 */
define(['common/keyValues'], function (keyValues) {
	return {
		/**
    	 * getTransactionSummary
    	 * Return a friendly summary for a given transaction or custom name
    	 *
    	 * @memberOf common
    	 * @name  common#getTransactionSummary
    	 * @method
    	 * 
    	 * @param  {object} transaction 
    	 * @param  {string} emptyText   
    	 * @return {string}       
    	 */
    	getTransactionSummary: function(transaction, emptyText) {
	        if(transaction){
	            if(transaction.name){
	                return transaction.name;
	            }else if(transaction.itemSummary){
	                return transaction.itemSummary;
	            }else if((transaction.items) && (transaction.items.length>0)){
	                return keyValues.getCategorySummary(transaction.items);
	            }
	        } 
	        return emptyText || "No items";  
    	}
	};
});