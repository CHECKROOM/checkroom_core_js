import Base from './base';
import common from './common';

var DEFAULTS = {
	name: '',
	summary: '',
	status: 'open',
	numTotal: 0,
	numUnexpected: 0,
	numChecked: 0,
	numUnchecked: 0,
	numIssues: 0,
	by: {},
	kind: '',
	docId: null,
	created: null,
	closed: null,
	users: [],
	note: '',
	address: '',
	archived: null,
	itemFilter: {},
};

// Allow overriding the ctor during inheritance
// http://stackoverflow.com/questions/4152931/javascript-inheritance-call-super-constructor-or-use-prototype-chain
var tmp = function () {};
tmp.prototype = Base.prototype;

/**
 * Spotcheck class
 * @name  Spotcheck
 * @class
 * @constructor
 * @extends Base
 */
var Spotcheck = function (opt) {
	var spec = Object.assign(
		{
			_fields: ['*'],
			crtype: 'cheqroom.types.spotcheck',
		},
		opt
	);
	Base.call(this, spec);

	this.name = spec.name || DEFAULTS.name;
	this.summary = spec.summary || DEFAULTS.summary;
	this.status = spec.status || DEFAULTS.status;
	this.numTotal = spec.numTotal || DEFAULTS.numTotal;
	this.numChecked = spec.numChecked || DEFAULTS.numChecked;
	this.numUnchecked = spec.numUnchecked || DEFAULTS.numUnchecked;
	this.numUnexpected = spec.numUnexpected || DEFAULTS.numUnexpected;
};

Spotcheck.prototype = new tmp();
Spotcheck.prototype.constructor = Spotcheck;

//
// Specific validators
/**
 * Checks if name is valid
 * @name Spotcheck#isValidName
 * @method
 * @return {Boolean}
 */
Spotcheck.prototype.isValidName = function () {
	this.name = this.name.trim();
	return this.name.length >= 3;
};

/**
 * Checks if the spotcheck can be deleted
 * @method
 * @name Spotcheck#canDelete
 * @returns {boolean}
 */
Spotcheck.prototype.canDelete = function () {
	return this.status == 'open';
};

/**
 * Checks if the spotcheck can be archived
 * @method
 * @name Spotcheck#canArchive
 * @returns {boolean}
 */
Spotcheck.prototype.canArchive = function () {
	return this.status == 'closed' && !this.archived;
};

/**
 * Checks if the spotcheck can be unarchived
 * @method
 * @name Spotcheck#canUndoArchive
 * @returns {boolean}
 */
Spotcheck.prototype.canUndoArchive = function () {
	return this.archived != null;
};

/**
 * Checks if the spotcheck can be done again
 * @method
 * @name Spotcheck#canSpotcheckAgain
 * @returns {boolean}
 */
Spotcheck.prototype.canSpotcheckAgain = function () {
	return this.status === 'closed';
};

//
// Base overrides
//

/**
 * Checks if the Spotcheck has any validation errors
 * @name Spotcheck#isValid
 * @method
 * @returns {boolean}
 * @override
 */
Spotcheck.prototype.isValid = function () {
	return this.isValidName();
};

/**
 * Checks if the Spotchecks is dirty and needs saving
 * @name Spotcheck#isDirty
 * @returns {boolean}
 * @override
 */
Spotcheck.prototype.isDirty = function () {
	var isDirty = Base.prototype.isDirty.call(this);
	if (!isDirty && this.raw) {
		isDirty = this._isDirtyStringProperty('name');
	}
	return isDirty || this.isDirtyItems();
};

//
// Business logic
//

/**
 * Sets spotcheck name
 * @method
 * @name Spotcheck#setName
 * @param name
 * @param skipRead skip parsing the returned json response into the spotcheck
 * @returns {promise}
 */
Spotcheck.prototype.setName = function (name, skipRead) {
	return this._doApiCall({ method: 'setName', params: { name: name }, skipRead: skipRead });
};

/**
 * Clears spotcheck name
 * @method
 * @name Spotcheck#clearName
 * @param skipRead skip parsing the returned json response into the spotcheck
 * @returns {promise}
 */
