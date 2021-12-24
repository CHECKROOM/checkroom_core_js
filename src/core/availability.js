import common from './common';
import api from './api';
import Document from './document';

// Some constant values
var DEFAULTS = {
	id: '',
	planning: '',
	item: '',
	from: null,
	to: null,
	order: '',
	reservation: '',
};

// Allow overriding the ctor during inheritance
// http://stackoverflow.com/questions/4152931/javascript-inheritance-call-super-constructor-or-use-prototype-chain
var tmp = function () {};
tmp.prototype = Document.prototype;

/**
 * Availability represents the **un**availability of an Item between two dates
 * Each of these unavailable timeslots have a reference to an Order or
 * a Reservation for which it's or will be booked
 *
 * @name  Availability
 * @class
 * @property {string} planning     the planning primary key
 * @property {string} item         the item primary key
 * @property {Moment} from         the from date
 * @property {Moment} to           the to date
 * @property {string} order        the order primary key (if any)
 * @property {string} reservation  the reservation primary key (if any)
 * @constructor
 * @extends Document
 */
var Availability = function (opt) {
	var spec = Object.assign({}, opt);
	Document.call(this, spec);

	this.planning = spec.planning || DEFAULTS.planning;
	this.item = spec.item || DEFAULTS.item;
	this.from = spec.from || DEFAULTS.from;
	this.to = spec.to || DEFAULTS.to;
	this.order = spec.order || DEFAULTS.order;
	this.reservation = spec.reservation || DEFAULTS.reservation;
};

Availability.prototype = new tmp();
Availability.prototype.constructor = Availability;

//
// Document overrides
//
Availability.prototype._getDefaults = function () {
	return DEFAULTS;
};

/**
 * Checks if the object is empty, it never is
 * @name  Availability#isEmpty
 * @method
 * @returns {boolean}
 * @override
 */
Availability.prototype.isEmpty = function () {
	// An Availability is never empty because it's generated on the server side
	return false;
};

/**
 * Checks via the api if we can delete the Availability document
 * @name  Availability#canDelete
 * @method
 * @returns {promise}
 * @override
 */
Availability.prototype.canDelete = function () {
	// An Availability can never be deleted
	return Promise.resolve(false);
};

// toJson, fromJson
// ----

/**
 * _toJson, makes a dict of params to use during create / update
 * @param options
 * @returns {{}}
 * @private
 */
Availability.prototype._toJson = function (options) {
	var data = Document.prototype._toJson.call(this, options);
	data.planning = this.planning;
	data.item = this.item;
	data.fromDate = this.from;
	data.toDate = this.to;
	data.order = this.order;
	data.reservation = this.reservation;
	return data;
};

/**
 * _fromJson: read some basic information
 * @method
 * @param {object} data the json response
 * @param {object} options dict
 * @returns {Promise}
 * @private
 */
Availability.prototype._fromJson = function (data, options) {
	var that = this;
	return Document.prototype._fromJson.call(this, data, options).then(function () {
		that.planning = data.planning || DEFAULTS.planning;
		that.item = data.item || DEFAULTS.item;
		that.from = data.fromDate || DEFAULTS.from;
		that.to = data.toDate || DEFAULTS.to;
		that.order = data.order || DEFAULTS.order;
		that.reservation = data.reservation || DEFAULTS.reservation;
		return data;
	});
};

export default Availability;
