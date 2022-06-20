import './core/dateHelper';

import api from './core/api';
import Field from './core/field';
import { validation, utils } from './core/common';

var DEFAULT_PLAN = 'cr_2004_plus_yearly_usd_500';
var DEFAULT_PERIOD = 'yearly';
var DEFAULT_SOURCE = 'attempt';
var DEFAULT_KIND = 'trial';
var DEFAULT_DEVICE_KIND = null;

var Signup = function (opt, settings) {
	opt = opt || {};
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
	this.plan = opt.plan || DEFAULT_PLAN;
	this.period = opt.period || DEFAULT_PERIOD;
	this.deviceKind = opt.deviceKind || DEFAULT_DEVICE_KIND;
	this.source = opt.source || '';
	this.phone = opt.phone || '';
	this.industry = opt.industry || '';
	this.tags = opt.tags || [];

	this.fields = [];

	this.inviteToken = opt.inviteToken || '';
	this.selfserviceToken = opt.selfserviceToken || '';

	this.onBeforeCreateAccount =
		opt.onBeforeCreateAccount ||
		function () {
			return Promise.resolve();
		};
	this.onCreatedAccount =
		opt.onCreatedAccount ||
		function () {
			return Promise.resolve();
		};
	this.onBeforeActivateAccount =
		opt.onBeforeActivateAccount ||
		function () {
			return Promise.resolve();
		};
	this.onActivatedAccount =
		opt.onActivatedAccount ||
		function () {
			return Promise.resolve();
		};
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
	this.onBeforeActivateSelfService =
		opt.onBeforeActivateSelfService ||
		function () {
			return Promise.resolve();
		};
	this.onActivatedSelfService =
		opt.onActivatedSelfService ||
		function () {
			return Promise.resolve();
		};

	this.onContactFields =
		opt.onContactFields ||
		function () {
			return Promise.resolve();
		};
};

// Implementation
// ---
Signup.prototype.validContactInfo = function () {
	return this.firstNameIsValid() && this.lastNameIsValid() && this.companyIsValid() && this.emailIsValid();
};

Signup.prototype.validCredentials = function () {
	return this.passwordIsValid();
};

Signup.prototype.firstNameIsValid = function () {
	var firstName = this.firstName.trim();
	return firstName.length >= 2 && firstName.length <= 25;
};

Signup.prototype.lastNameIsValid = function () {
	var lastName = this.lastName.trim();
	return lastName.length >= 2 && lastName.length <= 25;
};

Signup.prototype.companyIsValid = function () {
	var company = this.company.trim();
	return company.length >= 3 && company.length <= 46;
};

Signup.prototype.companyExists = function () {
	var account = this.getGroupId();

	if (this.dfdAccountExists) this.dfdAccountExists.abort();

	this.dfdAccountExists = new AbortController();

	return new Promise((resolve, reject) => {
		this.ds
			.call('accountExists', { account: account }, null, null, { abortController: this.dfdAccountExists })
			.then(function (resp) {
				resolve(resp.result);
			})
			.catch((err) => {
				if (err.name != 'AbortError') reject(err);
			});
	});
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

Signup.prototype.checkInvited = function () {
	return this.ds.call('checkInvited', { email: this.email }).then(function (resp) {
		return resp;
	});
};

Signup.prototype.passwordIsValid = function () {
	return validation.isValidPassword(this.password.trim());
};

Signup.prototype.phoneIsValid = function () {
	return validation.isValidPhone(this.phone.trim());
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

Signup.prototype.selfServiceIsValid = function () {
	var that = this;

	if (this.selfserviceToken.trim() != '') {
		return this.ds.call('checkSelfServiceKey', { key: this.selfserviceToken }).then(function (resp) {
			that.parseFields(resp.customerFields);

			return resp.result;
		});
	} else {
		return Promise.resolve(false);
	}
};

// Business logic
// ----
Signup.prototype.getGroupId = function () {
	var company = this.company.trim();
	return company.replace(/[\.-\s]/g, '_').OnlyAlphaNumSpaceAndUnderscore();
};

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

Signup.prototype.createAccount = function () {
	var that = this,
		beforeCreate = this.onBeforeCreateAccount,
		afterCreate = this.onCreatedAccount;

	return beforeCreate().then(function () {
		return that.ds
			.longCall(
				'createAccount',
				{
					kind: DEFAULT_KIND,
					period: that.period.trim(),
					subscription: that.plan.trim(),
					company: that.company.trim(),
					groupId: that.getGroupId(),
					signupDevice: that.deviceKind,
					tags: that.tags,
				},
				true
			)
			.then(function (data) {
				return afterCreate(data);
			});
	});
};

Signup.prototype.activateAccount = function (storeInLocalStorage) {
	var that = this,
		beforeActivate = this.onBeforeActivateAccount,
		afterActivate = this.onActivatedAccount;

	return beforeActivate().then(function () {
		return that.ds
			.longCall(
				'activateAccount',
				{
					groupId: that.getGroupId(),
					name: that.getFullName(),
					email: that.email.trim(),
					password: that.password.trim(),
					timezone: that.timezone.trim(),
					load_sample: false,
					owner_customer: true,
					maintenance_customer: true,
				},
				true
			)
			.then(function (resp) {
				if (storeInLocalStorage) {
					Signup.storeLoginToken(resp.data);
				}

				return afterActivate(resp);
			});
	});
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

Signup.prototype.activateSelfService = function (storeInLocalStorage) {
	var that = this,
		beforeActivate = this.onBeforeActivateSelfService,
		afterActivate = this.onActivatedSelfService;

	return beforeActivate().then(function () {
		var params = {
			name: that.getFullName(),
			password: that.password.trim(),
			timezone: that.timezone.trim(),
			email: that.email.trim(),
			phone: that.phone.trim(),
			key: that.selfserviceToken,
		};

		// Add custom contact fields
		if (that.fields) {
			that.fields.forEach(({ name, value }) => {
				params['fields__' + name] = value;
			});
		}

		return that.ds.longCall('createSelfServiceUser', params, true).then(function (user) {
			if (storeInLocalStorage) {
				Signup.storeLoginToken(user.data);
			}

			return afterActivate(user);
		});
	});
};

Signup.prototype.storeLead = function (tags) {
	return this.ds.call('storeLead', {
		firstName: this.firstName.trim(),
		lastName: this.lastName.trim(),
		email: this.email.trim(),
		company: this.company.trim(),
		phone: this.phone,
		tags: tags || [],
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

Signup.getUrlParam = utils.getUrlParam;

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
		source = utils.getUrlParam('source', DEFAULT_SOURCE),
		period = utils.getUrlParam('period', DEFAULT_PERIOD),
		plan = utils.getUrlParam('plan', DEFAULT_PLAN),
		timezone = utils.getUrlParam('timezone', 'America/New_York'),
		inviteToken = utils.getUrlParam('code', ''),
		selfserviceToken = utils.getUrlParam('key', ''),
		phone = utils.getUrlParam('phone', '').replace(' ', '+');

	if (firstName.length == 0 && lastName.length == 0 && name.length > 0) {
		var parts = Signup.splitFirstLastName(name);
		firstName = parts.firstName;
		lastName = parts.lastName;
	}

	// Don't allow signup to deprecated plans
	if (['starter', 'basic', 'professional', 'enterprise'].indexOf(plan) != -1) {
		plan = DEFAULT_PLAN;
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
				source: source,
				plan: plan,
				period: period,
				phone: phone,
				inviteToken: inviteToken,
				selfserviceToken: selfserviceToken,
			},
			opt
		),
		settings
	);
};

export default Signup;
