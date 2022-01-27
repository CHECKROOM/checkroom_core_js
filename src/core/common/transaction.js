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

export default that;
