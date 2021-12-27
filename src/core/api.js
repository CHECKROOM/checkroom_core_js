import moment from 'moment';
import { isEmptyObject } from './common/utils';
import ajaxQueue from './common/queue';
class fetchApi {
	static myRequest(url, method, options = {}) {
		const header = new Headers(options.headers);
		const controller = new AbortController();
		const signal = controller.signal;

		// Sets content type to 'application/json' for POST,PUT,PATCH,DELETE requests
		if (!header.get('content-type') && method !== 'GET') {
			header.set('content-type', 'application/json; charset=UTF-8');
		}

		options.timeOut = options.timeOut === void 0 ? false : options.timeOut;
		options.parms = options.parms === void 0 ? false : options.parms;
		const opts = {
			method: method,
			signal: signal,
			headers: header,
		};

		if (options.parms) {
			opts.body = JSON.stringify(options.parms);
		}

		if (options.timeOut) {
			setTimeout(() => controller.abort(), options.timeOut);
		}

		return fetch(url, opts).then(async (response) => {
			if (response.ok) {
				let contentType = response.headers.get('content-type');
				if (contentType.includes('application/json')) {
					return response.json();
				} else if (contentType.includes('text/html')) {
					return response.text();
				} else {
					throw new Error(`Sorry, content-type ${contentType} is not supported`);
				}
			} else {
				let responseJson;
				try {
					responseJson = await response.json();
				} finally {
					throw new api.ApiError(response.statusText, response.status, responseJson);
				}
			}
		});
	}

	static get(url, options = {}) {
		return this.myRequest(url, 'GET', options);
	}

	static post(url, options = {}) {
		return this.myRequest(url, 'POST', options);
	}

	static put(url, options = {}) {
		return this.myRequest(url, 'PUT', options);
	}

	static patch(url, options = {}) {
		return this.myRequest(url, 'PATCH', options);
	}

	static delete(url, options = {}) {
		return this.myRequest(url, 'DELETE', options);
	}
}

var MAX_QUERYSTRING_LENGTH = 2048;

//TODO change this
//system.log fallback
var system = {
	log: function () {
		// do something
	},
};

var api = {};

//*************
// ApiErrors
//*************
api.ApiError = function (msg, code = 500, opt) {
	this.code = code;
	this.message = msg || 'Something went wrong on the server';
	this.opt = opt;
};
api.ApiError.prototype = new Error();

// Network
api.NetworkNotConnected = function (msg, opt) {
	this.code = 999;
	this.message = msg || '';
	this.opt = opt;
};
api.NetworkNotConnected.prototype = new Error();
api.NetworkTimeout = function (msg, opt) {
	this.code = 408;
	this.message = msg || 'Could not reach the server in time';
	this.opt = opt;
};
api.NetworkTimeout.prototype = new Error();
// Api

api.ApiNotFound = function (msg, opt) {
	this.code = 404;
	this.message = msg || "Could not find what you're looking for";
	this.opt = opt;
};
api.ApiNotFound.prototype = new Error();
api.ApiBadRequest = function (msg, opt) {
	this.code = 400;
	this.message = msg || 'The server did not understand your request';
	this.opt = opt;
};
api.ApiBadRequest.prototype = new Error();
api.ApiUnauthorized = function (msg, opt) {
	this.code = 401;
	this.message = msg || 'Your session has expired';
	this.opt = opt;
};
api.ApiUnauthorized.prototype = new Error();
api.ApiForbidden = function (msg, opt) {
	this.code = 403;
	this.message = msg || "You don't have sufficient rights";
	this.opt = opt;
};
api.ApiForbidden.prototype = new Error();
api.ApiUnprocessableEntity = function (msg, opt) {
	this.code = 422;
	this.message = msg || 'Some data is invalid';
	this.opt = opt;
};
api.ApiUnprocessableEntity.prototype = new Error();
api.ApiSubscriptionLimit = function (msg, opt) {
	this.code = 422;
	this.message = msg || 'You have reached your subscription limit';
	this.opt = opt;
};
api.ApiSubscriptionLimit.prototype = new Error();
api.ApiPaymentRequired = function (msg, opt) {
	this.code = 402;
	this.message = msg || 'Your subscription has expired';
	this.opt = opt;
};
api.ApiPaymentRequired.prototype = new Error();
api.ApiServerCapicity = function (msg, opt) {
	this.code = 503;
	this.message = msg || 'Back-end server is at capacity';
	this.opt = opt;
};
api.ApiServerCapicity.prototype = new Error();

