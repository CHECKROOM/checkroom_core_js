import moment from 'moment';

import itemHelpers from './item';
import orderHelper from './order';
import utils from './utils';

var that = {},
	sanitizer = utils.sanitizeHtml;

/**
 * Checks if a kit can be checked out (any items available)
 * @memberOf common
 * @name common#kitCanCheckout
 * @method
 * @param kit
 * @returns {boolean}
 */
that.kitCanCheckout = function (kit) {
	return kit.canOrder !== undefined ? kit.canOrder === 'available' || kit.canOrder === 'available_partially' : true;
};

/**
 * Checks if a kit can be reserved (any items active)
 * @memberOf common
 * @name common#kitCanReserve
 * @method
 * @param kit
 * @returns {boolean}
 */
that.kitCanReserve = function (kit) {
	return kit.canReserve !== undefined
		? kit.canReserve === 'available' || kit.canReserve === 'available_partially'
		: true;
};

/**
 * Checks if custody can be taken for a kit (based on status)
 * @memberOf common
 * @name common#kitCanTakeCustody
 * @method
 * @param kit
 * @returns {boolean}
 */
that.kitCanTakeCustody = function (kit) {
	var canCustody = kit.canCustody !== undefined ? kit.canCustody === 'available' : true;
	return canCustody && kit.status == 'available';
};

/**
 * Checks if custody can be released for a kit (based on status)
 * @memberOf common
 * @name common#kitCanReleaseCustody
 * @method
 * @param kit
 * @returns {boolean}
 */
that.kitCanReleaseCustody = function (kit) {
	var canCustody = kit.canCustody !== undefined ? kit.canCustody === 'available' : true;
	return canCustody && kit.status == 'in_custody';
};

/**
 * Checks if custody can be transferred for a kit (based on status)
 * @memberOf common
 * @name common#kitCanTransferCustody
 * @method
 * @param kit
 * @returns {boolean}
 */
that.kitCanTransferCustody = function (kit) {
	var canCustody = kit.canCustody !== undefined ? kit.canCustody === 'available' : true;
	return canCustody && kit.status == 'in_custody';
};

/**
 * getKitStatus
 * Available 		=> if all items in the kit are available
 * Checking out 	=> if all item in the kit is checking out
 * Checked out 		=> if all item in the kit is checked out
 * Expired			=> if all item in the kit is expired
 * Unknown          => if not all items in the kit have the same status
 *
 * @memberOf common
 * @name  common#getKitStatus
 * @method
 *
 * @param  status
 * @return {string}
 */
that.getKitStatus = function (items) {
	var statuses = {};
	var itemStatuses = [];
	var orders = {};
	var itemOrders = [];

	// Make dictionary of different item statuses
	items.forEach(function (item) {
		// Unique item statuses
		if (!statuses[item.status]) {
			statuses[item.status] = true;
			itemStatuses.push(item.status);
		}

		// Unique item orders
		if (!orders[item.order]) {
			orders[item.order] = true;
			itemOrders.push(item.order);
		}
	});

	if (itemStatuses.length == 1 && itemOrders.length <= 1) {
		// All items in the kit have the same status and are in the same order
		return itemStatuses[0];
	} else {
		// Kit has items with different statuses
		return 'incomplete';
	}
};

/**
 * getFriendlyKitStatus
 *
 * @memberOf common
 * @name  common#getFriendlyKitStatus
 * @method
 *
 * @param  status
 * @return {string}
 */
that.getFriendlyKitStatus = function (status) {
	if (status == 'incomplete') {
		return 'Incomplete';
	}

	return itemHelpers.getFriendlyItemStatus(status);
};

/**
 * getKitStatusCss
 *
 * @memberOf common
 * @name  common#getKitStatusCss
 * @method
 *
 * @param  status
 * @return {string}
 */
that.getKitStatusCss = function (status) {
	if (status == 'incomplete') {
		return 'label-incomplete';
	}

	return itemHelpers.getItemStatusCss(status);
};

/**
 * getKitStatusIcon
 *
 * @memberOf common
 * @name  common#getKitStatusIcon
 * @method
 *
 * @param  status
 * @return {string}
 */
