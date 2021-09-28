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
    this.beforeSend = spec.beforeSend || function () {
    };
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
        var responseJson = {};
        try {
          responseJson = JSON.parse(x.responseText);
        } catch (e) {
        }
        if (x.statusText && x.statusText.indexOf('Notify user:') > -1) {
          msg = responseJson.message;
        }
        if (x.status == 422) {
          msg = responseJson.message;
          opt = {
            detail: responseJson.message,
            status: responseJson.status
          };
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
      beforeSend: that.beforeSend,
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
      beforeSend: that.beforeSend,
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
    return this.userId != null && this.userId.length > 0 && (this.userToken != null && this.userToken.length > 0);
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
      _v: this.version
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
    var ajaxQueue = new $.fn.ajaxQueue(), dfdMultiple = $.Deferred(), calls = [];
    // Extend promise with abort method
    // to abort xhr request if needed
    // http://stackoverflow.com/questions/21766428/chained-jquery-promises-with-abort
    var promise = dfdMultiple.promise();
    promise.abort = function () {
      $.each(calls, function (i, xhr) {
        xhr.abort();
      });
    };
    $.each(groups, function (i, group) {
      var url = that.getBaseUrl() + group.join(',');
      var p = that.getParamsDict(fields);
      if (!$.isEmptyObject(p)) {
        url += '?' + that.getParams(p);
      }
      ajaxQueue(function () {
        var call = that._ajaxGet(cmd, url);
        call.then(function (resp) {
          // BUGFIX make sure that response is an array
          resp = $.isArray(resp) ? resp : [resp];
          returnArr = returnArr.concat(resp);
        });
        calls.push(call);
        return call;
      });
    });
    ajaxQueue(function () {
      return dfdMultiple.resolve(returnArr);
    });
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
    var p = $.extend(this.getParamsDict(fields, limit, skip, sort), params);
    if (mimeType != null && mimeType.length > 0) {
      p['mimeType'] = mimeType;
    }
    url += '?' + this.getParams(p);
    return url;
  };
  api.ApiDataSource.prototype.searchParams = function (params, fields, limit, skip, sort, mimeType) {
    var url = this.getBaseUrl() + 'search';
    var p = $.extend(this.getParamsDict(fields, limit, skip, sort), params);
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
  api.ApiDataSource.prototype.getBaseUrl = function (forceOldToken) {
    var tokenType = this.user.tokenType != null && this.user.tokenType.length > 0 ? this.user.tokenType : 'null';
    //Don't use cached version of this because when user session gets expired
    //a new token is generated
    return this.urlApi + '/' + this.user.userId + '/' + (tokenType === 'jwt' && !forceOldToken ? 'null' : this.user.userToken) + '/' + (forceOldToken ? 'null' : tokenType) + '/' + this.collection + '/';
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
    'Á': 'A',
    'Ă': 'A',
    'Ắ': 'A',
    'Ặ': 'A',
    'Ằ': 'A',
    'Ẳ': 'A',
    'Ẵ': 'A',
    'Ǎ': 'A',
    'Â': 'A',
    'Ấ': 'A',
    'Ậ': 'A',
    'Ầ': 'A',
    'Ẩ': 'A',
    'Ẫ': 'A',
    'Ä': 'A',
    'Ǟ': 'A',
    'Ȧ': 'A',
    'Ǡ': 'A',
    'Ạ': 'A',
    'Ȁ': 'A',
    'À': 'A',
    'Ả': 'A',
    'Ȃ': 'A',
    'Ā': 'A',
    'Ą': 'A',
    'Å': 'A',
    'Ǻ': 'A',
    'Ḁ': 'A',
    'Ⱥ': 'A',
    'Ã': 'A',
    'Ꜳ': 'AA',
    'Æ': 'AE',
    'Ǽ': 'AE',
    'Ǣ': 'AE',
    'Ꜵ': 'AO',
    'Ꜷ': 'AU',
    'Ꜹ': 'AV',
    'Ꜻ': 'AV',
    'Ꜽ': 'AY',
    'Ḃ': 'B',
    'Ḅ': 'B',
    'Ɓ': 'B',
    'Ḇ': 'B',
    'Ƀ': 'B',
    'Ƃ': 'B',
    'Ć': 'C',
    'Č': 'C',
    'Ç': 'C',
    'Ḉ': 'C',
    'Ĉ': 'C',
    'Ċ': 'C',
    'Ƈ': 'C',
    'Ȼ': 'C',
    'Ď': 'D',
    'Ḑ': 'D',
    'Ḓ': 'D',
    'Ḋ': 'D',
    'Ḍ': 'D',
    'Ɗ': 'D',
    'Ḏ': 'D',
    'ǲ': 'D',
    'ǅ': 'D',
    'Đ': 'D',
    'Ƌ': 'D',
    'Ǳ': 'DZ',
    'Ǆ': 'DZ',
    'É': 'E',
    'Ĕ': 'E',
    'Ě': 'E',
    'Ȩ': 'E',
    'Ḝ': 'E',
    'Ê': 'E',
    'Ế': 'E',
    'Ệ': 'E',
    'Ề': 'E',
    'Ể': 'E',
    'Ễ': 'E',
    'Ḙ': 'E',
    'Ë': 'E',
    'Ė': 'E',
    'Ẹ': 'E',
    'Ȅ': 'E',
    'È': 'E',
    'Ẻ': 'E',
    'Ȇ': 'E',
    'Ē': 'E',
    'Ḗ': 'E',
    'Ḕ': 'E',
    'Ę': 'E',
    'Ɇ': 'E',
    'Ẽ': 'E',
    'Ḛ': 'E',
    'Ꝫ': 'ET',
    'Ḟ': 'F',
    'Ƒ': 'F',
    'Ǵ': 'G',
    'Ğ': 'G',
    'Ǧ': 'G',
    'Ģ': 'G',
    'Ĝ': 'G',
    'Ġ': 'G',
    'Ɠ': 'G',
    'Ḡ': 'G',
    'Ǥ': 'G',
    'Ḫ': 'H',
    'Ȟ': 'H',
    'Ḩ': 'H',
    'Ĥ': 'H',
    'Ⱨ': 'H',
    'Ḧ': 'H',
    'Ḣ': 'H',
    'Ḥ': 'H',
    'Ħ': 'H',
    'Í': 'I',
    'Ĭ': 'I',
    'Ǐ': 'I',
    'Î': 'I',
    'Ï': 'I',
    'Ḯ': 'I',
    'İ': 'I',
    'Ị': 'I',
    'Ȉ': 'I',
    'Ì': 'I',
    'Ỉ': 'I',
    'Ȋ': 'I',
    'Ī': 'I',
    'Į': 'I',
    'Ɨ': 'I',
    'Ĩ': 'I',
    'Ḭ': 'I',
    'Ꝺ': 'D',
    'Ꝼ': 'F',
    'Ᵹ': 'G',
    'Ꞃ': 'R',
    'Ꞅ': 'S',
    'Ꞇ': 'T',
    'Ꝭ': 'IS',
    'Ĵ': 'J',
    'Ɉ': 'J',
    'Ḱ': 'K',
    'Ǩ': 'K',
    'Ķ': 'K',
    'Ⱪ': 'K',
    'Ꝃ': 'K',
    'Ḳ': 'K',
    'Ƙ': 'K',
    'Ḵ': 'K',
    'Ꝁ': 'K',
    'Ꝅ': 'K',
    'Ĺ': 'L',
    'Ƚ': 'L',
    'Ľ': 'L',
    'Ļ': 'L',
    'Ḽ': 'L',
    'Ḷ': 'L',
    'Ḹ': 'L',
    'Ⱡ': 'L',
    'Ꝉ': 'L',
    'Ḻ': 'L',
    'Ŀ': 'L',
    'Ɫ': 'L',
    'ǈ': 'L',
    'Ł': 'L',
    'Ǉ': 'LJ',
    'Ḿ': 'M',
    'Ṁ': 'M',
    'Ṃ': 'M',
    'Ɱ': 'M',
    'Ń': 'N',
    'Ň': 'N',
    'Ņ': 'N',
    'Ṋ': 'N',
    'Ṅ': 'N',
    'Ṇ': 'N',
    'Ǹ': 'N',
    'Ɲ': 'N',
    'Ṉ': 'N',
    'Ƞ': 'N',
    'ǋ': 'N',
    'Ñ': 'N',
    'Ǌ': 'NJ',
    'Ó': 'O',
    'Ŏ': 'O',
    'Ǒ': 'O',
    'Ô': 'O',
    'Ố': 'O',
    'Ộ': 'O',
    'Ồ': 'O',
    'Ổ': 'O',
    'Ỗ': 'O',
    'Ö': 'O',
    'Ȫ': 'O',
    'Ȯ': 'O',
    'Ȱ': 'O',
    'Ọ': 'O',
    'Ő': 'O',
    'Ȍ': 'O',
    'Ò': 'O',
    'Ỏ': 'O',
    'Ơ': 'O',
    'Ớ': 'O',
    'Ợ': 'O',
    'Ờ': 'O',
    'Ở': 'O',
    'Ỡ': 'O',
    'Ȏ': 'O',
    'Ꝋ': 'O',
    'Ꝍ': 'O',
    'Ō': 'O',
    'Ṓ': 'O',
    'Ṑ': 'O',
    'Ɵ': 'O',
    'Ǫ': 'O',
    'Ǭ': 'O',
    'Ø': 'O',
    'Ǿ': 'O',
    'Õ': 'O',
    'Ṍ': 'O',
    'Ṏ': 'O',
    'Ȭ': 'O',
    'Ƣ': 'OI',
    'Ꝏ': 'OO',
    'Ɛ': 'E',
    'Ɔ': 'O',
    'Ȣ': 'OU',
    'Ṕ': 'P',
    'Ṗ': 'P',
    'Ꝓ': 'P',
    'Ƥ': 'P',
    'Ꝕ': 'P',
    'Ᵽ': 'P',
    'Ꝑ': 'P',
    'Ꝙ': 'Q',
    'Ꝗ': 'Q',
    'Ŕ': 'R',
    'Ř': 'R',
    'Ŗ': 'R',
    'Ṙ': 'R',
    'Ṛ': 'R',
    'Ṝ': 'R',
    'Ȑ': 'R',
    'Ȓ': 'R',
    'Ṟ': 'R',
    'Ɍ': 'R',
    'Ɽ': 'R',
    'Ꜿ': 'C',
    'Ǝ': 'E',
    'Ś': 'S',
    'Ṥ': 'S',
    'Š': 'S',
    'Ṧ': 'S',
    'Ş': 'S',
    'Ŝ': 'S',
    'Ș': 'S',
    'Ṡ': 'S',
    'Ṣ': 'S',
    'Ṩ': 'S',
    'Ť': 'T',
    'Ţ': 'T',
    'Ṱ': 'T',
    'Ț': 'T',
    'Ⱦ': 'T',
    'Ṫ': 'T',
    'Ṭ': 'T',
    'Ƭ': 'T',
    'Ṯ': 'T',
    'Ʈ': 'T',
    'Ŧ': 'T',
    'Ɐ': 'A',
    'Ꞁ': 'L',
    'Ɯ': 'M',
    'Ʌ': 'V',
    'Ꜩ': 'TZ',
    'Ú': 'U',
    'Ŭ': 'U',
    'Ǔ': 'U',
    'Û': 'U',
    'Ṷ': 'U',
    'Ü': 'U',
    'Ǘ': 'U',
    'Ǚ': 'U',
    'Ǜ': 'U',
    'Ǖ': 'U',
    'Ṳ': 'U',
    'Ụ': 'U',
    'Ű': 'U',
    'Ȕ': 'U',
    'Ù': 'U',
    'Ủ': 'U',
    'Ư': 'U',
    'Ứ': 'U',
    'Ự': 'U',
    'Ừ': 'U',
    'Ử': 'U',
    'Ữ': 'U',
    'Ȗ': 'U',
    'Ū': 'U',
    'Ṻ': 'U',
    'Ų': 'U',
    'Ů': 'U',
    'Ũ': 'U',
    'Ṹ': 'U',
    'Ṵ': 'U',
    'Ꝟ': 'V',
    'Ṿ': 'V',
    'Ʋ': 'V',
    'Ṽ': 'V',
    'Ꝡ': 'VY',
    'Ẃ': 'W',
    'Ŵ': 'W',
    'Ẅ': 'W',
    'Ẇ': 'W',
    'Ẉ': 'W',
    'Ẁ': 'W',
    'Ⱳ': 'W',
    'Ẍ': 'X',
    'Ẋ': 'X',
    'Ý': 'Y',
    'Ŷ': 'Y',
    'Ÿ': 'Y',
    'Ẏ': 'Y',
    'Ỵ': 'Y',
    'Ỳ': 'Y',
    'Ƴ': 'Y',
    'Ỷ': 'Y',
    'Ỿ': 'Y',
    'Ȳ': 'Y',
    'Ɏ': 'Y',
    'Ỹ': 'Y',
    'Ź': 'Z',
    'Ž': 'Z',
    'Ẑ': 'Z',
    'Ⱬ': 'Z',
    'Ż': 'Z',
    'Ẓ': 'Z',
    'Ȥ': 'Z',
    'Ẕ': 'Z',
    'Ƶ': 'Z',
    'Ĳ': 'IJ',
    'Œ': 'OE',
    'ᴀ': 'A',
    'ᴁ': 'AE',
    'ʙ': 'B',
    'ᴃ': 'B',
    'ᴄ': 'C',
    'ᴅ': 'D',
    'ᴇ': 'E',
    'ꜰ': 'F',
    'ɢ': 'G',
    'ʛ': 'G',
    'ʜ': 'H',
    'ɪ': 'I',
    'ʁ': 'R',
    'ᴊ': 'J',
    'ᴋ': 'K',
    'ʟ': 'L',
    'ᴌ': 'L',
    'ᴍ': 'M',
    'ɴ': 'N',
    'ᴏ': 'O',
    'ɶ': 'OE',
    'ᴐ': 'O',
    'ᴕ': 'OU',
    'ᴘ': 'P',
    'ʀ': 'R',
    'ᴎ': 'N',
    'ᴙ': 'R',
    'ꜱ': 'S',
    'ᴛ': 'T',
    'ⱻ': 'E',
    'ᴚ': 'R',
    'ᴜ': 'U',
    'ᴠ': 'V',
    'ᴡ': 'W',
    'ʏ': 'Y',
    'ᴢ': 'Z',
    'á': 'a',
    'ă': 'a',
    'ắ': 'a',
    'ặ': 'a',
    'ằ': 'a',
    'ẳ': 'a',
    'ẵ': 'a',
    'ǎ': 'a',
    'â': 'a',
    'ấ': 'a',
    'ậ': 'a',
    'ầ': 'a',
    'ẩ': 'a',
    'ẫ': 'a',
    'ä': 'a',
    'ǟ': 'a',
    'ȧ': 'a',
    'ǡ': 'a',
    'ạ': 'a',
    'ȁ': 'a',
    'à': 'a',
    'ả': 'a',
    'ȃ': 'a',
    'ā': 'a',
    'ą': 'a',
    'ᶏ': 'a',
    'ẚ': 'a',
    'å': 'a',
    'ǻ': 'a',
    'ḁ': 'a',
    'ⱥ': 'a',
    'ã': 'a',
    'ꜳ': 'aa',
    'æ': 'ae',
    'ǽ': 'ae',
    'ǣ': 'ae',
    'ꜵ': 'ao',
    'ꜷ': 'au',
    'ꜹ': 'av',
    'ꜻ': 'av',
    'ꜽ': 'ay',
    'ḃ': 'b',
    'ḅ': 'b',
    'ɓ': 'b',
    'ḇ': 'b',
    'ᵬ': 'b',
    'ᶀ': 'b',
    'ƀ': 'b',
    'ƃ': 'b',
    'ɵ': 'o',
    'ć': 'c',
    'č': 'c',
    'ç': 'c',
    'ḉ': 'c',
    'ĉ': 'c',
    'ɕ': 'c',
    'ċ': 'c',
    'ƈ': 'c',
    'ȼ': 'c',
    'ď': 'd',
    'ḑ': 'd',
    'ḓ': 'd',
    'ȡ': 'd',
    'ḋ': 'd',
    'ḍ': 'd',
    'ɗ': 'd',
    'ᶑ': 'd',
    'ḏ': 'd',
    'ᵭ': 'd',
    'ᶁ': 'd',
    'đ': 'd',
    'ɖ': 'd',
    'ƌ': 'd',
    'ı': 'i',
    'ȷ': 'j',
    'ɟ': 'j',
    'ʄ': 'j',
    'ǳ': 'dz',
    'ǆ': 'dz',
    'é': 'e',
    'ĕ': 'e',
    'ě': 'e',
    'ȩ': 'e',
    'ḝ': 'e',
    'ê': 'e',
    'ế': 'e',
    'ệ': 'e',
    'ề': 'e',
    'ể': 'e',
    'ễ': 'e',
    'ḙ': 'e',
    'ë': 'e',
    'ė': 'e',
    'ẹ': 'e',
    'ȅ': 'e',
    'è': 'e',
    'ẻ': 'e',
    'ȇ': 'e',
    'ē': 'e',
    'ḗ': 'e',
    'ḕ': 'e',
    'ⱸ': 'e',
    'ę': 'e',
    'ᶒ': 'e',
    'ɇ': 'e',
    'ẽ': 'e',
    'ḛ': 'e',
    'ꝫ': 'et',
    'ḟ': 'f',
    'ƒ': 'f',
    'ᵮ': 'f',
    'ᶂ': 'f',
    'ǵ': 'g',
    'ğ': 'g',
    'ǧ': 'g',
    'ģ': 'g',
    'ĝ': 'g',
    'ġ': 'g',
    'ɠ': 'g',
    'ḡ': 'g',
    'ᶃ': 'g',
    'ǥ': 'g',
    'ḫ': 'h',
    'ȟ': 'h',
    'ḩ': 'h',
    'ĥ': 'h',
    'ⱨ': 'h',
    'ḧ': 'h',
    'ḣ': 'h',
    'ḥ': 'h',
    'ɦ': 'h',
    'ẖ': 'h',
    'ħ': 'h',
    'ƕ': 'hv',
    'í': 'i',
    'ĭ': 'i',
    'ǐ': 'i',
    'î': 'i',
    'ï': 'i',
    'ḯ': 'i',
    'ị': 'i',
    'ȉ': 'i',
    'ì': 'i',
    'ỉ': 'i',
    'ȋ': 'i',
    'ī': 'i',
    'į': 'i',
    'ᶖ': 'i',
    'ɨ': 'i',
    'ĩ': 'i',
    'ḭ': 'i',
    'ꝺ': 'd',
    'ꝼ': 'f',
    'ᵹ': 'g',
    'ꞃ': 'r',
    'ꞅ': 's',
    'ꞇ': 't',
    'ꝭ': 'is',
    'ǰ': 'j',
    'ĵ': 'j',
    'ʝ': 'j',
    'ɉ': 'j',
    'ḱ': 'k',
    'ǩ': 'k',
    'ķ': 'k',
    'ⱪ': 'k',
    'ꝃ': 'k',
    'ḳ': 'k',
    'ƙ': 'k',
    'ḵ': 'k',
    'ᶄ': 'k',
    'ꝁ': 'k',
    'ꝅ': 'k',
    'ĺ': 'l',
    'ƚ': 'l',
    'ɬ': 'l',
    'ľ': 'l',
    'ļ': 'l',
    'ḽ': 'l',
    'ȴ': 'l',
    'ḷ': 'l',
    'ḹ': 'l',
    'ⱡ': 'l',
    'ꝉ': 'l',
    'ḻ': 'l',
    'ŀ': 'l',
    'ɫ': 'l',
    'ᶅ': 'l',
    'ɭ': 'l',
    'ł': 'l',
    'ǉ': 'lj',
    'ſ': 's',
    'ẜ': 's',
    'ẛ': 's',
    'ẝ': 's',
    'ḿ': 'm',
    'ṁ': 'm',
    'ṃ': 'm',
    'ɱ': 'm',
    'ᵯ': 'm',
    'ᶆ': 'm',
    'ń': 'n',
    'ň': 'n',
    'ņ': 'n',
    'ṋ': 'n',
    'ȵ': 'n',
    'ṅ': 'n',
    'ṇ': 'n',
    'ǹ': 'n',
    'ɲ': 'n',
    'ṉ': 'n',
    'ƞ': 'n',
    'ᵰ': 'n',
    'ᶇ': 'n',
    'ɳ': 'n',
    'ñ': 'n',
    'ǌ': 'nj',
    'ó': 'o',
    'ŏ': 'o',
    'ǒ': 'o',
    'ô': 'o',
    'ố': 'o',
    'ộ': 'o',
    'ồ': 'o',
    'ổ': 'o',
    'ỗ': 'o',
    'ö': 'o',
    'ȫ': 'o',
    'ȯ': 'o',
    'ȱ': 'o',
    'ọ': 'o',
    'ő': 'o',
    'ȍ': 'o',
    'ò': 'o',
    'ỏ': 'o',
    'ơ': 'o',
    'ớ': 'o',
    'ợ': 'o',
    'ờ': 'o',
    'ở': 'o',
    'ỡ': 'o',
    'ȏ': 'o',
    'ꝋ': 'o',
    'ꝍ': 'o',
    'ⱺ': 'o',
    'ō': 'o',
    'ṓ': 'o',
    'ṑ': 'o',
    'ǫ': 'o',
    'ǭ': 'o',
    'ø': 'o',
    'ǿ': 'o',
    'õ': 'o',
    'ṍ': 'o',
    'ṏ': 'o',
    'ȭ': 'o',
    'ƣ': 'oi',
    'ꝏ': 'oo',
    'ɛ': 'e',
    'ᶓ': 'e',
    'ɔ': 'o',
    'ᶗ': 'o',
    'ȣ': 'ou',
    'ṕ': 'p',
    'ṗ': 'p',
    'ꝓ': 'p',
    'ƥ': 'p',
    'ᵱ': 'p',
    'ᶈ': 'p',
    'ꝕ': 'p',
    'ᵽ': 'p',
    'ꝑ': 'p',
    'ꝙ': 'q',
    'ʠ': 'q',
    'ɋ': 'q',
    'ꝗ': 'q',
    'ŕ': 'r',
    'ř': 'r',
    'ŗ': 'r',
    'ṙ': 'r',
    'ṛ': 'r',
    'ṝ': 'r',
    'ȑ': 'r',
    'ɾ': 'r',
    'ᵳ': 'r',
    'ȓ': 'r',
    'ṟ': 'r',
    'ɼ': 'r',
    'ᵲ': 'r',
    'ᶉ': 'r',
    'ɍ': 'r',
    'ɽ': 'r',
    'ↄ': 'c',
    'ꜿ': 'c',
    'ɘ': 'e',
    'ɿ': 'r',
    'ś': 's',
    'ṥ': 's',
    'š': 's',
    'ṧ': 's',
    'ş': 's',
    'ŝ': 's',
    'ș': 's',
    'ṡ': 's',
    'ṣ': 's',
    'ṩ': 's',
    'ʂ': 's',
    'ᵴ': 's',
    'ᶊ': 's',
    'ȿ': 's',
    'ɡ': 'g',
    'ᴑ': 'o',
    'ᴓ': 'o',
    'ᴝ': 'u',
    'ť': 't',
    'ţ': 't',
    'ṱ': 't',
    'ț': 't',
    'ȶ': 't',
    'ẗ': 't',
    'ⱦ': 't',
    'ṫ': 't',
    'ṭ': 't',
    'ƭ': 't',
    'ṯ': 't',
    'ᵵ': 't',
    'ƫ': 't',
    'ʈ': 't',
    'ŧ': 't',
    'ᵺ': 'th',
    'ɐ': 'a',
    'ᴂ': 'ae',
    'ǝ': 'e',
    'ᵷ': 'g',
    'ɥ': 'h',
    'ʮ': 'h',
    'ʯ': 'h',
    'ᴉ': 'i',
    'ʞ': 'k',
    'ꞁ': 'l',
    'ɯ': 'm',
    'ɰ': 'm',
    'ᴔ': 'oe',
    'ɹ': 'r',
    'ɻ': 'r',
    'ɺ': 'r',
    'ⱹ': 'r',
    'ʇ': 't',
    'ʌ': 'v',
    'ʍ': 'w',
    'ʎ': 'y',
    'ꜩ': 'tz',
    'ú': 'u',
    'ŭ': 'u',
    'ǔ': 'u',
    'û': 'u',
    'ṷ': 'u',
    'ü': 'u',
    'ǘ': 'u',
    'ǚ': 'u',
    'ǜ': 'u',
    'ǖ': 'u',
    'ṳ': 'u',
    'ụ': 'u',
    'ű': 'u',
    'ȕ': 'u',
    'ù': 'u',
    'ủ': 'u',
    'ư': 'u',
    'ứ': 'u',
    'ự': 'u',
    'ừ': 'u',
    'ử': 'u',
    'ữ': 'u',
    'ȗ': 'u',
    'ū': 'u',
    'ṻ': 'u',
    'ų': 'u',
    'ᶙ': 'u',
    'ů': 'u',
    'ũ': 'u',
    'ṹ': 'u',
    'ṵ': 'u',
    'ᵫ': 'ue',
    'ꝸ': 'um',
    'ⱴ': 'v',
    'ꝟ': 'v',
    'ṿ': 'v',
    'ʋ': 'v',
    'ᶌ': 'v',
    'ⱱ': 'v',
    'ṽ': 'v',
    'ꝡ': 'vy',
    'ẃ': 'w',
    'ŵ': 'w',
    'ẅ': 'w',
    'ẇ': 'w',
    'ẉ': 'w',
    'ẁ': 'w',
    'ⱳ': 'w',
    'ẘ': 'w',
    'ẍ': 'x',
    'ẋ': 'x',
    'ᶍ': 'x',
    'ý': 'y',
    'ŷ': 'y',
    'ÿ': 'y',
    'ẏ': 'y',
    'ỵ': 'y',
    'ỳ': 'y',
    'ƴ': 'y',
    'ỷ': 'y',
    'ỿ': 'y',
    'ȳ': 'y',
    'ẙ': 'y',
    'ɏ': 'y',
    'ỹ': 'y',
    'ź': 'z',
    'ž': 'z',
    'ẑ': 'z',
    'ʑ': 'z',
    'ⱬ': 'z',
    'ż': 'z',
    'ẓ': 'z',
    'ȥ': 'z',
    'ẕ': 'z',
    'ᵶ': 'z',
    'ᶎ': 'z',
    'ʐ': 'z',
    'ƶ': 'z',
    'ɀ': 'z',
    'ﬀ': 'ff',
    'ﬃ': 'ffi',
    'ﬄ': 'ffl',
    'ﬁ': 'fi',
    'ﬂ': 'fl',
    'ĳ': 'ij',
    'œ': 'oe',
    'ﬆ': 'st',
    'ₐ': 'a',
    'ₑ': 'e',
    'ᵢ': 'i',
    'ⱼ': 'j',
    'ₒ': 'o',
    'ᵣ': 'r',
    'ᵤ': 'u',
    'ᵥ': 'v',
    'ₓ': 'x'
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
  /**
   * kFormatter
   * @param  {number} num
   * @return string   
   */
  utils.kFormatter = function (num) {
    return Math.abs(num) > 999 ? Math.sign(num) * (Math.abs(num) / 1000).toFixed(0) + 'k' : Math.sign(num) * Math.abs(num);
  };
  /**
   * sanitizeHtml
   * https://remarkablemark.org/blog/2019/11/29/javascript-sanitize-html/
   * 
   * @param  {string} html
   * @return string      
   */
  utils.sanitizeHtml = function (html) {
    return $('<div />').text(html).html();
  };
  /**
   * removeHtmlTags
   * @param  {string} html 
   * @return {string}      
   */
  utils.removeHtmlTags = function (html) {
    var regX = /(<([^>]+)>)/gi;
    return html.replace(regX, '');
  };
  return utils;
}(jquery);
signup = function ($, api, settings, Field, dateHelper, inflection, validation, clientStorage, utils) {
  var DEFAULT_PLAN = 'cr_2004_plus_yearly_usd_500';
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
    return this.passwordIsValid();
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
    if (this.dfdAccountExists)
      this.dfdAccountExists.abort();
    this.dfdAccountExists = this.ds.call('accountExists', { account: account });
    return this.dfdAccountExists.then(function (resp) {
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
      if (this.dfdEmailExists)
        this.dfdEmailExists.abort();
      this.dfdEmailExists = this.ds.call('emailExists', { email: this.email });
      return this.dfdEmailExists.then(function (resp) {
        return resp.result;
      });
    } else {
      return $.Deferred().resolve(false);
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
      return this.ds.call('checkInvite', {
        code: this.inviteToken,
        email: this.email
      }).then(function (resp) {
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
        email: $.trim(that.email),
        password: $.trim(that.password),
        timezone: $.trim(that.timezone),
        load_sample: false,
        owner_customer: true,
        maintenance_customer: true
      }, true).then(function (resp) {
        if (storeInLocalStorage) {
          Signup.storeLoginToken(resp.data);
        }
        return afterActivate(resp);
      });
    });
  };
  Signup.storeLoginToken = function (data) {
    // Already store the login token in localStorage
    var tmpUser = new api.ApiUser({
      userId: data.userId,
      userEmail: data.email,
      userToken: data.token
    });
    tmpUser.toStorage();
  };
  Signup.prototype.activateInvite = function (storeInLocalStorage) {
    var that = this, beforeActivate = this.onBeforeActivateInvite, afterActivate = this.onActivatedInvite;
    return beforeActivate().then(function () {
      var params = {
        name: that.getFullName(),
        email: $.trim(that.email),
        code: that.inviteToken,
        password: $.trim(that.password),
        timezone: $.trim(that.timezone)
      };
      // Add custom contact fields
      if (that.fields) {
        $.each(that.fields, function (i, field) {
          params['fields__' + field.name] = field.value;
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
    var that = this, beforeActivate = this.onBeforeActivateSelfService, afterActivate = this.onActivatedSelfService;
    return beforeActivate().then(function () {
      var params = {
        name: that.getFullName(),
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
    var name = utils.getUrlParam('name', '').capitalize(), email = utils.getUrlParam('email', '').replace(' ', '+'), company = utils.getUrlParam('company', ''), firstName = utils.getUrlParam('firstName', '').capitalize(), lastName = utils.getUrlParam('lastName', '').capitalize(), source = utils.getUrlParam('source', DEFAULT_SOURCE), period = utils.getUrlParam('period', DEFAULT_PERIOD), plan = utils.getUrlParam('plan', DEFAULT_PLAN), timezone = utils.getUrlParam('timezone', 'America/New_York'), inviteToken = utils.getUrlParam('code', ''), selfserviceToken = utils.getUrlParam('key', ''), phone = utils.getUrlParam('phone', '').replace(' ', '+');
    if (firstName.length == 0 && lastName.length == 0 && name.length > 0) {
      var parts = Signup.splitFirstLastName(name);
      firstName = parts.firstName;
      lastName = parts.lastName;
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