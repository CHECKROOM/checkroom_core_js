/*
 * User helpers
 */
define(['common/image'], function (imageHelper) {
	return {
		/**
		 * getUserImageUrl 
		 *
		 * @memberOf common
		 * @name  common#getUserImageUrl
		 * @method
		 * 
		 * @param  cr.User or user object
		 * @return {string} image path or base64 image        
		 */
		getUserImageUrl: function(ds, user, size, bustCache) {
			// Show profile picture of user?
	        if(user && user.picture) return imageHelper.getImageUrl(ds, user.picture, size, bustCache);
        	
        	// Show avatar initials
        	return imageHelper.getAvatarInitial(user.name, size);
	    },
	    /**
		 * getUserImageCDNUrl 
		 *
		 * @memberOf common
		 * @name  common#getUserImageCDNUrl
		 * @method
		 * 
		 * @param  cr.User or user object
		 * @return {string} image path or base64 image        
		 */
	    getUserImageCDNUrl: function(settings, groupid, user, size, bustCache){
	    	// Show profile picture of user?
	        if(user && user.picture) return imageHelper.getImageCDNUrl(settings, groupid, user.picture, size, bustCache);
        	
        	// Show avatar initials
        	return imageHelper.getAvatarInitial(user.name, size);
	    }
	};
});