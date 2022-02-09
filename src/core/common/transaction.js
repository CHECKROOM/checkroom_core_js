import moment from 'moment';

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

export default that;
