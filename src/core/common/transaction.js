import moment from 'moment';
import keyValues from './keyValues';

var that = {};

/**
 * getTransactionSummary
 * Return a friendly summary for a given transaction or custom name
 *
 * @memberOf common
 * @name  common#getTransactionSummary
 * @method
 *
 * @param  {object} transaction
 * @param  {string} emptyText
 * @return {string}
 */
that.getTransactionSummary = function (transaction, emptyText) {
	transaction = transaction || {};

	if (transaction.name) {
		return transaction.name;
	} else if (transaction.itemSummary && transaction.itemSummary != 'No items') {
		return transaction.itemSummary;
	}

	return emptyText || 'No items';
};

/**
 * getOrderDuration
 * Gets a moment duration object
 *
 * @memberOf common
 * @name common#getOrderDuration
 * @method
 *
 * @returns {duration}
 */
that.getOrderDuration = function (transaction) {
	var from = transaction.started || moment();
	var to = transaction.status == 'closed' ? transaction.finished : transaction.due;
	if (to) {
		return moment.duration(to - from);
	}

	return null;
};

/**
 * getFriendlyOrderDuration
 * Gets a friendly duration for a given order
 *
 * @memberOf common
 * @name common#getFriendlyOrderDuration
 * @method
 *
 * @param transaction
 * @param dateHelper
 * @returns {string}
 */
that.getFriendlyOrderDuration = function (transaction, dateHelper) {
	var duration = that.getOrderDuration(transaction);
	return duration != null ? dateHelper.getFriendlyDuration(duration) : '';
};

/**
 * getReservationDuration
 * Return a Moment duration for a given reservation
 *
 * @memberOf common
 * @name common#getReservationDuration
 * @method
 *
 * @param transaction
 * @returns {duration}
 */
that.getReservationDuration = function (transaction) {
	if (transaction) {
		if (transaction.fromDate != null && transaction.toDate != null) {
			return moment.duration(transaction.toDate - transaction.fromDate);
		}
		return null;
	}
};

/**
 * getFriendlyReservationDuration
 * Gets a friendly duration for a given reservation
 *
 * @memberOf common
 * @name common#getFriendlyReservationDuration
 * @method
 *
 * @param transaction
 * @param dateHelper
 * @returns {string}
 */
that.getFriendlyReservationDuration = function (transaction, dateHelper) {
	var duration = that.getReservationDuration(transaction);
	return duration != null ? dateHelper.getFriendlyDuration(duration) : '';
};

/**
 * getMessages
 *
 * @memberOf common
 * @name  common#getMessages
 * @method
 *
 * @param  transaction
 * @param  permissionHandler
 * @param  dateHelper
 * @return {promise}
 */
that.getMessages = function (transaction, getDataSource, permissionHandler, dateHelper, user, group) {
	var dfd = $.Deferred();
	(messages = []),
		(MessagePriority = {
			Critical: 0,
			High: 1,
			Medium: 2,
			Low: 3,
		}),
		(group = group.raw ? group.raw : group),
		(perm = permissionHandler);

	// Cleanup message?
	if (transaction.status == 'creating') {
		var cleanup = group.cleanup || {},
			deleteIn = cleanup.deleteReservationsCreating;

		if (deleteIn > 0) {
			var deleteTime = transaction.modified.clone().add(deleteIn, 'minutes'),
				now = moment(),
				isPassed = deleteTime.isBefore(now);

			var getDeleteTime = function () {
				return deleteTime.fromNow();
			};

			var message = 'Reservation will be deleted <strong>' + deleteTime.fromNow() + '</strong>';

			if (isPassed) {
				message = 'Reservation will be deleted <strong>in a few seconds</strong>';
			}

			messages.push({
				kind: 'cleanup',
				priority: MessagePriority.Critical,
				message: message,
				deleteTime: deleteTime,
				isPassed: isPassed,
			});
		}
	}

	dfd.resolve();

	return dfd.then(function () {
		// Sort by priority High > Low
		return messages.sort(function (a, b) {
			return a.priority - b.priority;
		});
	});
};

export default that;
