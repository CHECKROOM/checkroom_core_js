import Base from './base';
import common from './common';

var DEFAULTS = {
	name: '',
	description: '',
	items: [],
	itemSummary: '',
	status: 'unknown',
	cover: '',
	canReserve: 'available',
	canOrder: 'available',
	canCustody: 'available',
	allowReserve: true,
	allowOrder: true,
	allowCustody: true,
};

// Allow overriding the ctor during inheritance
// http://stackoverflow.com/questions/4152931/javascript-inheritance-call-super-constructor-or-use-prototype-chain
var tmp = function () {};
tmp.prototype = Base.prototype;

/**
 * Kit class
 * @name  Kit
 * @class
 * @constructor
 * @extends Base
 */
var Kit = function (opt) {
	var spec = Object.assign(
		{
			_fields: ['*'],
			crtype: 'cheqroom.types.kit',
		},
		opt
	);
	Base.call(this, spec);

	this.name = spec.name || DEFAULTS.name;
	this.description = spec.description || DEFAULTS.description;
	this.items = spec.items || DEFAULTS.items.slice();
	this.itemSummary = spec.itemSummary || DEFAULTS.itemSummary;
	this.codes = [];
	this.conflicts = [];
	this.status = spec.status || DEFAULTS.status;
	this.cover = spec.cover || DEFAULTS.cover;

	this.allowReserve = spec.allowReserve !== undefined ? spec.allowReserve : DEFAULTS.allowReserve;
	this.allowCheckout = spec.allowOrder !== undefined ? spec.allowOrder : DEFAULTS.allowOrder;
	this.allowCustody = spec.allowCustody !== undefined ? spec.allowCustody : DEFAULTS.allowCustody;
	this._canReserve = spec.canReserve !== undefined ? spec.canReserve : DEFAULTS.canReserve;
	this._canOrder = spec.canOrder !== undefined ? spec.canOrder : DEFAULTS.canOrder;
	this._canCustody = spec.canCustody !== undefined ? spec.canCustody : DEFAULTS.canCustody;
};

Kit.prototype = new tmp();
Kit.prototype.constructor = Kit;

//
// Specific validators
/**
 * Checks if name is valid
 * @name Kit#isValidName
 * @method
 * @return {Boolean}
 */
Kit.prototype.isValidName = function () {
	this.name = this.name.trim();
	return this.name.length >= 3;
};

/**
 * Check if name is valid and isn't already used
 * @name Kit#isValidNameAsync
 * @method
 * @return {promise}
 */
Kit.prototype.isNameAvailableAsync = function () {
	// When existing kit is edited, we don't want
	// to check its current name
	if (this.id != null && this.raw != null && this.name == this.raw.name) {
		return Promise.resolve(true);
	}

	// If a previous name available check is pending, abort it
	if (this._dfdNameAvailable) {
		this._dfdNameAvailable.abort();
	}

	this._dfdNameAvailable = this.ds.search({ name: this.name.trim() }, '_id');

	return this._dfdNameAvailable.then(
		function (resp) {
			return resp.count == 0;
		},
		function (error) {
			return false;
		}
	);
};

//
// Base overrides
//

/**
 * Checks if the Kit has any validation errors
 * @name Kit#isValid
 * @method
 * @returns {boolean}
 * @override
 */
Kit.prototype.isValid = function () {
	return this.isValidName();
};

/**
 * Checks if the kit is empty
 * @name Kit#isEmpty
 * @returns {boolean}
 */
Kit.prototype.isEmpty = function () {
	// Checks for: name
	return Base.prototype.isEmpty.call(this) && this.name == DEFAULTS.name;
};

/**
 * Checks if the Kit items is dirty
 * @name Kit#isDirtyItems
 * @returns {boolean}
 * @override
 */
Kit.prototype.isDirtyItems = function () {
	var toItemArrayString = function (items) {
		items = items || [];

		return items
			.map(function (it) {
				return it._id;
			})
			.sort()
			.join(',');
	};

	var raw = this.raw || {};

	return toItemArrayString(this.items) != toItemArrayString(raw.items);
};

/**
 * Checks if the Kits is dirty and needs saving
 * @name Kit#isDirty
 * @returns {boolean}
 * @override
 */