//*************
// ApiAjax
//*************

/**
 * The ajax communication object which makes the request to the API
 * @name ApiAjax
 * @param {object} spec
 * @constructor
 * @memberof api
 */
api.ApiAjax = function (spec) {
	spec = spec || {};
	this.timeOut = spec.timeOut || 10000;
	this.responseInTz = true;
	this.customHeaders =
		spec.customHeaders ||
		function () {
			return Promise.resolve({});
		};
};

api.ApiAjax.prototype.get = function (url, timeOut, opt) {
	system.log('ApiAjax: get ' + url);
	return this._getAjax(url, timeOut);
};

api.ApiAjax.prototype.post = function (url, data, timeOut, opt) {
	system.log('ApiAjax: post ' + url);
	return this._postAjax(url, data, timeOut);
};

// Implementation
// ----
api.ApiAjax.prototype._handleAjaxSuccess = function (data, opt) {
	if (this.responseInTz) {
		data = this._fixDates(data);
	}
	return data;
};

api.ApiAjax.prototype._handleAjaxError = function ({ name, message, code, opt }) {
	// ajax call was aborted
	if (name == 'AbortError') return;

	var msg = '';
	if (message === 'timeout') {
		return new api.NetworkTimeout(msg, opt);
	} else {
		if (message) {
			if (message.indexOf('Notify user:') > -1) {
				msg = message;
			}

			if (code == 422) {
				msg = message;
				opt = {
					detail: opt.message,
					status: code,
				};
			}
		}

		switch (code) {
			case 400:
				return new api.ApiBadRequest(msg, opt);
			case 401:
				return new api.ApiUnauthorized(msg, opt);
			case 402:
				return new api.ApiPaymentRequired(msg, opt);
			case 403:
				return new api.ApiForbidden(msg, opt);
			case 404:
				return new api.ApiNotFound(msg, opt);
			case 408:
				return new api.NetworkTimeout(msg, opt);
			case 422:
				// 422 Notify user: Cannot create item, max limit 50 items reached
				if (message.indexOf('limit') >= 0 && message.indexOf('reach') >= 0) {
					return new api.ApiSubscriptionLimit(msg, opt);
				} else {
					return new api.ApiUnprocessableEntity(msg, opt);
				}
			case 503:
				return new api.ApiServerCapicity(msg, opt);
			case 500:
			default:
				return new api.ApiError(msg, opt);
		}
	}
};

api.ApiAjax.prototype._postAjax = async function (url, data, timeOut, opt) {
	return fetchApi
		.post(url, {
			parms: this._prepareDict(data),
			timeOut: timeOut || this.timeOut,
			headers: await this.customHeaders(),
		})
		.then((result) => Promise.resolve(this._handleAjaxSuccess(result)))
		.catch((error) => Promise.reject(this._handleAjaxError(error)));
};

api.ApiAjax.prototype._getAjax = async function (url, timeOut, opt) {
	return fetchApi
		.get(url, {
			timeOut: timeOut || this.timeOut,
			headers: await this.customHeaders(),
		})
		.then((result) => Promise.resolve(this._handleAjaxSuccess(result)))
		.catch((error) => Promise.reject(this._handleAjaxError(error)));
};

