/*
 * Contact helpers
 */
define(['common/image', 'common/attachment'], function (imageHelper, attachmentHelper) {
	var that = {};

	that.contactGetUserId = function(contact) {
		if (contact.user) {
			if (typeof contact.user === "string") {
				return contact.user;
			} else if (contact.user.hasOwnProperty("_id")) {
				return contact._id;
			}
		}
	};

	that.contactGetUserSync = function(contact) {
		if(	(contact.user) &&
			(contact.user.sync)) {
			return contact.user.sync;
		}
	};

	that.contactCanReserve = function(contact) {
		return (contact.status=="active");
	};

	that.contactCanCheckout = function(contact) {
		return (contact.status=="active");
	};

	that.contactCanGenerateDocument = function(contact) {
		return (contact.status=="active");
	};

	that.contactCanArchive = function(contact) {
		return (contact.status=="active") && (!that.contactGetUserSync(contact));
	};

	that.contactCanUndoArchive = function(contact) {
		return (contact.status=="archived") && (!that.contactGetUserSync(contact));
	};

	that.contactCanDelete = function(contact) {
		return (!that.contactGetUserSync(contact));
	};

	that.contactCanBlock = function(contact) {
		return contact.status=="active";
	};

	that.contactCanUndoBlock = function(contact) {
		return contact.status=="blocked";
	};


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
	that.getContactImageUrl = function(ds, contact, size, bustCache) {
		// Show contact image
		if(contact.cover) {
			if(contact.cover.indexOf('data:image') != -1 || contact.cover.indexOf('file:') != -1){
				return contact.cover;
			}
			// Bugfix don't show pdf preview images as contact image
   			if(attachmentHelper.isImage(contact.cover)){
				return imageHelper.getImageUrl(ds, contact.cover, size, bustCache);
			}
		}

		// Show profile picture of user?
		if(contact.user && contact.user.picture) return imageHelper.getImageUrl(ds, contact.user.picture, size, bustCache);

		// Show avatar initials
		return imageHelper.getAvatarInitial(contact.name, size);
	};

	/**
	 * getContactImageCDNUrl
	 *
	 * @memberOf common
	 * @name  common#getContactImageCDNUrl
	 * @method
	 *
	 * @param  cr.Contact or contact object
	 * @return {string} image path or base64 image
	 */
	that.getContactImageCDNUrl = function(settings, groupid, contact, size, bustCache) {
		// Show contact image
		if(contact.cover) return imageHelper.getImageCDNUrl(settings, groupid, contact.cover, size, bustCache);

		// Show profile picture of user?
		if(contact.user && contact.user.picture) return imageHelper.getImageCDNUrl(settings, groupid, contact.user.picture, size, bustCache);

		// Show avatar initials
		return imageHelper.getAvatarInitial(contact.name, size);
	};

	/**
	 * getContactMessages
	 *
	 * @memberOf common
	 * @name  common#getContactMessages
	 * @method
	 * 
	 * @param  item          
	 * @param  permissionHandler
	 * @param  dateHelper
	 * @param  user        
	 * @return {promise}                   
	 */
	that.getContactMessages = function(contact, getDataSource, permissionHandler, dateHelper, user, group){
		var dfd = $.Deferred(),
			messages = [],
			MessagePriority = {
                'Critical': 0,
                'High': 1,
                'Medium': 2,
                'Low': 3
            },
			perm = permissionHandler;
		
		// Maintenance message
		if(contact.kind == "maintenance"){
        	var message = "Contact can <strong>maintenance / repair</strong>";     
			messages.push({
				kind: "maintenance",
	            priority: MessagePriority.Low,
	            message: message,
	            contact: {
	            	kind: 'maintenance',
	            	name: ''
	            }
	        });	  
        }

        // Blocked message
        if(contact.status == "blocked"){
            var message = "Contact was <strong>blocked</strong> " + (contact.blocked?"<span class='text-muted'>" + contact.blocked.fromNow() + "</span>":"");
            messages.push({
                kind: "blocked",
                priority: MessagePriority.High,
                message: message
            });            	  
        }

        dfd.resolve();
       
        // Sort by priority High > Low
        return dfd.then(function(){
	        return messages.sort(function(a, b){
	        	return a.priority - b.priority;
	        });
        })
	}

	return that;
});