Kit.prototype.isDirty = function () {
	var isDirty = Base.prototype.isDirty.call(this);
	if (!isDirty && this.raw) {
		isDirty = this._isDirtyStringProperty('name');
	}
	return isDirty || this.isDirtyItems();
};

//
// Business logic
//
// KIT_STATUS = ( 'available', 'checkedout', 'await_checkout', 'in_transit', 'maintenance', 'repair', 'inspection', 'expired', 'in_custody', 'empty', 'incomplete')

/**
 * Checks if a Kit can be checked out (based on status)
 * @name Kit#canCheckout
 * @method
 * @returns {boolean}
 */
Kit.prototype.canCheckout = function () {
	return common.kitCanCheckout(this.raw);
};

/**
 * Checks if a Kit can be reserved (based on status)
 * @name Kit#canReserve
 * @method
 * @returns {boolean}
 */
Kit.prototype.canReserve = function () {
	return common.kitCanReserve(this.raw);
};

/**
 * addItems; adds a bunch of Items to the transaction using a list of item ids
 * @name Kit#addItems
 * @method
 * @param items
 * @param skipRead
 * @returns {promise}
 */
Kit.prototype.addItems = function (items, skipRead) {
	if (!this.existsInDb()) {
		throw new Error('Cannot addItems from document without id');
	}

	return this._doApiCall({
		method: 'addItems',
		params: { items: items },
		skipRead: skipRead,
	});
};

/**
 * removeItems; removes a bunch of Items from the transaction using a list of item ids
 * @name Kit#removeItems
 * @method
 * @param items (can be null)
 * @param skipRead
 * @returns {promise}
 */
Kit.prototype.removeItems = function (items, skipRead) {
	if (!this.existsInDb()) {
		throw new Error('Cannot removeItems from document without id');
	}

	return this._doApiCall({
		method: 'removeItems',
		params: { items: items },
		skipRead: skipRead,
	});
};

/**
 * moveItem; moves an Item in a kit to another position
 * @name Kit#moveItem
 * @method
 * @param item
 * @param toPos
 * @param skipRead
 * @returns {promise}
 */
Kit.prototype.moveItem = function (item, toPos, skipRead) {
	if (!this.existsInDb()) {
		throw new Error('Cannot moveItem from document without id');
	}

	return this._doApiCall({
		method: 'moveItem',
		params: { item: item, toPos: toPos },
		skipRead: skipRead,
	});
};

/**
 * Adds a QR code to the kit
 * @name Kit#addCode
 * @param code
 * @param skipRead
 * @returns {promise}
 */
Kit.prototype.addCode = function (code, skipRead) {
	return this._doApiCall({ method: 'addCodes', params: { codes: [code] }, skipRead: skipRead });
};

/**
 * Removes a QR code from the kit
 * @name Kit#removeCode
 * @param code
 * @param skipRead
 * @returns {promise}
 */
Kit.prototype.removeCode = function (code, skipRead) {
	return this._doApiCall({ method: 'removeCodes', params: { codes: [code] }, skipRead: skipRead });
};

/**
 * Duplicates an item a number of times
 * @name Kit#duplicate
 * @param  {int} times
 * @return {promise}
 */
Kit.prototype.duplicate = function (times, location, skipRead) {
	return this._doApiCall({
		method: 'duplicate',
		params: { times: times, location: location },
		skipRead: skipRead || true,
	});
};

/**
 * Checks if custody can be taken for a kit (based on status)
 * @name Kit#canTakeCustody
 * @returns {boolean}
 */
Kit.prototype.canTakeCustody = function () {
	return common.kitCanTakeCustody(this.raw);
};

/**
 * Checks if custody can be released for a kit (based on status)
 * @name Kit#canReleaseCustody
 * @returns {boolean}
 */
Kit.prototype.canReleaseCustody = function () {
	return common.kitCanReleaseCustody(this.raw);
};

/**
 * Checks if custody can be transferred for a kit (based on status)
 * @name Kit#canTransferCustody
 * @returns {boolean}
 */
Kit.prototype.canTransferCustody = function () {
	return common.kitCanTransferCustody(this.raw);
};

/**
 * Takes custody of a kit (and all items in it)
 * Puts it in the *in_custody* status
 * @name Kit#takeCustody
 * @param customerId (when null, we'll take the customer of the user making the API call)
 * @param skipRead
 * @returns {promise}
 */