api.ApiAjax.prototype._prepareDict = function (data = {}) {
	Object.entries(data).forEach(([key, value]) => {
		if (moment.isMoment(value)) {
			data[key] = value.toJSONDate();
		}
	});
	return data;
};

/**
 * Turns all strings that look like datetimes into moment objects recursively
 *
 * @name  DateHelper#fixDates
 * @method
 * @private
 *
 * @param data
 * @returns {*}
 */
api.ApiAjax.prototype._fixDates = function (data) {
	if (typeof data == 'string' || data instanceof String) {
		// "2014-04-03T12:15:00+00:00" (length 25)
		// "2014-04-03T09:32:43.841000+00:00" (length 32)
		if (data.endsWith('+00:00')) {
			var len = data.length;
			if (len == 25) {
				return moment(data.substring(0, len - 6));
			} else if (len == 32) {
				return moment(data.substring(0, len - 6).split('.')[0]);
			}
		}
	} else if (data instanceof Object || Array.isArray(data)) {
		Object.entries(data).forEach(([key, value]) => {
			data[key] = this._fixDates(value);
		});
	}
	return data;
};

//*************
// ApiUser
//*************

/**
 * @name ApiUser
 * @param {object} spec
 * @param {string} spec.userId          - the users primary key
 * @param {string} spec.userToken       - the users token
 * @param {string} spec.tokenType       - the token type (empty for now)
 * @constructor
 * @memberof api
 */
api.ApiUser = function (spec) {
	spec = spec || {};
	this.userId = spec.userId || '';
	this.userEmail = spec.userEmail || '';
	this.userToken = spec.userToken || '';
	this.userJwt = spec.jwt || '';
	this.tokenType = spec.tokenType || '';
	this.impersonated = spec.impersonated || false;
};

api.ApiUser.prototype.fromStorage = function () {
	this.userId = window.localStorage.getItem('userId') || '';
	this.userEmail = window.localStorage.getItem('userEmail') || '';
	this.userToken = window.localStorage.getItem('userToken') || '';
	this.userJwt = window.localStorage.getItem('userJwt') || '';
	this.tokenType = window.localStorage.getItem('tokenType') || '';
	this.impersonated = window.localStorage.getItem('impersonated') === 'true';
};

api.ApiUser.prototype.toStorage = function () {
	window.localStorage.setItem('userId', this.userId);
	window.localStorage.setItem('userEmail', this.userEmail);
	window.localStorage.setItem('userToken', this.userToken);
	window.localStorage.setItem('userJwt', this.userJwt);
	window.localStorage.setItem('tokenType', this.tokenType);
	window.localStorage.setItem('impersonated', this.impersonated);
};

api.ApiUser.prototype.removeFromStorage = function () {
	window.localStorage.removeItem('userId');
	window.localStorage.removeItem('userEmail');
	window.localStorage.removeItem('userToken');
	window.localStorage.removeItem('userJwt');
	window.localStorage.removeItem('tokenType');
	window.localStorage.removeItem('impersonated');
};

api.ApiUser.prototype.clearToken = function () {
	window.localStorage.setItem('userToken', null);
	window.localStorage.setItem('userJwt', null);
	window.localStorage.setItem('tokenType', null);
};

api.ApiUser.prototype.isValid = function () {
	system.log('ApiUser: isValid');
	return this.userId != null && this.userId.length > 0 && this.userToken != null && this.userToken.length > 0;
};

api.ApiUser.prototype._reset = function () {
	this.userId = '';
	this.userToken = '';
	this.userJwt = '';
	this.tokenType = '';
	this.userEmail = '';
	this.impersonated = false;
};

//*************
// ApiAuth
//*************

api.ApiAuth = function (spec) {
	spec = spec || {};
	this.urlAuth = spec.urlAuth || '';
	this.ajax = spec.ajax;
	this.version = spec.version;
	this.platform = spec.platform;
	this.device = spec.device;
	this.sso = spec.sso;
	this.allowAccountOwner = spec.allowAccountOwner !== undefined ? spec.allowAccountOwner : true;
};

