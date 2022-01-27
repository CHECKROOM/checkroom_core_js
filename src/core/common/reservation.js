export default {
	/**
	 * getFriendlyReservationCss
	 *
	 * @memberOf common
	 * @name  common#getFriendlyReservationCss
	 * @method
	 *
	 * @param  {string} status
	 * @return {string}
	 */
	getFriendlyReservationCss: function (status) {
		switch (status) {
			case 'creating':
				return 'label-creating';
			case 'open':
				return 'label-open';
			case 'closed':
				return 'label-converted';
			case 'closed_manually':
				return 'label-closed';
			case 'cancelled':
				return 'label-cancelled';
			default:
				return '';
		}
	},
	/**
	 * getFriendlyReservationStatus
	 *
	 * @memberOf common
	 * @name  common#getFriendlyReservationStatus
	 * @method
	 *
	 * @param  {string} status
	 * @return {string}
	 */
	getFriendlyReservationStatus: function (status) {
		switch (status) {
			case 'creating':
				return 'Draft';
			case 'open':
				return 'Booked';
			case 'closed':
				return 'Converted';
			case 'closed_manually':
				return 'Closed';
			case 'cancelled':
				return 'Cancelled';
			default:
				return 'Unknown';
		}
	},
	/**
	 * getFriendlyReservationFrequency
	 *
	 * @memberOf common
	 * @name  common#getFriendlyReservationFrequency
	 * @method
	 *
	 * @param  {string} frequency
	 * @return {string}
	 */
	getFriendlyReservationFrequency: function (frequency) {
		switch (frequency) {
			case 'every_day':
				return 'Repeats every day';
			case 'every_weekday':
				return 'Repeats every weekday';
			case 'every_week':
				return 'Repeats every week';
			case 'every_2_weeks':
				return 'Repeats every 2 weeks';
			case 'every_month':
				return 'Repeats every month';
			case 'every_2_months':
				return 'Repeats every 2 months';
			case 'every_3_months':
				return 'Repeats every 3 months';
			case 'every_6_months':
				return 'Repeats every 6 months';
			default:
				return 'Repeating reservation';
		}
	},

	/**
	 * isReservationOverdue
	 *
	 * @memberOf common
	 * @name  common#isReservationOverdue
	 * @method
	 *
	 * @param  {object}  reservation
	 * @param  {moment}  now
	 * @return {Boolean}
	 */
	isReservationOverdue: function (reservation, now) {
		now = now || moment();
		return reservation.status == 'open' && now.isAfter(reservation.fromDate || reservation.from);
	},
	/**
	 * isReservationInThePast
	 *
	 * @memberOf common
	 * @name  common#isReservationInThePast
	 * @method
	 *
	 * @param  {object}  reservation
	 * @param  {moment}  now
	 * @return {Boolean}
	 */
	isReservationInThePast: function (reservation, now) {
		now = now || moment();
		return reservation.status == 'open' && now.isAfter(reservation.fromDate) && now.isAfter(reservation.toDate);
	},
	/**
	 * isReservationArchived
	 *
	 * @memberOf common
	 * @name  common#isReservationArchived
	 * @method
	 *
	 * @param  {object}  reservation
	 * @return {Boolean}
	 */
	isReservationArchived: function (reservation) {
		return reservation && reservation.archived != null;
	},
	/**
	 * getReservationCss
	 *
	 * @memberOf common
	 * @name  common#getReservationCss
	 * @method
	 *
	 * @param  {object} reservation
	 * @return {string}
	 */
	getReservationCss: function (reservation) {
		if (this.isReservationArchived(reservation)) {
			return 'label-archived';
		} else {
			return this.getFriendlyReservationCss(reservation.status);
		}
	},
	getReservationStatus: function (reservation) {
		if (this.isReservationArchived(reservation)) {
			return 'Archived';
		} else {
			return this.getFriendlyReservationStatus(reservation.status);
		}
	},
};