that.getKitStatusIcon = function (status) {
	switch (status) {
		case 'available':
			return 'fa fa-check-circle';
		case 'checkedout':
			return 'fa fa-times-circle';
		case 'await_checkout':
			return 'fa fa-ellipsis-h';
		case 'incomplete':
			return 'fa fa-warning';
		case 'empty':
			return 'fa fa-ellipsis-h';
		case 'in_transit':
			return 'fa fa-truck';
		case 'in_custody':
			return 'fa fa-exchange';
		case 'maintenance':
			return 'fa fa-wrench';
		case 'repair':
			return 'fa fa-wrench';
		case 'inspection':
			return 'fa fa-stethoscope';
		case 'expired':
			return 'fa fa-bug';
		default:
			return '';
	}
};

/**
 * getKitIds
 *
 * @memberOf common
 * @name  common#getKitIds
 * @method
 *
 * @param  items
 * @return {array}
 */
that.getKitIds = function (items) {
	var kitDictionary = {};
	var ids = [];

	items.forEach(function (item) {
		if (item.kit) {
			var kitId = typeof item.kit == 'string' ? item.kit : item.kit._id;
			if (!kitDictionary[kitId]) {
				kitDictionary[kitId] = true;
				ids.push(kitId);
			}
		}
	});

	return ids;
};

/**
 * getKitMessages
 *
 * @memberOf common
 * @name  common#getKitMessages
 * @method
 *
 * @param  kit
 * @param  permissionHandler
 * @param  dateHelper
 * @return {promise}
 */