api.ApiAuth.prototype.authenticate = function (userId, password) {
	system.log('ApiAuth: authenticate ' + userId);

	var that = this;
	var params = {
		user: userId,
		password: password,
		_v: this.version,
	};
	if (this.platform) {
		params.platform = this.platform;
	}
	if (this.device) {
		params.device = this.device;
	}
	if (this.sso) {
		params.sso = this.sso;
	}

	return fetchApi
		.post(this.urlAuth, {
			parms: params,
			timeOut: 30000,
		})
		.then((resp) => {
			// Check if login is ok AND if login is ok but account is expired, check if we allow login or not (allowAccountOwner)
			//
			// REMARK
			// - web app allows owners to still login on expired/cancelled account
			// - mobile doesn't allow expired logins also not for owners
			if (
				resp.status == 'OK' &&
				(['expired', 'cancelled_expired', 'archived'].indexOf(resp.subscription) != -1
					? that.allowAccountOwner
					: true)
			) {
				return Promise.resolve(resp.data, resp.is_impersonated === true);
			} else {
				return Promise.reject(resp);
			}
		})
		.catch((err) => Promise.reject(err));
};

//*************
// ApiAnonymous
// Communicates with the API without having token authentication
//*************

/**
 * @name ApiAnonymous
 * @param {object} spec
 * @param {ApiAjax} spec.ajax
 * @param {string} spec.urlApi
 * @constructor
 * @memberof api
 */
api.ApiAnonymous = function (spec) {
	spec = spec || {};
	this.ajax = spec.ajax;
	this.urlApi = spec.urlApi || '';
	this.version = spec.version;
};

/**
 * Makes a call to the API which doesn't require a token
 * @method
 * @name ApiAnonymous#call
 * @param method
 * @param params
 * @param timeOut
 * @param usePost
 * @returns {*}
 */
api.ApiAnonymous.prototype.call = function (method, params, timeOut, usePost) {
	system.log('ApiAnonymous: call ' + method);
	if (this.version) {
		params = params || {};
		params['_v'] = this.version;
	}

	var url = this.urlApi + '/' + method;
	var queryString = Object.keys(params)
		.map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
		.join('&');
	var getUrl = url + '?' + queryString;

	if (usePost || getUrl.length >= MAX_QUERYSTRING_LENGTH) {
		return this.ajax.post(url, params, timeOut);
	} else {
		return this.ajax.get(getUrl, timeOut);
	}
};

/**
 * Makes a long call (timeout 60s) to the API which doesn't require a token
 * @method
 * @name ApiAnonymous#longCall
 * @param method
 * @param params
 * @param usePost
 * @returns {*}
 */
api.ApiAnonymous.prototype.longCall = function (method, params, usePost) {
	system.log('ApiAnonymous: longCall ' + method);
	return this.call(method, params, 60000, usePost);
};

//*************
// ApiDataSource
// Communicates with the API using an ApiUser
//*************

/**
 * @name ApiDataSource
 * @param {object} spec
 * @param {string} spec.collection         - the collection this datasource uses, e.g. "items"
 * @param {string} spec.urlApi             - the api url to use
 * @param {ApiUser} spec.user              - the user auth object
 * @param {ApiAjax}  spec.ajax             - the ajax api object to use
 * @constructor
 * @memberof api
 */
api.ApiDataSource = function (spec) {
	spec = spec || {};
	this.collection = spec.collection || '';
	this.urlApi = spec.urlApi || '';
	this.user = spec.user;
	this.ajax = spec.ajax;
	this.version = spec.version;
};

/**
 * Checks if a certain document exists
 * @method
 * @name ApiDataSource#exists
 * @param pk
 * @param fields
 * @returns {*}
 */