Spotcheck.prototype.clearName = function (skipRead) {
	return this._doApiCall({ method: 'clearName', skipRead: skipRead });
};

Spotcheck.prototype.getEntries = function (params) {
	return this._doApiCall({ method: 'getEntries', params: params, skipRead: true });
};

Spotcheck.prototype.create = function (params, skipRead) {
	return this._doApiCall({ method: 'create', params: params, skipRead: skipRead, usePost: true });
};

Spotcheck.prototype.markEntriesAsScanned = function (scanItems, optionalParams, skipRead) {
	var params = Object.assign(
		{
			scanItems: scanItems,
		},
		optionalParams
	);
	return this._doApiCall({ method: 'markEntriesAsScanned', params: params, skipRead: skipRead });
};

Spotcheck.prototype.unmarkEntriesAsScanned = function (scanItems, skipRead) {
	var params = {
		scanItems: scanItems,
	};
	return this._doApiCall({ method: 'unmarkEntriesAsScanned', params: params, skipRead: skipRead });
};

Spotcheck.prototype.searchEntriesByCodes = function (codes) {
	return this._doApiCall({ method: 'searchEntriesByCodes', params: { codes: codes, _fields: '*' }, skipRead: true });
};

Spotcheck.prototype.close = function (message, skipRead) {
	return this._doApiCall({ method: 'close', params: { message: message }, skipRead: skipRead });
};

/**
 * Archive a spotcheck
 * @name Spotcheck#archive
 * @param skipRead
 * @returns {promise}
 */
Spotcheck.prototype.archive = function (skipRead) {
	if (!this.canArchive()) {
		throw new Error('Cannot archive document');
	}

	return this._doApiCall({
		method: 'archive',
		params: {},
		skipRead: skipRead,
	});
};

/**
 * Unarchive a spotcheck
 * @name Spotcheck#undoArchive
 * @param skipRead
 * @returns {promise}
 */
Spotcheck.prototype.undoArchive = function (skipRead) {
	return this._doApiCall({
		method: 'undoArchive',
		params: {},
		skipRead: skipRead,
	});
};

/**
 * Redo spotcheck
 * @name Spotcheck#spotcheckAgain
 * @param skipRead
 * @returns {promise}
 */
Spotcheck.prototype.spotcheckAgain = function () {
	return this._doApiCall({
		method: 'spotcheckAgain',
		params: {
			name: this.name,
		},
		skipRead: true,
	});
};

//
// Implementation stuff
//

Spotcheck.prototype._getDefaults = function () {
	return DEFAULTS;
};

Spotcheck.prototype._toJson = function (options) {
	var data = Base.prototype._toJson.call(this, options);
	data.name = this.name || DEFAULTS.name;

	return data;
};

Spotcheck.prototype._fromJson = function (data, options) {
	var that = this;
	return Base.prototype._fromJson.call(this, data, options).then(function (data) {
		that.name = data.name || DEFAULTS.name;
		that.summary = data.summary || DEFAULTS.summary;
		that.status = data.status || DEFAULTS.status;
		that.numTotal = data.numTotal || DEFAULTS.numTotal;
		that.numUnexpected = data.numUnexpected || DEFAULTS.numUnexpected;
		that.numChecked = data.numChecked || DEFAULTS.numChecked;
		that.numUnchecked = data.numUnchecked || DEFAULTS.numUnchecked;
		that.numIssues = data.numIssues || DEFAULTS.numIssues;
		that.kind = data.kind || DEFAULTS.kind;
		that.docId = data.docId || DEFAULTS.docId;
		that.created = data.created || DEFAULTS.created;
		that.finished = data.closed || DEFAULTS.closed;
		that.users = data.users || DEFAULTS.users;
		that.note = data.message || DEFAULTS.note;
		that.address = data.lastAddress || DEFAULTS.address;
		that.archived = data.archived || DEFAULTS.archived;
		that.itemFilter = data.itemFilter || DEFAULTS.itemFilter;
		that.by = data.by || DEFAULTS.by;

		//$.publish('Spotcheck.fromJson', data);
		return data;
	});
};

export default Spotcheck;
