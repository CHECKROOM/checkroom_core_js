import Base from './base';
import common from './common';
import User from './user';
import Helper from './helper';

var DEFAULTS = {
	name: '',
	email: '',
	status: 'active',
	user: {},
	kind: 'contact',
	cover: '',
	blocked: null,
};

// Allow overriding the ctor during inheritance
// http://stackoverflow.com/questions/4152931/javascript-inheritance-call-super-constructor-or-use-prototype-chain
var tmp = function () {};
tmp.prototype = Base.prototype;

/**
 * Contact class
 * @name  Contact
 * @class
 * @constructor
 * @extends Base
 */
var Contact = function (opt) {
	var spec = Object.assign(
		{
			_fields: ['*'],
			crtype: 'cheqroom.types.customer',
		},
		opt
	);
	Base.call(this, spec);

	this.helper = spec.helper || new Helper();

	this.name = spec.name || DEFAULTS.name;
	this.email = spec.email || DEFAULTS.email;
	this.status = spec.status || DEFAULTS.status;
	this.user = spec.user || DEFAULTS.user;
	this.kind = spec.kind || DEFAULTS.kind;
	this.cover = spec.cover || DEFAULTS.cover;
	this.blocked = spec.blocked || DEFAULTS.blocked;
};

Contact.prototype = new tmp();
Contact.prototype.constructor = Contact;

//
// Specific validators
/**
 * Checks if name is valid
 * @name Contact#isValidName
 * @method
 * @return {Boolean} [description]
 */
Contact.prototype.isValidName = function () {
	this.name = this.name.trim();
	return this.name.length >= 3;
};

/**
 * Check is email is valid
 * @name  Contact#isValidEmail
 * @method
 * @return {Boolean} [description]
 */
Contact.prototype.isValidEmail = function () {
	this.email = this.email.trim();
	return common.isValidEmail(this.email);
};

/**
 * If the contact is linked to a user,
 * return its user id
 * Remark: needs field user
 * @name Contact#getUserId
 * @method
 * @return {string}
 */
Contact.prototype.getUserId = function () {
	return this.helper.ensureId(this.user);
};

/**
 * Checks if the user is a synced user
 * Remark: needs field user
 * @name Contact#getUserSync
 * @method
 * @return {string}
 */
Contact.prototype.getUserSync = function () {
	return this.user != null && this.user.sync != null ? this.user.sync : '';
};

//
// Business logic
//
/**
 * Checks if a contact can be used in a reservation (based on status)
 * @name Contact#canReserve
 * @returns {boolean}
 */
Contact.prototype.canReserve = function () {
	return common.contactCanReserve(this);
};

/**
 * Checks if a contact can be used in a checkout (based on status)
 * @name Contact#canCheckout
 * @returns {boolean}
 */
Contact.prototype.canCheckout = function () {
	return common.contactCanCheckout(this);
};

/**
 * Checks if we can generate a document for this contact (based on status)
 * @name Contact#canGenerateDocument
 * @returns {boolean}
 */
Contact.prototype.canGenerateDocument = function () {
	return common.contactCanGenerateDocument(this);
};

/**
 * Checks if a contact can be archived (based on status)
 * @name Contact#canArchive
 * @returns {boolean}
 */
Contact.prototype.canArchive = function () {
	return common.contactCanArchive(this);
};

/**
 * Checks if a contact can be unarchived (based on status)
 * @name Contact#canUndoArchive
 * @returns {boolean}
 */
Contact.prototype.canUndoArchive = function () {
	return common.contactCanUndoArchive(this);
};

/**
 * Checks if a contact can be blocked
 * @name Contact#canBlock
 * @returns {boolean}
 */
Contact.prototype.canBlock = function () {
	return common.contactCanBlock(this);
};

/**
 * Checks if a contact can be unblocked
 * @name Contact#canUndoBlock
 * @returns {boolean}
 */
Contact.prototype.canUndoBlock = function () {
	return common.contactCanUndoBlock(this);
};

/**
 * Checks if a contact can be deleted (based on status and link to user)
 * @name Contact#canDelete
 * @returns {boolean}
 */
Contact.prototype.canDelete = function () {
	return common.contactCanDelete(this);
};

/**
 * Change contact kind
 * @name Contact#changeKind
 * @param skipRead
 * @returns {promise}
 */
Contact.prototype.changeKind = function (kind, skipRead) {
	return this._doApiCall({
		method: 'changeKind',
		params: {
			kind: kind,
		},
		skipRead: skipRead,
	});
};

/**
 * Archive a contact
 * @name Contact#archive
 * @param skipRead
 * @returns {promise}
 */
