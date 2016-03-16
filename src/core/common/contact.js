/*
 * Contact helpers
 */
define(['helper', 'common/image'], function (Helper, imageHelper) {
	return {
		/**
		 * getContactImageUrl 
		 *
		 * @memberOf common
		 * @name  common#getContactImageUrl
		 * @method
		 * 
		 * @param  cr.Contact
		 * @return {string} image path or base64 image        
		 */
		getContactImageUrl: function(ds, contact, size) {
			// Show maintenance avatar?
			if(contact.kind == "maintenance") return imageHelper.getMaintenanceAvatar(size);
	        
	        // Show profile picture of user?
	        if(contact.user && contact.user.picture) return new Helper().getImageUrl(ds, contact.user.picture, size);
        	
        	// Show avatar initials
        	return imageHelper.getAvatarInitial(contact.name, size);
	    }
	};
});