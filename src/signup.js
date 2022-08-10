import './core/dateHelper';

import api from './core/api';
import Field from './core/field';
import utils from './core/common/utils';
import validation from './core/common/validation';

/**
 * capitalize
 *
 * @memberOf String
 * @name  String#capitalize
 * @method
 *
 * @param  {Boolean} lower
 * @return {string}
 */
String.prototype.capitalize = function (lower) {
	return (lower ? this.toLowerCase() : this).replace(/(?:^|\s)\S/g, function (a) {
		return a.toUpperCase();
	});
};

var Signup = function (opt = {}, settings) {
	this.ds =
		opt.ds ||
		new api.ApiAnonymous({
			urlApi: settings.urlApi,
			ajax: new api.ApiAjax(),
		});

	this.firstName = opt.firstName || ''; // between 2 and 25 chars
	this.lastName = opt.lastName || ''; // between 2 and 25 chars
	this.company = opt.company || ''; // between 3 and 46 chars
	this.timezone = opt.timezone || 'America/New_York';
	this.email = opt.email || '';
	this.password = opt.password || '';

	this.fields = [];

	this.inviteToken = opt.inviteToken || '';

	this.onBeforeActivateInvite =
		opt.onBeforeActivateInvite ||
		function () {
			return Promise.resolve();
		};
	this.onActivatedInvite =
		opt.onActivatedInvite ||
		function () {
			return Promise.resolve();
		};

	this.onContactFields =
		opt.onContactFields ||
		function () {
			return Promise.resolve();
		};
};

Signup.prototype.emailIsValid = function (denyFreeEmail) {
	var email = this.email.trim();
	var isValid = validation.isValidEmail(email);
	if (isValid && denyFreeEmail === true) {
		return !validation.isFreeEmail(email);
	}
	return isValid;
};

Signup.prototype.emailExists = function () {
	if (this.emailIsValid()) {
		if (this.dfdEmailExists) this.dfdEmailExists.abort();

		this.dfdEmailExists = new AbortController();

		return new Promise((resolve, reject) => {
			this.ds
				.call('emailExists', { email: this.email }, null, null, { abortController: this.dfdEmailExists })
				.then((resp) => {
					return resolve(resp.result);
				})
				.catch((err) => {
					if (err.name != 'AbortError') reject(err);
				});
		});
	} else {
		return Promise.resolve(false);
	}
};

Signup.prototype.passwordIsValid = function () {
	return validation.isValidPassword(this.password.trim());
};

Signup.prototype.parseFields = function (fieldDefs) {
	if (!fieldDefs) return [];

	var fields = [];

	// Return only form field definitions that are required and need to be shown on the form
	fieldDefs = fieldDefs.filter(function (def) {
		return def.form && def.required;
	});

	// Create a Field object for each field definition
	for (var i = 0; i < fieldDefs.length; i++) {
		fields.push(this._getField(fieldDefs[i]));
	}

	this.fields = fields;
	this.onContactFields(fields);
};

Signup.prototype.inviteIsValid = function () {
	var that = this;

	if (this.inviteToken.trim() != '') {
		return this.ds.call('checkInvite', { code: this.inviteToken, email: this.email }).then(function (resp) {
			that.parseFields(resp.customerFields);

			return resp.result;
		});
	} else {
		return Promise.resolve(false);
	}
};

// Business logic
// ----

Signup.prototype.getFullName = function () {
	var firstName = this.firstName.trim();
	var lastName = this.lastName.trim();
	return `${firstName} ${lastName}`;
};

Signup.prototype.setFullName = function (name) {
	var parts = Signup.splitFirstLastName(name.trim());
	this.firstName = parts.firstName;
	this.lastName = parts.lastName;
};

Signup.prototype._getField = function (data) {
	return new Field(data);
};

Signup.storeLoginToken = function (data) {
	// Already store the login token in localStorage
	var tmpUser = new api.ApiUser({ userId: data.userId, userEmail: data.email, userToken: data.token });
	tmpUser.toStorage();
};

Signup.prototype.activateInvite = function (storeInLocalStorage) {
	var that = this,
		beforeActivate = this.onBeforeActivateInvite,
		afterActivate = this.onActivatedInvite;

	return beforeActivate().then(function () {
		var params = {
			name: that.getFullName(),
			email: that.email.trim(),
			code: that.inviteToken,
			password: that.password.trim(),
			timezone: that.timezone.trim(),
		};

		// Add custom contact fields
		if (that.fields) {
			that.fields.forEach(({ name, value }) => {
				params['fields__' + name] = value;
			});
		}

		return that.ds.longCall('activateInvite', params, true).then(function (user) {
			if (storeInLocalStorage) {
				Signup.storeLoginToken(user.data);
			}

			return afterActivate(user);
		});
	});
};

// Static constructor
// ----
Signup.splitFirstLastName = function (name) {
	var parts = name.split(' ');
	return {
		firstName: parts.shift().trim(),
		lastName: parts.join(' ').trim(),
	};
};

/**
 * Constructor function that creates a Signup object from the params on the querystring
 * @returns {Signup}
 */
Signup.fromQueryString = function (opt, settings) {
	var name = utils.getUrlParam('name', '').capitalize(),
		email = utils.getUrlParam('email', '').replace(' ', '+'),
		company = utils.getUrlParam('company', ''),
		firstName = utils.getUrlParam('firstName', '').capitalize(),
		lastName = utils.getUrlParam('lastName', '').capitalize(),
		timezone = utils.getUrlParam('timezone', 'America/New_York'),
		inviteToken = utils.getUrlParam('code', '');

	if (firstName.length == 0 && lastName.length == 0 && name.length > 0) {
		var parts = Signup.splitFirstLastName(name);
		firstName = parts.firstName;
		lastName = parts.lastName;
	}

	return new Signup(
		Object.assign(
			{
				name: name,
				email: email,
				company: company,
				timezone: timezone,
				firstName: firstName,
				lastName: lastName,
				inviteToken: inviteToken,
			},
			opt
		),
		settings
	);
};

export default Signup;
