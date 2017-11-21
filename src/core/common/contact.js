/*
 * Contact helpers
 */
define(['common/image'], function (imageHelper) {
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
		// Show maintenance avatar?
		if(contact.kind == "maintenance") return imageHelper.getMaintenanceAvatar(size);

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
		// Show maintenance avatar?
		if(contact.kind == "maintenance") return imageHelper.getMaintenanceAvatar(size);

		// Show profile picture of user?
		if(contact.user && contact.user.picture) return imageHelper.getImageCDNUrl(settings, groupid, contact.user.picture, size, bustCache);

		// Show avatar initials
		return imageHelper.getAvatarInitial(contact.name, size);
	};

	return that;
});