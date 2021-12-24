import moment from 'moment';
import orderHelper from './order';
import reservationHelper from './reservation';
import utils from './utils';

var that = {},
	sanitizer = utils.sanitizeHtml;

that.itemCanTakeCustody = function (item) {
	var canCustody = item.canCustody !== undefined ? item.canCustody === 'available' : true;
	return canCustody && item.status == 'available';
};

that.itemCanReleaseCustody = function (item) {
	return item.status == 'in_custody';
};

that.itemCanTransferCustody = function (item) {
	var canCustody = item.canCustody !== undefined ? item.canCustody === 'available' : true;
	return canCustody && item.status == 'in_custody';
};

that.itemCanReserve = function (item) {
	return item.canReserve !== undefined ? item.canReserve === 'available' : true;
};

that.itemCanCheckout = function (item) {
	return item.canOrder !== undefined ? item.canOrder === 'available' : true;
};

that.itemCanGoToCheckout = function (item) {
	return item.status == 'checkedout' || item.status == 'await_checkout';
};

that.itemCanCheckin = function (item) {
	return item.status == 'checkedout';
};

that.itemCanExpire = function (item) {
	return item.status == 'available';
};

that.itemCanUndoExpire = function (item) {
	return item.status == 'expired';
};

that.itemCanDelete = function (item) {
	return item.status == 'available' || item.status == 'expired';
};

/**
 * getFriendlyItemStatus
 *
 * @memberOf common
 * @name  common#getFriendlyItemStatus
 * @method
 *
 * @param  status
 * @return {string}
 */
that.getFriendlyItemStatus = function (status) {
	// ITEM_STATUS = ('available', 'checkedout', 'await_checkout', 'in_transit', 'maintenance', 'repair', 'inspection', 'expired')
	switch (status) {
		case 'available':
			return 'Available';
		case 'checkedout':
			return 'Checked out';
		case 'await_checkout':
			return 'Checking out';
		case 'in_transit':
			return 'In transit';
		case 'in_custody':
			return 'In custody';
		case 'maintenance':
			return 'Maintenance';
		case 'repair':
			return 'Repair';
		case 'inspection':
			return 'Inspection';
		case 'expired':
			return 'Expired';
		default:
			return 'Unknown';
	}
};

/**
 * getItemStatusCss
 *
 * @memberOf common
 * @name  common#getItemStatusCss
 * @method
 *
 * @param  status
 * @return {string}
 */
that.getItemStatusCss = function (status) {
	switch (status) {
		case 'available':
			return 'label-available';
		case 'checkedout':
			return 'label-checkedout';
		case 'await_checkout':
			return 'label-awaitcheckout';
		case 'in_transit':
			return 'label-transit';
		case 'in_custody':
			return 'label-custody';
		case 'maintenance':
			return 'label-maintenance';
		case 'repair':
			return 'label-repair';
		case 'inspection':
			return 'label-inspection';
		case 'expired':
			return 'label-expired';
		default:
			return '';
	}
};

/**
 * getItemStatusIcon
 *
 * @memberOf common
 * @name  common#getItemStatusIcon
 * @method
 *
 * @param  status
 * @return {string}
 */