api.ApiDataSource.prototype.exists = function (pk, fields) {
	system.log('ApiDataSource: ' + this.collection + ': exists ' + pk);
	var cmd = 'exists';

	// We're actually doing a API get
	// and resolve to an object,
	// so we also pass the fields
	var url = this.getBaseUrl() + pk;
	var p = this.getParams(fields);
	if (!isEmptyObject(p)) {
		url += '?' + this.getParams(p);
	}

	return new Promise((resolve, reject) => {
		this._ajaxGet(cmd, url)
			.done(function (data) {
				resolve(data);
			})
			.fail(function (error) {
				if (error instanceof api.ApiNotFound) {
					resolve(null);
				} else {
					reject(error);
				}
			});
	});
};

/**
 * Gets a certain document by its primary key
 * @method
 * @name ApiDataSource#get
 * @param pk
 * @param fields
 * @returns {promise}
 */
api.ApiDataSource.prototype.get = function (pk, fields) {
	system.log('ApiDataSource: ' + this.collection + ': get ' + pk);
	var cmd = 'get';
	var url = this.getBaseUrl() + pk;
	var p = this.getParamsDict(fields);
	if (!isEmptyObject(p)) {
		url += '?' + this.getParams(p);
	}
	return this._ajaxGet(cmd, url);
};

/**
 * Gets a certain document by its primary key, but returns null if not found
 * instead of a rejected promise
 * @method
 * @name ApiDataSource#getIgnore404
 * @param pk
 * @param fields
 * @returns {promise}
 */
api.ApiDataSource.prototype.getIgnore404 = function (pk, fields) {
	system.log('ApiDataSource: ' + this.collection + ': getIgnore404 ' + pk);

	return new Promise((resolve, reject) => {
		this.get(pk, fields)
			.done(function (data) {
				resolve(data);
			})
			.fail(function (err) {
				if (err instanceof api.ApiNotFound) {
					resolve(null);
				} else {
					reject(err);
				}
			});
	});
};

/**
 * Get multiple document by primary keys in a single query
 * @method
 * @name ApiDataSource#getMultiple
 * @param {array} pks
 * @param fields
 * @returns {promise}
 */
api.ApiDataSource.prototype.getMultiple = function (pks, fields) {
	system.log('ApiDataSource: ' + this.collection + ': getMultiple ' + pks);
	var cmd = 'getMultiple';

	//BUGFIX url to long
	var chunk_size = 100;
	var groups = pks
		.map(function (e, i) {
			return i % chunk_size === 0 ? pks.slice(i, i + chunk_size) : null;
		})
		.filter(function (e) {
			return e;
		});

	var that = this,
		returnArr = [];

	var queue = new ajaxQueue(),
		calls = [];

	// Extend promise with abort method
	// to abort xhr request if needed
	// http://stackoverflow.com/questions/21766428/chained-jquery-promises-with-abort
	let promise = new Promise((resolve) => {
		groups.forEach(function (group) {
			var url = that.getBaseUrl() + group.join(',');
			var p = that.getParamsDict(fields);
			if (!isEmptyObject(p)) {
				url += '?' + that.getParams(p);
			}

			queue(function () {
				var call = that._ajaxGet(cmd, url);

				call.then(function (resp) {
					// BUGFIX make sure that response is an array
					resp = Array.isArray(resp) ? resp : [resp];

					returnArr = returnArr.concat(resp);
				});

				calls.push(call);

				return call;
			});
		});

		queue(function () {
			return resolve(returnArr);
		});
	});

	promise.abort = function () {
		calls.forEach(function (xhr) {
			xhr.abort();
		});
	};

	return promise;
};

/**
 * Deletes a document by its primary key
 * @method
 * @name ApiDataSource#delete
 * @param pk
 * @returns {promise}
 */
api.ApiDataSource.prototype.delete = function (pk) {
	system.log('ApiDataSource: ' + this.collection + ': delete ' + pk);
	var cmd = 'delete';
	var url = this.getBaseUrl() + pk + '/delete';
	return this._ajaxGet(cmd, url);
};

