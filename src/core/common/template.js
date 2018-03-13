/*
 * Template helpers
 */
define(['moment'], function (moment) {
	return {
		templateIsArchived: function(templ) {
			return !(templ.archived == null);
		},
		templateCanDelete: function(templ) {
			return (!templ.system);
		},
		templateCanActivate: function(templ) {
			return (templ.status=="inactive") && (templ.archived==null);
		},
		templateCanDeactivate: function(templ) {
			return (templ.status=="active") && (templ.archived==null);
		},
		templateCanArchive: function(templ) {
			return (templ.archived == null);
		},
		templateCanUndoArchive: function(templ) {
			return (templ.archived != null);
		},


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
	     * @param  {float} width
	     * @param  {float} height
	     * @param  {string} unit
	     * @return {string}
	     */
	    getFriendlyTemplateSize: function(width, height, unit) {
            if( (width==0.0) || 
                (height==0.0)) {
                return "";
            } else if(
                (unit=="inch") &&
                (width==8.5) &&
                (height==11.0)) {
                return "US Letter";
            } else if(
                (unit=="mm") &&
                (width==210.0) &&
                (height==297.0)) {
                return "A4";
            } else if(
            	(unit=="cm") &&
            	(width==21) &&
            	(height==29.7)){
            	return "A4";
            } else {
				var friendlyUnit = (unit=="inch") ? '"' : unit;
                return width + friendlyUnit + " x " + height + friendlyUnit;
            }
	    }
	};
});