that.getItemStatusIcon = function (status) {
	switch (status) {
		case 'available':
			return 'fa fa-check-circle';
		case 'checkedout':
			return 'fa fa-times-circle';
		case 'await_checkout':
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
 * getItemsByStatus
 *
 * @memberOf common
 * @name  common#getItemsByStatus
 * @method
 *
 * @param  {Array} 			 items
 * @param  {string|function} comparator
 * @return {Array}
 */
that.getItemsByStatus = function (items, comparator) {
	if (!items) return [];

	return items.filter(function (item) {
		if (typeof comparator == 'string') {
			//filter items on status
			return item.status == comparator;
		} else {
			//use custom comparator to filter items
			return comparator(item);
		}
	});
};

/**
 * getAvailableItems
 *
 * @memberOf common
 * @name  common#getAvailableItems
 * @method
 *
 * @param  {Array} items
 * @return {Array}
 */
that.getAvailableItems = function (items) {
	return this.getItemsByStatus(items, 'available').filter(function (item) {
		return item.canOrder === 'available';
	});
};

/**
 * getActiveItems
 *
 * @memberOf common
 * @name  common#getActiveItems
 * @method
 *
 * @param  {Array} items
 * @return {Array}
 */
that.getActiveItems = function (items) {
	return this.getItemsByStatus(items, function (item) {
		return item.status != 'expired' && item.status != 'in_custody';
	}).filter(function (item) {
		return item.canReserve === 'available';
	});
};

/**
 * getItemIds
 *
 * @memberOf common
 * @name  common#getItemIds
 * @method
 *
 * @param  items
 * @return {array}
 */
that.getItemIds = function (items) {
	return items.map(function (item) {
		return typeof item === 'string' ? item : item._id;
	});
};

/**
 * getItemMessages
 *
 * @memberOf common
 * @name  common#getItemMessages
 * @method
 *
 * @param  item
 * @param  permissionHandler
 * @param  dateHelper
 * @param  user
 * @return {promise}
 */
that.getItemMessages = function (item, getDataSource, permissionHandler, dateHelper, user, group) {
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
	var dfdCheckouts = new Promise((resolveCheckouts, rejectCheckouts) => {
		if (perm.hasCheckoutPermission('read') && (item.status == 'checkedout' || item.status == 'await_checkout')) {
			var message = '';

			var dfd = new Promise((resolve) => {
				getDataSource('orders')
					.search({
						_fields:
							'name,itemSummary,status,started,due,finished,customer.name,customer.user.picture,customer.cover,customer.kind',
						_restrict: !isSelfservice,
						_sort: 'started',
						status: item.status == 'checkedout' ? 'open' : 'creating',
						pk: typeof item.order !== 'string' ? item.order._id : item.order,
						_limit: 1,
						_skip: 0,
						items__contains: item.id,
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

				if (item.status == 'await_checkout') {
					message = 'Item is currently <strong>awaiting checkout</strong>';
				} else {
					var customerName = sanitizer(typeof checkout.customer !== 'string' ? checkout.customer.name : '');

					if (checkout && orderHelper.isOrderOverdue(checkout)) {
						message =
							'Item was <strong>due back</strong> ' +
							checkout.due.fromNow() +
							(customerName ? ' from ' + customerName : '');
					} else {
						message =
							'Item is <strong>checked out</strong>' +
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
		if (perm.hasReservationPermission('read')) {
			getDataSource('reservations')
				.search({
					status: 'open',
					fromDate__gte: moment(),
					_fields:
						'name,status,itemSummary,fromDate,toDate,customer.name,customer.user.picture,customer.cover,customer.kind',
					_restrict: !isSelfservice || !perm.hasReservationPermission('read'),
					_sort: 'fromDate',
					_limit: 1,
					_skip: 0,
					items__contains: item.id,
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
		if (item.status == 'in_custody') {
			var dfd = new Promise((resolve) => {
				if (isSelfservice) {
					resolve(null);
				} else {
					getDataSource('items')
						.call(item.id, 'getChangeLog', {
							action__in: ['takeCustody', 'transferCustody'],
							limit: 1,
							skip: 0,
						})
						.then(function (resp) {
							getDataSource('contacts')
								.get(resp[0].obj, 'name,cover,user.picture,kind')
								.then(function (contact) {
									resolve(contact, resp[0].created);
								});
						});
				}
			});

			dfd.then(function (contact, since) {
				var message =
					'Item is <strong>in ' +
					(isOwn(item.custody) ? 'your' : '') +
					' custody</strong>' +
					(contact && !isOwn(item.custody)
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
	var canReserve = perm.hasItemPermission('reserve') && item.allowReserve,
		canCheckout = perm.hasItemPermission('checkout') && item.allowCheckout,
		canCustody = perm.hasItemPermission('takeCustody') && item.allowCustody;
	var flag = group.itemFlags.find(function (f) {
			return f.id == item.flag;
		}),
		hasUnavailableFlag = flag && !flag.available;

	if ((!item.allowReserve || !item.allowCheckout || !item.allowCustody) && !hasUnavailableFlag) {
		var notAllowedActions = [],
			allowedActions = [];

		if (
			perm.hasReservationPermission('read') &&
			perm.hasCheckoutPermission('read') &&
			((!canReserve && !canCheckout) || (canReserve && canCheckout))
		) {
			if (canReserve && canCheckout) {
				allowedActions.push('Bookings');
			} else {
				// modules enabled?d
				if (perm.hasCheckoutPermission('read') && perm.hasReservationPermission('read')) {
					notAllowedActions.push('Bookings');
				}
			}
		} else {
			if (canReserve) {
				allowedActions.push('Reservation');
			} else {
				if (perm.hasReservationPermission('read')) {
					notAllowedActions.push('Reservation');
				}
			}
			if (canCheckout) {
				allowedActions.push('Check-out');
			} else {
				// module enabled
				if (perm.hasCheckoutPermission('read')) {
					notAllowedActions.push('Check-out');
				}
			}
		}
		if (canCustody) {
			allowedActions.push('Custody');
		} else {
			// module enabled?
			if (perm.hasItemPermission('takeCustody')) {
				notAllowedActions.push('Custody');
			}
		}

		var message = '',
			unavailable = !canReserve && !canCheckout && !canCustody;
		if (unavailable) {
			message = 'Item is <strong>unavailable</strong> for ' + notAllowedActions.joinAdvanced(', ', ' and ');
		} else {
			message =
				'Item is <strong>available</strong> for ' +
				allowedActions.joinAdvanced(', ', ' and ') +
				"<span class='text-muted'>, not for " +
				notAllowedActions.joinAdvanced(', ', ' and ') +
				'</span>';
		}

		messages.push({
			kind: 'permission',
			priority: MessagePriority.Medium,
			message: message,
		});
	}

	// Flag message?
	if (flag) {
		var flagName = sanitizer(flag.name),
			message =
				'Item was <strong>flagged</strong> as ' +
				flagName +
				(item.flagged ? " <span class='text-muted'>" + item.flagged.fromNow() + '</span>' : '');

		if (hasUnavailableFlag) {
			message =
				'Item is <strong>unavailable</strong> because of flag ' +
				flagName +
				(item.flagged ? " <span class='text-muted'>" + item.flagged.fromNow() + '</span>' : '');
		}

		messages.push({
			kind: 'flag',
			priority: hasUnavailableFlag ? MessagePriority.High : MessagePriority.Medium,
			message: message,
			flag: flag,
		});
	}

	if (item.warrantyDate) {
		var message = '';

		var inWarranty = Math.round(moment().diff(item.warrantyDate, 'days')) >= 0;

		if (inWarranty) {
			message =
				'Went <strong>out of warranty</strong> ' +
				item.warrantyDate.fromNow() +
				" <span class='text-muted'>on " +
				formatDate(item.warrantyDate) +
				'</span>';
		} else {
			message =
				'Warranty <strong>expires</strong> ' +
				item.warrantyDate.fromNow() +
				" <span class='text-muted'>on " +
				formatDate(item.warrantyDate) +
				'</span>';
		}

		messages.push({
			kind: 'warranty',
			priority: MessagePriority.Low,
			message: message,
			inWarranty: inWarranty,
		});
	}

	// Expired message?
	if (item.status == 'expired') {
		var message =
			'Item was <strong>expired</strong> ' +
			(item.expired ? "<span class='text-muted'>" + item.expired.fromNow() + '</span>' : '');

		messages.push({
			kind: 'expired',
			priority: MessagePriority.Critical,
			message: message,
		});
	}

	return Promise.all(dfdCheckouts, dfdReservations, dfdCustody).then(function () {
		// Sort by priority High > Low
		return messages.sort(function (a, b) {
			return a.priority - b.priority;
		});
	});
};

export default that;