/**
 * Deletes documents by their primary key
 * @method
 * @name ApiDataSource#deleteMultiple
 * @param pks
 * @returns {promise}
 */
api.ApiDataSource.prototype.deleteMultiple = function (pks, usePost) {
	system.log('ApiDataSource: ' + this.collection + ': deleteMultiple ' + pks);
	var cmd = 'deleteMultiple';
	var url = this.getBaseUrl() + 'delete';

	var p = { pk: pks };
	var geturl = url + '?' + this.getParams(p);

	if (usePost || geturl.length >= MAX_QUERYSTRING_LENGTH) {
		return this._ajaxPost(cmd, url, p);
	} else {
		return this._ajaxGet(cmd, geturl);
	}
};

/**
 * Updates a document by its primary key and a params objects
 * @method
 * @name ApiDataSource#update
 * @param pk
 * @param params
 * @param fields
 * @param timeOut
 * @param usePost
 * @returns {promise}
 */
api.ApiDataSource.prototype.update = function (pk, params, fields, timeOut, usePost) {
	system.log('ApiDataSource: ' + this.collection + ': update ' + pk);
	var cmd = 'update';
	var url = this.getBaseUrl() + pk + '/update';
	var p = Object.assign({}, params);
	if (fields != null && fields.length > 0) {
		p['_fields'] = Array.isArray(fields) ? fields.join(',') : fields;
	}
	var geturl = url + '?' + this.getParams(p);

	if (usePost || geturl.length >= MAX_QUERYSTRING_LENGTH) {
		return this._ajaxPost(cmd, url, p, timeOut);
	} else {
		return this._ajaxGet(cmd, geturl, timeOut);
	}
};

/**
 * Creates a document with some data in an object
 * @method
 * @name ApiDataSource#create
 * @param params
 * @param fields
 * @param timeOut
 * @param usePost
 * @returns {promise}
 */
api.ApiDataSource.prototype.create = function (params, fields, timeOut, usePost) {
	system.log('ApiDataSource: ' + this.collection + ': create');
	var cmd = 'create';
	var url = this.getBaseUrl() + 'create';
	var p = Object.assign({}, params);
	if (fields != null && fields.length > 0) {
		p['_fields'] = Array.isArray(fields) ? fields.join(',') : fields;
	}

	var geturl = url + '?' + this.getParams(p);

	if (usePost || geturl.length >= MAX_QUERYSTRING_LENGTH) {
		return this._ajaxPost(cmd, url, p, timeOut);
	} else {
		return this._ajaxGet(cmd, geturl, timeOut);
	}
};

/**
 * Creates multiple objects in one go
 * @method
 * @name ApiDataSource#createMultiple
 * @param objects
 * @param fields
 * @returns {promise}
 */
api.ApiDataSource.prototype.createMultiple = function (objects, fields) {
	system.log('ApiDataSource: ' + this.collection + ': createMultiple (' + objects.length + ')');

	var that = this;
	var todoObjs = objects.slice(0);
	var doneIds = [];

	// Trigger the creates sequentially
	var createRecurse = function (todoObjs) {
		return new Promise((resolve, reject) => {
			if (todoObjs.length > 0) {
				var obj = todoObjs.pop();
				that.create(obj, fields)
					.done(function (resp) {
						doneIds.push(resp._id);
						return createRecurse(todoObjs);
					})
					.fail(function (error) {
						reject(error);
					});
			} else {
				resolve(doneIds);
			}
		});
	};

	return createRecurse(todoObjs);
};

/**
 * Get a list of objects from the collection
 * @method
 * @name ApiDataSource#list
 * @param name
 * @param fields
 * @param limit
 * @param skip
 * @param sort
 * @returns {promise}
 */