Kit.prototype.takeCustody = function (customerId, skipRead) {
	return this._doApiCall({ method: 'takeCustody', params: { customer: customerId }, skipRead: skipRead });
};

/**
 * Releases custody of a kit (and all items in it) at a certain location
 * Puts it in the *available* status again
 * @name Kit#releaseCustody
 * @param locationId
 * @param skipRead
 * @returns {promise}
 */
Kit.prototype.releaseCustody = function (locationId, skipRead) {
	return this._doApiCall({ method: 'releaseCustody', params: { location: locationId }, skipRead: skipRead });
};

/**
 * Transfers custody of a kit (and all items in it)
 * Keeps it in the *in_custody* status
 * @name Kit#transferCustody
 * @param customerId (when null, we'll take the customer of the user making the API call)
 * @param skipRead
 * @returns {promise}
 */
Kit.prototype.transferCustody = function (customerId, skipRead) {
	return this._doApiCall({ method: 'transferCustody', params: { customer: customerId }, skipRead: skipRead });
};

//
// Implementation stuff
//

Kit.prototype._getDefaults = function () {
	return DEFAULTS;
};

Kit.prototype._toJson = function (options) {
	var data = Base.prototype._toJson.call(this, options);
	data.name = this.name || DEFAULTS.name;
	data.description = this.description || DEFAULTS.description;

	//data.items --> not via update
	return data;
};

Kit.prototype._fromJson = function (data, options) {
	var that = this;
	return Base.prototype._fromJson.call(this, data, options).then(function (data) {
		that.name = data.name || DEFAULTS.name;
		that.description = data.description || DEFAULTS.description;
		that.items = data.items || DEFAULTS.items.slice();
		that.itemSummary = data.itemSummary || DEFAULTS.itemSummary;
		that.codes = data.codes || [];
		that.status = data.status || DEFAULTS.status;
		that.cover = data.cover || DEFAULTS.cover;

		that._canReserve = data.canReserve !== undefined ? data.canReserve : DEFAULTS.canReserve;
		that._canOrder = data.canOrder !== undefined ? data.canOrder : DEFAULTS.canOrder;
		that._canCustody = data.canCustody !== undefined ? data.canCustody : DEFAULTS.canCustody;
		that.allowReserve = data.allowReserve !== undefined ? data.allowReserve : DEFAULTS.allowReserve;
		that.allowCheckout = data.allowOrder !== undefined ? data.allowOrder : DEFAULTS.allowOrder;
		that.allowCustody = data.allowCustody !== undefined ? data.allowCustody : DEFAULTS.allowCustody;

		that._loadConflicts(that.items);

		return data;
	});
};

// Override create method so we can pass items
// We don't override _toJson to include items, because this would
// mean that on an update items would also be passed
Kit.prototype.create = function (skipRead) {
	if (this.existsInDb()) {
		throw new Error('Cannot create document, already exists in database');
	}

	var that = this,
		data = {
			name: this.name,
			items: this._getIds(this.items),
		};

	// Also add any possible fields we need during `create`
	Object.assign(data, this._toJsonFields());

	delete data.id;

	return this.ds.create(data, this._fields).then(function (data) {
		return skipRead == true ? data : that._fromJson(data);
	});
};

Kit.prototype._loadConflicts = function (items) {
	var conflicts = [];
	var kitStatus = common.getKitStatus(items);

	// Kit has only conflicts when it's status is incomplete
	if (kitStatus == 'incomplete') {
		items.forEach(function (item) {
			switch (item.status) {
				case 'await_checkout':
					conflicts.push({
						kind: 'status',
						item: item._id,
						itemName: item.name,
						itemStatus: item.status,
						order: item.order,
					});
					break;
				case 'checkedout':
					conflicts.push({
						kind: 'order',
						item: item._id,
						itemName: item.name,
						itemStatus: item.status,
						order: item.order,
					});
					break;
				case 'expired':
					conflicts.push({
						kind: 'status',
						item: item._id,
						itemName: item.name,
						itemStatus: item.status,
					});
					break;
				case 'in_custody':
					conflicts.push({
						kind: 'custody',
						item: item._id,
						itemName: item.name,
						itemStatus: item.status,
					});
					break;
			}
		});
	}

	this.conflicts = conflicts;
};

export default Kit;
