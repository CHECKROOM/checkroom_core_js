(function (factory) {
if (typeof define === 'function' && define.amd) {
define(['jquery', 'moment'], factory);
} else {
factory($, moment);
}
}(function (jquery, moment) {//Queued AJAX requests
//https://stackoverflow.com/questions/3034874/sequencing-ajax-requests/3035268#3035268
//http://jsfiddle.net/p4zjH/1/
var common_queue, api, settings, common_code, common_order, common_reservation, common_item, common_conflicts, common_keyValues, common_image, common_attachment, common_inflection, common_validation, common_utils, common_slimdown, common_kit, common_contact, common_user, common_template, common_clientStorage, common_document, common_transaction, common_pubsub, common, field, dateHelper, signup;
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
  $.ajaxSetup({ cache: false });
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
    this.userToken = spec.userToken || '';
    this.tokenType = spec.tokenType || '';
  };
  api.ApiUser.prototype.fromStorage = function () {
    this.userId = window.localStorage.getItem('userId') || '';
    this.userToken = window.localStorage.getItem('userToken') || '';
    this.tokenType = window.localStorage.getItem('tokenType') || '';
  };
  api.ApiUser.prototype.toStorage = function () {
    window.localStorage.setItem('userId', this.userId);
    window.localStorage.setItem('userToken', this.userToken);
    window.localStorage.setItem('tokenType', this.tokenType);
  };
  api.ApiUser.prototype.removeFromStorage = function () {
    window.localStorage.removeItem('userId');
    window.localStorage.removeItem('userToken');
    window.localStorage.removeItem('tokenType');
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
        dfd.resolve(resp.data);
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
common_code = {
  /**
     * isCodeValid
     *
     * @memberOf common
     * @name  common#isCodeValid
     * @method
     * 
  * @param  codeId
  * @return {Boolean}       
  */
  isCodeValid: function (codeId) {
    // Checks if a code is syntactically valid
    // This does not mean that it is an official code issued by CHEQROOM
    return codeId.trim().match(/^[a-z0-9]{8}$/i) != null;
  },
  /**
   * isCodeFromScanner
   *
   * @memberOf common
   * @name  common#isCodeFromScanner
   * @method
   * 
   * @param  urlPart
   * @return {Boolean}        
   */
  isCodeFromScanner: function (urlPart) {
    // If no urlPart is given or is empty, return false
    if (!urlPart || urlPart.length == 0)
      return false;
    var prefix = urlPart.substring(0, 23);
    var index = 'http://cheqroom.com/qr/'.indexOf(prefix);
    return index == 0;
  },
  /**
   * isBarcodeValid
   * 		 
   * @memberOf common
   * @name  common#isValidBarcode
   * @method
   * 
   * @param  {string}  barCode 
   * @return {Boolean}         
   */
  isValidBarcode: function (barCode) {
    return barCode && barCode.match(/^([A-Z0-9\s\-]{3,22})$/i) != null;
  },
  /**
   * isValidQRCode
   * 
   * @memberOf common
   * @name  common#isValidQRCode
   * @method
   * 
   * @param  {string}  qrCode 
   * @return {Boolean}  
   */
  isValidQRCode: function (qrCode) {
    return this.isValidItemQRCode(qrCode) || this.isValidTransferQRCode(qrCode);
  },
  /**
   * isValidTransferQRCode
   * For example: http://cheqroom.com/ordertransfer/tTfZXW6eTianQU3UQVELdn
   * 
   * @memberOf common
   * @name  common#isValidTransferQRCode
   * @method
   * 
   * @param  {string}  qrCode 
   * @return {Boolean} 
   */
  isValidTransferQRCode: function (qrCode) {
    return qrCode.match(/^http:\/\/cheqroom\.com\/ordertransfer\/[a-zA-Z0-9]{22}$/i) != null;
  },
  /**
   * isValidDocQRCode 
   * For example: http://cheqroom.com/qr/eeaa37ed
   * 
   * @memberOf common
   * @name  common#isValidDocQRCode
   * @method
   * 
   * @param  {string}  qrCode 
   * @return {Boolean} 
   */
  isValidDocQRCode: function (qrCode) {
    return qrCode && (qrCode.match(/^http:\/\/cheqroom\.com\/qr\/[a-z0-9]{8}$/i) != null || qrCode.match(/^[a-z0-9]{8}$/i) != null);
  },
  /**
   * isValidItemQRCode 
   * 
   * @memberOf common
   * @name  common#isValidItemQRCode
   * @method
   * 
   * @param  {string}  qrCode 
   * @return {Boolean} 
   */
  isValidItemQRCode: function (qrCode) {
    return this.isValidDocQRCode(qrCode);
  },
  /**
   * isValidKitQRCode 
   * 
   * @memberOf common
   * @name  common#isValidKitQRCode
   * @method
   * 
   * @param  {string}  qrCode 
   * @return {Boolean} 
   */
  isValidKitQRCode: function (qrCode) {
    return this.isValidDocQRCode(qrCode);
  },
  /**
   * getCheqRoomRedirectUrl
   *
   * @memberOf  common
   * @name  common#getCheqRoomRedirectUrl
   * @method
   * 
   * @param  codeId 
   * @return {string}       
   */
  getCheqRoomRedirectUrl: function (codeId) {
    return this.isCodeValid(codeId) ? 'http://cheqroom.com/qr/' + codeId.trim() : '';
  },
  /**
   * getCheqRoomRedirectUrlQR 
   *
   * @memberOf  common
   * @name  common#getCheqRoomRedirectUrlQR
   * @method
   * 
   * @param  codeId 
   * @param  size   
   * @return {string}      
   */
  getCheqRoomRedirectUrlQR: function (codeId, size) {
    if (this.isCodeValid(codeId)) {
      //https://chart.googleapis.com/chart?chs=200x200&cht=qr&choe=UTF-8&chld=L|0&chl=http://cheqroom.com/qr/c4ab3a6a
      var url = encodeURI(this.getCheqRoomRedirectUrl(codeId));
      return 'https://chart.googleapis.com/chart?chs=' + size + 'x' + size + '&cht=qr&choe=UTF-8&chld=L|0&chl=' + url;
    } else {
      return '';
    }
  },
  /**
   * getQRCodeUrl 
   *
   * @memberOf  common
   * @name  common#getCheqRoomRedirectUrlQR
   * @method
   *
   * @param  {string} urlApi 
   * @param  {string} code 
   * @param  {number} size 
   * @return {string}      
   */
  getQRCodeUrl: function (urlApi, code, size) {
    return urlApi + '/qrcode?code=' + code + '&size=' + size;
  },
  /**
   * getBarcodeUrl 
   *
   * @memberOf  common
   * @name  common#getCheqRoomRedirectUrlQR
   * @method
   *
   * @param  {string} urlApi 
   * @param  {string} code 
   * @param  {number} size 
   * @return {string}      
   */
  getBarcodeUrl: function (urlApi, code, width, height) {
    return urlApi + '/barcode?code=' + code + '&width=' + width + (height ? '&height=' + height : '');
  }
};
common_order = function (moment) {
  return {
    /**
     * getFriendlyOrderStatus
     *
     * @memberOf common
     * @name  common#getFriendlyOrderStatus
     * @method
     * 
     * @param  {string} status
     * @return {string}        
     */
    getFriendlyOrderStatus: function (status) {
      // ORDER_STATUS = ('creating', 'open', 'closed')
      switch (status) {
      case 'creating':
        return 'Draft';
      case 'open':
        return 'Open';
      case 'closed':
        return 'Completed';
      default:
        return 'Unknown';
      }
    },
    /**
    * getFriendlyOrderCss
    *
    * @memberOf common
    * @name  common#getFriendlyOrderCss
    * @method
    * 
    * @param  {string} status 
    * @return {string}        
    */
    getFriendlyOrderCss: function (status) {
      switch (status) {
      case 'creating':
        return 'label-creating';
      case 'open':
        return 'label-open';
      case 'closed':
        return 'label-closed';
      default:
        return '';
      }
    },
    /**
    * getFriendlyOrderSize
    *
    * @memberOf common
    * @name  common#getFriendlyOrderSize
    * @method
    * 
    * @param  {object} order
    * @return {string}      
    */
    getFriendlyOrderSize: function (order) {
      if (order.items && order.items.length > 0) {
        var str = order.items.length + ' item';
        if (order.items.length > 1) {
          str += 's';
        }
        return str;
      } else {
        return 'No items';
      }
    },
    /**
    * isOrderOverdue
    *
    * @memberOf common
    * @name  common#isOrderOverdue
    * @method
    * 
    * @param  {object}  order 
    * @param  {moment}  now   
    * @return {Boolean}       
    */
    isOrderOverdue: function (order, now) {
      now = now || moment();
      return order.status == 'open' && now.isAfter(order.due);
    },
    /**
    * isOrderArchived
    *
    * @memberOf common
    * @name  common#isOrderArchived
    * @method
    * 
    * @param  {object}  order 
    * @return {Boolean}       
    */
    isOrderArchived: function (order) {
      return order && order.archived != null;
    },
    /**
    * getOrderStatus
    *
    * @memberOf common
    * @name  common#getOrderStatus
    * @method
    * 
    * @param  {object} order 
    * @param  {moment} now   
    * @return {string}       
    */
    getOrderStatus: function (order, now) {
      now = now || moment();
      if (this.isOrderOverdue(order, now)) {
        return 'Overdue';
      } else if (this.isOrderArchived(order)) {
        return 'Archived';
      } else {
        return this.getFriendlyOrderStatus(order.status);
      }
    },
    /**
    * getOrderCss
    *
    * @memberOf common
    * @name  common#getOrderCss
    * @method
    * 
    * @param  {object} order 
    * @param  {moment} now   
    * @return {string}       
    */
    getOrderCss: function (order, now) {
      now = now || moment();
      if (this.isOrderOverdue(order, now)) {
        return 'label-overdue';
      } else if (this.isOrderArchived(order)) {
        return 'label-archived';
      } else {
        return this.getFriendlyOrderCss(order.status);
      }
    }
  };
}(moment);
common_reservation = {
  /**
   * getFriendlyReservationCss
   *
   * @memberOf common
   * @name  common#getFriendlyReservationCss
   * @method
   * 
   * @param  {string} status 
   * @return {string}        
   */
  getFriendlyReservationCss: function (status) {
    switch (status) {
    case 'creating':
      return 'label-creating';
    case 'open':
      return 'label-open';
    case 'closed':
      return 'label-converted';
    case 'closed_manually':
      return 'label-closed';
    case 'cancelled':
      return 'label-cancelled';
    default:
      return '';
    }
  },
  /**
   * getFriendlyReservationStatus 
   *
   * @memberOf common
   * @name  common#getFriendlyReservationStatus
   * @method
   * 
   * @param  {string} status 
   * @return {string}        
   */
  getFriendlyReservationStatus: function (status) {
    switch (status) {
    case 'creating':
      return 'Draft';
    case 'open':
      return 'Booked';
    case 'closed':
      return 'Converted';
    case 'closed_manually':
      return 'Closed';
    case 'cancelled':
      return 'Cancelled';
    default:
      return 'Unknown';
    }
  },
  /**
   * getFriendlyReservationFrequency
   *
   * @memberOf common
   * @name  common#getFriendlyReservationFrequency
   * @method
   * 
   * @param  {string} frequency 
   * @return {string}        
   */
  getFriendlyReservationFrequency: function (frequency) {
    switch (frequency) {
    case 'every_day':
      return 'Repeats every day';
    case 'every_weekday':
      return 'Repeats every weekday';
    case 'every_week':
      return 'Repeats every week';
    case 'every_2_weeks':
      return 'Repeats every 2 weeks';
    case 'every_month':
      return 'Repeats every month';
    case 'every_2_months':
      return 'Repeats every 2 months';
    case 'every_3_months':
      return 'Repeats every 3 months';
    case 'every_6_months':
      return 'Repeats every 6 months';
    default:
      return 'Repeating reservation';
    }
  },
  /**
   * isReservationOverdue
   *
   * @memberOf common
   * @name  common#isReservationOverdue
   * @method
   * 
   * @param  {object}  reservation 
   * @param  {moment}  now   
   * @return {Boolean}       
   */
  isReservationOverdue: function (reservation, now) {
    now = now || moment();
    return reservation.status == 'open' && now.isAfter(reservation.fromDate || reservation.from);
  },
  /**
   * isReservationInThePast
   *
   * @memberOf common
   * @name  common#isReservationInThePast
   * @method
   *
   * @param  {object}  reservation
   * @param  {moment}  now
   * @return {Boolean}
   */
  isReservationInThePast: function (reservation, now) {
    now = now || moment();
    return reservation.status == 'open' && now.isAfter(reservation.fromDate) && now.isAfter(reservation.toDate);
  },
  /**
   * isReservationArchived
   *
   * @memberOf common
   * @name  common#isReservationArchived
   * @method
   * 
   * @param  {object}  reservation 
   * @return {Boolean}       
   */
  isReservationArchived: function (reservation) {
    return reservation && reservation.archived != null;
  },
  /**
   * getReservationCss
   *
   * @memberOf common
   * @name  common#getReservationCss
   * @method
   * 
   * @param  {object} reservation
   * @return {string}       
   */
  getReservationCss: function (reservation) {
    if (this.isReservationArchived(reservation)) {
      return 'label-archived';
    } else {
      return this.getFriendlyReservationCss(reservation.status);
    }
  },
  getReservationStatus: function (reservation) {
    if (this.isReservationArchived(reservation)) {
      return 'Archived';
    } else {
      return this.getFriendlyReservationStatus(reservation.status);
    }
  }
};
common_item = function () {
  var that = {};
  that.itemCanTakeCustody = function (item) {
    var canCustody = item.canCustody !== undefined ? item.canCustody === 'available' : true;
    return canCustody && item.status == 'available';
  };
  that.itemCanReleaseCustody = function (item) {
    var canCustody = item.canCustody !== undefined ? item.canCustody === 'available' : true;
    return canCustody && item.status == 'in_custody';
  };
  that.itemCanTransferCustody = function (item) {
    var canCustody = item.canCustody !== undefined ? item.canCustody === 'available' : true;
    return canCustody && item.status == 'in_custody';
  };
  that.itemCanReserve = function (item) {
    return item.canReserve !== undefined ? item.canReserve === 'available' : true;
  };
  that.itemCanCheckout = function (item) {
    return item.canOrder !== undefined ? item.canOrder === 'available' : true;
  };
  that.itemCanGoToCheckout = function (item) {
    return item.status == 'checkedout' || item.status == 'await_checkout';
  };
  that.itemCanCheckin = function (item) {
    return item.status == 'checkedout';
  };
  that.itemCanExpire = function (item) {
    return item.status == 'available';
  };
  that.itemCanUndoExpire = function (item) {
    return item.status == 'expired';
  };
  that.itemCanDelete = function (item) {
    return item.status == 'available' || item.status == 'expired';
  };
  /**
  * getFriendlyItemStatus
  *
  * @memberOf common
  * @name  common#getFriendlyItemStatus
  * @method
  *
  * @param  status
  * @return {string}
  */
  that.getFriendlyItemStatus = function (status) {
    // ITEM_STATUS = ('available', 'checkedout', 'await_checkout', 'in_transit', 'maintenance', 'repair', 'inspection', 'expired')
    switch (status) {
    case 'available':
      return 'Available';
    case 'checkedout':
      return 'Checked out';
    case 'await_checkout':
      return 'Checking out';
    case 'in_transit':
      return 'In transit';
    case 'in_custody':
      return 'In custody';
    case 'maintenance':
      return 'Maintenance';
    case 'repair':
      return 'Repair';
    case 'inspection':
      return 'Inspection';
    case 'expired':
      return 'Expired';
    default:
      return 'Unknown';
    }
  };
  /**
  * getItemStatusCss
  *
  * @memberOf common
  * @name  common#getItemStatusCss
  * @method
  * 
  * @param  status 
  * @return {string}       
  */
  that.getItemStatusCss = function (status) {
    switch (status) {
    case 'available':
      return 'label-available';
    case 'checkedout':
      return 'label-checkedout';
    case 'await_checkout':
      return 'label-awaitcheckout';
    case 'in_transit':
      return 'label-transit';
    case 'in_custody':
      return 'label-custody';
    case 'maintenance':
      return 'label-maintenance';
    case 'repair':
      return 'label-repair';
    case 'inspection':
      return 'label-inspection';
    case 'expired':
      return 'label-expired';
    default:
      return '';
    }
  };
  /**
  * getItemStatusIcon
  *
  * @memberOf common
  * @name  common#getItemStatusIcon
  * @method
  * 
  * @param  status
  * @return {string}       
  */
  that.getItemStatusIcon = function (status) {
    switch (status) {
    case 'available':
      return 'fa fa-check-circle';
    case 'checkedout':
      return 'fa fa-times-circle';
    case 'await_checkout':
      return 'fa fa-ellipsis-h';
    case 'in_transit':
      return 'fa fa-truck';
    case 'in_custody':
      return 'fa fa-exchange';
    case 'maintenance':
      return 'fa fa-wrench';
    case 'repair':
      return 'fa fa-wrench';
    case 'inspection':
      return 'fa fa-stethoscope';
    case 'expired':
      return 'fa fa-bug';
    default:
      return '';
    }
  };
  /**
  * getItemsByStatus
  *
  * @memberOf common
  * @name  common#getItemsByStatus
  * @method
  * 
  * @param  {Array} 			 items      
  * @param  {string|function} comparator 
  * @return {Array}           
  */
  that.getItemsByStatus = function (items, comparator) {
    if (!items)
      return [];
    return items.filter(function (item) {
      if (typeof comparator == 'string') {
        //filter items on status
        return item.status == comparator;
      } else {
        //use custom comparator to filter items
        return comparator(item);
      }
    });
  };
  /**
  * getAvailableItems
  * 
  * @memberOf common
  * @name  common#getAvailableItems
  * @method
  * 
  * @param  {Array} items 
  * @return {Array}       
  */
  that.getAvailableItems = function (items) {
    return this.getItemsByStatus(items, 'available');
  };
  /**
  * getActiveItems
  * 
  * @memberOf common
  * @name  common#getActiveItems
  * @method
  * 
  * @param  {Array} items 
  * @return {Array}       
  */
  that.getActiveItems = function (items) {
    return this.getItemsByStatus(items, function (item) {
      return item.status != 'expired' && item.status != 'in_custody';
    });
  };
  /**
  * getItemIds
  *
  * @memberOf common
  * @name  common#getItemIds
  * @method
  * 
  * @param  items 
  * @return {array}       
  */
  that.getItemIds = function (items) {
    return items.map(function (item) {
      return typeof item === 'string' ? item : item._id;
    });
  };
  return that;
}();
common_conflicts = {
  /**
   * getFriendlyConflictKind
   *
   * @memberOf  common
   * @name  common#getFriendlyConflictKind
   * @method
   * 
   * @param  kind 
   * @return {string}    
   */
  getFriendlyConflictKind: function (kind) {
    switch (kind) {
    case 'location':
      return 'At wrong location';
    case 'order':
      return 'Checked out';
    case 'reservation':
      return 'Already reserved';
    case 'expired':
      return 'Item is expired';
    case 'custody':
      return 'Item is in custody';
    default:
      return '';
    }
  }
};
common_keyValues = function () {
  var _getCategoryName = function (obj) {
    return typeof obj === 'string' ? obj : obj['name'];
  };
  return {
    /**
     * Creates a category key from a friendly name
     *
     * @memberOf  common
     * @name  common#getCategoryKeyFromName
     * @method
     * 
     * @param  {string} name 
     * @return {string}   
     */
    getCategoryKeyFromName: function (name) {
      return 'cheqroom.types.item.' + name.split(' ').join('_').split('.').join('').toLowerCase();
    },
    /**
     * Creates a name from a category key
     *
     * @memberOf common
     * @name  common#getCategoryNameFromKey
     * @method
     * 
     * @param  {string} key
     * @return {string}
     */
    getCategoryNameFromKey: function (key) {
      var re = new RegExp('_', 'g');
      return key.split('.').pop().replace(re, ' ');
    },
    /**
     * getCategorySummary
     *
     * @memberOf common
     * @name  common#getCategorySummary
     * @method
     * 
     * @param  {array} items 
     * @return {string}      
     */
    getCategorySummary: function (items) {
      items = items || [];
      if (items.length == 0) {
        return 'No items';
      }
      var item = null, key = null, catName = null, catSummary = {}, firstKey = '', firstKeyCount = 0;
      for (var i = 0, len = items.length; i < len; i++) {
        item = items[i];
        catName = item.category ? _getCategoryName(item.category) : '';
        key = catName ? this.getCategoryNameFromKey(catName) : '';
        //console.log(item.category, catName, key);
        if (!catSummary[key]) {
          catSummary[key] = 1;
        } else {
          catSummary[key] += 1;
        }
        // first key should be category with largest number of items
        if (catSummary[key] > firstKeyCount) {
          firstKey = key;
          firstKeyCount = catSummary[key];
        }
      }
      var summ = catSummary[firstKey] + ' ';
      if (firstKeyCount == 1 && String.prototype.singularize) {
        summ += firstKey.singularize();
      } else {
        summ += firstKey;
      }
      if (items.length > catSummary[firstKey]) {
        var other = items.length - catSummary[firstKey];
        summ += ' +' + other + ' other';
      }
      return summ;
    },
    /**
     * getItemSummary
     *
     * Works much like getCategorySummary but prefers making summaries with kit names in it
     *
     * @memberOf common
     * @name  common#getItemSummary
     * @method
     *
     * @param  {array} items
     * @return {string}
     */
    getItemSummary: function (items) {
      items = items || [];
      if (items.length == 0) {
        return 'No items';
      }
      var sep = ', ', item = null, numKits = 0, kitItems = {}, unkittedItems = [];
      // Do a first loop to extract all items for which we have a kit name
      // If we don't have the kit.name field, we'll treat the item as if
      // the item was not in a kit, and put it in unkittedItems
      for (var i = 0, len = items.length; i < len; i++) {
        item = items[i];
        if (item.kit && item.kit.name) {
          if (kitItems[item.kit.name]) {
            kitItems[item.kit.name].push(item);
          } else {
            kitItems[item.kit.name] = [item];
            numKits += 1;
          }
        } else {
          unkittedItems.push(item);
        }
      }
      // If we have no kits (or no kit names),
      // we'll just use getCategorySummary
      // which works pretty well for that
      if (numKits == 0) {
        return this.getCategorySummary(items);
      } else {
        // Get all the kit names as an array
        var names = $.map(kitItems, function (val, key) {
          return key;
        });
        // We only have kits and not unkitted items
        // We can try to make a very short summary of the kit names
        // If we can't fit multiple kit names into a single string
        // we'll take 1 (or more) and then add "+3 other kits"
        if (unkittedItems.length == 0) {
          var maxKitNamesLength = 30;
          return names.joinOther(maxKitNamesLength, sep, 'other kits');
        } else {
          // We have a mix of kits an unkitted items
          // If we only have one kit, we'll use its name
          // and just paste getCategorySummary after it
          if (numKits == 1) {
            return names[0] + sep + this.getCategorySummary(unkittedItems);
          } else {
            // We have multiple kits, so we'll put
            // 3 kits, 5 pumps +2 other
            return len(names) + ' kits' + sep + this.getCategorySummary(unkittedItems);
          }
        }
      }
    }
  };
}();
common_image = function ($) {
  return {
    /**
     * Returns an avatar image with the initials of the user
     * source: http://codepen.io/leecrossley/pen/CBHca 
     *
     * @memberOf  common
     * @name  common#getAvatarInitial
     * @method
     * 
     * @param  {string} name name for which to display the initials
     * @param  {string} size Possible values XS,S,M,L,XL
     * @return {string}	base64 image url    
     */
    getAvatarInitial: function (name, size) {
      name = name || 'Unknown';
      var sizes = {
        'XS': 32,
        'S': 64,
        'M': 128,
        'L': 256,
        'XL': 512
      };
      var colours = [
        '#1abc9c',
        '#2ecc71',
        '#3498db',
        '#9b59b6',
        '#34495e',
        '#16a085',
        '#27ae60',
        '#2980b9',
        '#8e44ad',
        '#2c3e50',
        '#f1c40f',
        '#e67e22',
        '#e74c3c',
        '#95a5a6',
        '#f39c12',
        '#d35400',
        '#c0392b',
        '#bdc3c7'
      ];
      var nameSplit = name.split(' '), initials = nameSplit.length == 2 ? nameSplit[0].charAt(0).toUpperCase() + nameSplit[1].charAt(0).toUpperCase() : nameSplit[0].charAt(0).toUpperCase();
      var charIndex = initials.charCodeAt(0) - 65, colourIndex = charIndex % colours.length;
      var canvasWidth = sizes[size], canvasHeight = sizes[size], canvasCssWidth = canvasWidth, canvasCssHeight = canvasHeight;
      var $canvas = $('<canvas />').attr({
        width: canvasWidth,
        height: canvasHeight
      });
      var context = $canvas.get(0).getContext('2d');
      if (window.devicePixelRatio) {
        $canvas.attr('width', canvasWidth * window.devicePixelRatio);
        $canvas.attr('height', canvasHeight * window.devicePixelRatio);
        $canvas.css('width', canvasCssWidth);
        $canvas.css('height', canvasCssHeight);
        context.scale(window.devicePixelRatio, window.devicePixelRatio);
      }
      context.fillStyle = colours[colourIndex];
      context.fillRect(0, 0, canvasWidth, canvasHeight);
      context.font = canvasWidth / 2 + 'px Arial';
      context.textAlign = 'center';
      context.fillStyle = '#FFF';
      context.fillText(initials, canvasCssWidth / 2, canvasCssHeight / 1.5);
      return $canvas.get(0).toDataURL();
    },
    /**
     * Returns an maintenace avatar image
     *
     * @memberOf  common
     * @name  common#getMaintenanceAvatar
     * @method
     * 
     * @param  {string} size Possible values XS,S,M,L,XL
     * @return {string} base64 image url    
     */
    getMaintenanceAvatar: function (size) {
      return this.getIconAvatar(size, 'f0ad');
    },
    /**
     * Returns an icon avatar image from FontAwesome collection
     *
     * @memberOf  common
     * @name  common#getIconAvatar
     * @method
     * 
     * @param  {string} size Possible values XS,S,M,L,XL
     * @return {string} base64 image url    
     */
    getIconAvatar: function (size, value, fontColorHex, backgroundColorHex, fontSize) {
      var sizes = {
        'XS': 32,
        'S': 64,
        'M': 128,
        'L': 256,
        'XL': 512
      };
      var canvasWidth = sizes[size], canvasHeight = sizes[size], canvasCssWidth = canvasWidth, canvasCssHeight = canvasHeight;
      if (!fontColorHex)
        fontColorHex = '#aaa';
      if (!backgroundColorHex)
        backgroundColorHex = '#f5f5f5';
      if (!fontSize)
        fontSize = canvasWidth / 2;
      var $canvas = $('<canvas />').attr({
        width: canvasWidth,
        height: canvasHeight
      });
      var context = $canvas.get(0).getContext('2d');
      if (window.devicePixelRatio) {
        $canvas.attr('width', canvasWidth * window.devicePixelRatio);
        $canvas.attr('height', canvasHeight * window.devicePixelRatio);
        $canvas.css('width', canvasCssWidth);
        $canvas.css('height', canvasCssHeight);
        context.scale(window.devicePixelRatio, window.devicePixelRatio);
      }
      context.fillStyle = backgroundColorHex;
      context.fillRect(0, 0, canvasWidth, canvasHeight);
      context.font = fontSize + 'px FontAwesome';
      context.textAlign = 'center';
      context.fillStyle = fontColorHex;
      context.fillText(String.fromCharCode('0x' + value), canvasCssWidth / 2, canvasCssHeight / 1.5);
      return $canvas.get(0).toDataURL();
    },
    getTextImage: function (text, size, fontColorHex, backgroundColorHex) {
      var sizes = {
        'XS': 32,
        'S': 64,
        'M': 128,
        'L': 256,
        'XL': 512
      };
      if (!fontColorHex)
        fontColorHex = '#aaa';
      if (!backgroundColorHex)
        backgroundColorHex = '#e5e5e5';
      var canvasWidth = sizes[size], canvasHeight = sizes[size], canvasCssWidth = canvasWidth, canvasCssHeight = canvasHeight;
      var $canvas = $('<canvas />').attr({
        width: canvasWidth,
        height: canvasHeight
      });
      var context = $canvas.get(0).getContext('2d');
      if (window.devicePixelRatio) {
        $canvas.attr('width', canvasWidth * window.devicePixelRatio);
        $canvas.attr('height', canvasHeight * window.devicePixelRatio);
        $canvas.css('width', canvasCssWidth);
        $canvas.css('height', canvasCssHeight);
        context.scale(window.devicePixelRatio, window.devicePixelRatio);
      }
      context.fillStyle = backgroundColorHex;
      context.fillRect(0, 0, canvasWidth, canvasHeight);
      context.font = canvasWidth / 2.7 + 'px Arial';
      context.textAlign = 'center';
      context.fillStyle = fontColorHex;
      context.fillText(text, canvasCssWidth / 2, canvasCssHeight / 1.5);
      return $canvas.get(0).toDataURL();
    },
    /**
     * getImageUrl 
     *
     * @memberOf  common
     * @name common#getImageUrl  
     * @method
     * 
     * @param  ds        
     * @param  pk        
     * @param  size      
     * @param  bustCache 
     * @return {string}           
     */
    getImageUrl: function (ds, pk, size, bustCache) {
      var url = ds.getBaseUrl() + pk + '?mimeType=image/jpeg';
      if (size && size != 'orig') {
        url += '&size=' + size;
      }
      if (bustCache) {
        url += '&_bust=' + new Date().getTime();
      }
      return url;
    },
    /**
     * getImageCDNUrl 
     *
     * @memberOf  common
     * @name  common#getImageCDNUrl
     * @method
     * 
     * @param  settings     
     * @param  groupId      
     * @param  attachmentId 
     * @param  size         
     * @return {string}              
     */
    getImageCDNUrl: function (settings, groupId, attachmentId, size) {
      // https://cheqroom-cdn.s3.amazonaws.com/app-staging/groups/nose/b00f1ae1-941c-11e3-9fc5-1040f389c0d4-M.jpg
      var url = 'https://assets.cheqroomcdn.com/' + settings.amazonBucket + '/groups/' + groupId + '/' + attachmentId;
      if (size && size.length > 0) {
        var parts = url.split('.');
        var ext = attachmentId.indexOf('.') != -1 ? parts.pop() : '';
        // pop off the extension, we'll change it
        url = parts.join('.') + '-' + size + '.jpg';  // resized images are always jpg
      }
      return url;
    },
    getNoImage: function (size) {
      return this.getIconAvatar(size, 'f03e', 'rgba(0,0,0,0.2)', 'rgba(255,255,255,0.5)');
    }
  };
}(jquery);
common_attachment = function (moment) {
  var IMAGES = [
    'jpg',
    'jpeg',
    'png',
    'gif'
  ];
  /**
   * Provides attachment related helper methods
   */
  return {
    /**
     * getImgFileNameFromName
     *
     * @memberOf common
     * @name  common#getImgFileNameFromName
     * @method
     * 
     * @param  name 
     * @return {string}      
     */
    getImgFileNameFromName: function (name) {
      if (name != null && name.length > 0) {
        return name.split(' ').join('_').split('.').join('_') + '.jpg';
      } else {
        // upload 2014-03-10 at 11.41.45 am.png
        return 'upload ' + moment().format('YYYY-MM-DD at hh:mm:ss a') + '.jpg';
      }
    },
    /**
     * makeFileNameJpg
     *
     * @memberOf common
     * @name  common#makeFileNameJpg
     * @method
     * 
     * @param  name
     * @return {string}    
     */
    makeFileNameJpg: function (name) {
      return name.indexOf('.') >= 0 ? name.substr(0, name.lastIndexOf('.')) + '.jpg' : name;
    },
    /**
     * getFileNameFromUrl
     *
     * @memberOf common
     * @name  common#getFileNameFromUrl
     * @method
     * 
     * @param  url
     * @return {string}  
     */
    getFileNameFromUrl: function (url) {
      if (url) {
        var m = url.toString().match(/.*\/(.+?)\./);
        if (m && m.length > 1) {
          return m[1];
        }
      }
      return '';
    },
    /**
     * isImage
     *
     * @memberOf common
     * @name  common#isImage
     * @method
     * 
     * @param  fileName
     * @return {boolean}  
     */
    isImage: function (fileName) {
      var ext = this.getExt(fileName);
      return $.inArray(ext, IMAGES) >= 0;
    },
    /**
     * getExt
     *
     * @memberOf common
     * @name  common#getExt
     * @method
     * 
     * @param  fileName
     * @return {string}  
     */
    getExt: function (fileName) {
      var EXT = /(?:\.([^.]+))?$/;
      return (EXT.exec(fileName)[1] || '').toLowerCase();
    }
  };
}(moment);
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
      var m = email.match(/^([\w-\+]+(?:\.[\w-\+]+)*)@(?!gmail\.com)(?!yahoo\.com)(?!hotmail\.com)(?!163\.com)(?!qq\.com)((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,}(?:\.[a-z]{2})?)$/i);
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
   * @param {string} default
   * @return {string}
   */
  utils.getUrlParam = function (name, def) {
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    var regexS = '[\\?&]' + name + '=([^&#]*)';
    var regex = new RegExp(regexS);
    var results = regex.exec(window.location.href);
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
    csvFile = new Blob([csv], { type: 'text/csv' });
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
common_slimdown = function () {
  /**
  * Javascript version of https://gist.github.com/jbroadway/2836900
  *
  * Slimdown - A very basic regex-based Markdown parser. Supports the
  * following elements (and can be extended via Slimdown::add_rule()):
  *
  * - Headers
  * - Links
  * - Bold
  * - Emphasis
  * - Deletions
  * - Quotes
  * - Inline code
  * - Blockquotes
  * - Ordered/unordered lists
  * - Horizontal rules
  *
  * Author: Johnny Broadway <johnny@johnnybroadway.com>
  * Website: https://gist.github.com/jbroadway/2836900
  * License: MIT
  *
  * @global
  * @name  Slimdown
  */
  var Slimdown = function () {
    // Rules
    this.rules = [
      {
        regex: /(#{1,6})\s(.*)/g,
        replacement: header
      },
      // headers
      {
        regex: /!\[([^\[]+)\]\(([^\)]+)\)/g,
        replacement: '<img src=\'$2\' alt=\'$1\'>'
      },
      // image
      {
        regex: /\[([^\[]+)\]\(([^\)]+)\)/g,
        replacement: '<a href=\'$2\'>$1</a>'
      },
      // hyperlink
      {
        regex: /(\*\*|__)(.*?)\1/g,
        replacement: '<strong>$2</strong>'
      },
      // bold
      {
        regex: /(\*|_)(.*?)\1/g,
        replacement: '<em>$2</em>'
      },
      // emphasis
      {
        regex: /\~\~(.*?)\~\~/g,
        replacement: '<del>$1</del>'
      },
      // del
      {
        regex: /\:\"(.*?)\"\:/g,
        replacement: '<q>$1</q>'
      },
      // quote
      {
        regex: /`(.*?)`/g,
        replacement: '<code>$1</code>'
      },
      // inline code
      {
        regex: /\n\*(.*)/g,
        replacement: ulList
      },
      // ul lists
      {
        regex: /\n[0-9]+\.\s(.*)/g,
        replacement: olList
      },
      // ol lists
      {
        regex: /\n(&gt;|\>)(.*)/g,
        replacement: blockquote
      },
      // blockquotes
      {
        regex: /\n-{5,}/g,
        replacement: '\n<hr />'
      },
      // horizontal rule
      {
        regex: /(?:[^\n]|\n(?! *\n))+/g,
        replacement: para
      },
      // add paragraphs
      {
        regex: /<\/ul>\s?<ul>/g,
        replacement: ''
      },
      // fix extra ul
      {
        regex: /<\/ol>\s?<ol>/g,
        replacement: ''
      },
      // fix extra ol
      {
        regex: /<\/blockquote><blockquote>/g,
        replacement: '\n'
      }  // fix extra blockquote
    ];
    // Add a rule.
    this.addRule = function (regex, replacement) {
      regex.global = true;
      regex.multiline = false;
      this.rules.push({
        regex: regex,
        replacement: replacement
      });
    };
    // Render some Markdown into HTML.
    this.render = function (text) {
      text = '\n' + text + '\n';
      text = autolink(text);
      this.rules.forEach(function (rule) {
        text = text.replace(rule.regex, rule.replacement);
      });
      return text.trim();
    };
    function para(text, line) {
      var trimmed = ('' + text).trimLeft().trimRight();
      if (/^<\/?(ul|ol|li|h|p|bl)/i.test(trimmed)) {
        return trimmed;
      }
      trimmed = trimmed.replace(/\n/g, '<br />');
      return '<p>' + trimmed + '</p>';
    }
    function ulList(text, item) {
      return '\n<ul>\n\t<li>' + item.trim() + '</li>\n</ul>';
    }
    function olList(text, item) {
      return '\n<ol>\n\t<li>' + item.trim() + '</li>\n</ol>';
    }
    function blockquote(text, tmp, item) {
      return '\n<blockquote>' + item.trim() + '</blockquote>';
    }
    function header(text, chars, content) {
      var level = chars.length;
      return '<h' + level + '>' + content.trim() + '</h' + level + '>';
    }
    function autolink(text) {
      var urls = text.match(/(\(?https?:\/\/[-A-Za-z0-9+&@#\/%?=~_()|!:,.;]*[-A-Za-z0-9+&@#\/%=~_()|])(">|<\/a>|\)|\])?/gm);
      if (urls == null)
        return text;
      var cleanedUrls = {};
      for (var i = 0; i < urls.length; i++) {
        var url = urls[i];
        // ignore urls that are part of a markdown link already
        if (url.lastIndexOf(']') != -1 || url.lastIndexOf(')') != -1)
          break;
        // already replaced this url
        if (cleanedUrls[url])
          break;
        cleanedUrls[url] = url;
        text = text.replace(url, '[' + url + '](' + url + ')');
      }
      return text;
    }
  };
  window.Slimdown = Slimdown;
}();
common_kit = function ($, itemHelpers) {
  var that = {};
  /**
   * Checks if a kit can be checked out (any items available)
   * @memberOf common
   * @name common#kitCanCheckout
   * @method
   * @param kit
   * @returns {boolean}
   */
  that.kitCanCheckout = function (kit) {
    return kit.canOrder !== undefined ? kit.canOrder === 'available' : true;
  };
  /**
   * Checks if a kit can be reserved (any items active)
   * @memberOf common
   * @name common#kitCanReserve
   * @method
   * @param kit
   * @returns {boolean}
   */
  that.kitCanReserve = function (kit) {
    return kit.canReserve !== undefined ? kit.canReserve === 'available' : true;
  };
  /**
   * Checks if custody can be taken for a kit (based on status)
   * @memberOf common
   * @name common#kitCanTakeCustody
   * @method
   * @param kit
   * @returns {boolean}
   */
  that.kitCanTakeCustody = function (kit) {
    var canCustody = kit.canCustody !== undefined ? kit.canCustody === 'available' : true;
    return canCustody && kit.status == 'available';
  };
  /**
   * Checks if custody can be released for a kit (based on status)
   * @memberOf common
   * @name common#kitCanReleaseCustody
   * @method
   * @param kit
   * @returns {boolean}
   */
  that.kitCanReleaseCustody = function (kit) {
    var canCustody = kit.canCustody !== undefined ? kit.canCustody === 'available' : true;
    return canCustody && kit.status == 'in_custody';
  };
  /**
   * Checks if custody can be transferred for a kit (based on status)
   * @memberOf common
   * @name common#kitCanTransferCustody
   * @method
   * @param kit
   * @returns {boolean}
   */
  that.kitCanTransferCustody = function (kit) {
    var canCustody = kit.canCustody !== undefined ? kit.canCustody === 'available' : true;
    return canCustody && kit.status == 'in_custody';
  };
  /**
   * getKitStatus
   * Available 		=> if all items in the kit are available
   * Checking out 	=> if all item in the kit is checking out
   * Checked out 		=> if all item in the kit is checked out
   * Expired			=> if all item in the kit is expired
   * Unknown          => if not all items in the kit have the same status
   *
   * @memberOf common
   * @name  common#getKitStatus
   * @method
   *
   * @param  status
   * @return {string}
   */
  that.getKitStatus = function (items) {
    var statuses = {};
    var itemStatuses = [];
    var orders = {};
    var itemOrders = [];
    // Make dictionary of different item statuses
    $.each(items, function (i, item) {
      // Unique item statuses
      if (!statuses[item.status]) {
        statuses[item.status] = true;
        itemStatuses.push(item.status);
      }
      // Unique item orders
      if (!orders[item.order]) {
        orders[item.order] = true;
        itemOrders.push(item.order);
      }
    });
    if (itemStatuses.length == 1 && itemOrders.length <= 1) {
      // All items in the kit have the same status and are in the same order
      return itemStatuses[0];
    } else {
      // Kit has items with different statuses
      return 'incomplete';
    }
  };
  /**
   * getFriendlyKitStatus
   *
   * @memberOf common
   * @name  common#getFriendlyKitStatus
   * @method
   *
   * @param  status
   * @return {string}
   */
  that.getFriendlyKitStatus = function (status) {
    if (status == 'incomplete') {
      return 'Incomplete';
    }
    return itemHelpers.getFriendlyItemStatus(status);
  };
  /**
   * getKitStatusCss
   *
   * @memberOf common
   * @name  common#getKitStatusCss
   * @method
   *
   * @param  status
   * @return {string}
   */
  that.getKitStatusCss = function (status) {
    if (status == 'incomplete') {
      return 'label-incomplete';
    }
    return itemHelpers.getItemStatusCss(status);
  };
  /**
   * getKitStatusIcon
   *
   * @memberOf common
   * @name  common#getKitStatusIcon
   * @method
   * 
   * @param  status
   * @return {string}       
   */
  that.getKitStatusIcon = function (status) {
    switch (status) {
    case 'available':
      return 'fa fa-check-circle';
    case 'checkedout':
      return 'fa fa-times-circle';
    case 'await_checkout':
      return 'fa fa-ellipsis-h';
    case 'incomplete':
      return 'fa fa-warning';
    case 'empty':
      return 'fa fa-ellipsis-h';
    case 'in_transit':
      return 'fa fa-truck';
    case 'in_custody':
      return 'fa fa-exchange';
    case 'maintenance':
      return 'fa fa-wrench';
    case 'repair':
      return 'fa fa-wrench';
    case 'inspection':
      return 'fa fa-stethoscope';
    case 'expired':
      return 'fa fa-bug';
    default:
      return '';
    }
  };
  /**
   * getKitIds
   *
   * @memberOf common
   * @name  common#getKitIds
   * @method
   *
   * @param  items
   * @return {array}
   */
  that.getKitIds = function (items) {
    var kitDictionary = {};
    var ids = [];
    $.each(items, function (i, item) {
      if (item.kit) {
        var kitId = typeof item.kit == 'string' ? item.kit : item.kit._id;
        if (!kitDictionary[kitId]) {
          kitDictionary[kitId] = true;
          ids.push(kitId);
        }
      }
    });
    return ids;
  };
  return that;
}(jquery, common_item);
common_contact = function (imageHelper, attachmentHelper) {
  var that = {};
  that.contactGetUserId = function (contact) {
    if (contact.user) {
      if (typeof contact.user === 'string') {
        return contact.user;
      } else if (contact.user.hasOwnProperty('_id')) {
        return contact._id;
      }
    }
  };
  that.contactGetUserSync = function (contact) {
    if (contact.user && contact.user.sync) {
      return contact.user.sync;
    }
  };
  that.contactCanReserve = function (contact) {
    return contact.status == 'active';
  };
  that.contactCanCheckout = function (contact) {
    return contact.status == 'active';
  };
  that.contactCanGenerateDocument = function (contact) {
    return contact.status == 'active';
  };
  that.contactCanArchive = function (contact) {
    return contact.status == 'active' && !that.contactGetUserSync(contact);
  };
  that.contactCanUndoArchive = function (contact) {
    return contact.status == 'archived' && !that.contactGetUserSync(contact);
  };
  that.contactCanDelete = function (contact) {
    return !that.contactGetUserSync(contact);
  };
  that.contactCanBlock = function (contact) {
    return contact.status == 'active';
  };
  that.contactCanUndoBlock = function (contact) {
    return contact.status == 'blocked';
  };
  /**
  * getContactImageUrl
  *
  * @memberOf common
  * @name  common#getContactImageUrl
  * @method
  *
  * @param  cr.Contact or contact object
  * @return {string} image path or base64 image
  */
  that.getContactImageUrl = function (ds, contact, size, bustCache) {
    // Show profile picture of user?
    if (contact.user && contact.user.picture)
      return imageHelper.getImageUrl(ds, contact.user.picture, size, bustCache);
    // Show contact image
    if (contact.cover) {
      // Bugfix don't show pdf preview images as contact image
      if (attachmentHelper.isImage(contact.cover)) {
        return imageHelper.getImageUrl(ds, contact.cover, size, bustCache);
      }
    }
    // Show maintenance avatar?
    if (contact.kind == 'maintenance')
      return imageHelper.getMaintenanceAvatar(size);
    // Show avatar initials
    return imageHelper.getAvatarInitial(contact.name, size);
  };
  /**
  * getContactImageCDNUrl
  *
  * @memberOf common
  * @name  common#getContactImageCDNUrl
  * @method
  *
  * @param  cr.Contact or contact object
  * @return {string} image path or base64 image
  */
  that.getContactImageCDNUrl = function (settings, groupid, contact, size, bustCache) {
    // Show profile picture of user?
    if (contact.user && contact.user.picture)
      return imageHelper.getImageCDNUrl(settings, groupid, contact.user.picture, size, bustCache);
    // Show contact image
    if (contact.cover)
      return imageHelper.getImageCDNUrl(settings, groupid, contact.cover, size, bustCache);
    // Show maintenance avatar?
    if (contact.kind == 'maintenance')
      return imageHelper.getMaintenanceAvatar(size);
    // Show avatar initials
    return imageHelper.getAvatarInitial(contact.name, size);
  };
  return that;
}(common_image, common_attachment);
common_user = function (imageHelper) {
  return {
    /**
     * getUserImageUrl 
     *
     * @memberOf common
     * @name  common#getUserImageUrl
     * @method
     * 
     * @param  cr.User or user object
     * @return {string} image path or base64 image        
     */
    getUserImageUrl: function (ds, user, size, bustCache) {
      // Show profile picture of user?
      if (user && user.picture)
        return imageHelper.getImageUrl(ds, user.picture, size, bustCache);
      // Show avatar initials
      return imageHelper.getAvatarInitial(user.name, size);
    },
    /**
     * getUserImageCDNUrl 
     *
     * @memberOf common
     * @name  common#getUserImageCDNUrl
     * @method
     * 
     * @param  cr.User or user object
     * @return {string} image path or base64 image        
     */
    getUserImageCDNUrl: function (settings, groupid, user, size, bustCache) {
      // Show profile picture of user?
      if (user && user.picture)
        return imageHelper.getImageCDNUrl(settings, groupid, user.picture, size, bustCache);
      // Show avatar initials
      return imageHelper.getAvatarInitial(user.name, size);
    }
  };
}(common_image);
common_template = function (moment) {
  return {
    templateIsArchived: function (templ) {
      return !(templ.archived == null);
    },
    templateCanDelete: function (templ) {
      return !templ.system;
    },
    templateCanActivate: function (templ) {
      return templ.status == 'inactive' && templ.archived == null;
    },
    templateCanDeactivate: function (templ) {
      return templ.status == 'active' && templ.archived == null;
    },
    templateCanArchive: function (templ) {
      return templ.archived == null;
    },
    templateCanUndoArchive: function (templ) {
      return templ.archived != null;
    },
    /**
     * getFriendlyTemplateStatus
     *
     * @memberOf common
     * @name  common#getFriendlyTemplateStatus
     * @method
     * 
     * @param  {string} status
     * @return {string}        
     */
    getFriendlyTemplateStatus: function (status) {
      switch (status) {
      case 'inactive':
        return 'Inactive';
      case 'active':
        return 'Active';
      case 'archived':
        return 'Archived';
      default:
        return 'Unknown';
      }
    },
    /**
    * getFriendlyTemplateCss
    *
    * @memberOf common
    * @name  common#getFriendlyTemplateCss
    * @method
    * 
    * @param  {string} status 
    * @return {string}        
    */
    getFriendlyTemplateCss: function (status) {
      switch (status) {
      case 'inactive':
        return 'label-inactive';
      case 'active':
        return 'label-active';
      case 'archived':
        return 'label-archived';
      default:
        return '';
      }
    },
    /**
    * getFriendlyTemplateSize
    *
    * @memberOf common
    * @name  common#getFriendlyTemplateSize
    * @method
    * 
    * @param  {float} width
    * @param  {float} height
    * @param  {string} unit
    * @return {string}
    */
    getFriendlyTemplateSize: function (width, height, unit) {
      if (width == 0 || height == 0) {
        return '';
      } else if (unit == 'inch' && (width == 8.5 && height == 11 || width == 11 && height == 8.5)) {
        return 'US Letter';
      } else if (unit == 'inch' && (width == 11 && height == 17 || width == 17 && height == 11)) {
        return 'US Tabloid';
      } else if (unit == 'mm' && (width == 210 && height == 297 || width == 297 && height == 210)) {
        return 'A4';
      } else if (unit == 'cm' && (width == 21 && height == 29.7 || width == 29.7 && height == 21)) {
        return 'A4';
      } else {
        var friendlyUnit = unit == 'inch' ? '"' : unit;
        return width + friendlyUnit + ' x ' + height + friendlyUnit;
      }
    },
    /**
    * getPageSizes
    *
    * @memberOf common
    * @name  common#getPageSizes
    * @method
    * 
    * @return {array}
    */
    getPageSizes: function () {
      return [
        {
          id: 'letter',
          name: 'US Letter',
          width: 8.5,
          height: 11,
          unit: 'inch',
          layout: 'portrait',
          px: {
            width: 816,
            height: 1056
          }
        },
        {
          id: 'a4',
          name: 'A4',
          width: 210,
          height: 297,
          unit: 'mm',
          layout: 'portrait',
          px: {
            width: 793,
            height: 1122
          }
        },
        {
          id: 'tabloid',
          name: 'US Tabloid',
          width: 11,
          height: 17,
          unit: 'inch',
          layout: 'portrait',
          px: {
            width: 1056,
            height: 1632
          }
        },
        {
          id: 'label4x6',
          name: '4" x 6" Shipping Label',
          width: 4,
          height: 6,
          unit: 'inch',
          layout: 'portrait',
          px: {
            width: 384,
            height: 576
          }
        }
      ];
    },
    /**
    * getPageSize
    *
    * @memberOf common
    * @name  common#getPageSize
    * @method
    * 
    * @return {object}
    */
    getPageSize: function (unit, width, height) {
      var pageSizes = this.getPageSizes(), pageSize = null;
      // Portrait?
      pageSize = pageSizes.find(function (size) {
        return size.unit == unit && size.width == width && size.height == height;
      });
      if (pageSize)
        return pageSize;
      // Landscape?
      pageSize = pageSizes.find(function (size) {
        return size.unit == unit && size.width == height && size.height == width;
      });
      if (pageSize) {
        pageSize.layout = 'landscape';
        return pageSize;
      }
      // Unknown pagesize
      return null;
    }
  };
}(moment);
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
common_document = {
  /**
   * Checks if a given object (document) contains given value
   *
   * @memberOf common
   * @name  common#searchDocument
   * @method
   * 
   * @param  doc
   * @param  value
   * @param  fields  
   * @return Boolean       
   */
  containsValue: function (doc, value, fields) {
    doc = doc || {};
    fields = fields || [
      'name',
      'fields',
      'codes',
      'barcodes'
    ];
    // Trim search
    value = $.trim(value).toLowerCase();
    // Name contains value?
    if (fields.indexOf('name') != -1) {
      if (doc.name && doc.name.toLowerCase().indexOf(value) != -1)
        return true;
    }
    // Field contains value?
    if (fields.indexOf('fields') != -1) {
      if (doc.fields) {
        var findValue = Object.values(doc.fields).find(function (fieldValue) {
          return fieldValue.toString().toLowerCase().indexOf(value) != -1;
        });
        if (findValue) {
          return true;
        }
      }
    }
    // Code contains value?
    if (fields.indexOf('codes') != -1) {
      if (doc.codes) {
        var findValue = doc.codes.find(function (code) {
          return code.toLowerCase().indexOf(value) != -1;
        });
        if (findValue) {
          return true;
        }
      }
    }
    // Barcode contains value?
    if (fields.indexOf('barcodes') != -1) {
      if (doc.barcodes) {
        var findValue = doc.barcodes.find(function (code) {
          return code.toLowerCase().indexOf(value) != -1;
        });
        if (findValue) {
          return true;
        }
      }
    }
    return false;
  },
  /**
  * getDocumentIds
  * @memberOf common
  * @name  common#getDocumentIds
  * @method
  * @param  docs
  * @return {array}
   */
  getDocumentIds: function (docs) {
    return docs.map(function (doc) {
      return typeof doc === 'string' ? doc : doc._id;
    });
  }
};
common_transaction = function (moment, keyValues) {
  var that = {};
  /**
  * getTransactionSummary
  * Return a friendly summary for a given transaction or custom name
  *
  * @memberOf common
  * @name  common#getTransactionSummary
  * @method
  *
  * @param  {object} transaction
  * @param  {string} emptyText
  * @return {string}
  */
  that.getTransactionSummary = function (transaction, emptyText) {
    if (transaction) {
      if (transaction.name) {
        return transaction.name;
      } else if (transaction.itemSummary) {
        return transaction.itemSummary;
      } else if (transaction.items && transaction.items.length > 0) {
        return keyValues.getCategorySummary(transaction.items);
      }
    }
    return emptyText || 'No items';
  };
  /**
     * getOrderDuration
  * Gets a moment duration object
     *
  * @memberOf common
  * @name common#getOrderDuration
     * @method
  *
     * @returns {duration}
     */
  that.getOrderDuration = function (transaction) {
    var from = transaction.started || moment();
    var to = transaction.status == 'closed' ? transaction.finished : transaction.due;
    if (to) {
      return moment.duration(to - from);
    }
    return null;
  };
  /**
  * getFriendlyOrderDuration
  * Gets a friendly duration for a given order
  *
  * @memberOf common
  * @name common#getFriendlyOrderDuration
  * @method
  *
  * @param transaction
  * @param dateHelper
  * @returns {string}
  */
  that.getFriendlyOrderDuration = function (transaction, dateHelper) {
    var duration = that.getOrderDuration(transaction);
    return duration != null ? dateHelper.getFriendlyDuration(duration) : '';
  };
  /**
  * getReservationDuration
  * Return a Moment duration for a given reservation
  *
  * @memberOf common
  * @name common#getReservationDuration
  * @method
  *
  * @param transaction
  * @returns {duration}
  */
  that.getReservationDuration = function (transaction) {
    if (transaction) {
      if (transaction.fromDate != null && transaction.toDate != null) {
        return moment.duration(transaction.toDate - transaction.fromDate);
      }
      return null;
    }
  };
  /**
  * getFriendlyReservationDuration
  * Gets a friendly duration for a given reservation
  *
  * @memberOf common
  * @name common#getFriendlyReservationDuration
  * @method
  *
  * @param transaction
  * @param dateHelper
  * @returns {string}
  */
  that.getFriendlyReservationDuration = function (transaction, dateHelper) {
    var duration = that.getReservationDuration(transaction);
    return duration != null ? dateHelper.getFriendlyDuration(duration) : '';
  };
  return that;
}(moment, common_keyValues);
common_pubsub = function ($) {
  var o = $({});
  $.subscribe = function () {
    o.on.apply(o, arguments);
  };
  $.unsubscribe = function () {
    o.off.apply(o, arguments);
  };
  $.publish = function () {
    o.trigger.apply(o, arguments);
  };
}(jquery);
common = function ($, code, order, reservation, item, conflicts, keyvalues, image, attachment, inflection, validation, utils, slimdown, kit, contact, user, template, clientStorage, _document, transaction, ajaxQueue, pubsub) {
  /**
   * Return common object with different helper methods
   */
  return $.extend({}, code, order, reservation, item, conflicts, keyvalues, image, attachment, validation, utils, kit, contact, user, template, _document, transaction);
}(jquery, common_code, common_order, common_reservation, common_item, common_conflicts, common_keyValues, common_image, common_attachment, common_inflection, common_validation, common_utils, common_slimdown, common_kit, common_contact, common_user, common_template, common_clientStorage, common_document, common_transaction, common_queue, common_pubsub);
field = function ($, common) {
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
      return common.isNumeric(value);
    case 'int':
      return common.isNumeric(value, true);
    case 'date':
    case 'datetime':
      return common.isValidDate(value);
    case 'string':
    case 'select':
      if (this.editor == 'phone') {
        return common.isValidPhone(value);
      }
      if (this.editor == 'email') {
        return common.isValidEmail(value);
      }
      if (this.editor == 'url') {
        return common.isValidURL(value);
      }
      if (this.editor == 'number') {
        return common.isNumeric(value);
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
}(jquery, common);
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
        signupDevice: that.deviceKind
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