api.ApiDataSource.prototype.list = function (name, fields, limit, skip, sort) {
	name = name || '';

	system.log('ApiDataSource: ' + this.collection + ': list ' + name);
	var cmd = 'list.' + name;
	var url = this.getBaseUrl();
	if (name != null && name.length > 0) {
		url += 'list/' + name + '/';
	}
	var p = this.getParamsDict(fields, limit, skip, sort);
	if (!isEmptyObject(p)) {
		url += '?' + this.getParams(p);
	}
	return this._ajaxGet(cmd, url);
};

/**
 * Searches for objects in the collection
 * @method
 * @name ApiDataSource#search
 * @param params
 * @param fields
 * @param limit
 * @param skip
 * @param sort
 * @param mimeType
 * @returns {promise}
 */
api.ApiDataSource.prototype.search = function (params, fields, limit, skip, sort, mimeType) {
	system.log('ApiDataSource: ' + this.collection + ': search ' + params);
	var cmd = 'search';
	var url = this.getBaseUrl() + 'search';
	var geturl = this.searchUrl(params, fields, limit, skip, sort, mimeType);

	if (geturl.length >= MAX_QUERYSTRING_LENGTH) {
		var p = this.searchParams(params, fields, limit, skip, sort, mimeType);
		return this._ajaxPost(cmd, url, p);
	} else {
		return this._ajaxGet(cmd, geturl);
	}
};

api.ApiDataSource.prototype.searchUrl = function (params, fields, limit, skip, sort, mimeType) {
	var url = this.getBaseUrl() + 'search';
	var p = Object.assign(this.getParamsDict(fields, limit, skip, sort), params);
	if (mimeType != null && mimeType.length > 0) {
		p['mimeType'] = mimeType;
	}
	url += '?' + this.getParams(p);
	return url;
};

api.ApiDataSource.prototype.searchParams = function (params, fields, limit, skip, sort, mimeType) {
	var url = this.getBaseUrl() + 'search';
	var p = Object.assign(this.getParamsDict(fields, limit, skip, sort), params);
	if (mimeType != null && mimeType.length > 0) {
		p['mimeType'] = mimeType;
	}
	return p;
};

/**
 * Export objects in the collection
 * @method
 * @name ApiDataSource#export
 * @param params
 * @param fields
 * @param limit
 * @param skip
 * @param sort
 * @param mimeType
 * @returns {promise}
 */
api.ApiDataSource.prototype.export = function (params, fields, limit, skip, sort, mimeType) {
	system.log('ApiDataSource: ' + this.collection + ': export ' + params);
	var cmd = 'export';
	var url = this.exportUrl(params, fields, limit, skip, sort, mimeType);
	return this._ajaxGet(cmd, url);
};

api.ApiDataSource.prototype.exportUrl = function (params, fields, limit, skip, sort, mimeType) {
	var url = this.getBaseUrl() + 'call/export';
	var p = Object.assign(this.getParamsDict(fields, limit, skip, sort), params);
	if (mimeType != null && mimeType.length > 0) {
		p['mimeType'] = mimeType;
	}
	url += '?' + this.getParams(p);
	return url;
};

/**
 * Calls a certain method on an object or on the entire collection
 * @method
 * @name ApiDataSource#call
 * @param pk
 * @param method
 * @param params
 * @param fields
 * @param timeOut
 * @param usePost
 * @returns {promise}
 */
api.ApiDataSource.prototype.call = function (pk, method, params, fields, timeOut, usePost) {
	system.log('ApiDataSource: ' + this.collection + ': call ' + method);
	var cmd = 'call.' + method;
	var url =
		pk != null && pk.length > 0 ? this.getBaseUrl() + pk + '/call/' + method : this.getBaseUrl() + 'call/' + method;
	var p = Object.assign({}, this.getParamsDict(fields, null, null, null), params);
	var getUrl = url + '?' + this.getParams(p);

	if (usePost || getUrl.length >= MAX_QUERYSTRING_LENGTH) {
		return this._ajaxPost(cmd, url, p, timeOut);
	} else {
		return this._ajaxGet(cmd, getUrl, timeOut);
	}
};