Contact.prototype.archive = function (skipRead) {
	return this._doApiCall({ method: 'archive', params: {}, skipRead: skipRead });
};

/**
 * Undo archive of a contact
 * @name Contact#undoArchive
 * @param skipRead
 * @returns {promise}
 */
Contact.prototype.undoArchive = function (skipRead) {
	return this._doApiCall({ method: 'undoArchive', params: {}, skipRead: skipRead });
};

/**
 * Blocks a contact
 * @name Contact#block
 * @param message
 * @param skipRead
 * @returns {promise}
 */
Contact.prototype.block = function (message, skipRead) {
	return this._doApiCall({ method: 'block', params: { message: message }, skipRead: skipRead });
};

/**
 * Unblock a contact
 * @name Contact#undoBlock
 * @param message
 * @param skipRead
 * @returns {promise}
 */
Contact.prototype.undoBlock = function (message, skipRead) {
	return this._doApiCall({ method: 'undoBlock', params: { message: message }, skipRead: skipRead });
};

/**
 * Generates a PDF document for the reservation
 * @method
 * @name Contact#generateDocument
 * @param {string} template id
 * @param {string} signature (base64)
 * @param {bool} skipRead
 * @returns {promise}
 */
Contact.prototype.generateDocument = function (template, signature, skipRead) {
	return this._doApiLongCall({
		method: 'generateDocument',
		params: { template: template, signature: signature },
		skipRead: skipRead,
	});
};

//
// Base overrides
//

/**
 * Checks if the contact has any validation errors
 * @name Contact#isValid
 * @method
 * @returns {boolean}
 * @override
 */
Contact.prototype.isValid = function () {
	return this.isValidName() && this.isValidEmail();
};

/**
 * Checks if the contact is empty
 * @returns {boolean}
 * @override
 */
Contact.prototype.isEmpty = function () {
	return Base.prototype.isEmpty.call(this) && this.name == DEFAULTS.name && this.email == DEFAULTS.email;
};

/**
 * Checks if the contact is dirty and needs saving
 * @returns {boolean}
 * @override
 */
Contact.prototype.isDirty = function () {
	var isDirty = Base.prototype.isDirty.call(this);
	if (!isDirty && this.raw) {
		isDirty =
			this._isDirtyStringProperty('name') ||
			this._isDirtyStringProperty('email') ||
			this._isDirtyStringProperty('kind');
	}
	return isDirty;
};

Contact.prototype._getDefaults = function () {
	return DEFAULTS;
};

Contact.prototype._toJson = function (options) {
	var data = Base.prototype._toJson.call(this, options);
	data.name = this.name || DEFAULTS.name;
	data.email = this.email || DEFAULTS.email;
	data.kind = this.kind || DEFAULTS.kind;

	return data;
};

Contact.prototype._fromJson = function (data, options) {
	var that = this;
	return Base.prototype._fromJson.call(this, data, options).then(function (data) {
		that.name = data.name || DEFAULTS.name;
		that.email = data.email || DEFAULTS.email;
		that.status = data.status || DEFAULTS.status;
		that.user = data.user || DEFAULTS.user;
		that.kind = data.kind || DEFAULTS.kind;
		that.blocked = data.blocked || DEFAULTS.blocked;

		var cover = data.cover || DEFAULTS.cover;
		that.cover = common.isImage(cover) ? cover : '';

		//$.publish('contact.fromJson', data);
		return data;
	});
};

Contact.prototype._create = function (skipRead) {
	// We override create because we also want
	// to set possible `fields` during the `create` command
	var that = this,
		data = Object.assign({}, this._toJson(), this._toJsonFields());

	delete data.id;

	return this.ds.create(data, this._fields).then(function (data) {
		return skipRead == true ? data : that._fromJson(data);
	});
};

Contact.prototype._update = function (skipRead) {
	var that = this;

	// Don't use the original `_update`
	// because it uses `_toJson` and lists fields, even if they didn't change
	// var data = this._toJson();
	var data = {};
	if (this._isDirtyStringProperty('name')) {
		data['name'] = that.name;
	}
	if (this._isDirtyStringProperty('email')) {
		data['email'] = that.email;
	}

	var dfdKind;
	if (this._isDirtyStringProperty('kind')) {
		dfdKind = this.changeKind(that.kind, true);
	} else {
		dfdKind = Promise.resolve();
	}

	return this.ds.update(this.id, data, this._fields).then(function (data) {
		return dfdKind.then(function () {
			return skipRead == true ? data : that._fromJson(data);
		});
	});
};

export default Contact;
