/*
 * Template helpers
 */
define(['moment'], function (moment) {
	return {
		/**
		 * getFriendlyTemplateStatus
		 *
		 * @memberOf common
		 * @name  common#getFriendlyTemplateStatus
		 * @method
		 * 
		 * @param  {string} status
		 * @return {string}        
		 */
		getFriendlyTemplateStatus: function(status) {
	        switch (status) {
	            case 'inactive': return 'Inactive';
	            case 'active': return 'Active';
	            case 'archived': return 'Archived';
	            default: return 'Unknown';
	        }
	    },
	    /**
	     * getFriendlyTemplateCss
	     *
	     * @memberOf common
	     * @name  common#getFriendlyTemplateCss
	     * @method
	     * 
	     * @param  {string} status 
	     * @return {string}        
	     */
	    getFriendlyTemplateCss: function(status) {
	        switch(status) {
                case 'inactive': return 'label-inactive';
                case 'active': return 'label-active';
                case 'archived': return 'label-archived';
	            default: return '';
	        }
	    },
	    /**
	     * getFriendlyTemplateSize
	     *
	     * @memberOf common
	     * @name  common#getFriendlyTemplateSize
	     * @method
	     * 
	     * @param  {object} template
	     * @return {string}      
	     */
	    getFriendlyTemplateSize: function(template) {
            if( (template.width==0.0) || 
                (template.height==0.0)) {
                return "";
            } else if(
                (template.unit=="inch") &&
                (template.width==8.5) &&
                (template.height==11.0)) {
                return "US Letter";
            } else if(
                (template.unit="mm") &&
                (template.width==210.0) &&
                (template.height==297.0)) {
                return "A4";
            } else {
                return template.width + template.unit + " x " + template.height + template.unit;
            }
	    }
	};
});