that.getKitMessages = function (kit, getDataSource, permissionHandler, dateHelper, user) {
	var messages = [],
		MessagePriority = {
			Critical: 0,
			High: 1,
			Medium: 2,
			Low: 3,
		},
		perm = permissionHandler,
		isSelfservice = !perm.hasContactReadOtherPermission();

	var formatDate = function (date) {
		return date.format('MMMM Do' + (date.year() == moment().year() ? '' : ' YYYY'));
	};
	var isOwn = function (contact) {
		contact = typeof contact !== 'string' ? contact || {} : { _id: contact };
		user = user || {};
		if (!user.customer) {
			user.customer = {};
		}
		return contact._id == user.customer._id;
	};

	// Check-out message?
	var dfdCheckouts = new Promise((resolveCheckouts) => {
		if (perm.hasCheckoutPermission('read') && (kit.status == 'checkedout' || kit.status == 'await_checkout')) {
			var message = '';

			var dfd = new Promise((resolve) => {
				getDataSource('orders')
					.search({
						_fields:
							'name,itemSummary,status,started,due,finished,customer.name,customer.user.picture,customer.cover,customer.kind',
						_restrict: !isSelfservice || !perm.hasCheckoutPermission('read'),
						_sort: 'started',
						status: kit.status == 'checkedout' ? 'open' : 'creating',
						_limit: 1,
						_skip: 0,
						items__in: itemHelpers.getItemIds(kit.items),
					})
					.then(function (resp) {
						if (resp && resp.count > 0) {
							resolve(resp.docs[0]);
						}
					});
			});

			dfd.then(function (checkout) {
				checkout = checkout || {};

				if (isOwn(checkout.customer)) {
					checkout.customer = user.customer;
					checkout.customer.user = user;
				}

				if (kit.status == 'await_checkout') {
					message = 'Kit is currently <strong>awaiting checkout</strong>';
				} else {
					var customerName = sanitizer(typeof checkout.customer !== 'string' ? checkout.customer.name : '');

					if (checkout && orderHelper.isOrderOverdue(checkout)) {
						message =
							'Kit was <strong>due back</strong> ' +
							checkout.due.fromNow() +
							(customerName ? ' from ' + customerName : '');
					} else {
						message =
							'Kit is <strong>checked out</strong>' +
							(customerName ? ' to ' + customerName : '') +
							' until ' +
							formatDate(checkout.due);
					}
				}

				messages.push({
					kind: 'checkout',
					priority: MessagePriority.Critical,
					message: message,
					checkout: !isOwn(checkout.customer) && isSelfservice ? {} : checkout,
				});

				resolveCheckouts();
			});
		} else {
			resolveCheckouts();
		}
	});

	// Reservation message?
	var dfdReservations = new Promise((resolveReservations) => {
		if (perm.hasReservationPermission('read') && kit.items.length > 0) {
			getDataSource('reservations')
				.search({
					status: 'open',
					fromDate__gte: moment(),
					_fields:
						'name,status,itemSummary,fromDate,toDate,customer.name,customer.user.picture,customer.cover,customer.kind',
					_restrict: !isSelfservice,
					_sort: 'fromDate',
					_limit: 1,
					_skip: 0,
					items__in: itemHelpers.getItemIds(kit.items),
				})
				.then(function (resp) {
					if (resp && resp.count > 0) {
						var reservation = resp.docs[0];

						message =
							'Next <strong>reservation</strong> is ' +
							reservation.fromDate.fromNow() +
							" <span class='text-muted'>on " +
							formatDate(reservation.fromDate) +
							'</span>';
						messages.push({
							kind: 'reservation',
							priority: MessagePriority.High,
							reservation: reservation,
							isOwn: isOwn(reservation.customer),
							message: message,
						});
					}

					resolveReservations();
				});
		} else {
			resolveReservations();
		}
	});

	// Custody message?
	var dfdCustody = new Promise((resolveCustody) => {
		if (kit.status == 'in_custody') {
			var dfd = new Promise((resolve) => {
				if (isSelfservice) {
					resolve([]);
				} else {
					getDataSource('kits')
						.call(kit.id, 'getChangeLog', {
							action__in: ['takeCustody', 'giveCustody', 'transferCustody'],
							limit: 1,
							skip: 0,
						})
						.then(function (resp) {
							var dfdFallback = new Promise((resolveFallback) => {
								if (resp.length == 0) {
									getDataSource('items')
										.call(kit.items[0]._id, 'getChangeLog', {
											action__in: ['takeCustody', 'giveCustody', 'transferCustody'],
											limit: 1,
											skip: 0,
										})
										.then(function (resp) {
											resolveFallback(resp);
										});
								} else {
									resolveFallback(resp);
								}
							});

							dfdFallback.then(function (resp) {
								getDataSource('contacts')
									.get(resp[0].obj, 'name,cover,user.picture,kind')
									.then(function (contact) {
										resolve([contact, resp[0].created]);
									});
							});
						});
				}
			});

			dfd.then(function ([contact, since]) {
				var message =
					'Kit is <strong>in custody</strong>' +
					(contact
						? ' of ' +
						  sanitizer(contact.name) +
						  " <span class='text-muted'>since " +
						  formatDate(since) +
						  '</span>'
						: '');

				messages.push({
					kind: 'custody',
					priority: MessagePriority.High,
					by: contact || {},
					message: message,
				});

				resolveCustody();
			});
		} else {
			resolveCustody();
		}
	});

	// Permission message?
	var canReserve = perm.hasKitPermission('reserve') && (kit._canReserve || kit.canReserve),
		canCheckout = perm.hasKitPermission('checkout') && (kit._canOrder || kit.canOrder),
		canCustody = perm.hasKitPermission('takeCustody') && (kit._canCustody || kit.canCustody),
		kitCanReserve = canReserve === 'available' || canReserve === 'available_partially',
		kitCanCheckout = canCheckout === 'available' || canCheckout === 'available_partially',
		kitCanCustody = canCustody === 'available';

	if (kitCanReserve || kitCanCheckout || kitCanCustody) {
		var notAllowedActions = [],
			allowedActions = [];

		if (
			(perm.hasReservationPermission('read') &&
				perm.hasCheckoutPermission('read') &&
				kitCanReserve &&
				kitCanCheckout) ||
			(!kitCanReserve && !kitCanCheckout)
		) {
			if (kitCanReserve && kitCanCheckout) {
				allowedActions.push('Bookings');
			} else {
				// modules enabled?d
				if (perm.hasCheckoutPermission('read') && perm.hasReservationPermission('read')) {
					notAllowedActions.push('Bookings');
				}
			}
		} else {
			if (kitCanReserve) {
				allowedActions.push('Reservation');
			} else {
				// module enabled?
				if (perm.hasReservationPermission('read')) {
					notAllowedActions.push('Reservation');
				}
			}
			if (kitCanCheckout) {
				allowedActions.push('Check-out');
			} else {
				// module enabled
				if (perm.hasCheckoutPermission('read')) {
					notAllowedActions.push('Check-out');
				}
			}
		}
		if (kitCanCustody) {
			allowedActions.push('Custody');
		} else {
			// module enabled?
			if (perm.hasItemPermission('takeCustody')) {
				notAllowedActions.push('Custody');
			}
		}

		var message = '',
			unavailable = !kitCanReserve && !kitCanCustody && !kitCanCheckout;
		if (unavailable) {
			message = 'Kit is <strong>unavailable</strong> for ' + notAllowedActions.joinAdvanced(', ', ' and ');
		} else {
			message =
				'Kit is <strong>' +
				(canReserve == 'available_partially' || canCheckout == 'available_partially' ? 'partially ' : '') +
				'available</strong> for ' +
				allowedActions.joinAdvanced(', ', ' and ') +
				(notAllowedActions.length > 0
					? "<span class='text-muted'>, not for " + notAllowedActions.joinAdvanced(', ', ' and ') + '</span>'
					: '');
		}

		messages.push({
			kind: 'permission',
			priority: MessagePriority.Medium,
			message: message,
		});
	}

	// Empty message?
	if (kit.status == 'empty') {
		var message = 'Kit is <strong>empty</strong>';

		messages.push({
			kind: 'empty',
			priority: MessagePriority.Low,
			message: message,
		});
	}

	// Incomplete message?
	if (kit.status == 'incomplete') {
		var message = 'Kit is <strong>incomplete</strong>';

		var items = kit.items;

		// Group per status total
		var statuses = {};
		items.forEach(function (item) {
			var status = item.status;
			if (item.status == 'available') {
				var canReserve = item.canReserve,
					canCheckout = item.canOrder;
				if (
					canReserve !== 'available' &&
					canReserve !== 'unavailable_status' &&
					canCheckout !== 'available' &&
					canCheckout !== 'unavailable_status'
				) {
					status = 'unavailable';
				}
			}

			var count = statuses[status] || 0;
			statuses[status] = count + 1;
		});

		var unavailableTotal = statuses['unavailable'] || 0;
		var checkedOutTotal = statuses['checkedout'] || 0;
		var awaitCheckoutTotal = statuses['await_checkout'] || 0;
		var expiredTotal = statuses['expired'] || 0;
		var availableTotal = statuses['available'] || 0;
		var inCustodyTotal = statuses['in_custody'] || 0;

		var itemsText = items.length + ' item'.pluralize(items.length);

		// If status total is equal to items total
		// only show # items
		if (
			availableTotal == items.length ||
			checkedOutTotal == items.length ||
			awaitCheckoutTotal == items.length ||
			expiredTotal == items.length ||
			inCustodyTotal == items.length
		) {
			// Do nothing
		} else {
			var msg = [];
			if (unavailableTotal > 0) {
				msg.push(unavailableTotal + ' unavailable');
			}
			if (availableTotal > 0) {
				msg.push(availableTotal + ' available');
			}
			if (checkedOutTotal > 0) {
				msg.push(checkedOutTotal + ' checked out');
			}
			if (awaitCheckoutTotal > 0) {
				msg.push(awaitCheckoutTotal + ' awaiting checkout');
			}
			if (expiredTotal > 0) {
				msg.push(expiredTotal + ' retired');
			}
			if (inCustodyTotal > 0) {
				msg.push(inCustodyTotal + ' in custody');
			}

			message += " <span class='text-muted'>(" + msg.joinAdvanced(', ', ' and ') + ')</span>';
		}

		messages.push({
			kind: 'incomplete',
			priority: MessagePriority.Low,
			message: message,
		});
	}

	// Expired message?
	if (kit.status == 'expired') {
		var message = 'Kit is <strong>retired</strong>';

		messages.push({
			kind: 'expired',
			priority: MessagePriority.Critical,
			message: message,
		});
	}

	return Promise.all([dfdCheckouts, dfdReservations, dfdCustody]).then(function () {
		// Sort by priority High > Low
		return messages.sort(function (a, b) {
			return a.priority - b.priority;
		});
	});
};

export default that;