/**
 * Calls a certain method on one or more objects in a collection
 * @method
 * @name ApiDataSource#callMultiple
 * @param pks
 * @param method
 * @param params
 * @param fields
 * @param timeOut
 * @param usePost
 * @returns {promise}
 */
api.ApiDataSource.prototype.callMultiple = function (pks, method, params, fields, timeOut, usePost) {
	system.log('ApiDataSource: ' + this.collection + ': call ' + method);
	var cmd = 'call.' + method;
	var url = this.getBaseUrl() + pks.join(',') + '/call/' + method;
	var p = Object.assign({}, this.getParamsDict(fields, null, null, null), params);
	var getUrl = url + '?' + this.getParams(p);

	if (usePost || getUrl.length >= MAX_QUERYSTRING_LENGTH) {
		return this._ajaxPost(cmd, url, p, timeOut);
	} else {
		return this._ajaxGet(cmd, getUrl, timeOut);
	}
};

/**
 * Makes a long call (timeout 60s) to a certain method on an object or on the entire collection
 * @method
 * @name ApiDataSource#longCall
 * @param pk
 * @param method
 * @param params
 * @param fields
 * @param usePost
 * @returns {promise}
 */
api.ApiDataSource.prototype.longCall = function (pk, method, params, fields, usePost) {
	return this.call(pk, method, params, fields, 60000, usePost);
};

/**
 * Gets the base url for all calls to this collection
 * @method
 * @name ApiDataSource#getBaseUrl
 * @returns {string}
 */
api.ApiDataSource.prototype.getBaseUrl = function (forceOldToken) {
	var tokenType = this.user.tokenType != null && this.user.tokenType.length > 0 ? this.user.tokenType : 'null';

	//Don't use cached version of this because when user session gets expired
	//a new token is generated
	return (
		this.urlApi +
		'/' +
		this.user.userId +
		'/' +
		(tokenType === 'jwt' && !forceOldToken ? 'null' : this.user.userToken) +
		'/' +
		(forceOldToken ? 'null' : tokenType) +
		'/' +
		this.collection +
		'/'
	);
};

/**
 * Prepare some parameters so we can use them during a request
 * @method
 * @name ApiDataSource#getParams
 * @param data
 * @returns {object}
 */
api.ApiDataSource.prototype.getParams = function (data = {}) {
	const params = this.ajax._prepareDict(data);
	return Object.keys(params)
		.map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
		.join('&');
};

/**
 * Gets a dictionary of parameters
 * @method
 * @name ApiDataSource#getParamsDict
 * @param fields
 * @param limit
 * @param skip
 * @param sort
 * @returns {{}}
 */
api.ApiDataSource.prototype.getParamsDict = function (fields, limit, skip, sort) {
	var p = {};
	if (fields) {
		p['_fields'] = Array.isArray(fields) ? fields.join(',') : fields.replace(/\s/g, '');
	}
	if (limit) {
		p['_limit'] = limit;
	}
	if (skip) {
		p['_skip'] = skip;
	}
	if (sort) {
		p['_sort'] = sort;
	}
	if (this.version) {
		p['_v'] = this.version;
	}
	return p;
};

/**
 * Does an ajax GET call using the api.ApiAjax object
 * @param cmd
 * @param url
 * @param timeout
 * @returns {promise}
 * @private
 */
api.ApiDataSource.prototype._ajaxGet = function (cmd, url, timeout) {
	return this.ajax.get(url, timeout, { coll: this.collection, cmd: cmd });
};

/**
 * Does an ajax POST call using the api.ApiAjax object
 * @param cmd
 * @param url
 * @param data
 * @param timeout
 * @returns {promise}
 * @private
 */
api.ApiDataSource.prototype._ajaxPost = function (cmd, url, data, timeout) {
	return this.ajax.post(url, data, timeout, { coll: this.collection, cmd: cmd });
};

export default api;
