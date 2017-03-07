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
         * @param  fields  
         * @return Boolean       
         */
        containsValue: function(doc, value, fields){
        	doc = doc || {};
            fields = fields || ['name', 'fields', 'codes', 'barcodes']

        	// Trim search
        	value = $.trim(value).toLowerCase();

        	// Name contains value?
            if(fields.indexOf('name') != -1){ 
                if(doc.name && doc.name.toLowerCase().indexOf(value) != -1)
            	   return true;
            }

            // Field contains value?
            if(fields.indexOf('fields') != -1){
                if(doc.fields){
                	var findValue = Object.values(doc.fields).find(function(fieldValue){ return fieldValue.toString().indexOf(value) != -1; });
                	if(findValue){
                		return true;
                	}
                }
            }

            // Code contains value?
            if(fields.indexOf('codes') != -1){
                if(doc.codes){
                	var findValue = doc.codes.find(function(code){ return code.indexOf(value) != -1; });
                	if(findValue){
                		return true;
                	}
                }
            }

            // Barcode contains value?
            if(fields.indexOf('barcodes') != -1){
                if(doc.barcodes){
                    var findValue = doc.barcodes.find(function(code){ return code.indexOf(value) != -1; });
                    if(findValue){
                        return true;
                    }
                }
            }

            return false;
        },
		/**
		* getDocumentIds
		* @memberOf common
		* @name  common#getDocumentIds
		* @method
		* @param  docs
		* @return {array}
		 */
		getDocumentIds: function(docs) {
			return docs.map(function(doc){ return typeof(doc) === "string" ? doc : doc._id; });
		}
	};
});