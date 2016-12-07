/*
 * Document helpers
 */
define(function () {
	return {
		
         /**
         * Checks if a given object (document) contains given value
         *
         * @memberOf common
         * @name  common#searchDocument
         * @method
         * 
         * @param  doc
         * @param  value
         * @return Boolean       
         */
        containsValue: function(doc, value){
        	doc = doc || {};

        	// Trim search
        	value = $.trim(value).toLowerCase();

        	// Name contains value?
            if(doc.name && doc.name.toLowerCase().indexOf(value) != -1)
            	return true;

            // Field contains value?
            if(doc.fields){
            	var findValue = Object.values(doc.fields).find(function(fieldValue){ return fieldValue.toString().indexOf(value) != -1; });
            	if(findValue){
            		return true;
            	}
            }

            // Code contains value?
            if(doc.codes){
            	var findValue = doc.codes.find(function(code){ return code.indexOf(value) != -1; });
            	if(findValue){
            		return true;
            	}
            }

            return false;
        }
	};
});