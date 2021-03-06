(function (factory) {
if (typeof define === 'function' && define.amd) {
define(['jquery', 'moment'], factory);
} else {
factory($, moment);
}
}(function (jquery, moment) {//Queued AJAX requests
//https://stackoverflow.com/questions/3034874/sequencing-ajax-requests/3035268#3035268
//http://jsfiddle.net/p4zjH/1/
var common_queue, api, settings, common_validation, field, dateHelper, common_inflection, common_clientStorage, common_utils, signup;
common_queue = function ($) {
  $.fn.ajaxQueue = function () {
    var previous = new $.Deferred().resolve();
    return function (fn, fail) {
      if (typeof fn !== 'function') {
        throw 'must be a function';
      }
      return previous = previous.then(fn, fail || fn);
    };
  };
}(jquery);
api = function ($, moment) {
  var MAX_QUERYSTRING_LENGTH = 2048;
  //TODO change this
  //system.log fallback
  var system = {
    log: function () {
    }
  };
  // Disable caching AJAX requests in IE
  // http://stackoverflow.com/questions/5502002/jquery-ajax-producing-304-responses-when-it-shouldnt
  $.ajaxSetup({
    beforeSend: function (xhr, call) {
      if (call.type == 'GET') {
        call.url += (call.url.indexOf('?') == -1 ? '?' : '&') + '_=' + new Date().getTime();
      } else {
        call.data['_'] = new Date().getTime();
      }
    }
  });
  var api = {};
  //*************
  // ApiErrors
  //*************
  // Network
  api.NetworkNotConnected = function (msg, opt) {
    this.code = 999;
    this.message = msg || 'Connection interrupted';
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
  api.ApiError = function (msg, opt) {
    this.code = 500;
    this.message = msg || 'Something went wrong on the server';
    this.opt = opt;
  };
  api.ApiError.prototype = new Error();
  api.ApiNotFound = function (msg, opt) {
    this.code = 404;
    this.message = msg || 'Could not find what you\'re looking for';
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
    this.message = msg || 'You don\'t have sufficient rights';
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
  };
  api.ApiAjax.prototype.get = function (url, timeOut) {
    system.log('ApiAjax: get ' + url);
    return this._getAjax(url, timeOut);
  };
  api.ApiAjax.prototype.post = function (url, data, timeOut) {
    system.log('ApiAjax: post ' + url);
    return this._postAjax(url, data, timeOut);
  };
  // Implementation
  // ----
  api.ApiAjax.prototype._handleAjaxSuccess = function (dfd, data, opt) {
    if (this.responseInTz) {
      data = this._fixDates(data);
    }
    return dfd.resolve(data);
  };
  api.ApiAjax.prototype._handleAjaxError = function (dfd, x, t, m, opt) {
    // ajax call was aborted
    if (t == 'abort')
      return;
    var msg = '';
    if (m === 'timeout') {
      dfd.reject(new api.NetworkTimeout(msg, opt));
    } else {
      if (x) {
        if (x.statusText && x.statusText.indexOf('Notify user:') > -1) {
          msg = x.statusText.slice(x.statusText.indexOf('Notify user:') + 13);
        }
        if (x.status == 422 && x.responseText && x.responseText.match(/HTTPError: \(.+\)/g).length > 0) {
          opt = { detail: x.responseText.match(/HTTPError: \(.+\)/g)[0] };
        }
      }
      switch (x.status) {
      case 400:
        dfd.reject(new api.ApiBadRequest(msg, opt));
        break;
      case 401:
        dfd.reject(new api.ApiUnauthorized(msg, opt));
        break;
      case 402:
        dfd.reject(new api.ApiPaymentRequired(msg, opt));
        break;
      case 403:
        dfd.reject(new api.ApiForbidden(msg, opt));
        break;
      case 404:
        dfd.reject(new api.ApiNotFound(msg, opt));
        break;
      case 408:
        dfd.reject(new api.NetworkTimeout(msg, opt));
        break;
      case 422:
        // 422 Notify user: Cannot create item, max limit 50 items reached
        if (msg && msg.indexOf('limit') >= 0 && msg.indexOf('reach') >= 0) {
          dfd.reject(new api.ApiSubscriptionLimit(msg, opt));
        } else {
          dfd.reject(new api.ApiUnprocessableEntity(msg, opt));
        }
        break;
      case 503:
        dfd.reject(new api.ApiServerCapicity(msg, opt));
        break;
      case 500:
      default:
        dfd.reject(new api.ApiError(msg, opt));
        break;
      }
    }
  };
  api.ApiAjax.prototype._postAjax = function (url, data, timeOut, opt) {
    var dfd = $.Deferred();
    var that = this;
    var xhr = $.ajax({
      type: 'POST',
      url: url,
      data: JSON.stringify(this._prepareDict(data)),
      contentType: 'application/json; charset=utf-8',
      timeout: timeOut || this.timeOut,
      success: function (data) {
        return that._handleAjaxSuccess(dfd, data, opt);
      },
      error: function (x, t, m) {
        return that._handleAjaxError(dfd, x, t, m, opt);
      }
    });
    // Extend promise with abort method
    // to abort xhr request if needed
    // http://stackoverflow.com/questions/21766428/chained-jquery-promises-with-abort
    var promise = dfd.promise();
    promise.abort = function () {
      xhr.abort();
    };
    return promise;
  };
  api.ApiAjax.prototype._getAjax = function (url, timeOut, opt) {
    var dfd = $.Deferred();
    var that = this;
    var xhr = $.ajax({
      url: url,
      timeout: timeOut || this.timeOut,
      success: function (data) {
        return that._handleAjaxSuccess(dfd, data, opt);
      },
      error: function (x, t, m) {
        return that._handleAjaxError(dfd, x, t, m, opt);
      }
    });
    // Extend promise with abort method
    // to abort xhr request if needed
    // http://stackoverflow.com/questions/21766428/chained-jquery-promises-with-abort
    var promise = dfd.promise();
    promise.abort = function () {
      xhr.abort();
    };
    return promise;
  };
  api.ApiAjax.prototype._prepareDict = function (data) {
    // Makes sure all values from the dict are serializable and understandable for json
    if (!data) {
      return {};
    }
    $.each(data, function (key, value) {
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
    } else if (data instanceof Object || $.isArray(data)) {
      var that = this;
      $.each(data, function (k, v) {
        data[k] = that._fixDates(v);
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
    this.tokenType = spec.tokenType || '';
    this.impersonated = spec.impersonated || false;
  };
  api.ApiUser.prototype.fromStorage = function () {
    this.userId = window.localStorage.getItem('userId') || '';
    this.userEmail = window.localStorage.getItem('userEmail') || '';
    this.userToken = window.localStorage.getItem('userToken') || '';
    this.tokenType = window.localStorage.getItem('tokenType') || '';
    this.impersonated = window.localStorage.getItem('impersonated') === 'true';
  };
  api.ApiUser.prototype.toStorage = function () {
    window.localStorage.setItem('userId', this.userId);
    window.localStorage.setItem('userEmail', this.userEmail);
    window.localStorage.setItem('userToken', this.userToken);
    window.localStorage.setItem('tokenType', this.tokenType);
    window.localStorage.setItem('impersonated', this.impersonated);
  };
  api.ApiUser.prototype.removeFromStorage = function () {
    window.localStorage.removeItem('userId');
    window.localStorage.removeItem('userEmail');
    window.localStorage.removeItem('userToken');
    window.localStorage.removeItem('tokenType');
    window.localStorage.removeItem('impersonated');
  };
  api.ApiUser.prototype.clearToken = function () {
    window.localStorage.setItem('userToken', null);
    window.localStorage.setItem('tokenType', null);
  };
  api.ApiUser.prototype.isValid = function () {
    system.log('ApiUser: isValid');
    return this.userId != null && this.userId.length > 0 && (this.userToken != null && this.userToken.length > 0);
  };
  api.ApiUser.prototype._reset = function () {
    this.userId = '';
    this.userToken = '';
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
    this.allowAccountOwner = spec.allowAccountOwner !== undefined ? spec.allowAccountOwner : true;
  };
  api.ApiAuth.prototype.authenticate = function (userId, password) {
    system.log('ApiAuth: authenticate ' + userId);
    var that = this;
    var params = {
      user: userId,
      password: password,
      _v: this.version
    };
    if (this.platform) {
      params.platform = this.platform;
    }
    if (this.device) {
      params.device = this.device;
    }
    var dfd = $.Deferred();
    this.ajax.post(this.urlAuth, params, 30000).done(function (resp) {
      // Check if login is ok AND if login is ok but account is expired, check if we allow login or not (allowAccountOwner)
      // 
      // REMARK
      // - web app allows owners to still login on expired/cancelled account
      // - mobile doesn't allow expired logins also not for owners
      if (resp.status == 'OK' && ([
          'expired',
          'cancelled_expired',
          'archived'
        ].indexOf(resp.subscription) != -1 ? that.allowAccountOwner : true)) {
        dfd.resolve(resp.data, resp.is_impersonated === true);
      } else {
        dfd.reject(resp);
      }
    }).fail(function (err) {
      dfd.reject(err);
    });
    return dfd.promise();
  };
  // Deprecated ApiAuthV2, use ApiAuth
  api.ApiAuthV2 = api.ApiAuth;
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
    var cmd = 'call.' + method;
    var url = this.urlApi + '/' + method;
    var getUrl = url + '?' + $.param(this.ajax._prepareDict(params));
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
    var dfd = $.Deferred();
    var that = this;
    // We're actually doing a API get
    // and resolve to an object,
    // so we also pass the fields
    var url = this.getBaseUrl() + pk;
    var p = this.getParams(fields);
    if (!$.isEmptyObject(p)) {
      url += '?' + this.getParams(p);
    }
    this._ajaxGet(cmd, url).done(function (data) {
      dfd.resolve(data);
    }).fail(function (error) {
      if (error instanceof api.ApiNotFound) {
        dfd.resolve(null);
      } else {
        dfd.reject(error);
      }
    });
    return dfd.promise();
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
    if (!$.isEmptyObject(p)) {
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
    var that = this;
    var dfd = $.Deferred();
    this.get(pk, fields).done(function (data) {
      dfd.resolve(data);
    }).fail(function (err) {
      if (err instanceof api.ApiNotFound) {
        dfd.resolve(null);
      } else {
        dfd.reject(err);
      }
    });
    return dfd.promise();
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
    var groups = pks.map(function (e, i) {
      return i % chunk_size === 0 ? pks.slice(i, i + chunk_size) : null;
    }).filter(function (e) {
      return e;
    });
    var that = this, returnArr = [];
    var ajaxQueue = new $.fn.ajaxQueue(), dfdMultiple = $.Deferred();
    $.each(groups, function (i, group) {
      var url = that.getBaseUrl() + group.join(',');
      var p = that.getParamsDict(fields);
      if (!$.isEmptyObject(p)) {
        url += '?' + that.getParams(p);
      }
      ajaxQueue(function () {
        return that._ajaxGet(cmd, url).then(function (resp) {
          // BUGFIX make sure that response is an array
          resp = $.isArray(resp) ? resp : [resp];
          returnArr = returnArr.concat(resp);
        });
      });
    });
    ajaxQueue(function () {
      return dfdMultiple.resolve(returnArr);
    });
    return dfdMultiple;
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
    var p = $.extend({}, params);
    if (fields != null && fields.length > 0) {
      p['_fields'] = $.isArray(fields) ? fields.join(',') : fields;
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
    var p = $.extend({}, params);
    if (fields != null && fields.length > 0) {
      p['_fields'] = $.isArray(fields) ? fields.join(',') : fields;
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
    var dfd = $.Deferred();
    var that = this;
    var todoObjs = objects.slice(0);
    var doneIds = [];
    // Trigger the creates sequentially
    var createRecurse = function (todoObjs) {
      if (todoObjs.length > 0) {
        var obj = todoObjs.pop();
        that.create(obj, fields).done(function (resp) {
          doneIds.push(resp._id);
          return createRecurse(todoObjs);
        }).fail(function (error) {
          dfd.reject(error);
        });
      } else {
        dfd.resolve(doneIds);
      }
    };
    createRecurse(todoObjs);
    return dfd.promise();
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
    if (!$.isEmptyObject(p)) {
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
    var url = this.searchUrl(params, fields, limit, skip, sort, mimeType);
    return this._ajaxGet(cmd, url);
  };
  api.ApiDataSource.prototype.searchUrl = function (params, fields, limit, skip, sort, mimeType) {
    var url = this.getBaseUrl() + 'search';
    var p = $.extend(this.getParamsDict(fields, limit, skip, sort), params);
    if (mimeType != null && mimeType.length > 0) {
      p['mimeType'] = mimeType;
    }
    url += '?' + this.getParams(p);
    return url;
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
    var p = $.extend(this.getParamsDict(fields, limit, skip, sort), params);
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
    var url = pk != null && pk.length > 0 ? this.getBaseUrl() + pk + '/call/' + method : this.getBaseUrl() + 'call/' + method;
    var p = $.extend({}, this.getParamsDict(fields, null, null, null), params);
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
    var p = $.extend({}, this.getParamsDict(fields, null, null, null), params);
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
  api.ApiDataSource.prototype.getBaseUrl = function () {
    var tokenType = this.user.tokenType != null && this.user.tokenType.length > 0 ? this.user.tokenType : 'null';
    //Don't use cached version of this because when user session gets expired
    //a new token is generated
    return this.urlApi + '/' + this.user.userId + '/' + this.user.userToken + '/' + tokenType + '/' + this.collection + '/';
  };
  /**
   * Prepare some parameters so we can use them during a request
   * @method
   * @name ApiDataSource#getParams
   * @param data
   * @returns {object}
   */
  api.ApiDataSource.prototype.getParams = function (data) {
    return $.param(this.ajax._prepareDict(data));
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
      p['_fields'] = $.isArray(fields) ? fields.join(',') : fields.replace(/\s/g, '');
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
    return this.ajax.get(url, timeout, {
      coll: this.collection,
      cmd: cmd
    });
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
    return this.ajax.post(url, data, timeout, {
      coll: this.collection,
      cmd: cmd
    });
  };
  return api;
}(jquery, moment);
settings = { amazonBucket: 'app' };
common_validation = function (moment) {
  return {
    /**
     * isValidEmail
     * @memberOf common
     * @name  common#isValidEmail
     * @method
     * @param  {string}  email 
     * @return {Boolean}       
     */
    isValidEmail: function (email) {
      var m = email.match(/^([\w-\+']+(?:\.[\w-\+']+)*)@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,}(?:\.[a-z]{2})?)$/i);
      return m != null && m.length > 0;
    },
    /**
     * isFreeEmail
     * @memberOf common
     * @name common#isFreeEmail
     * @method
     * @param email
     * @returns {boolean}
     */
    isFreeEmail: function (email) {
      var m = email.match(/^([\w-\+]+(?:\.[\w-\+]+)*)@(?!gmail\.com)(?!yahoo\.com)(?!hotmail\.com)(?!163\.com)(?!qq\.com)(?!mail\.ru)((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,}(?:\.[a-z]{2})?)$/i);
      return m == null;
    },
    /**
     * isValidPhone
     * @memberOf common
     * @name  common#isValidPhone
     * @method
     * @param  {string}  phone 
     * @return {Boolean}       
     */
    isValidPhone: function (phone) {
      // stip all none ascii characters
      // f.e "054-5237745‬4" --> "054-5237745%u202C4"
      // https://stackoverflow.com/questions/20856197/remove-non-ascii-character-in-string
      phone = phone.replace(/[^A-Za-z 0-9 \.,\?""!@#\$%\^&\*\(\)-_=\+;:<>\/\\\|\}\{\[\]`~]*/g, '');
      if ($.isNumeric(phone)) {
        return true;
      }
      var m = phone.match(/^[\s()+-]*([0-9][\s()+-]*){7,20}(( x| ext)\d{1,5}){0,1}$/);
      return m != null && m.length > 0;
    },
    /**
     * isValidURL
     * @memberOf common
     * @name common#isValidURL
     * @method
     * @param {string}  url
     * @returns {boolean}
     */
    isValidURL: function (url) {
      // http://stackoverflow.com/questions/1303872/trying-to-validate-url-using-javascript
      var m = url.match(/^(https?|ftp):\/\/([a-zA-Z0-9.-]+(:[a-zA-Z0-9.&%$-]+)*@)*((25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9][0-9]?)(\.(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])){3}|([a-zA-Z0-9-]+\.)*[a-zA-Z0-9-]+\.(com|edu|gov|int|mil|net|org|biz|arpa|info|name|pro|aero|coop|museum|[a-zA-Z]{1,}))(:[0-9]+)*(\/($|[a-zA-Z0-9.,?'\\+&%$#=~_@\!-]+))*$/);
      return m != null && m.length > 0;
    },
    /**
     * isValidPassword
     * @memberOf common
     * @name common#isValidPassword
     * @method
     * @param password
     * @returns {boolean}
     */
    isValidPassword: function (password) {
      var hasDigit = password.match(/[0-9]/);
      return password.length >= 4 && hasDigit;
    },
    /**
     * isNumeric
     * https://stackoverflow.com/questions/18082/validate-decimal-numbers-in-javascript-isnumeric
     * @memberOf common
     * @name common#isNumeric
     * @method
     * @param  {string}     value
     * @param  {boolean}    onlyInteger
     * @return {Boolean}    
     */
    isNumeric: function (value, onlyInteger) {
      var isNumeric = $.isNumeric(value);
      if (onlyInteger) {
        return (value ^ 0) === Number(value);
      }
      return $.isNumeric(value);
    },
    /**
     * isValidDate
     * @memberOf common
     * @name common#isValidDate
     * @method
     * @param  {string}     value
     * @return {Boolean}    
     */
    isValidDate: function (value) {
      // make sure numbers are parsed as a number
      if (!isNaN(value)) {
        value = parseInt(value);
      }
      return moment(value).isValid();
    }
  };
}(moment);
field = function ($, validationHelper) {
  var DEFAULTS = {
    name: null,
    value: null,
    required: false,
    unit: '',
    kind: 'string',
    form: false,
    editor: null,
    description: '',
    select: []
  };
  /**
   * @name  Field
   * @class
   * @param spec
   * @constructor
   */
  var Field = function (spec) {
    spec = spec || {};
    this.raw = spec;
    this.name = spec.name || DEFAULTS.name;
    this.value = spec.value || DEFAULTS.value;
    this.required = spec.required || DEFAULTS.required;
    this.unit = spec.unit || DEFAULTS.unit;
    this.kind = spec.kind || DEFAULTS.kind;
    this.form = spec.form || DEFAULTS.form;
    this.editor = spec.editor || DEFAULTS.editor;
    this.description = spec.description || DEFAULTS.description;
    this.select = spec.select || DEFAULTS.select;
  };
  /**
   * isValid
   * @name  Field#isValid
   * @method
   * @returns {boolean}
   */
  Field.prototype.isValid = function (allowEmpty) {
    var value = $.trim(this.value);
    // skip if not required and empty
    if (!this.required && value == '')
      return true;
    switch (this.kind) {
    case 'float':
    case 'decimal':
    case 'currency':
      return validationHelper.isNumeric(value);
    case 'int':
      return validationHelper.isNumeric(value, true);
    case 'date':
    case 'datetime':
      return validationHelper.isValidDate(value);
    case 'string':
    case 'select':
      if (this.editor == 'phone') {
        return validationHelper.isValidPhone(value);
      }
      if (this.editor == 'email') {
        return validationHelper.isValidEmail(value);
      }
      if (this.editor == 'url') {
        return validationHelper.isValidURL(value);
      }
      if (this.editor == 'number') {
        return validationHelper.isNumeric(value);
      }
      return value != '';
    default:
      return true;
    }
  };
  /**
   * isDirty
   * @name  Field#isDirty
   * @method
   * @returns {boolean}
   */
  Field.prototype.isDirty = function () {
    return this.raw.value != this.value;
  };
  /**
   * isEmpty
   * @name  Field#isEmpty
   * @method
   * @returns {boolean}
   */
  Field.prototype.isEmpty = function () {
    return $.trim(this.value) == '';
  };
  return Field;
}(jquery, common_validation);
dateHelper = function ($, moment) {
  // Add a new function to moment
  moment.fn.toJSONDate = function () {
    // toISOString gives the time in Zulu timezone
    // we want the local timezone but in ISO formatting
    return this.format('YYYY-MM-DD[T]HH:mm:ss.000[Z]');
  };
  // https://github.com/moment/moment/pull/1595
  //m.roundTo('minute', 15); // Round the moment to the nearest 15 minutes.
  //m.roundTo('minute', 15, 'up'); // Round the moment up to the nearest 15 minutes.
  //m.roundTo('minute', 15, 'down'); // Round the moment down to the nearest 15 minutes.
  moment.fn.roundTo = function (units, offset, midpoint) {
    units = moment.normalizeUnits(units);
    offset = offset || 1;
    var roundUnit = function (unit) {
      switch (midpoint) {
      case 'up':
        unit = Math.ceil(unit / offset);
        break;
      case 'down':
        unit = Math.floor(unit / offset);
        break;
      default:
        unit = Math.round(unit / offset);
        break;
      }
      return unit * offset;
    };
    switch (units) {
    case 'year':
      this.year(roundUnit(this.year()));
      break;
    case 'month':
      this.month(roundUnit(this.month()));
      break;
    case 'week':
      this.weekday(roundUnit(this.weekday()));
      break;
    case 'isoWeek':
      this.isoWeekday(roundUnit(this.isoWeekday()));
      break;
    case 'day':
      this.day(roundUnit(this.day()));
      break;
    case 'hour':
      this.hour(roundUnit(this.hour()));
      break;
    case 'minute':
      this.minute(roundUnit(this.minute()));
      break;
    case 'second':
      this.second(roundUnit(this.second()));
      break;
    default:
      this.millisecond(roundUnit(this.millisecond()));
      break;
    }
    return this;
  };
  /*
   useHours = BooleanField(default=True)
   avgCheckoutHours = IntField(default=4)
   roundMinutes = IntField(default=15)
   roundType = StringField(default="nearest", choices=ROUND_TYPE)  # nearest, longer, shorter
   */
  var INCREMENT = 15, START_OF_DAY_HRS = 9, END_OF_DAY_HRS = 17;
  /**
   * @name  DateHelper
   * @class
   * @constructor
   */
  var DateHelper = function (spec) {
    spec = spec || {};
    this.roundType = spec.roundType || 'nearest';
    this.roundMinutes = spec.roundMinutes || INCREMENT;
    this.timeFormat24 = spec.timeFormat24 ? spec.timeFormat24 : false;
    this._momentFormat = this.timeFormat24 ? 'MMM D [at] H:mm' : 'MMM D [at] h:mm a';
    this.startOfDayHours = spec.startOfDayHours != null ? startOfDayHours : START_OF_DAY_HRS;
    this.endOfDayHours = spec.endOfDayHours != null ? endOfDayHours : END_OF_DAY_HRS;
    this.businessHours = spec.businessHours || [];
    this.weekStart = spec.weekStart || 1;
  };
  /**
   * @name parseDate
   * @method
   * @param data
   * @returns {moment}
   */
  DateHelper.prototype.parseDate = function (data) {
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
    }
  };
  /**
   * @name  DateHelper#getNow
   * @method
   * @return {moment}
   */
  DateHelper.prototype.getNow = function () {
    // TODO: Use the right MomentJS constructor
    //       This one will be deprecated in the next version
    return moment();
  };
  /**
   * @name DateHelper#getFriendlyDuration
   * @method
   * @param  duration
   * @return {}
   */
  DateHelper.prototype.getFriendlyDuration = function (duration) {
    return duration.humanize();
  };
  /**
   * @name DateHelper#getFriendlyDateParts
   * @param date
   * @param now (optional)
   * @param format (optional)
   * @returns [date string,time string]
   */
  DateHelper.prototype.getFriendlyDateParts = function (date, now, format) {
    /*
     moment().calendar() shows friendlier dates
     - when the date is <=7d away:
     - Today at 4:15 PM
     - Yesterday at 4:15 PM
     - Last Monday at 4:15 PM
     - Wednesday at 4:15 PM
     - when the date is >7d away:
     - 07/25/2015
     */
    if (!moment.isMoment(date)) {
      date = moment(date);
    }
    now = now || this.getNow();
    return date.calendar().replace('AM', 'am').replace('PM', 'pm').split(' at ');
  };
  /**
   * Returns a number of friendly date ranges with a name
   * Each date range is a standard transaction duration
   * @name getDateRanges
   * @method
   * @param avgHours
   * @param numRanges
   * @param now
   * @param i18n
   * @returns {Array} [{counter: 1, from: m(), to: m(), hours: 24, option: 'days', title: '1 Day'}, {...}]
   */
  DateHelper.prototype.getDateRanges = function (avgHours, numRanges, now, i18n) {
    if (now && !moment.isMoment(now)) {
      now = moment(now);
    }
    i18n = i18n || {
      year: 'year',
      years: 'years',
      month: 'month',
      months: 'months',
      week: 'week',
      weeks: 'weeks',
      day: 'day',
      days: 'days',
      hour: 'hour',
      hours: 'hours'
    };
    var timeOptions = [
        'years',
        'months',
        'weeks',
        'days',
        'hours'
      ], timeHourVals = [
        365 * 24,
        30 * 24,
        7 * 24,
        24,
        1
      ], opt = null, val = null, title = null, counter = 0, chosenIndex = -1, ranges = [];
    // Find the range kind that best fits the avgHours (search from long to short)
    for (var i = 0; i < timeOptions.length; i++) {
      val = timeHourVals[i];
      opt = timeOptions[i];
      if (avgHours >= val) {
        if (avgHours % val == 0) {
          chosenIndex = i;
          break;
        }
      }
    }
    now = now || this.getNow();
    if (chosenIndex >= 0) {
      for (var i = 1; i <= numRanges; i++) {
        counter = i * avgHours;
        title = i18n[counter == 1 ? opt.replace('s', '') : opt];
        ranges.push({
          option: opt,
          hours: counter,
          title: counter / timeHourVals[chosenIndex] + ' ' + title,
          from: now.clone(),
          to: now.clone().add(counter, 'hours')
        });
      }
    }
    return ranges.filter(function (r) {
      return global.dateHelper.isValidBusinessDate(r.to);
    });
  };
  /**
   * getFriendlyFromTo
   * returns {fromDate:"", fromTime: "", fromText: "", toDate: "", toTime: "", toText: "", text: ""}
   * @param from
   * @param to
   * @param useHours
   * @param now
   * @param separator
   * @param format
   * @returns {}
   */
  DateHelper.prototype.getFriendlyFromTo = function (from, to, useHours, now, separator, format) {
    if (!moment.isMoment(from)) {
      from = moment(from);
    }
    if (!moment.isMoment(to)) {
      to = moment(to);
    }
    now = now || this.getNow();
    var sep = separator || ' - ', fromParts = this.getFriendlyDateParts(from, now, format), toParts = this.getFriendlyDateParts(to, now, format), result = {
        dayDiff: from ? from.clone().startOf('day').diff(to, 'days') : -1,
        fromDate: from ? fromParts[0] : 'No from date set',
        fromTime: useHours && from != null ? fromParts[1] : '',
        toDate: to ? toParts[0] : 'No to date set',
        toTime: useHours && to != null ? toParts[1] : ''
      };
    result.fromText = result.fromDate;
    result.toText = result.toDate;
    if (useHours) {
      if (result.fromTime) {
        result.fromText += ' ' + result.fromTime;
      }
      if (result.toTime) {
        result.toText += ' ' + result.toTime;
      }
    }
    // Build a text based on the dates and times we have
    if (result.dayDiff == 0) {
      if (useHours) {
        result.text = result.fromText + sep + result.toText;
      } else {
        result.text = result.fromText;
      }
    } else {
      result.text = result.fromText + sep + result.toText;
    }
    return result;
  };
  /**
   * @deprecated use getFriendlyFromToInfo
   * [getFriendlyFromToOld]
   * @param  fromDate
   * @param  toDate
   * @param  groupProfile
   * @return {}
   */
  DateHelper.prototype.getFriendlyFromToOld = function (fromDate, toDate, groupProfile) {
    var mFrom = this.roundFromTime(fromDate, groupProfile);
    var mTo = this.roundToTime(toDate, groupProfile);
    return {
      from: mFrom,
      to: mTo,
      daysBetween: mTo.clone().startOf('day').diff(mFrom.clone().startOf('day'), 'days'),
      duration: moment.duration(mFrom - mTo).humanize(),
      fromText: mFrom.calendar().replace(' at ', ' '),
      toText: mTo.calendar().replace(' at ', ' ')
    };
  };
  /**
   * makeStartDate helps making an start date for a transaction, usually a reservation
   * It will do the standard rounding
   * But also, if you're using dates instead of datetimes,
   * it will try to make smart decisions about which hours to use
   * @param m - the Moment date
   * @param useHours - does the profile use hours?
   * @param dayMode - did the selection happen via calendar day selection? (can be true even if useHours is true)
   * @param minDate - passing in a minimum start-date, will be different for reservations compared to orders
   * @param maxDate - passing in a maximum start-date (not used for the moment)
   * @param now - the current moment (just to make testing easier)
   * @returns {moment}
   * @private
   */
  DateHelper.prototype.makeStartDate = function (m, useHours, dayMode, minDate, maxDate, now) {
    useHours = useHours != null ? useHours : true;
    // is the account set up to use hours?
    dayMode = dayMode != null ? dayMode : false;
    // did the selection come from a calendar fullcalendar day selection?
    now = now || moment();
    // the current time (for unit testing)
    if (useHours && !dayMode) {
      // The account is set up to use hours,
      // and the user picked the hours himself (since it's not picked from a dayMode calendar)
      // We'll just round the from date
      // if it's before the minDate, just take the minDate instead
      m = this.roundTimeFrom(m);
    } else {
      // When we get here we know that either:
      // 1) The account is set up to use hours BUT the date came from a calendar selection that just chose the date part
      // or
      // 2) The account is set up to use days instead of hours
      //
      // Which means we still need to see if we can make a smart decision about the hours part
      // we'll base this on typical business hours (usually 9 to 5)
      var isToday = m.isSame(now, 'day'), startOfBusinessDay = this._makeStartOfBusinessDay(m);
      if (isToday) {
        // The start date is today
        // and the current time is still before business hours
        // we can use the start time to start-of-business hours
        if (m.isBefore(startOfBusinessDay)) {
          m = startOfBusinessDay;
        } else {
          // We're already at the beginning of business hours
          // or even already passed it, just try rounding the
          // time and see if its before minDate
          m = this.roundTimeFrom(m);
        }
      } else {
        // The start date is not today, we can just take the business day start from the date that was passed
        m = startOfBusinessDay;
      }
    }
    // Make sure we never return anything before the mindate
    return minDate && m.isBefore(minDate) ? minDate : m;
  };
  /**
   * makeEndDate helps making an end date for a transaction
   * It will do the standard rounding
   * But also, if you're using dates instead of datetimes,
   * it will try to make smart decisions about which hours to use
   * @param m - the Moment date
   * @param useHours - does the profile use hours?
   * @param dayMode - did the selection happen via calendar day selection? (can be true even if useHours is true)
   * @param minDate
   * @param maxDate
   * @param now - the current moment (just to make testing easier)
   * @returns {moment}
   * @private
   */
  DateHelper.prototype.makeEndDate = function (m, useHours, dayMode, minDate, maxDate, now) {
    useHours = useHours != null ? useHours : true;
    dayMode = dayMode != null ? dayMode : false;
    now = now || moment();
    if (useHours && !dayMode) {
      // The account is set up to use hours,
      // and since dayMode is false,
      // we assume the hours are picked by the user himself
      // just do the rounding and we're done
      m = this.roundTimeTo(m);
    } else {
      // When we get here we know that either:
      // 1) The account is set up to use hours BUT the date came from a calendar selection that just chose the date part
      // or
      // 2) The account is set up to use days instead of hours
      //
      // Which means we still need to see if we can make a smart decision about the hours part
      var isToday = m.isSame(now, 'day'), endOfBusinessDay = this._makeEndOfBusinessDay(m), endOfDay = this._makeEndOfDay(m);
      if (isToday) {
        // The end date is today
        // and the current date is before business hours
        // we can use the end time to end-of-business hours
        if (m.isBefore(endOfBusinessDay)) {
          m = endOfBusinessDay;
        } else {
          m = endOfDay;
        }
      } else if (m.isAfter(endOfBusinessDay)) {
        m = endOfDay;
      } else {
        m = endOfBusinessDay;
      }
    }
    // Make sure we never return a date after the max date
    return maxDate && m.isAfter(maxDate) ? maxDate : m;
  };
  /**
   * [getFriendlyDateText]
   * @param  date
   * @param  useHours
   * @param  now
   * @param  format
   * @return {string}
   */
  DateHelper.prototype.getFriendlyDateText = function (date, useHours, now, format) {
    if (date == null) {
      return 'Not set';
    }
    var parts = this.getFriendlyDateParts(date, now, format);
    return useHours ? parts.join(' ') : parts[0];
  };
  /**
   * [addAverageDuration]
   * @param m
   * @returns {moment}
   */
  DateHelper.prototype.addAverageDuration = function (m) {
    // TODO: Read the average order duration from the group.profile
    // add it to the date that was passed
    return m.clone().add(1, 'day');
  };
  /**
   * roundTimeFrom uses the time rounding rules to round a begin datetime
   * @name  DateHelper#roundTimeFrom
   * @method
   * @param m
   */
  DateHelper.prototype.roundTimeFrom = function (m) {
    return this.roundMinutes <= 1 ? m : this.roundTime(m, this.roundMinutes, this._typeToDirection(this.roundType, 'from'));
  };
  /**
   * roundTimeTo uses the time rounding rules to round an end datetime
   * @name  DateHelper#roundTimeTo
   * @method
   * @param m
   */
  DateHelper.prototype.roundTimeTo = function (m) {
    return this.roundMinutes <= 1 ? m : this.roundTime(m, this.roundMinutes, this._typeToDirection(this.roundType, 'to'));
  };
  /**
   * @name  DateHelper#roundTime
   * @method
   * @param  m
   * @param  inc
   * @param  direction
   */
  DateHelper.prototype.roundTime = function (m, inc, direction) {
    var mom = moment.isMoment(m) ? m : moment(m);
    mom.seconds(0).milliseconds(0);
    return mom.roundTo('minute', inc || INCREMENT, direction);
  };
  /**
   * @name  DateHelper#roundTimeUp
   * @method
   * @param  m
   * @param  inc
   */
  DateHelper.prototype.roundTimeUp = function (m, inc) {
    var mom = moment.isMoment(m) ? m : moment(m);
    mom.seconds(0).milliseconds(0);
    return mom.roundTo('minute', inc || INCREMENT, 'up');
  };
  /**
   * @name DateHelper#roundTimeDown
   * @method
   * @param  m
   * @param  inc
   */
  DateHelper.prototype.roundTimeDown = function (m, inc) {
    var mom = moment.isMoment(m) ? m : moment(m);
    mom.seconds(0).milliseconds(0);
    return mom.roundTo('minute', inc || INCREMENT, 'down');
  };
  DateHelper.prototype._typeToDirection = function (type, fromto) {
    switch (type) {
    case 'longer':
      switch (fromto) {
      case 'from':
        return 'down';
      case 'to':
        return 'up';
      default:
        break;
      }
      break;
    case 'shorter':
      switch (fromto) {
      case 'from':
        return 'up';
      case 'to':
        return 'down';
      default:
        break;
      }
      break;
    default:
      break;
    }
  };
  DateHelper.prototype.isValidBusinessDate = function (d) {
    var isValid = false;
    var businessHours = this.businessHours;
    if (businessHours.length > 0) {
      $.each(this._getBusinessHours(d), function (i, h) {
        var openTime = moment(moment.utc(moment.duration(h.openTime, 'minutes').asMilliseconds()).format('H:mm'), 'H:mm'), closeTime = moment(moment.utc(moment.duration(h.closeTime, 'minutes').asMilliseconds()).format('H:mm'), 'H:mm');
        var testDate = moment(d.clone().format('H:mm'), 'H:mm');
        isValid = testDate.isBetween(openTime, closeTime) || testDate.isSame(openTime) || testDate.isSame(closeTime);
        if (isValid)
          return false;
      });
    } else {
      isValid = true;
    }
    return isValid;
  };
  DateHelper.prototype.getValidBusinessDate = function (d) {
    var that = this, now = this.getNow(), maxMinutes = 0;
    //bugfix getValidBusinessDate only returns dates from now or in the future
    if (d.isBefore(now)) {
      d.date(now.date());
    }
    while (!this.isValidBusinessDate(d) || maxMinutes >= 7 * 24 * 60) {
      d = d.add(that.roundMinutes, 'minutes');
      // Prevent infinite loop by stopping after 1 full week
      maxMinutes += that.roundMinutes;
    }
    return d;
  };
  DateHelper.prototype._getBusinessHours = function (d) {
    var businessHours = this.businessHours;
    if (businessHours.length > 0) {
      return businessHours.filter(function (bh) {
        return bh.isoWeekday == d.isoWeekday();
      });
    } else {
      return [];
    }
  };
  DateHelper.prototype._makeStartOfBusinessDay = function (m) {
    var startOfBusinessDay = m.clone().hour(this.startOfDayHours).minutes(0).seconds(0).milliseconds(0);
    var businessHours = this.businessHours;
    if (businessHours.length > 0) {
      var businessHoursForDay = this._getBusinessHours(m);
      if (businessHoursForDay.length > 0) {
        var openTime = moment(moment.utc(moment.duration(businessHoursForDay[0].openTime, 'minutes').asMilliseconds()).format('H:mm'), 'H:mm');
        startOfBusinessDay.hour(openTime.hour()).minute(openTime.minute());
      }
    }
    return this.getValidBusinessDate(startOfBusinessDay);
  };
  DateHelper.prototype._makeEndOfBusinessDay = function (m) {
    var endOfBusinessDay = m.clone().hour(this.endOfDayHours).minutes(0).seconds(0).milliseconds(0);
    var businessHours = this.businessHours;
    if (businessHours.length > 0) {
      var businessHoursForDay = this._getBusinessHours(m).sort(function (a, b) {
        return a.closeTime < b.closeTime;
      });
      if (businessHoursForDay.length > 0) {
        var closeTime = moment(moment.utc(moment.duration(businessHoursForDay[0].closeTime, 'minutes').asMilliseconds()).format('H:mm'), 'H:mm');
        endOfBusinessDay.hour(closeTime.hour()).minute(closeTime.minute());
      }
    }
    return this.getValidBusinessDate(endOfBusinessDay);
  };
  DateHelper.prototype._makeEndOfDay = function (m) {
    return m.clone().hours(23).minutes(45).seconds(0).milliseconds(0);
  };
  return DateHelper;
}(jquery, moment);
common_inflection = function () {
  /**
  * STRING EXTENSIONS
  */
  /**
  * pluralize
  *
  * @memberOf String
  * @name  String#pluralize
  * @method
  *
  * @param  {int} count
  * @param  {string} suffix
  * @return {string}
  */
  String.prototype.pluralize = function (count, suffix) {
    if (this == 'is' && count != 1) {
      return 'are';
    } else if (this == 'this') {
      return count == 1 ? this : 'these';
    } else if (this.endsWith('s')) {
      suffix = suffix || 'es';
      return count == 1 ? this : this + suffix;
    } else if (this.endsWith('y')) {
      suffix = suffix || 'ies';
      return count == 1 ? this : this.substr(0, this.length - 1) + suffix;
    } else {
      suffix = suffix || 's';
      return count == 1 ? this : this + suffix;
    }
  };
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
  if (!String.prototype.startsWith) {
    /**
     * startsWith
     *
     * @memberOf String
     * @name  String#startsWith
     * @method
     *
     * @param  {string} str
     * @return {Boolean}
     */
    String.prototype.startsWith = function (str) {
      return this.indexOf(str) == 0;
    };
  }
  if (!String.prototype.endsWith) {
    /**
     * endsWith
     *
     * @memberOf String
     * @name  String#endsWith
     * @method
     *
     * @param  {string} str
     * @return {Boolean}
     */
    String.prototype.endsWith = function (str) {
      if (this.length < str.length) {
        return false;
      } else {
        return this.lastIndexOf(str) == this.length - str.length;
      }
    };
  }
  if (!String.prototype.truncate) {
    /**
     * truncate
     *
     * @memberOf String
     * @name  String#truncate
     * @method
     *
     * @param  {int} len
     * @return {string}
     */
    String.prototype.truncate = function (len) {
      len = len != null ? len : 25;
      var re = this.match(RegExp('^.{0,' + len + '}[S]*'));
      var l = re[0].length;
      re = re[0].replace(/\s$/, '');
      if (l < this.length)
        re = re + '&hellip;';
      return re;
    };
  }
  if (!String.prototype.isValidUrl) {
    /**
     * isValidUrl
     *
     * @memberOf String
     * @name  String#isValidUrl
     * @method
     *
     * @return {Boolean}
     */
    String.prototype.isValidUrl = function () {
      var pattern = new RegExp('^(https?:\\/\\/)?' + // protocol
      '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' + // domain name
      '((\\d{1,3}\\.){3}\\d{1,3}))' + // OR ip (v4) address
      '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' + // port and path
      '(\\?[;&a-z\\d%_.~+=-]*)?' + // query string
      '(\\#[-a-z\\d_]*)?$', 'i');
      // fragment locator
      if (!pattern.test(this)) {
        return false;
      } else {
        return true;
      }
    };
  }
  if (!String.prototype.hashCode) {
    /**
     * hashCode
     * http://stackoverflow.com/questions/7616461/generate-a-hash-from-string-in-javascript-jquery
     *
     * @memberOf String
     * @name  String#hashCode
     * @method
     *
     * @return {string}
     */
    String.prototype.hashCode = function () {
      var hash = 0, i, chr, len;
      if (this.length == 0)
        return hash;
      for (i = 0, len = this.length; i < len; i++) {
        chr = this.charCodeAt(i);
        hash = (hash << 5) - hash + chr;
        hash |= 0;  // Convert to 32bit integer
      }
      return hash;
    };
  }
  //http://stackoverflow.com/questions/286921/efficiently-replace-all-accented-characters-in-a-string
  var Latinise = {};
  Latinise.latin_map = {
    '\xC1': 'A',
    '\u0102': 'A',
    '\u1EAE': 'A',
    '\u1EB6': 'A',
    '\u1EB0': 'A',
    '\u1EB2': 'A',
    '\u1EB4': 'A',
    '\u01CD': 'A',
    '\xC2': 'A',
    '\u1EA4': 'A',
    '\u1EAC': 'A',
    '\u1EA6': 'A',
    '\u1EA8': 'A',
    '\u1EAA': 'A',
    '\xC4': 'A',
    '\u01DE': 'A',
    '\u0226': 'A',
    '\u01E0': 'A',
    '\u1EA0': 'A',
    '\u0200': 'A',
    '\xC0': 'A',
    '\u1EA2': 'A',
    '\u0202': 'A',
    '\u0100': 'A',
    '\u0104': 'A',
    '\xC5': 'A',
    '\u01FA': 'A',
    '\u1E00': 'A',
    '\u023A': 'A',
    '\xC3': 'A',
    '\uA732': 'AA',
    '\xC6': 'AE',
    '\u01FC': 'AE',
    '\u01E2': 'AE',
    '\uA734': 'AO',
    '\uA736': 'AU',
    '\uA738': 'AV',
    '\uA73A': 'AV',
    '\uA73C': 'AY',
    '\u1E02': 'B',
    '\u1E04': 'B',
    '\u0181': 'B',
    '\u1E06': 'B',
    '\u0243': 'B',
    '\u0182': 'B',
    '\u0106': 'C',
    '\u010C': 'C',
    '\xC7': 'C',
    '\u1E08': 'C',
    '\u0108': 'C',
    '\u010A': 'C',
    '\u0187': 'C',
    '\u023B': 'C',
    '\u010E': 'D',
    '\u1E10': 'D',
    '\u1E12': 'D',
    '\u1E0A': 'D',
    '\u1E0C': 'D',
    '\u018A': 'D',
    '\u1E0E': 'D',
    '\u01F2': 'D',
    '\u01C5': 'D',
    '\u0110': 'D',
    '\u018B': 'D',
    '\u01F1': 'DZ',
    '\u01C4': 'DZ',
    '\xC9': 'E',
    '\u0114': 'E',
    '\u011A': 'E',
    '\u0228': 'E',
    '\u1E1C': 'E',
    '\xCA': 'E',
    '\u1EBE': 'E',
    '\u1EC6': 'E',
    '\u1EC0': 'E',
    '\u1EC2': 'E',
    '\u1EC4': 'E',
    '\u1E18': 'E',
    '\xCB': 'E',
    '\u0116': 'E',
    '\u1EB8': 'E',
    '\u0204': 'E',
    '\xC8': 'E',
    '\u1EBA': 'E',
    '\u0206': 'E',
    '\u0112': 'E',
    '\u1E16': 'E',
    '\u1E14': 'E',
    '\u0118': 'E',
    '\u0246': 'E',
    '\u1EBC': 'E',
    '\u1E1A': 'E',
    '\uA76A': 'ET',
    '\u1E1E': 'F',
    '\u0191': 'F',
    '\u01F4': 'G',
    '\u011E': 'G',
    '\u01E6': 'G',
    '\u0122': 'G',
    '\u011C': 'G',
    '\u0120': 'G',
    '\u0193': 'G',
    '\u1E20': 'G',
    '\u01E4': 'G',
    '\u1E2A': 'H',
    '\u021E': 'H',
    '\u1E28': 'H',
    '\u0124': 'H',
    '\u2C67': 'H',
    '\u1E26': 'H',
    '\u1E22': 'H',
    '\u1E24': 'H',
    '\u0126': 'H',
    '\xCD': 'I',
    '\u012C': 'I',
    '\u01CF': 'I',
    '\xCE': 'I',
    '\xCF': 'I',
    '\u1E2E': 'I',
    '\u0130': 'I',
    '\u1ECA': 'I',
    '\u0208': 'I',
    '\xCC': 'I',
    '\u1EC8': 'I',
    '\u020A': 'I',
    '\u012A': 'I',
    '\u012E': 'I',
    '\u0197': 'I',
    '\u0128': 'I',
    '\u1E2C': 'I',
    '\uA779': 'D',
    '\uA77B': 'F',
    '\uA77D': 'G',
    '\uA782': 'R',
    '\uA784': 'S',
    '\uA786': 'T',
    '\uA76C': 'IS',
    '\u0134': 'J',
    '\u0248': 'J',
    '\u1E30': 'K',
    '\u01E8': 'K',
    '\u0136': 'K',
    '\u2C69': 'K',
    '\uA742': 'K',
    '\u1E32': 'K',
    '\u0198': 'K',
    '\u1E34': 'K',
    '\uA740': 'K',
    '\uA744': 'K',
    '\u0139': 'L',
    '\u023D': 'L',
    '\u013D': 'L',
    '\u013B': 'L',
    '\u1E3C': 'L',
    '\u1E36': 'L',
    '\u1E38': 'L',
    '\u2C60': 'L',
    '\uA748': 'L',
    '\u1E3A': 'L',
    '\u013F': 'L',
    '\u2C62': 'L',
    '\u01C8': 'L',
    '\u0141': 'L',
    '\u01C7': 'LJ',
    '\u1E3E': 'M',
    '\u1E40': 'M',
    '\u1E42': 'M',
    '\u2C6E': 'M',
    '\u0143': 'N',
    '\u0147': 'N',
    '\u0145': 'N',
    '\u1E4A': 'N',
    '\u1E44': 'N',
    '\u1E46': 'N',
    '\u01F8': 'N',
    '\u019D': 'N',
    '\u1E48': 'N',
    '\u0220': 'N',
    '\u01CB': 'N',
    '\xD1': 'N',
    '\u01CA': 'NJ',
    '\xD3': 'O',
    '\u014E': 'O',
    '\u01D1': 'O',
    '\xD4': 'O',
    '\u1ED0': 'O',
    '\u1ED8': 'O',
    '\u1ED2': 'O',
    '\u1ED4': 'O',
    '\u1ED6': 'O',
    '\xD6': 'O',
    '\u022A': 'O',
    '\u022E': 'O',
    '\u0230': 'O',
    '\u1ECC': 'O',
    '\u0150': 'O',
    '\u020C': 'O',
    '\xD2': 'O',
    '\u1ECE': 'O',
    '\u01A0': 'O',
    '\u1EDA': 'O',
    '\u1EE2': 'O',
    '\u1EDC': 'O',
    '\u1EDE': 'O',
    '\u1EE0': 'O',
    '\u020E': 'O',
    '\uA74A': 'O',
    '\uA74C': 'O',
    '\u014C': 'O',
    '\u1E52': 'O',
    '\u1E50': 'O',
    '\u019F': 'O',
    '\u01EA': 'O',
    '\u01EC': 'O',
    '\xD8': 'O',
    '\u01FE': 'O',
    '\xD5': 'O',
    '\u1E4C': 'O',
    '\u1E4E': 'O',
    '\u022C': 'O',
    '\u01A2': 'OI',
    '\uA74E': 'OO',
    '\u0190': 'E',
    '\u0186': 'O',
    '\u0222': 'OU',
    '\u1E54': 'P',
    '\u1E56': 'P',
    '\uA752': 'P',
    '\u01A4': 'P',
    '\uA754': 'P',
    '\u2C63': 'P',
    '\uA750': 'P',
    '\uA758': 'Q',
    '\uA756': 'Q',
    '\u0154': 'R',
    '\u0158': 'R',
    '\u0156': 'R',
    '\u1E58': 'R',
    '\u1E5A': 'R',
    '\u1E5C': 'R',
    '\u0210': 'R',
    '\u0212': 'R',
    '\u1E5E': 'R',
    '\u024C': 'R',
    '\u2C64': 'R',
    '\uA73E': 'C',
    '\u018E': 'E',
    '\u015A': 'S',
    '\u1E64': 'S',
    '\u0160': 'S',
    '\u1E66': 'S',
    '\u015E': 'S',
    '\u015C': 'S',
    '\u0218': 'S',
    '\u1E60': 'S',
    '\u1E62': 'S',
    '\u1E68': 'S',
    '\u0164': 'T',
    '\u0162': 'T',
    '\u1E70': 'T',
    '\u021A': 'T',
    '\u023E': 'T',
    '\u1E6A': 'T',
    '\u1E6C': 'T',
    '\u01AC': 'T',
    '\u1E6E': 'T',
    '\u01AE': 'T',
    '\u0166': 'T',
    '\u2C6F': 'A',
    '\uA780': 'L',
    '\u019C': 'M',
    '\u0245': 'V',
    '\uA728': 'TZ',
    '\xDA': 'U',
    '\u016C': 'U',
    '\u01D3': 'U',
    '\xDB': 'U',
    '\u1E76': 'U',
    '\xDC': 'U',
    '\u01D7': 'U',
    '\u01D9': 'U',
    '\u01DB': 'U',
    '\u01D5': 'U',
    '\u1E72': 'U',
    '\u1EE4': 'U',
    '\u0170': 'U',
    '\u0214': 'U',
    '\xD9': 'U',
    '\u1EE6': 'U',
    '\u01AF': 'U',
    '\u1EE8': 'U',
    '\u1EF0': 'U',
    '\u1EEA': 'U',
    '\u1EEC': 'U',
    '\u1EEE': 'U',
    '\u0216': 'U',
    '\u016A': 'U',
    '\u1E7A': 'U',
    '\u0172': 'U',
    '\u016E': 'U',
    '\u0168': 'U',
    '\u1E78': 'U',
    '\u1E74': 'U',
    '\uA75E': 'V',
    '\u1E7E': 'V',
    '\u01B2': 'V',
    '\u1E7C': 'V',
    '\uA760': 'VY',
    '\u1E82': 'W',
    '\u0174': 'W',
    '\u1E84': 'W',
    '\u1E86': 'W',
    '\u1E88': 'W',
    '\u1E80': 'W',
    '\u2C72': 'W',
    '\u1E8C': 'X',
    '\u1E8A': 'X',
    '\xDD': 'Y',
    '\u0176': 'Y',
    '\u0178': 'Y',
    '\u1E8E': 'Y',
    '\u1EF4': 'Y',
    '\u1EF2': 'Y',
    '\u01B3': 'Y',
    '\u1EF6': 'Y',
    '\u1EFE': 'Y',
    '\u0232': 'Y',
    '\u024E': 'Y',
    '\u1EF8': 'Y',
    '\u0179': 'Z',
    '\u017D': 'Z',
    '\u1E90': 'Z',
    '\u2C6B': 'Z',
    '\u017B': 'Z',
    '\u1E92': 'Z',
    '\u0224': 'Z',
    '\u1E94': 'Z',
    '\u01B5': 'Z',
    '\u0132': 'IJ',
    '\u0152': 'OE',
    '\u1D00': 'A',
    '\u1D01': 'AE',
    '\u0299': 'B',
    '\u1D03': 'B',
    '\u1D04': 'C',
    '\u1D05': 'D',
    '\u1D07': 'E',
    '\uA730': 'F',
    '\u0262': 'G',
    '\u029B': 'G',
    '\u029C': 'H',
    '\u026A': 'I',
    '\u0281': 'R',
    '\u1D0A': 'J',
    '\u1D0B': 'K',
    '\u029F': 'L',
    '\u1D0C': 'L',
    '\u1D0D': 'M',
    '\u0274': 'N',
    '\u1D0F': 'O',
    '\u0276': 'OE',
    '\u1D10': 'O',
    '\u1D15': 'OU',
    '\u1D18': 'P',
    '\u0280': 'R',
    '\u1D0E': 'N',
    '\u1D19': 'R',
    '\uA731': 'S',
    '\u1D1B': 'T',
    '\u2C7B': 'E',
    '\u1D1A': 'R',
    '\u1D1C': 'U',
    '\u1D20': 'V',
    '\u1D21': 'W',
    '\u028F': 'Y',
    '\u1D22': 'Z',
    '\xE1': 'a',
    '\u0103': 'a',
    '\u1EAF': 'a',
    '\u1EB7': 'a',
    '\u1EB1': 'a',
    '\u1EB3': 'a',
    '\u1EB5': 'a',
    '\u01CE': 'a',
    '\xE2': 'a',
    '\u1EA5': 'a',
    '\u1EAD': 'a',
    '\u1EA7': 'a',
    '\u1EA9': 'a',
    '\u1EAB': 'a',
    '\xE4': 'a',
    '\u01DF': 'a',
    '\u0227': 'a',
    '\u01E1': 'a',
    '\u1EA1': 'a',
    '\u0201': 'a',
    '\xE0': 'a',
    '\u1EA3': 'a',
    '\u0203': 'a',
    '\u0101': 'a',
    '\u0105': 'a',
    '\u1D8F': 'a',
    '\u1E9A': 'a',
    '\xE5': 'a',
    '\u01FB': 'a',
    '\u1E01': 'a',
    '\u2C65': 'a',
    '\xE3': 'a',
    '\uA733': 'aa',
    '\xE6': 'ae',
    '\u01FD': 'ae',
    '\u01E3': 'ae',
    '\uA735': 'ao',
    '\uA737': 'au',
    '\uA739': 'av',
    '\uA73B': 'av',
    '\uA73D': 'ay',
    '\u1E03': 'b',
    '\u1E05': 'b',
    '\u0253': 'b',
    '\u1E07': 'b',
    '\u1D6C': 'b',
    '\u1D80': 'b',
    '\u0180': 'b',
    '\u0183': 'b',
    '\u0275': 'o',
    '\u0107': 'c',
    '\u010D': 'c',
    '\xE7': 'c',
    '\u1E09': 'c',
    '\u0109': 'c',
    '\u0255': 'c',
    '\u010B': 'c',
    '\u0188': 'c',
    '\u023C': 'c',
    '\u010F': 'd',
    '\u1E11': 'd',
    '\u1E13': 'd',
    '\u0221': 'd',
    '\u1E0B': 'd',
    '\u1E0D': 'd',
    '\u0257': 'd',
    '\u1D91': 'd',
    '\u1E0F': 'd',
    '\u1D6D': 'd',
    '\u1D81': 'd',
    '\u0111': 'd',
    '\u0256': 'd',
    '\u018C': 'd',
    '\u0131': 'i',
    '\u0237': 'j',
    '\u025F': 'j',
    '\u0284': 'j',
    '\u01F3': 'dz',
    '\u01C6': 'dz',
    '\xE9': 'e',
    '\u0115': 'e',
    '\u011B': 'e',
    '\u0229': 'e',
    '\u1E1D': 'e',
    '\xEA': 'e',
    '\u1EBF': 'e',
    '\u1EC7': 'e',
    '\u1EC1': 'e',
    '\u1EC3': 'e',
    '\u1EC5': 'e',
    '\u1E19': 'e',
    '\xEB': 'e',
    '\u0117': 'e',
    '\u1EB9': 'e',
    '\u0205': 'e',
    '\xE8': 'e',
    '\u1EBB': 'e',
    '\u0207': 'e',
    '\u0113': 'e',
    '\u1E17': 'e',
    '\u1E15': 'e',
    '\u2C78': 'e',
    '\u0119': 'e',
    '\u1D92': 'e',
    '\u0247': 'e',
    '\u1EBD': 'e',
    '\u1E1B': 'e',
    '\uA76B': 'et',
    '\u1E1F': 'f',
    '\u0192': 'f',
    '\u1D6E': 'f',
    '\u1D82': 'f',
    '\u01F5': 'g',
    '\u011F': 'g',
    '\u01E7': 'g',
    '\u0123': 'g',
    '\u011D': 'g',
    '\u0121': 'g',
    '\u0260': 'g',
    '\u1E21': 'g',
    '\u1D83': 'g',
    '\u01E5': 'g',
    '\u1E2B': 'h',
    '\u021F': 'h',
    '\u1E29': 'h',
    '\u0125': 'h',
    '\u2C68': 'h',
    '\u1E27': 'h',
    '\u1E23': 'h',
    '\u1E25': 'h',
    '\u0266': 'h',
    '\u1E96': 'h',
    '\u0127': 'h',
    '\u0195': 'hv',
    '\xED': 'i',
    '\u012D': 'i',
    '\u01D0': 'i',
    '\xEE': 'i',
    '\xEF': 'i',
    '\u1E2F': 'i',
    '\u1ECB': 'i',
    '\u0209': 'i',
    '\xEC': 'i',
    '\u1EC9': 'i',
    '\u020B': 'i',
    '\u012B': 'i',
    '\u012F': 'i',
    '\u1D96': 'i',
    '\u0268': 'i',
    '\u0129': 'i',
    '\u1E2D': 'i',
    '\uA77A': 'd',
    '\uA77C': 'f',
    '\u1D79': 'g',
    '\uA783': 'r',
    '\uA785': 's',
    '\uA787': 't',
    '\uA76D': 'is',
    '\u01F0': 'j',
    '\u0135': 'j',
    '\u029D': 'j',
    '\u0249': 'j',
    '\u1E31': 'k',
    '\u01E9': 'k',
    '\u0137': 'k',
    '\u2C6A': 'k',
    '\uA743': 'k',
    '\u1E33': 'k',
    '\u0199': 'k',
    '\u1E35': 'k',
    '\u1D84': 'k',
    '\uA741': 'k',
    '\uA745': 'k',
    '\u013A': 'l',
    '\u019A': 'l',
    '\u026C': 'l',
    '\u013E': 'l',
    '\u013C': 'l',
    '\u1E3D': 'l',
    '\u0234': 'l',
    '\u1E37': 'l',
    '\u1E39': 'l',
    '\u2C61': 'l',
    '\uA749': 'l',
    '\u1E3B': 'l',
    '\u0140': 'l',
    '\u026B': 'l',
    '\u1D85': 'l',
    '\u026D': 'l',
    '\u0142': 'l',
    '\u01C9': 'lj',
    '\u017F': 's',
    '\u1E9C': 's',
    '\u1E9B': 's',
    '\u1E9D': 's',
    '\u1E3F': 'm',
    '\u1E41': 'm',
    '\u1E43': 'm',
    '\u0271': 'm',
    '\u1D6F': 'm',
    '\u1D86': 'm',
    '\u0144': 'n',
    '\u0148': 'n',
    '\u0146': 'n',
    '\u1E4B': 'n',
    '\u0235': 'n',
    '\u1E45': 'n',
    '\u1E47': 'n',
    '\u01F9': 'n',
    '\u0272': 'n',
    '\u1E49': 'n',
    '\u019E': 'n',
    '\u1D70': 'n',
    '\u1D87': 'n',
    '\u0273': 'n',
    '\xF1': 'n',
    '\u01CC': 'nj',
    '\xF3': 'o',
    '\u014F': 'o',
    '\u01D2': 'o',
    '\xF4': 'o',
    '\u1ED1': 'o',
    '\u1ED9': 'o',
    '\u1ED3': 'o',
    '\u1ED5': 'o',
    '\u1ED7': 'o',
    '\xF6': 'o',
    '\u022B': 'o',
    '\u022F': 'o',
    '\u0231': 'o',
    '\u1ECD': 'o',
    '\u0151': 'o',
    '\u020D': 'o',
    '\xF2': 'o',
    '\u1ECF': 'o',
    '\u01A1': 'o',
    '\u1EDB': 'o',
    '\u1EE3': 'o',
    '\u1EDD': 'o',
    '\u1EDF': 'o',
    '\u1EE1': 'o',
    '\u020F': 'o',
    '\uA74B': 'o',
    '\uA74D': 'o',
    '\u2C7A': 'o',
    '\u014D': 'o',
    '\u1E53': 'o',
    '\u1E51': 'o',
    '\u01EB': 'o',
    '\u01ED': 'o',
    '\xF8': 'o',
    '\u01FF': 'o',
    '\xF5': 'o',
    '\u1E4D': 'o',
    '\u1E4F': 'o',
    '\u022D': 'o',
    '\u01A3': 'oi',
    '\uA74F': 'oo',
    '\u025B': 'e',
    '\u1D93': 'e',
    '\u0254': 'o',
    '\u1D97': 'o',
    '\u0223': 'ou',
    '\u1E55': 'p',
    '\u1E57': 'p',
    '\uA753': 'p',
    '\u01A5': 'p',
    '\u1D71': 'p',
    '\u1D88': 'p',
    '\uA755': 'p',
    '\u1D7D': 'p',
    '\uA751': 'p',
    '\uA759': 'q',
    '\u02A0': 'q',
    '\u024B': 'q',
    '\uA757': 'q',
    '\u0155': 'r',
    '\u0159': 'r',
    '\u0157': 'r',
    '\u1E59': 'r',
    '\u1E5B': 'r',
    '\u1E5D': 'r',
    '\u0211': 'r',
    '\u027E': 'r',
    '\u1D73': 'r',
    '\u0213': 'r',
    '\u1E5F': 'r',
    '\u027C': 'r',
    '\u1D72': 'r',
    '\u1D89': 'r',
    '\u024D': 'r',
    '\u027D': 'r',
    '\u2184': 'c',
    '\uA73F': 'c',
    '\u0258': 'e',
    '\u027F': 'r',
    '\u015B': 's',
    '\u1E65': 's',
    '\u0161': 's',
    '\u1E67': 's',
    '\u015F': 's',
    '\u015D': 's',
    '\u0219': 's',
    '\u1E61': 's',
    '\u1E63': 's',
    '\u1E69': 's',
    '\u0282': 's',
    '\u1D74': 's',
    '\u1D8A': 's',
    '\u023F': 's',
    '\u0261': 'g',
    '\u1D11': 'o',
    '\u1D13': 'o',
    '\u1D1D': 'u',
    '\u0165': 't',
    '\u0163': 't',
    '\u1E71': 't',
    '\u021B': 't',
    '\u0236': 't',
    '\u1E97': 't',
    '\u2C66': 't',
    '\u1E6B': 't',
    '\u1E6D': 't',
    '\u01AD': 't',
    '\u1E6F': 't',
    '\u1D75': 't',
    '\u01AB': 't',
    '\u0288': 't',
    '\u0167': 't',
    '\u1D7A': 'th',
    '\u0250': 'a',
    '\u1D02': 'ae',
    '\u01DD': 'e',
    '\u1D77': 'g',
    '\u0265': 'h',
    '\u02AE': 'h',
    '\u02AF': 'h',
    '\u1D09': 'i',
    '\u029E': 'k',
    '\uA781': 'l',
    '\u026F': 'm',
    '\u0270': 'm',
    '\u1D14': 'oe',
    '\u0279': 'r',
    '\u027B': 'r',
    '\u027A': 'r',
    '\u2C79': 'r',
    '\u0287': 't',
    '\u028C': 'v',
    '\u028D': 'w',
    '\u028E': 'y',
    '\uA729': 'tz',
    '\xFA': 'u',
    '\u016D': 'u',
    '\u01D4': 'u',
    '\xFB': 'u',
    '\u1E77': 'u',
    '\xFC': 'u',
    '\u01D8': 'u',
    '\u01DA': 'u',
    '\u01DC': 'u',
    '\u01D6': 'u',
    '\u1E73': 'u',
    '\u1EE5': 'u',
    '\u0171': 'u',
    '\u0215': 'u',
    '\xF9': 'u',
    '\u1EE7': 'u',
    '\u01B0': 'u',
    '\u1EE9': 'u',
    '\u1EF1': 'u',
    '\u1EEB': 'u',
    '\u1EED': 'u',
    '\u1EEF': 'u',
    '\u0217': 'u',
    '\u016B': 'u',
    '\u1E7B': 'u',
    '\u0173': 'u',
    '\u1D99': 'u',
    '\u016F': 'u',
    '\u0169': 'u',
    '\u1E79': 'u',
    '\u1E75': 'u',
    '\u1D6B': 'ue',
    '\uA778': 'um',
    '\u2C74': 'v',
    '\uA75F': 'v',
    '\u1E7F': 'v',
    '\u028B': 'v',
    '\u1D8C': 'v',
    '\u2C71': 'v',
    '\u1E7D': 'v',
    '\uA761': 'vy',
    '\u1E83': 'w',
    '\u0175': 'w',
    '\u1E85': 'w',
    '\u1E87': 'w',
    '\u1E89': 'w',
    '\u1E81': 'w',
    '\u2C73': 'w',
    '\u1E98': 'w',
    '\u1E8D': 'x',
    '\u1E8B': 'x',
    '\u1D8D': 'x',
    '\xFD': 'y',
    '\u0177': 'y',
    '\xFF': 'y',
    '\u1E8F': 'y',
    '\u1EF5': 'y',
    '\u1EF3': 'y',
    '\u01B4': 'y',
    '\u1EF7': 'y',
    '\u1EFF': 'y',
    '\u0233': 'y',
    '\u1E99': 'y',
    '\u024F': 'y',
    '\u1EF9': 'y',
    '\u017A': 'z',
    '\u017E': 'z',
    '\u1E91': 'z',
    '\u0291': 'z',
    '\u2C6C': 'z',
    '\u017C': 'z',
    '\u1E93': 'z',
    '\u0225': 'z',
    '\u1E95': 'z',
    '\u1D76': 'z',
    '\u1D8E': 'z',
    '\u0290': 'z',
    '\u01B6': 'z',
    '\u0240': 'z',
    '\uFB00': 'ff',
    '\uFB03': 'ffi',
    '\uFB04': 'ffl',
    '\uFB01': 'fi',
    '\uFB02': 'fl',
    '\u0133': 'ij',
    '\u0153': 'oe',
    '\uFB06': 'st',
    '\u2090': 'a',
    '\u2091': 'e',
    '\u1D62': 'i',
    '\u2C7C': 'j',
    '\u2092': 'o',
    '\u1D63': 'r',
    '\u1D64': 'u',
    '\u1D65': 'v',
    '\u2093': 'x'
  };
  /**
  * latinise
  *
  * @memberOf  String
  * @name  String#latinise
  * @method
  *
  * @return {string}
  */
  String.prototype.latinise = function () {
    return this.replace(/[^A-Za-z0-9\[\] ]/g, function (a) {
      return Latinise.latin_map[a] || a;
    });
  };
  /**
  * latinize
  *
  * @memberOf  String
  * @name  String#latinize
  * @method
  *
  * @return {string}
  */
  String.prototype.latinize = String.prototype.latinise;
  /**
  * isLatin
  *
  * @memberOf  String
  * @name  String#isLatin
  * @method
  *
  * @return {Boolean}
  */
  String.prototype.isLatin = function () {
    return this == this.latinise();
  };
  /**
  * OnlyAlphaNumSpaceAndUnderscore
  *
  * @memberOf String
  * @name  String#OnlyAlphaNumSpaceAndUnderscore
  * @method
  *
  */
  String.prototype.OnlyAlphaNumSpaceAndUnderscore = function () {
    // \s Matches a single white space character, including space, tab, form feed, line feed and other Unicode spaces.
    // \W Matches any character that is not a word character from the basic Latin alphabet. Equivalent to [^A-Za-z0-9_]
    // Preceding or trailing whitespaces are removed, and words are also latinised
    return $.trim(this).toLowerCase().replace(/[\s-]+/g, '_').latinise().replace(/[\W]/g, '');
  };
  /**
  * OnlyAlphaNumSpaceUnderscoreAndDot
  *
  * @memberOf String
  * @name  String#OnlyAlphaNumSpaceUnderscoreAndDot
  * @method
  *
  */
  String.prototype.OnlyAlphaNumSpaceUnderscoreAndDot = function () {
    // \s Matches a single white space character, including space, tab, form feed, line feed and other Unicode spaces.
    // \W Matches any character that is not a word character from the basic Latin alphabet. Equivalent to [^A-Za-z0-9_]
    // Preceding or trailing whitespaces are removed, and words are also latinised
    return $.trim(this).toLowerCase().replace(/[\s-]+/g, '_').latinise().replace(/[^a-z0-9_\.]/g, '');
  };
  if (!String.prototype.NoWhiteSpaceInWord) {
    /**
     * NoWhiteSpaceInWord
     *
     * @memberOf String
     * @name String#NoWhiteSpaceInWord
     * @method
     * @returns {string}
     */
    String.prototype.NoWhiteSpaceInWord = function () {
      return this.replace(/[\s]+/g, '');
    };
  }
  if (!String.prototype.addLeadingZero) {
    /**
     * addLeadingZero adds zeros in front of a number
     * http://stackoverflow.com/questions/6466135/adding-extra-zeros-in-front-of-a-number-using-jquery
     * ex: 5.pad(3) --> 005
     *
     * @param  {string} str
     * @param  {Number} max
     * @return {string}
     */
    String.prototype.addLeadingZero = function (max) {
      var str = this.toString();
      return str.length < max ? ('0' + str).addLeadingZero(max) : str;
    };
  }
  /**
  * Pad a number with leading zeros f.e. "5".lpad('0',2) -> 005
  * @param padString
  * @param length
  * @return {string}
  */
  String.prototype.lpad = function (padString, length) {
    var str = this;
    while (str.length < length)
      str = padString + str;
    return str;
  };
  // trimLeft/trimRight polyfill
  //https://gist.github.com/eliperelman/1036520
  if (!String.prototype.trimLeft) {
    String.prototype.trimLeft = function () {
      return this.replace(/^\s+/, '');
    };
  }
  if (!String.prototype.trimRight) {
    String.prototype.trimRight = function () {
      return this.replace(/\s+$/, '');
    };
  }
  /**
  * NUMBER EXTENSIONS
  */
  if (!Number.prototype.between) {
    /**
     * between
     *
     * @memberOf  Number
     * @name  Number#between
     * @method
     *
     * @param  {int} a
     * @param  {int} b
     * @return {Boolean}
     */
    Number.prototype.between = function (a, b) {
      var min = Math.min(a, b), max = Math.max(a, b);
      return this >= min && this <= max;
    };
  }
  /**
  * ARRAY EXTENSTIONS
  */
  if (!Array.prototype.joinOther) {
    /**
     * joinOther
     *
     * Makes a friendly joined list of strings
     * constrained to a certain maxLength
     * where the text would be:
     * Kit 1, Kit2 +3 other
     * or
     * Kit 1 +4 other (if no params were passed)
     *
     * @memberOf Array
     * @name Array#joinOther
     * @method
     *
     * @param maxLength {int} 30
     * @param sep {string} ", "
     * @param other {string} "other"
     */
    Array.prototype.joinOther = function (maxLength, sep, other) {
      // If we only have 1 item, no need to join anything
      if (this.length < 2) {
        return this.join(sep);
      }
      sep = sep || ', ';
      other = other || 'other';
      // Take the minimum length if no maxLength was passed
      if (!maxLength || maxLength < 0) {
        maxLength = 1;
      }
      // Keep popping off entries in the array
      // until there's only one left, or until
      // the joined text is shorter than maxLength
      var copy = this.slice(0);
      var joined = copy.join(sep);
      while (copy.length > 1 && joined.length > maxLength) {
        copy.pop();
        joined = copy.join(sep);
      }
      var numOther = this.length - copy.length;
      if (numOther > 0) {
        joined += ' +' + numOther + ' ' + other;
      }
      return joined;
    };
  }
  if (!Array.prototype.joinAdvanced) {
    /**
     * Special join method
     * ['a','a','a'].specialJoin(',', 'and') -> 'a, a and a'
     * http://stackoverflow.com/questions/15069587/is-there-a-way-to-join-the-elements-in-an-js-array-but-let-the-last-separator-b
     *
     * @param  {string} sep
     * @param  {string} sepLast
     */
    Array.prototype.joinAdvanced = function (sep, sepLast) {
      var arr = this.slice(0);
      var outStr = '';
      if (arr.length === 1) {
        outStr = arr[0];
      } else if (arr.length === 2) {
        //joins all with "and" but no commas
        //example: "bob and sam"
        outStr = arr.join(sepLast);
      } else if (arr.length > 2) {
        //joins all with commas, but last one gets ", and" (oxford comma!)
        //example: "bob, joe, and sam"
        outStr = arr.slice(0, -1).join(sep) + sepLast + arr.slice(-1);
      }
      return outStr;
    };
  }
  if (!Array.prototype.find) {
    /**
     * Returns a value in the array, if an element in the array
     * satisfies the provided testing function.
     * Otherwise undefined is returned.
     * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/find
     *
     * @param  {function} function to contains check to find item
     * @return {object}
     */
    Array.prototype.find = function (predicate) {
      if (this === null) {
        throw new TypeError('Array.prototype.find called on null or undefined');
      }
      if (typeof predicate !== 'function') {
        throw new TypeError('predicate must be a function');
      }
      var list = Object(this);
      var length = list.length >>> 0;
      var thisArg = arguments[1];
      var value;
      for (var i = 0; i < length; i++) {
        value = list[i];
        if (predicate.call(thisArg, value, i, list)) {
          return value;
        }
      }
      return undefined;
    };
  }
  // https://tc39.github.io/ecma262/#sec-array.prototype.includes
  if (!Array.prototype.includes) {
    Object.defineProperty(Array.prototype, 'includes', {
      value: function (searchElement, fromIndex) {
        if (this == null) {
          throw new TypeError('"this" is null or not defined');
        }
        // 1. Let O be ? ToObject(this value).
        var o = Object(this);
        // 2. Let len be ? ToLength(? Get(O, "length")).
        var len = o.length >>> 0;
        // 3. If len is 0, return false.
        if (len === 0) {
          return false;
        }
        // 4. Let n be ? ToInteger(fromIndex).
        //    (If fromIndex is undefined, this step produces the value 0.)
        var n = fromIndex | 0;
        // 5. If n ≥ 0, then
        //  a. Let k be n.
        // 6. Else n < 0,
        //  a. Let k be len + n.
        //  b. If k < 0, let k be 0.
        var k = Math.max(n >= 0 ? n : len - Math.abs(n), 0);
        function sameValueZero(x, y) {
          return x === y || typeof x === 'number' && typeof y === 'number' && isNaN(x) && isNaN(y);
        }
        // 7. Repeat, while k < len
        while (k < len) {
          // a. Let elementK be the result of ? Get(O, ! ToString(k)).
          // b. If SameValueZero(searchElement, elementK) is true, return true.
          if (sameValueZero(o[k], searchElement)) {
            return true;
          }
          // c. Increase k by 1.
          k++;
        }
        // 8. Return false
        return false;
      }
    });
  }
  if (!Object.values) {
    Object.values = function (obj) {
      var vals = [];
      for (var key in obj) {
        if (obj.hasOwnProperty(key)) {
          vals.push(obj[key]);
        }
      }
      return vals;
    };
  }
  /**
  * Draw rectangle with rounded corners on canvas
  * https://stackoverflow.com/questions/1255512/how-to-draw-a-rounded-rectangle-on-html-canvas
  */
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, width, height, radius, fill, stroke) {
    var cornerRadius = {
      upperLeft: 0,
      upperRight: 0,
      lowerLeft: 0,
      lowerRight: 0
    };
    if (typeof stroke == 'undefined') {
      stroke = true;
    }
    if (typeof radius === 'object') {
      for (var side in radius) {
        cornerRadius[side] = radius[side];
      }
    }
    this.beginPath();
    this.moveTo(x + cornerRadius.upperLeft, y);
    this.lineTo(x + width - cornerRadius.upperRight, y);
    this.quadraticCurveTo(x + width, y, x + width, y + cornerRadius.upperRight);
    this.lineTo(x + width, y + height - cornerRadius.lowerRight);
    this.quadraticCurveTo(x + width, y + height, x + width - cornerRadius.lowerRight, y + height);
    this.lineTo(x + cornerRadius.lowerLeft, y + height);
    this.quadraticCurveTo(x, y + height, x, y + height - cornerRadius.lowerLeft);
    this.lineTo(x, y + cornerRadius.upperLeft);
    this.quadraticCurveTo(x, y, x + cornerRadius.upperLeft, y);
    this.closePath();
    if (stroke) {
      this.stroke();
    }
    if (fill) {
      this.fill();
    }
  };
}();
common_clientStorage = function () {
  var setItem = localStorage.setItem, getItem = localStorage.getItem, removeItem = localStorage.removeItem;
  var _data = {};
  /**
   * Override default localStorage.setItem
   * Try to set an object for a key in local storage
   * 
   * @param {string} k
   * @param {object|string} v
   * @return {bool}
   */
  Storage.prototype.setItem = function (k, v) {
    try {
      setItem.apply(this, [
        k,
        v
      ]);
    } catch (e) {
      _data[k] = String(v);
    }
    return true;
  };
  /**
   * Override default localStorage.getItem
   * Try to get an object for a key in local storage
   * 
   * @param {string} k
   * @return {object|string|null}
   */
  Storage.prototype.getItem = function (k) {
    try {
      return getItem.apply(this, [k]);
    } catch (e) {
      return _data.hasOwnProperty(k) ? _data[k] : undefined;
    }
    return null;
  };
  /**
   * Override default localStorage.removeItem
   * Try to remove an object for a key in local storage
   * 
   * @param {string} k
   * @return {object|string|null}
   */
  Storage.prototype.removeItem = function (k) {
    try {
      removeItem.apply(this, [k]);
    } catch (e) {
      delete _data[k];
    }
    return true;
  };
}();
common_utils = function ($) {
  var utils = {};
  /**
   * Sorts a given fields dict based on a list of fieldDefs
   * @memberOf utils
   * @name utils#sortFields
   * @param {object} fields
   * @param {Array} fieldDefs
   * @param {Boolean} onlyFormFields (optional)
   * @param {int} limit (optional)
   * @return {Array} list of dicts
   */
  utils.sortFields = function (fields, fieldDefs, onlyFormFields, limit) {
    var sortedFields = [], fieldDef = null, fieldValue = null, fieldText = null;
    // Work on copy of fieldDefs array
    fieldDefs = fieldDefs.slice();
    // Return only form field definitions?
    if (onlyFormFields != null) {
      fieldDefs = fieldDefs.filter(function (def) {
        return def.form == onlyFormFields;
      });
    }
    // Create a Field dict for each field definition
    for (var i = 0; i < fieldDefs.length; i++) {
      fieldDef = fieldDefs[i];
      fieldValue = fields[fieldDef.name];
      sortedFields.push($.extend({ value: fieldValue }, fieldDef));
      if (limit != null && sortedFields.length >= limit) {
        break;
      }
    }
    return sortedFields;
  };
  /**
   * Stringifies an object while first sorting the keys
   * Ensures we can use it to check object equality
   * http://stackoverflow.com/questions/16167581/sort-object-properties-and-json-stringify
   * @memberOf  utils
   * @name  utils#stringifyOrdered
   * @method
   * @param obj
   * @return {string}
   */
  utils.stringifyOrdered = function (obj) {
    keys = [];
    if (obj) {
      for (var key in obj) {
        keys.push(key);
      }
    }
    keys.sort();
    var tObj = {};
    var key;
    for (var index in keys) {
      key = keys[index];
      tObj[key] = obj[key];
    }
    return JSON.stringify(tObj);
  };
  /**
   * Checks if two objects are equal
   * Mimics behaviour from http://underscorejs.org/#isEqual
   * @memberOf  utils
   * @name  utils#areEqual
   * @method
   * @param obj1
   * @param obj2
   * @return {boolean}
   */
  utils.areEqual = function (obj1, obj2) {
    return utils.stringifyOrdered(obj1 || {}) == utils.stringifyOrdered(obj2 || {});
  };
  /**
   * Turns an integer into a compact text to show in a badge
   * @memberOf  utils
   * @name  utils#badgeify
   * @method
   * @param  {int} count
   * @return {string}
   */
  utils.badgeify = function (count) {
    if (count > 100) {
      return '99+';
    } else if (count > 10) {
      return '10+';
    } else if (count > 0) {
      return '' + count;
    } else {
      return '';
    }
  };
  /**
   * Turns a firstName lastName into a fistname.lastname login
   * @memberOf utils
   * @name  utils#getLoginName
   * @method
   * @param  {string} firstName
   * @param  {string} lastName
   * @return {string}
   */
  utils.getLoginName = function (firstName, lastName) {
    var patt = /[\s-]*/gim;
    var parts = [];
    if (firstName) {
      parts.push(firstName.latinise().toLowerCase().replace(patt, ''));
    }
    if (lastName) {
      parts.push(lastName.latinise().toLowerCase().replace(patt, ''));
    }
    return parts.join('.');
  };
  /**
   * Gets a parameter from the querystring (returns null if not found)
   * @memberOf utils
   * @name  utils#getUrlParam
   * @method
   * @param  {string} name
   * @param  {string} default
   * @param  {string} url
   * @return {string}
   */
  utils.getUrlParam = function (name, def, url) {
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    var regexS = '[\\?&]' + name + '=([^&#]*)';
    var regex = new RegExp(regexS);
    var results = regex.exec(url || window.location.href);
    return results ? decodeURIComponent(results[1].replace(/\+/g, ' ')) : def;
  };
  // jQuery extension method
  $.urlParam = utils.getUrlParam;
  /**
   * getParsedLines
   * @memberOf utils
   * @name  utils#getParsedLines
   * @method
   * @param  {string} text
   * @return {Array}
   */
  utils.getParsedLines = function (text) {
    if (text && text.length > 0) {
      var customs = text.split(/\s*([,;\r\n]+|\s\s)\s*/);
      return customs.filter(function (cust, idx, arr) {
        return cust.length > 0 && cust.indexOf(',') < 0 && cust.indexOf(';') < 0 && $.trim(cust).length > 0 && arr.indexOf(cust) >= idx;
      }).map(function (cust) {
        // trim each line
        return $.trim(cust);
      });
    } else {
      return [];
    }
  };
  /**
   * getFriendlyFileName
   * @memberOf utils
   * @name  utils#getFriendlyFileName
   * @method
   * @param  {string} name
   * @return {string}
   */
  utils.getFriendlyFileName = function (name) {
    return name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  };
  /**
   * getFriendlyKind
   * @memberOf utils
   * @name  utils#getFriendlyKind
   * @method
   * @param {object} kind
   * @return {string}
   */
  utils.getFriendlyKind = function (kind) {
    var friendlyKind = kind;
    if (kind == 'string') {
      friendlyKind = 'single line text';
    }
    if (kind == 'text') {
      friendlyKind = 'multi line text';
    }
    if (kind == 'select') {
      friendlyKind = 'dropdown list';
    }
    if (kind == 'number') {
      friendlyKind = 'numeric';
    }
    return friendlyKind;
  };
  /**
   * arrayToCSV
   * https://www.codexworld.com/export-html-table-data-to-csv-using-javascript/
   * @param  {array} csv      
   * @param  {[type]} filename 
   */
  utils.arrayToCSV = function (csv, filename) {
    var csvFile;
    var downloadLink;
    // CSV file
    csvFile = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    // BUGFIX IE Access is denied.
    // https://stackoverflow.com/questions/36984907/access-is-denied-when-attempting-to-open-a-url-generated-for-a-procedurally-ge/36984974
    if (window.navigator && window.navigator.msSaveOrOpenBlob) {
      window.navigator.msSaveOrOpenBlob(csvFile, filename);
    } else {
      // Download link
      downloadLink = window.document.createElement('a');
      // File name
      downloadLink.download = filename;
      // Create a link to the file
      downloadLink.href = window.URL.createObjectURL(csvFile);
      // Hide download link
      downloadLink.style.display = 'none';
      // Add the link to DOM
      window.document.body.appendChild(downloadLink);
      // Click download link
      downloadLink.click();
    }
  };
  return utils;
}(jquery);
signup = function ($, api, settings, Field, dateHelper, inflection, validation, clientStorage, utils) {
  var DEFAULT_PLAN = 'cr_1802_professional_yearly_usd_500';
  var DEFAULT_PERIOD = 'yearly';
  var DEFAULT_SOURCE = 'attempt';
  var DEFAULT_KIND = 'trial';
  var DEFAULT_DEVICE_KIND = null;
  var Signup = function (opt, settings) {
    opt = opt || {};
    this.ds = opt.ds || new api.ApiAnonymous({
      urlApi: settings.urlApi,
      ajax: new api.ApiAjax()
    });
    this.firstName = opt.firstName || '';
    // between 2 and 25 chars
    this.lastName = opt.lastName || '';
    // between 2 and 25 chars
    this.company = opt.company || '';
    // between 3 and 46 chars
    this.timezone = opt.timezone || 'America/New_York';
    this.email = opt.email || '';
    this.login = opt.login || '';
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
    this.onBeforeCreateAccount = opt.onBeforeCreateAccount || function () {
      return $.Deferred().resolve();
    };
    this.onCreatedAccount = opt.onCreatedAccount || function () {
      return $.Deferred().resolve();
    };
    this.onBeforeActivateAccount = opt.onBeforeActivateAccount || function () {
      return $.Deferred().resolve();
    };
    this.onActivatedAccount = opt.onActivatedAccount || function () {
      return $.Deferred().resolve();
    };
    this.onBeforeActivateInvite = opt.onBeforeActivateInvite || function () {
      return $.Deferred().resolve();
    };
    this.onActivatedInvite = opt.onActivatedInvite || function () {
      return $.Deferred().resolve();
    };
    this.onBeforeActivateSelfService = opt.onBeforeActivateSelfService || function () {
      return $.Deferred().resolve();
    };
    this.onActivatedSelfService = opt.onActivatedSelfService || function () {
      return $.Deferred().resolve();
    };
    this.onContactFields = opt.onContactFields || function () {
      return $.Deferred().resolve();
    };
  };
  // Implementation
  // ---
  Signup.prototype.validContactInfo = function () {
    return this.firstNameIsValid() && this.lastNameIsValid() && this.companyIsValid() && this.emailIsValid();
  };
  Signup.prototype.validCredentials = function () {
    return this.loginIsValid() && this.passwordIsValid();
  };
  Signup.prototype.firstNameIsValid = function () {
    var firstName = $.trim(this.firstName);
    return firstName.length >= 2 && firstName.length <= 25;
  };
  Signup.prototype.lastNameIsValid = function () {
    var lastName = $.trim(this.lastName);
    return lastName.length >= 2 && lastName.length <= 25;
  };
  Signup.prototype.companyIsValid = function () {
    var company = $.trim(this.company);
    return company.length >= 3 && company.length <= 46;
  };
  Signup.prototype.companyExists = function () {
    var account = this.getGroupId();
    return this.ds.call('accountExists', { account: account }).then(function (resp) {
      return resp.result;
    });
  };
  Signup.prototype.emailIsValid = function (denyFreeEmail) {
    var email = $.trim(this.email);
    var isValid = validation.isValidEmail(email);
    if (isValid && denyFreeEmail == true) {
      return !validation.isFreeEmail(email);
    }
    return isValid;
  };
  Signup.prototype.emailExists = function () {
    if (this.emailIsValid()) {
      return this.ds.call('emailExists', { email: this.email }).then(function (resp) {
        return resp.result;
      });
    } else {
      return $.Deferred().resolve(false);
    }
  };
  Signup.prototype.loginIsValid = function () {
    var login = this.login.NoWhiteSpaceInWord().OnlyAlphaNumSpaceUnderscoreAndDot();
    return login.length >= 4 && login == this.login;
  };
  Signup.prototype.loginExists = function () {
    if (this.loginIsValid()) {
      return this.ds.call('loginExists', { login: this.login }).then(function (resp) {
        return resp.result;
      });
    } else {
      return $.Deferred().resolve(true);
    }
  };
  Signup.prototype.checkInvited = function () {
    return this.ds.call('checkInvited', { email: this.email }).then(function (resp) {
      return resp;
    });
  };
  Signup.prototype.passwordIsValid = function () {
    return validation.isValidPassword($.trim(this.password));
  };
  Signup.prototype.phoneIsValid = function () {
    return validation.isValidPhone($.trim(this.phone));
  };
  Signup.prototype.parseFields = function (fieldDefs) {
    if (!fieldDefs)
      return [];
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
    if ($.trim(this.inviteToken) != '') {
      return this.ds.call('checkInvite', { code: this.inviteToken }).then(function (resp) {
        that.parseFields(resp.customerFields);
        return resp.result;
      });
    } else {
      return $.Deferred().resolve(false);
    }
  };
  Signup.prototype.selfServiceIsValid = function () {
    var that = this;
    if ($.trim(this.selfserviceToken) != '') {
      return this.ds.call('checkSelfServiceKey', { key: this.selfserviceToken }).then(function (resp) {
        that.parseFields(resp.customerFields);
        return resp.result;
      });
    } else {
      return $.Deferred().resolve(false);
    }
  };
  // Business logic
  // ----
  Signup.prototype.getGroupId = function () {
    var company = $.trim(this.company);
    return company.replace(/[\.-\s]/g, '_').OnlyAlphaNumSpaceAndUnderscore();
  };
  Signup.prototype.getFullName = function () {
    var firstName = $.trim(this.firstName);
    var lastName = $.trim(this.lastName);
    return $.trim(firstName + ' ' + lastName);
  };
  Signup.prototype.setFullName = function (name) {
    var parts = Signup.splitFirstLastName($.trim(name));
    this.firstName = parts.firstName;
    this.lastName = parts.lastName;
    // Generate login name based on name
    if (this.firstName || this.lastName) {
      this.login = utils.getLoginName(this.firstName, this.lastName);
    } else {
      this.login = '';
    }
  };
  Signup.prototype._getField = function (data) {
    return new Field(data);
  };
  Signup.prototype.createAccount = function () {
    var that = this, beforeCreate = this.onBeforeCreateAccount, afterCreate = this.onCreatedAccount;
    return beforeCreate().then(function () {
      return that.ds.longCall('createAccount', {
        kind: DEFAULT_KIND,
        period: $.trim(that.period),
        subscription: $.trim(that.plan),
        company: $.trim(that.company),
        groupId: that.getGroupId(),
        signupDevice: that.deviceKind,
        tags: that.tags
      }, true).then(function (data) {
        return afterCreate(data);
      });
    });
  };
  Signup.prototype.activateAccount = function (storeInLocalStorage) {
    var that = this, beforeActivate = this.onBeforeActivateAccount, afterActivate = this.onActivatedAccount;
    return beforeActivate().then(function () {
      return that.ds.longCall('activateAccount', {
        groupId: that.getGroupId(),
        name: that.getFullName(),
        login: $.trim(that.login),
        email: $.trim(that.email),
        password: $.trim(that.password),
        timezone: $.trim(that.timezone),
        load_sample: false,
        owner_customer: true,
        maintenance_customer: true
      }, true).then(function (user) {
        if (storeInLocalStorage) {
          // Already store the login token in localStorage
          var tmpUser = new api.ApiUser({
            userId: that.login,
            userEmail: that.email,
            userToken: user.data.token
          });
          tmpUser.toStorage();
        }
        return afterActivate(user);
      });
    });
  };
  Signup.prototype.activateInvite = function (storeInLocalStorage) {
    var that = this, beforeActivate = this.onBeforeActivateInvite, afterActivate = this.onActivatedInvite;
    return beforeActivate().then(function () {
      var params = {
        name: that.getFullName(),
        code: that.inviteToken,
        login: $.trim(that.login),
        password: $.trim(that.password),
        timezone: $.trim(that.timezone)
      };
      // Add custom contact fields
      if (that.fields) {
        $.each(that.fields, function (i, field) {
          params['fields__' + field.name] = field.value;
        });
      }
      return that.ds.longCall('activateInvite', params).then(function (user) {
        if (storeInLocalStorage) {
          // Already store the login token in localStorage
          var tmpUser = new api.ApiUser({
            userId: that.login,
            userEmail: that.email,
            userToken: user.data.token
          });
          tmpUser.toStorage();
        }
        return afterActivate(user);
      });
    });
  };
  Signup.prototype.activateSelfService = function (storeInLocalStorage) {
    var that = this, beforeActivate = this.onBeforeActivateSelfService, afterActivate = this.onActivatedSelfService;
    return beforeActivate().then(function () {
      var params = {
        name: that.getFullName(),
        login: $.trim(that.login),
        password: $.trim(that.password),
        timezone: $.trim(that.timezone),
        email: $.trim(that.email),
        phone: $.trim(that.phone),
        key: that.selfserviceToken
      };
      // Add custom contact fields
      if (that.fields) {
        $.each(that.fields, function (i, field) {
          params['fields__' + field.name] = field.value;
        });
      }
      return that.ds.longCall('createSelfServiceUser', params).then(function (user) {
        if (storeInLocalStorage) {
          // Already store the login token in localStorage
          var tmpUser = new api.ApiUser({
            userId: that.login,
            userEmail: that.email,
            userToken: user.data.token
          });
          tmpUser.toStorage();
        }
        return afterActivate(user);
      });
    });
  };
  Signup.prototype.storeLead = function (tags) {
    return this.ds.call('storeLead', {
      firstName: $.trim(this.firstName),
      lastName: $.trim(this.lastName),
      email: $.trim(this.email),
      company: $.trim(this.company),
      phone: this.phone,
      tags: tags || []
    });
  };
  // Static constructor
  // ----
  Signup.splitFirstLastName = function (name) {
    var parts = name.split(' ');
    return {
      firstName: $.trim(parts.shift()),
      lastName: $.trim(parts.join(' '))
    };
  };
  /**
   * Constructor function that creates a Signup object from the params on the querystring
   * @returns {Signup}
   */
  Signup.fromQueryString = function (opt, settings) {
    var name = utils.getUrlParam('name', '').capitalize(), email = utils.getUrlParam('email', '').replace(' ', '+'), company = utils.getUrlParam('company', ''), firstName = utils.getUrlParam('firstName', '').capitalize(), lastName = utils.getUrlParam('lastName', '').capitalize(), login = utils.getUrlParam('login', '').toLowerCase(), source = utils.getUrlParam('source', DEFAULT_SOURCE), period = utils.getUrlParam('period', DEFAULT_PERIOD), plan = utils.getUrlParam('plan', DEFAULT_PLAN), timezone = utils.getUrlParam('timezone', 'America/New_York'), inviteToken = utils.getUrlParam('code', ''), selfserviceToken = utils.getUrlParam('key', ''), phone = utils.getUrlParam('phone', '').replace(' ', '+');
    if (firstName.length == 0 && lastName.length == 0 && name.length > 0) {
      var parts = Signup.splitFirstLastName(name);
      firstName = parts.firstName;
      lastName = parts.lastName;
    }
    if (login.length == 0 && firstName.length > 0 && lastName.length > 0) {
      login = utils.getLoginName(firstName, lastName);
    }
    // Don't allow signup to deprecated plans
    if ([
        'starter',
        'basic',
        'professional',
        'enterprise'
      ].indexOf(plan) != -1) {
      plan = DEFAULT_PLAN;
    }
    return new Signup($.extend({
      name: name,
      email: email,
      company: company,
      timezone: timezone,
      firstName: firstName,
      lastName: lastName,
      login: login,
      source: source,
      plan: plan,
      period: period,
      phone: phone,
      inviteToken: inviteToken,
      selfserviceToken: selfserviceToken
    }, opt), settings);
  };
  return Signup;
}(jquery, api, settings, field, dateHelper, common_inflection, common_validation, common_clientStorage, common_utils);
return signup;
}))