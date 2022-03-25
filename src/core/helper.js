import common from './common';

/**
 * Allows you to call helpers based on the settings file
 * and also settings in group.profile and user.profile
 * @name Helper
 * @class Helper
 * @constructor
 * @property {object} settings
 */
export default function (settings) {
	settings = settings;

	return {
		/**
		 * getImageUrl gets an image by using the datasource /get style and a mimeType
		 * 'XS': (64, 64),
		 * 'S': (128, 128),
		 * 'M': (256, 256),
		 * 'L': (512, 512)
		 *
		 * @memberOf helper
		 * @method
		 * @name  helper#getImageUrl
		 *
		 * @param ds
		 * @param pk
		 * @param size
		 * @param bustCache
		 * @returns {string}
		 */
		getImageUrl: function (ds, pk, size, bustCache) {
			var url = ds.getBaseUrl(true) + pk + '?mimeType=image/jpeg';
			if (size && size != 'orig') {
				url += '&size=' + size;
			}
			if (bustCache) {
				url += '&_bust=' + new Date().getTime();
			}
			return url;
		},
		getICalUrl: function (
			urlApi,
			userId,
			userPublicKey,
			orderLabels,
			reservationLabels,
			customerId,
			locationId,
			itemIds
		) {
			orderLabels = orderLabels || [];
			reservationLabels = reservationLabels || [];
			itemIds = itemIds || [];

			const url = new URL(
				`${urlApi}/ical/${userId}/${userPublicKey}/public/${
					itemIds && itemIds.length > 0 ? 'items' : 'locations'
				}/call/ical`
			);

			if (locationId) {
				url.searchParams.append('locations[]', locationId);
			}
			if (customerId) {
				url.searchParams.append('customer', customerId);
			}

			if (itemIds.length > 0) {
				itemIds.forEach((itemId) => url.searchParams.append('items[]', itemId));
			}

			var selectedReservationLabels = reservationLabels
				.filter(function (lbl) {
					return lbl.selected;
				})
				.map(function (lbl) {
					return lbl.id || '';
				});
			if (selectedReservationLabels.length == 0) {
				url.searchParams.append('skipOpenReservations', true);
			} else {
				// Only pass reservationLabels if user has made a custom selection
				if (selectedReservationLabels.length != reservationLabels.length) {
					selectedReservationLabels.forEach((label) => url.searchParams.append('rlab[]', label));
				}
			}

			var selectedOrderLabels = orderLabels
				.filter(function (lbl) {
					return lbl.selected;
				})
				.map(function (lbl) {
					return lbl.id || '';
				});
			if (selectedOrderLabels.length == 0) {
				url.searchParams.append('skipOpenOrders', true);
			} else {
				// Only pass orderLabels if user has made a custom selection
				if (selectedOrderLabels.length != orderLabels.length) {
					selectedOrderLabels.forEach((label) => url.searchParams.append('olab[]', selectedOrderLabels));
				}
			}

			return url.toString();
		},

		/**
		 * getQRCodeUrl
		 *
		 * @memberOf helper
		 * @method
		 * @name  helper#getQRCodeUrl
		 *
		 * @param  {string} code
		 * @param  {number} size
		 * @return {string}
		 */
		getQRCodeUrl: function (code, size) {
			return common.getQRCodeUrl(settings.qrCodeUtilsApi, code, size);
		},
		/**
		 * getBarcodeUrl
		 *
		 * @memberOf helper
		 * @method
		 * @name  helper#getBarcodeUrl
		 *
		 * @param  {string} code
		 * @param  {number} size
		 * @return {string}
		 */
		getBarcodeUrl: function (code, width, height) {
			return common.getBarcodeUrl(settings.barcodeUtilsApi, code, width, height);
		},

		/**
		 * getNumItemsLeft
		 *
		 * @memberOf helper
		 * @method
		 * @name  helper#getNumItemsLeft
		 *
		 * @param limits
		 * @param stats
		 * @return {Number}
		 */
		getNumItemsLeft: function (limits, stats) {
			var itemsPerStatus = this.getStat(stats, 'items', 'status');
			return limits.maxItemsSoft - this.getStat(stats, 'items', 'total') + itemsPerStatus.expired;
		},
		/**
		 * getStat for location
		 *
		 * @memberOf helper
		 * @method
		 * @name  helper#getStat
		 *
		 * @param stats
		 * @param location
		 * @param type
		 * @param name
		 * @param mode
		 * @return {object}         number or object
		 */
		getStat: function (stats, type, name, location, mode) {
			// make sure stats object isn't undefined
			stats = stats || {};

			//if no stats for given location found, use all stats object
			stats = stats[location && location != 'null' ? location : 'all'] || stats['all'];

			if (stats === undefined) throw 'Invalid stats';

			// load stats for given mode (defaults to production)
			stats = stats[mode || 'production'];

			var statType = stats[type];

			if (!statType) return {};
			if (!name) return statType;

			var statTypeValue = statType[name];
			if (statTypeValue === undefined) return {};

			return statTypeValue;
		},
		/**
		 * ensureValue, returns specific prop value of object or if you pass a string it returns that exact string
		 *
		 * @memberOf helper
		 * @method
		 * @name  helper#ensureValue
		 *
		 * @param  obj
		 * @param  prop
		 * @return {string}
		 */
		ensureValue: function (obj, prop) {
			if (typeof obj === 'string') {
				return obj;
			} else if (obj && obj.hasOwnProperty(prop)) {
				return obj[prop];
			} else {
				return obj;
			}
		},
		/**
		 * ensureId, returns id value of object or if you pass a string it returns that exact string
		 * For example:
		 * ensureId("abc123") --> "abc123"
		 * ensureId({ id:"abc123", name:"example" }) --> "abc123"
		 *
		 * @memberOf helper
		 * @method
		 * @name  helper#ensureId
		 *
		 * @param  obj
		 * @return {string}
		 */
		ensureId: function (obj) {
			if (obj && obj.hasOwnProperty('id')) {
				return this.ensureValue(obj, 'id');
			} else {
				return this.ensureValue(obj, '_id');
			}
		},
	};
}
