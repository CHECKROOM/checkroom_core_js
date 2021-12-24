import common from './common';
import api from './api';
import Document from './document';

/*
    id = StringField(primary_key=True)  # category id in reverse domain format cheqroom.types.customer
    name = StringField()  # A friendly name for the category
    count = IntField(default=0)  # How many categories are under this parent
    defs = ListField(EmbeddedDocumentField(KeyValueDef))  # a list of allowed KeyValueDefs
    parent = ReferenceField("Category")  # the parent category
    by = ReferenceField(User)  # The user that add / updated this meta
    modified = DateTimeField(default=DateHelper.getNow)  # The data when it was added / update
     */

// Some constant values
var DEFAULTS = {
	id: '',
	name: '',
	count: 0,
	defs: [],
	parent: '',
	modified: null,
};

// Allow overriding the ctor during inheritance
// http://stackoverflow.com/questions/4152931/javascript-inheritance-call-super-constructor-or-use-prototype-chain
var tmp = function () {};
tmp.prototype = Document.prototype;

/**
 * Category describes a category which can trigger on certain events (signals)
 * @name  Category
 * @class
 * @property {string} name          the category name
 * @property {string} count         how many categories are under this node
 * @property {array} defs           a list of allowed keyvalue definitions
 * @property {string} parent        the primary key of the parent category
 * @property {Moment} modified      the modified date of the category
 * @constructor
 * @extends Document
 */
var Category = function (opt) {
	var spec = Object.assign({}, opt);
	Document.call(this, spec);

	this.name = spec.name || DEFAULTS.name;
	this.count = spec.count || DEFAULTS.count;
	this.defs = spec.defs || DEFAULTS.defs.slice();
	this.parent = spec.parent || DEFAULTS.parent;
	this.modified = spec.modified || DEFAULTS.modified;
};

Category.prototype = new tmp();
Category.prototype.constructor = Category;

//
// Specific validators
/**
 * Checks if name is valid
 * @name Category#isValidName
 * @method
 * @return {Boolean}
 */
Category.prototype.isValidName = function () {
	this.name = this.name.trim();
	if (this.name.length >= 3) {
		var nospecial = this.name.latinise().replace(/[`~!@#$%^&*()_|+\-=?;:'",.<\{\}\[\]\\\/]/gi, '');
		return this.name == nospecial;
	} else {
		return false;
	}
};

//
// Document overrides
//
/**
 * Checks if the category has any validation errors
 * @name Category#isValid
 * @method
 * @returns {boolean}
 * @override
 */
Category.prototype.isValid = function () {
	return this.isValidName();
};

Category.prototype._getDefaults = function () {
	return DEFAULTS;
};

/**
 * Checks if the object is empty, it never is
 * @name  Category#isEmpty
 * @method
 * @returns {boolean}
 * @override
 */
Category.prototype.isEmpty = function () {
	return Document.prototype.isEmpty.call(this) && this.name == DEFAULTS.name;
};

/**
 * Checks if the category is dirty and needs saving
 * @returns {boolean}
 * @override
 */
Category.prototype.isDirty = function () {
	var isDirty = Document.prototype.isDirty.call(this);
	if (!isDirty && this.raw) {
		isDirty = this.name != this.raw.name;
	}
	return isDirty;
};

/**
 * Checks via the api if we can delete the Category document
 * @name  Category#canDelete
 * @method
 * @returns {promise}
 * @override
 */
Category.prototype.canDelete = function () {
	return this.ds.call(this.id, 'canDeleteCategory', { omitFields: true });
};

/**
 * Checks via the api if we can rename the Category document
 * e.g. if it would not clash with any existing categories
 * @method
 * @param name
 * @returns {promise}
 */
Category.prototype.canChangeName = function (name) {
	return this.ds.call(this.id, 'canChangeName', { name: name });
};

/**
 * Changes the name of a category
 * @method
 * @param name
 * @returns {promise}
 */
Category.prototype.changeName = function (name) {
	return this._doApiCall({ pk: this.id, method: 'changeName', params: { name: name } });
};

/**
 * Checks via the api if we can change the parent of a Category document
 * e.g. if it would not clash with any existing categories
 * @param parentId
 * @returns {promise}
 */
Category.prototype.canChangeParent = function (parentId) {
	return this.ds.call(this.id, 'canChangeParent', { parent: parentId, omitFields: true });
};

/**
 * Changes the parent of a category
 * @param parentId
 * @returns {promise}
 */
Category.prototype.changeParent = function (parentId) {
	return this._doApiCall({ pk: this.id, method: 'changeParent', params: { parent: parentId, omitFields: true } });
};

// toJson, fromJson
// ----

/**
 * _toJson, makes a dict of params to use during create / update
 * @param options
 * @returns {{}}
 * @private
 */
Category.prototype._toJson = function (options) {
	var data = Document.prototype._toJson.call(this, options);
	data.name = this.name;
	return data;
};

/**
 * _fromJson: read some basic information
 * @method
 * @param {object} data the json response
 * @param {object} options dict
 * @returns {promise}
 * @private
 */
Category.prototype._fromJson = function (data, options) {
	var that = this;
	return Document.prototype._fromJson.call(this, data, options).then(function () {
		that.name = data.name || DEFAULTS.name;
		that.count = data.count || DEFAULTS.count;
		that.defs = data.defs || DEFAULTS.defs.slice();
		that.parent = data.parent || DEFAULTS.parent;
		that.modified = data.modified || DEFAULTS.modified;
		return data;
	});
};

export default Category;
