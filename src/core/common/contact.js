/*
 * Contact helpers
 */
define(['common/image'], function (imageHelper) {
	return {
		/**
		 * getContactImageUrl 
		 *
		 * @memberOf common
		 * @name  common#getContactImageUrl
		 * @method
		 * 
		 * @param  cr.Contact or contact object
		 * @return {string} image path or base64 image        
		 */
		getContactImageUrl: function(ds, contact, size, bustCache) {
			// Show maintenance avatar?
			if(contact.kind == "maintenance") return imageHelper.getMaintenanceAvatar(size);
	        
	        // Show profile picture of user?
	        if(contact.user && contact.user.picture) return imageHelper.getImageUrl(ds, contact.user.picture, size, bustCache);
        	
        	// Show avatar initials
        	return imageHelper.getAvatarInitial(contact.name, size);
	    }
	};
});