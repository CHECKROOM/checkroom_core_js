(function (factory) {
if (typeof define === 'function' && define.amd) {
define(['jquery', 'moment', 'jquery-jsonp', 'jquery-pubsub'], factory);
} else {
factory($, moment, jsonp, pubsub);
}
}(function (jquery, moment, jquery_jsonp, jquery_pubsub) {/**
 * Provides the classes needed to communicate with the CHECKROOM API
 * @module api
 * @namespace api
 * @copyright CHECKROOM NV 2015
 */
var api, settings, common_code, common_order, common_reservation, common_item, common_conflicts, common_keyValues, common_image, common_attachment, common_inflection, common_validation, common_utils, common_slimdown, common_kit, common_contact, common_user, common_template, common_clientStorage, common_document, common_transaction, common, document, Availability, Attachment, comment, attachment, field, Base, Category, Comment, Conflict, base, user, helper, Contact, DateHelper, Document, Group, Item, Kit, Location, location, dateHelper, transaction, conflict, Order, PermissionHandler, Reservation, Template, Transaction, User, UserSync, WebHook, OrderTransfer, core;
api = function ($, jsonp, moment) {
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
   * @param {boolean} spec.useJsonp
   * @constructor
   * @memberof api
   */
  api.ApiAjax = function (spec) {
    spec = spec || {};
    this.useJsonp = spec.useJsonp != null ? spec.useJsonp : true;
    this.timeOut = spec.timeOut || 10000;
    this.responseInTz = true;
  };
  api.ApiAjax.prototype.get = function (url, timeOut) {
    system.log('ApiAjax: get ' + url);
    return this.useJsonp ? this._getJsonp(url, timeOut) : this._getAjax(url, timeOut);
  };
  api.ApiAjax.prototype.post = function (url, data, timeOut) {
    system.log('ApiAjax: post ' + url);
    if (this.useJsonp) {
      throw 'ApiAjax cannot post while useJsonp is true';
    }
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
  api.ApiAjax.prototype._getJsonp = function (url, timeOut, opt) {
    var dfd = $.Deferred();
    var that = this;
    var xhr = $.jsonp({
      url: url,
      type: 'GET',
      timeout: timeOut || this.timeOut,
      dataType: ' jsonp',
      callbackParameter: 'callback',
      success: function (data, textStatus, xOptions) {
        return that._handleAjaxSuccess(dfd, data);
      },
      error: function (xOptions, textStatus) {
        // JSONP doesn't support HTTP status codes
        // https://github.com/jaubourg/jquery-jsonp/issues/37
        // so we can only return a simple error
        dfd.reject(new api.ApiError(null, opt));
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
    return this.userId && this.userId.length > 0 && this.userToken && this.userToken.length > 0;
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
  };
  api.ApiAuth.prototype.authenticate = function (userId, password) {
    system.log('ApiAuth: authenticate ' + userId);
    var url = this.urlAuth + '?' + $.param({
      user: userId,
      password: password,
      auth_v: 2,
      _v: this.version
    });
    var dfd = $.Deferred();
    this.ajax.get(url, 30000).done(function (resp) {
      if (resp.status == 'OK') {
        dfd.resolve(resp.data);
      } else {
        dfd.reject(resp);
      }
    }).fail(function (err) {
      dfd.reject(err);
    });
    return dfd.promise();
  };
  //*************
  // ApiAuth
  //*************
  /**
   * @name ApiAuthV2
   * @param {object}  spec
   * @param {string}  spec.urlAuth          - the api url to use when authenticating
   * @param {ApiAjax}  spec.ajax            - an ApiAjax object to use
   * @constructor
   * @memberof api
   * @example
   * var baseUrl = 'https://app.cheqroom.com/api/v2_0';
   * var userName = "";
   * var password = "";
   *
   * var ajax = new cr.api.ApiAjax({useJsonp: true});
   * var auth = new cr.api.ApiAuthV2({ajax: ajax, urlAuth: baseUrl + '/authenticate', version: '2.2.9.15'});
   * var authUser = null;
   *
   * auth.authenticate(userName, password)
   *     .done(function(data) {
   *         authUser = new cr.api.ApiUser({userId: data.userId, userToken: data.token});
   *     });
   *
   */
  api.ApiAuthV2 = function (spec) {
    spec = spec || {};
    this.urlAuth = spec.urlAuth || '';
    this.ajax = spec.ajax;
    this.version = spec.version;
  };
  /**
   * The call to authenticate a user with userid an dpassword
   * @method
   * @name ApiAuthV2#authenticate
   * @param userId
   * @param password
   * @returns {object}
   */
  api.ApiAuthV2.prototype.authenticate = function (userId, password) {
    system.log('ApiAuthV2: authenticate ' + userId);
    var url = this.urlAuth + '?' + $.param({
      user: userId,
      password: password,
      auth_v: 2,
      _v: this.version
    });
    var dfd = $.Deferred();
    this.ajax.get(url, 30000).done(function (resp) {
      // {"status": "OK", "message": "", "data": {"token": "547909916c092811d3bebcb4", "userid": "heavy"}
      // TODO: Handle case for password incorrect, no rights or subscription expired
      if (resp.status == 'OK') {
        dfd.resolve(resp.data);
      } else {
        // When account expired, /authenticate will respond with
        //{"status": "ERROR",
        // "message": "Trial subscription expired on 2015-07-03 09:25:30.668000+00:00. ",
        // "data": {...}}
        var error = null;
        if (resp.message && resp.message.indexOf('expired') > 0) {
          error = new api.ApiPaymentRequired(resp.message);
        } else {
          error = new Error('Your username or password is not correct');
        }
        dfd.reject(error);
      }
    }).fail(function (err) {
      dfd.reject(err);
    });
    return dfd.promise();
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
   * @param opt
   * @returns {*}
   */
  api.ApiAnonymous.prototype.call = function (method, params, timeOut, opt) {
    system.log('ApiAnonymous: call ' + method);
    if (this.version) {
      params = params || {};
      params['_v'] = this.version;
    }
    var url = this.urlApi + '/' + method + '?' + $.param(this.ajax._prepareDict(params));
    return this.ajax.get(url, timeOut, opt);
  };
  /**
   * Makes a long call (timeout 30s) to the API which doesn't require a token
   * @method
   * @name ApiAnonymous#longCall
   * @param method
   * @param params
   * @param opt
   * @returns {*}
   */
  api.ApiAnonymous.prototype.longCall = function (method, params, opt) {
    system.log('ApiAnonymous: longCall ' + method);
    return this.call(method, params, 30000, opt);
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
      // This doesn't work when not in JSONP mode!!
      // Since all errors are generic api.ApiErrors
      // In jsonp mode, if a GET fails, assume it didn't exist
      if (that.ajax.useJsonp) {
        dfd.resolve(null);
      } else if (error instanceof api.ApiNotFound) {
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
      if (that.ajax.useJsonp) {
        // In Jsonp mode, we cannot get other error messages than 500
        // We'll assume that it doesn't exist when we get an error
        // Jsonp is not really meant to run in production environment
        dfd.resolve(null);
      } else if (err instanceof api.ApiNotFound) {
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
    var url = this.getBaseUrl() + pks.join(',') + ',';
    var p = this.getParamsDict(fields);
    if (!$.isEmptyObject(p)) {
      url += '?' + this.getParams(p);
    }
    return this._ajaxGet(cmd, url);
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
  api.ApiDataSource.prototype.deleteMultiple = function (pks) {
    system.log('ApiDataSource: ' + this.collection + ': deleteMultiple ' + pks);
    var cmd = 'deleteMultiple';
    var url = this.getBaseUrl() + pks.join(',') + '/delete';
    return this._ajaxGet(cmd, url);
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
   * Makes a long call (timeout 30s) to a certain method on an object or on the entire collection
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
    return this.call(pk, method, params, fields, 30000, usePost);
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
}(jquery, jquery_jsonp, moment);
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
    return barCode && barCode.length != 8 && barCode.match(/^[A-Z0-9\-]{4,13}$/i) != null;
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
    return qrCode && qrCode.match(/^http:\/\/cheqroom\.com\/qr\/[a-z0-9]{8}$/i) != null;
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
        return this.getFriendlyOrderCss(order.status) + ' label-striped';
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
      return 'Completed';
    case 'cancelled':
      return 'Cancelled';
    default:
      return 'Unknown';
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
    return reservation.status == 'open' && now.isAfter(reservation.fromDate);
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
    if (this.isOrderArchived(reservation)) {
      return this.getFriendlyReservationCss(reservation.status) + ' label-striped';
    } else {
      return this.getFriendlyReservationCss(reservation.status);
    }
  }
};
common_item = function () {
  var that = {};
  that.itemCanTakeCustody = function (item) {
    return item.status == 'available';
  };
  that.itemCanReleaseCustody = function (item) {
    return item.status == 'in_custody';
  };
  that.itemCanTransferCustody = function (item) {
    return item.status == 'in_custody';
  };
  that.itemCanReserve = function (item) {
    return item.status != 'expired' && item.status != 'in_custody';
  };
  that.itemCanCheckout = function (item) {
    return item.status == 'available';
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
      var sizes = {
        'XS': 32,
        'S': 64,
        'M': 128,
        'L': 256,
        'XL': 512
      };
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
      context.fillStyle = '#f5f5f5';
      context.fillRect(0, 0, canvasWidth, canvasHeight);
      context.font = canvasWidth / 2 + 'px FontAwesome';
      context.textAlign = 'center';
      context.fillStyle = '#aaa';
      context.fillText(String.fromCharCode('0xf0ad'), canvasCssWidth / 2, canvasCssHeight / 1.5);
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
      if (size) {
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
      var url = 'https://cheqroom-cdn.s3.amazonaws.com/' + settings.amazonBucket + '/groups/' + groupId + '/' + attachmentId;
      if (size && size.length > 0) {
        var parts = url.split('.');
        var ext = attachmentId.indexOf('.') != -1 ? parts.pop() : '';
        // pop off the extension, we'll change it
        url = parts.join('.') + '-' + size + '.jpg';  // resized images are always jpg
      }
      return url;
    },
    getNoImage: function (size) {
      var sizes = {
        'XS': 64,
        'S': 128,
        'M': 256,
        'L': 512,
        'XL': 1024
      };
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
      context.fillStyle = 'rgba(255,255,255,0.5)';
      context.fillRect(0, 0, canvasWidth, canvasHeight);
      context.font = canvasWidth / 2 + 'px FontAwesome';
      context.textAlign = 'center';
      context.fillStyle = 'rgba(0,0,0,0.2)';
      context.fillText(String.fromCharCode('0xf03e'), canvasCssWidth / 2, canvasCssHeight / 1.5);
      return $canvas.get(0).toDataURL();
    }
  };
}(jquery);
common_attachment = function (moment) {
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
}();
common_validation = {
  /**
   * isValidEmail
   * @memberOf common
   * @name  common#isValidEmail
   * @method
   * @param  {string}  email 
   * @return {Boolean}       
   */
  isValidEmail: function (email) {
    var re = /^([\w-\+]+(?:\.[\w-\+]+)*)@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$/i;
    return re.test(email);
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
    var re = /^([\w-\+]+(?:\.[\w-\+]+)*)@(?!gmail\.com)(?!yahoo\.com)(?!hotmail\.com)((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$/i;
    return !re.test(email);
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
    var isnum = /^\d{9,}$/.test(phone);
    if (isnum) {
      return true;
    }
    var m = phone.match(/^[\s()+-]*([0-9][\s()+-]*){10,20}(( x| ext)\d{1,5}){0,1}$/);
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
    var re = /^(https?|ftp):\/\/([a-zA-Z0-9.-]+(:[a-zA-Z0-9.&%$-]+)*@)*((25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9][0-9]?)(\.(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])){3}|([a-zA-Z0-9-]+\.)*[a-zA-Z0-9-]+\.(com|edu|gov|int|mil|net|org|biz|arpa|info|name|pro|aero|coop|museum|[a-zA-Z]{2}))(:[0-9]+)*(\/($|[a-zA-Z0-9.,?'\\+&%$#=~_-]+))*$/;
    return re.test(url);
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
  }
};
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
      return '100+';
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
    return firstName.latinise().toLowerCase().replace(patt, '') + '.' + lastName.latinise().toLowerCase().replace(patt, '');
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
      });
    } else {
      return [];
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
        regex: /(#+)(.*)/g,
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
        regex: /\n[0-9]+\.(.*)/g,
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
        regex: /\n([^\n]+)\n/g,
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
      this.rules.forEach(function (rule) {
        text = text.replace(rule.regex, rule.replacement);
      });
      return text.trim();
    };
    function para(text, line) {
      var trimmed = line.trim();
      if (/^<\/?(ul|ol|li|h|p|bl)/i.test(trimmed)) {
        return '\n' + line + '\n';
      }
      return '\n<p>' + trimmed + '</p>\n';
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
    return common.getAvailableItems(kit.items || []).length > 0;
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
    return common.getActiveItems(kit.items || []).length > 0;
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
    return kit.status == 'available';
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
    return kit.status == 'in_custody';
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
    return kit.status == 'in_custody';
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
common_contact = function (imageHelper) {
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
    return !that.contactGetUserId(contact);
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
    // Show maintenance avatar?
    if (contact.kind == 'maintenance')
      return imageHelper.getMaintenanceAvatar(size);
    // Show profile picture of user?
    if (contact.user && contact.user.picture)
      return imageHelper.getImageUrl(ds, contact.user.picture, size, bustCache);
    // Show avatar initials
    return imageHelper.getAvatarInitial(contact.name, size);
  };
  return that;
}(common_image);
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
      } else if (unit == 'inch' && width == 8.5 && height == 11) {
        return 'US Letter';
      } else if (unit == 'mm' && width == 210 && height == 297) {
        return 'A4';
      } else {
        var friendlyUnit = unit == 'inch' ? '"' : unit;
        return width + friendlyUnit + ' x ' + height + friendlyUnit;
      }
    }
  };
}(moment);
common_clientStorage = function () {
  var setItem = localStorage.setItem, getItem = localStorage.getItem, removeItem = localStorage.removeItem;
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
      //console.log(e);
      return false;
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
      //console.log(e);
      return false;
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
          return fieldValue.toString().indexOf(value) != -1;
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
          return code.indexOf(value) != -1;
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
          return code.indexOf(value) != -1;
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
    if (transaction.started != null) {
      var to = transaction.status == 'closed' ? transaction.finished : transaction.due;
      if (to) {
        return moment.duration(to - transaction.started);
      }
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
common = function ($, code, order, reservation, item, conflicts, keyvalues, image, attachment, inflection, validation, utils, slimdown, kit, contact, user, template, clientStorage, _document, transaction) {
  /**
   * Return common object with different helper methods
   */
  return $.extend({}, code, order, reservation, item, conflicts, keyvalues, image, attachment, validation, utils, kit, contact, user, template, _document, transaction);
}(jquery, common_code, common_order, common_reservation, common_item, common_conflicts, common_keyValues, common_image, common_attachment, common_inflection, common_validation, common_utils, common_slimdown, common_kit, common_contact, common_user, common_template, common_clientStorage, common_document, common_transaction);
document = function ($, common, api) {
  // Some constant values
  var DEFAULTS = { id: '' };
  /**
   * @name Document
   * @class
   * @constructor
   * @property {ApiDataSource}  ds        - The documents primary key
   * @property {array}  _fields           - The raw, unprocessed json response
   * @property {string}  id               - The documents primary key
   * @property {string}  raw              - The raw, unprocessed json response
   */
  var Document = function (spec) {
    this.raw = null;
    // raw json object
    this.id = spec.id || DEFAULTS.id;
    // doc _id
    this.ds = spec.ds;
    // ApiDataSource object
    this._fields = spec._fields;  // e.g. [*]
  };
  /**
   * Resets the object
   * @name  Document#reset
   * @method
   * @returns {promise}
   */
  Document.prototype.reset = function () {
    // By default, reset just reads from the DEFAULTS dict again
    return this._fromJson(this._getDefaults(), null);
  };
  /**
   * Checks if the document exists in the database
   * @name  Document#existsInDb
   * @method
   * @returns {boolean}
   */
  Document.prototype.existsInDb = function () {
    // Check if we have a primary key
    return this.id != null && this.id.length > 0;
  };
  /**
   * Checks if the object is empty
   * @name  Document#isEmpty
   * @method
   * @returns {boolean}
   */
  Document.prototype.isEmpty = function () {
    return true;
  };
  /**
   * Checks if the object needs to be saved
   * We don't check any of the keyvalues (or comments, attachments) here
   * @name  Document#isDirty
   * @method
   * @returns {boolean}
   */
  Document.prototype.isDirty = function () {
    return false;
  };
  /**
   * Checks if the object is valid
   * @name  Document#isValid
   * @method
   * @returns {boolean}
   */
  Document.prototype.isValid = function () {
    return true;
  };
  /**
   * Discards any changes made to the object from the previously loaded raw response
   * or resets it when no old raw response was found
   * @name  Document#discardChanges
   * @method
   * @returns {promise}
   */
  Document.prototype.discardChanges = function () {
    return this.raw ? this._fromJson(this.raw, null) : this.reset();
  };
  /**
   * Reloads the object from db
   * @name  Document#reload
   * @method
   * @param _fields
   * @returns {promise}
   */
  Document.prototype.reload = function (_fields) {
    if (this.existsInDb()) {
      return this.get(_fields);
    } else {
      return $.Deferred().reject(new api.ApiError('Cannot reload document, id is empty or null'));
    }
  };
  /**
   * Gets an object by the default api.get
   * @name  Document#get
   * @method
   * @param _fields
   * @returns {promise}
   */
  Document.prototype.get = function (_fields) {
    if (this.existsInDb()) {
      var that = this;
      return this.ds.get(this.id, _fields || this._fields).then(function (data) {
        return that._fromJson(data);
      });
    } else {
      return $.Deferred().reject(new api.ApiError('Cannot get document, id is empty or null'));
    }
  };
  /**
   * Creates an object by the default api.create
   * @name  Document#create
   * @method
   * @param skipRead skips reading the response via _fromJson (false)
   * @returns {promise}
   */
  Document.prototype.create = function (skipRead) {
    if (this.existsInDb()) {
      return $.Deferred().reject(new Error('Cannot create document, already exists in database'));
    }
    if (this.isEmpty()) {
      return $.Deferred().reject(new Error('Cannot create empty document'));
    }
    if (!this.isValid()) {
      return $.Deferred().reject(new Error('Cannot create, invalid document'));
    }
    return this._create(skipRead);
  };
  /**
   * Updates an object by the default api.update
   * @name  Document#update
   * @method
   * @param skipRead skips reading the response via _fromJson (false)
   * @returns {promise}
   */
  Document.prototype.update = function (skipRead) {
    if (!this.existsInDb()) {
      return $.Deferred().reject(new Error('Cannot update document without id'));
    }
    if (this.isEmpty()) {
      return $.Deferred().reject(new Error('Cannot update to empty document'));
    }
    if (!this.isValid()) {
      return $.Deferred().reject(new Error('Cannot update, invalid document'));
    }
    return this._update(skipRead);
  };
  /**
   * Deletes an object by the default api.delete
   * @name  Document#delete
   * @method
   * @returns {promise}
   */
  Document.prototype.delete = function () {
    // Call the api /delete on this document
    if (this.existsInDb()) {
      return this._delete();
    } else {
      return $.Deferred().reject(new Error('Document does not exist'));
    }
  };
  // toJson, fromJson
  // ----
  Document.prototype._getDefaults = function () {
    return DEFAULTS;
  };
  /**
   * _toJson, makes a dict of this object
   * Possibly inheriting classes will override this method,
   * because not all fields can be set during create / update
   * @method
   * @param options
   * @returns {{}}
   * @private
   */
  Document.prototype._toJson = function (options) {
    return { id: this.id };
  };
  /**
   * _fromJson: in this implementation we'll only read
   * the data.keyValues into: comments, attachments, keyValues
   * @method
   * @param {object} data the json response
   * @param {object} options dict
   * @private
   */
  Document.prototype._fromJson = function (data, options) {
    this.raw = data;
    this.id = data._id || DEFAULTS.id;
    return $.Deferred().resolve(data);
  };
  // Implementation stuff
  // ---
  /**
   * The actual _create implementation (after all the checks are done)
   * @param skipRead
   * @returns {*}
   * @private
   */
  Document.prototype._create = function (skipRead) {
    var that = this;
    var data = this._toJson();
    delete data.id;
    return this.ds.create(data, this._fields).then(function (data) {
      return skipRead == true ? data : that._fromJson(data);
    });
  };
  /**
   * The actual _update implementation (after all the checks are done)
   * @param skipRead
   * @returns {*}
   * @private
   */
  Document.prototype._update = function (skipRead) {
    var that = this;
    var data = this._toJson();
    delete data.id;
    return this.ds.update(this.id, data, this._fields).then(function (data) {
      return skipRead == true ? data : that._fromJson(data);
    });
  };
  /**
   * The actual _delete implementation (after all the checks are done)
   * @returns {*}
   * @private
   */
  Document.prototype._delete = function () {
    var that = this;
    return this.ds.delete(this.id).then(function () {
      return that.reset();
    });
  };
  /**
   * Helper for checking if a simple object property is dirty
   * compared to the original raw result
   * @param prop
   * @returns {boolean}
   * @private
   */
  Document.prototype._isDirtyProperty = function (prop) {
    return this.raw ? this[prop] != this.raw[prop] : false;
  };
  /**
   * Helper for checking if a simple object property is dirty
   * compared to the original raw result
   * Because we know that the API doesn't return empty string properties,
   * we do a special, extra check on that.
   * @param prop
   * @returns {boolean}
   * @private
   */
  Document.prototype._isDirtyStringProperty = function (prop) {
    if (this.raw) {
      var same = this[prop] == this.raw[prop] || this[prop] == '' && this.raw[prop] == null;
      return !same;
    } else {
      return false;
    }
  };
  /**
   * Helper for checking if a simple object property is dirty
   * compared to the original raw result
   * @param prop
   * @returns {boolean}
   * @private
   */
  Document.prototype._isDirtyMomentProperty = function (prop) {
    if (this.raw) {
      var newVal = this[prop], oldVal = this.raw[prop];
      if (newVal == null && oldVal == null) {
        return false;
      } else if (newVal && oldVal) {
        return !newVal.isSame(oldVal);
      } else {
        return true;
      }
    } else {
      return false;
    }
  };
  /**
   * Gets the id of a document
   * @param obj
   * @param prop
   * @returns {string}
   * @private
   */
  Document.prototype._getId = function (obj, prop) {
    return typeof obj === 'string' ? obj : obj[prop || '_id'];
  };
  Document.prototype._getIds = function (objs, prop) {
    return objs.map(function (obj) {
      return typeof obj == 'string' ? obj : obj[prop || '_id'];
    });
  };
  /**
   * Wrapping the this.ds.call method
   * {pk: '', method: '', params: {}, _fields: '', timeOut: null, usePost: null, skipRead: null}
   * @method
   * @param spec
   * @returns {promise}
   * @private
   */
  Document.prototype._doApiCall = function (spec) {
    var that = this;
    return this.ds.call(spec.collectionCall == true ? null : spec.pk || this.id, spec.method, spec.params, spec._fields || this._fields, spec.timeOut, spec.usePost).then(function (data) {
      return spec.skipRead == true ? data : that._fromJson(data);
    });
  };
  return Document;
}(jquery, common, api);
Availability = function ($, common, api, Document) {
  // Some constant values
  var DEFAULTS = {
    id: '',
    planning: '',
    item: '',
    from: null,
    to: null,
    order: '',
    reservation: ''
  };
  // Allow overriding the ctor during inheritance
  // http://stackoverflow.com/questions/4152931/javascript-inheritance-call-super-constructor-or-use-prototype-chain
  var tmp = function () {
  };
  tmp.prototype = Document.prototype;
  /**
   * Availability represents the **un**availability of an Item between two dates
   * Each of these unavailable timeslots have a reference to an Order or
   * a Reservation for which it's or will be booked
   *
   * @name  Availability
   * @class
   * @property {string} planning     the planning primary key
   * @property {string} item         the item primary key
   * @property {Moment} from         the from date
   * @property {Moment} to           the to date
   * @property {string} order        the order primary key (if any)
   * @property {string} reservation  the reservation primary key (if any)
   * @constructor
   * @extends Document
   */
  var Availability = function (opt) {
    var spec = $.extend({}, opt);
    Document.call(this, spec);
    this.planning = spec.planning || DEFAULTS.planning;
    this.item = spec.item || DEFAULTS.item;
    this.from = spec.from || DEFAULTS.from;
    this.to = spec.to || DEFAULTS.to;
    this.order = spec.order || DEFAULTS.order;
    this.reservation = spec.reservation || DEFAULTS.reservation;
  };
  Availability.prototype = new tmp();
  Availability.prototype.constructor = Availability;
  //
  // Document overrides
  //
  Availability.prototype._getDefaults = function () {
    return DEFAULTS;
  };
  /**
   * Checks if the object is empty, it never is
   * @name  Availability#isEmpty
   * @method
   * @returns {boolean}
   * @override
   */
  Availability.prototype.isEmpty = function () {
    // An Availability is never empty because it's generated on the server side
    return false;
  };
  /**
   * Checks via the api if we can delete the Availability document
   * @name  Availability#canDelete
   * @method
   * @returns {promise}
   * @override
   */
  Availability.prototype.canDelete = function () {
    // An Availability can never be deleted
    return $.Deferred().resolve(false);
  };
  // toJson, fromJson
  // ----
  /**
   * _toJson, makes a dict of params to use during create / update
   * @param options
   * @returns {{}}
   * @private
   */
  Availability.prototype._toJson = function (options) {
    var data = Document.prototype._toJson.call(this, options);
    data.planning = this.planning;
    data.item = this.item;
    data.fromDate = this.from;
    data.toDate = this.to;
    data.order = this.order;
    data.reservation = this.reservation;
    return data;
  };
  /**
   * _fromJson: read some basic information
   * @method
   * @param {object} data the json response
   * @param {object} options dict
   * @returns {Promise}
   * @private
   */
  Availability.prototype._fromJson = function (data, options) {
    var that = this;
    return Document.prototype._fromJson.call(this, data, options).then(function () {
      that.planning = data.planning || DEFAULTS.planning;
      that.item = data.item || DEFAULTS.item;
      that.from = data.fromDate || DEFAULTS.from;
      that.to = data.toDate || DEFAULTS.to;
      that.order = data.order || DEFAULTS.order;
      that.reservation = data.reservation || DEFAULTS.reservation;
      return data;
    });
  };
  return Availability;
}(jquery, common, api, document);
Attachment = function ($) {
  var EXT = /(?:\.([^.]+))?$/;
  var IMAGES = [
    'jpg',
    'jpeg',
    'png'
  ];
  var PREVIEWS = [
    'jpg',
    'jpeg',
    'png',
    'doc',
    'docx',
    'pdf'
  ];
  var DEFAULTS = {
    fileName: '',
    fileSize: 0,
    isCover: false,
    canBeCover: true
  };
  /**
   * @name  Attachment
   * @class
   * @property {ApiDataSource} ds    attachments datasource
   * @property {bool} isCover        is this the cover image of a document
   * @property {bool} canBeCover     can this attachment be the cover of a document?
   * @constructor
   */
  var Attachment = function (spec) {
    spec = spec || {};
    this.ds = spec.ds;
    this.raw = null;
    // the raw json object
    this.fileName = spec.fileName || DEFAULTS.fileName;
    this.fileSize = spec.fileSize || DEFAULTS.fileSize;
    this.value = spec.value || DEFAULTS.value;
    this.created = spec.created || DEFAULTS.created;
    this.by = spec.by || DEFAULTS.by;
    this.isCover = spec.isCover != null ? spec.isCover : DEFAULTS.isCover;
    this.canBeCover = spec.canBeCover != null ? spec.canBeCover : DEFAULTS.canBeCover;
  };
  /**
   * Gets the url of a thumbnail
   * "XS": 32,
   * "S": 64,
   * "M": 128,
   * "L": 256,
   * "XL": 512
   * "orig": original size
   * @name Attachment#getThumbnailUrl
   * @method
   * @param size
   * @returns {string}
   */
  Attachment.prototype.getThumbnailUrl = function (size) {
    return this.hasPreview() ? this.helper.getImageUrl(this.ds, this.value, size || 'S') : '';
  };
  /**
   * Gets the url where the attachment can be downloaded
   * @name Attachment#getDownloadUrl
   * @method
   * @returns {string}
   */
  Attachment.prototype.getDownloadUrl = function () {
    return this.ds.getBaseUrl() + this.value + '?download=True';
  };
  /**
   * Gets the extension part of a filename
   * @name  Attachment#getExt
   * @method
   * @param fileName
   * @returns {string}
   */
  Attachment.prototype.getExt = function (fileName) {
    fileName = fileName || this.fileName;
    return EXT.exec(fileName)[1] || '';
  };
  /**
   * Gets a friendly file size
   * @param  {int} size 
   * @return {string}      
   */
  Attachment.prototype.getFriendlyFileSize = function () {
    var size = this.fileSize;
    if (isNaN(size))
      size = 0;
    if (size < 1024)
      return size + ' Bytes';
    size /= 1024;
    if (size < 1024)
      return size.toFixed(2) + ' Kb';
    size /= 1024;
    if (size < 1024)
      return size.toFixed(2) + ' Mb';
    size /= 1024;
    if (size < 1024)
      return size.toFixed(2) + ' Gb';
    size /= 1024;
    return size.toFixed(2) + ' Tb';
  };
  /**
   * Checks if the attachment is an image
   * @name  Attachment#isImage
   * @method
   * @returns {boolean}
   */
  Attachment.prototype.isImage = function () {
    var ext = this.getExt(this.fileName);
    return $.inArray(ext, IMAGES) >= 0;
  };
  /**
   * Checks if the attachment has a preview
   * @name  Attachment#hasPreview
   * @method
   * @returns {boolean}
   */
  Attachment.prototype.hasPreview = function () {
    var ext = this.getExt(this.fileName);
    return $.inArray(ext, PREVIEWS) >= 0;
  };
  /**
   * _toJson, makes a dict of the object
   * @method
   * @param options
   * @returns {object}
   * @private
   */
  Attachment.prototype._toJson = function (options) {
    return {
      fileName: this.fileName,
      fileSize: this.fileSize,
      value: this.value,
      created: this.created,
      by: this.by
    };
  };
  /**
   * _fromJson: reads the Attachment object from json
   * @method
   * @param {object} data the json response
   * @param {object} options dict
   * @returns promise
   * @private
   */
  Attachment.prototype._fromJson = function (data, options) {
    this.raw = data;
    this.fileName = data.fileName || DEFAULTS.fileName;
    this.fileSize = data.fileSize || DEFAULTS.fileSize;
    this.value = data.value || DEFAULTS.value;
    this.created = data.created || DEFAULTS.created;
    this.by = data.by || DEFAULTS.by;
    return $.Deferred().resolve(data);
  };
  return Attachment;
}(jquery);
comment = function ($) {
  var DEFAULTS = {
    id: '',
    value: null,
    created: null,
    modified: null,
    by: null
  };
  /**
   * @name  Comment
   * @class
   * @param spec
   * @constructor
   */
  var Comment = function (spec) {
    spec = spec || {};
    this.ds = spec.ds;
    this.raw = null;
    // the raw json object
    this.id = spec.id || DEFAULTS.id;
    this.value = spec.value || DEFAULTS.value;
    this.created = spec.created || DEFAULTS.created;
    this.modified = spec.modified || DEFAULTS.modified;
    this.by = spec.by || DEFAULTS.by;
    this.fromReservation = spec.fromReservation || false;
  };
  /**
   * _toJson, makes a dict of the object
   * @method
   * @param options
   * @returns {object}
   * @private
   */
  Comment.prototype._toJson = function (options) {
    return {
      id: this.id,
      value: this.value,
      created: this.created,
      modified: this.modified,
      by: this.by
    };
  };
  /**
   * _fromJson: reads the Comment object from json
   * @method
   * @param {object} data the json response
   * @param {object} options dict
   * @returns promise
   * @private
   */
  Comment.prototype._fromJson = function (data, options) {
    this.raw = data;
    this.id = data.id || DEFAULTS.id;
    this.value = data.value || DEFAULTS.value;
    this.created = data.created || DEFAULTS.created;
    this.modified = data.modified || DEFAULTS.modified;
    this.by = data.by || DEFAULTS.by;
    return $.Deferred().resolve(data);
  };
  return Comment;
}(jquery);
attachment = function ($) {
  var EXT = /(?:\.([^.]+))?$/;
  var IMAGES = [
    'jpg',
    'jpeg',
    'png'
  ];
  var PREVIEWS = [
    'jpg',
    'jpeg',
    'png',
    'doc',
    'docx',
    'pdf'
  ];
  var DEFAULTS = {
    fileName: '',
    fileSize: 0,
    isCover: false,
    canBeCover: true
  };
  /**
   * @name  Attachment
   * @class
   * @property {ApiDataSource} ds    attachments datasource
   * @property {bool} isCover        is this the cover image of a document
   * @property {bool} canBeCover     can this attachment be the cover of a document?
   * @constructor
   */
  var Attachment = function (spec) {
    spec = spec || {};
    this.ds = spec.ds;
    this.raw = null;
    // the raw json object
    this.fileName = spec.fileName || DEFAULTS.fileName;
    this.fileSize = spec.fileSize || DEFAULTS.fileSize;
    this.value = spec.value || DEFAULTS.value;
    this.created = spec.created || DEFAULTS.created;
    this.by = spec.by || DEFAULTS.by;
    this.isCover = spec.isCover != null ? spec.isCover : DEFAULTS.isCover;
    this.canBeCover = spec.canBeCover != null ? spec.canBeCover : DEFAULTS.canBeCover;
  };
  /**
   * Gets the url of a thumbnail
   * "XS": 32,
   * "S": 64,
   * "M": 128,
   * "L": 256,
   * "XL": 512
   * "orig": original size
   * @name Attachment#getThumbnailUrl
   * @method
   * @param size
   * @returns {string}
   */
  Attachment.prototype.getThumbnailUrl = function (size) {
    return this.hasPreview() ? this.helper.getImageUrl(this.ds, this.value, size || 'S') : '';
  };
  /**
   * Gets the url where the attachment can be downloaded
   * @name Attachment#getDownloadUrl
   * @method
   * @returns {string}
   */
  Attachment.prototype.getDownloadUrl = function () {
    return this.ds.getBaseUrl() + this.value + '?download=True';
  };
  /**
   * Gets the extension part of a filename
   * @name  Attachment#getExt
   * @method
   * @param fileName
   * @returns {string}
   */
  Attachment.prototype.getExt = function (fileName) {
    fileName = fileName || this.fileName;
    return EXT.exec(fileName)[1] || '';
  };
  /**
   * Gets a friendly file size
   * @param  {int} size 
   * @return {string}      
   */
  Attachment.prototype.getFriendlyFileSize = function () {
    var size = this.fileSize;
    if (isNaN(size))
      size = 0;
    if (size < 1024)
      return size + ' Bytes';
    size /= 1024;
    if (size < 1024)
      return size.toFixed(2) + ' Kb';
    size /= 1024;
    if (size < 1024)
      return size.toFixed(2) + ' Mb';
    size /= 1024;
    if (size < 1024)
      return size.toFixed(2) + ' Gb';
    size /= 1024;
    return size.toFixed(2) + ' Tb';
  };
  /**
   * Checks if the attachment is an image
   * @name  Attachment#isImage
   * @method
   * @returns {boolean}
   */
  Attachment.prototype.isImage = function () {
    var ext = this.getExt(this.fileName);
    return $.inArray(ext, IMAGES) >= 0;
  };
  /**
   * Checks if the attachment has a preview
   * @name  Attachment#hasPreview
   * @method
   * @returns {boolean}
   */
  Attachment.prototype.hasPreview = function () {
    var ext = this.getExt(this.fileName);
    return $.inArray(ext, PREVIEWS) >= 0;
  };
  /**
   * _toJson, makes a dict of the object
   * @method
   * @param options
   * @returns {object}
   * @private
   */
  Attachment.prototype._toJson = function (options) {
    return {
      fileName: this.fileName,
      fileSize: this.fileSize,
      value: this.value,
      created: this.created,
      by: this.by
    };
  };
  /**
   * _fromJson: reads the Attachment object from json
   * @method
   * @param {object} data the json response
   * @param {object} options dict
   * @returns promise
   * @private
   */
  Attachment.prototype._fromJson = function (data, options) {
    this.raw = data;
    this.fileName = data.fileName || DEFAULTS.fileName;
    this.fileSize = data.fileSize || DEFAULTS.fileSize;
    this.value = data.value || DEFAULTS.value;
    this.created = data.created || DEFAULTS.created;
    this.by = data.by || DEFAULTS.by;
    return $.Deferred().resolve(data);
  };
  return Attachment;
}(jquery);
field = function ($) {
  var DEFAULTS = {
    name: null,
    value: null,
    required: false,
    unit: '',
    kind: 'string',
    form: false,
    editor: null,
    description: ''
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
  };
  /**
   * isValid
   * @name  Field#isValid
   * @method
   * @returns {boolean}
   */
  Field.prototype.isValid = function () {
    if (!this.required)
      return true;
    return $.trim(this.value) != '';
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
}(jquery);
Base = function ($, common, api, Document, Comment, Attachment, Field) {
  // Some constant values
  var DEFAULTS = {
    id: '',
    modified: null,
    cover: null,
    flag: null,
    fields: {},
    comments: [],
    attachments: [],
    barcodes: []
  };
  // Allow overriding the ctor during inheritance
  // http://stackoverflow.com/questions/4152931/javascript-inheritance-call-super-constructor-or-use-prototype-chain
  var tmp = function () {
  };
  tmp.prototype = Document.prototype;
  /**
   * @name  Base
   * @class
   * @property {ApiDataSource} dsAttachments   attachments datasource
   * @property {string} crtype                 e.g. cheqroom.types.customer
   * @property {moment} modified               last modified timestamp
   * @property {string} flag                   the document flag
   * @property {object} fields                 dictionary of document fields
   * @property {array} comments                array of Comment objects
   * @property {array} attachments             array of Attachment objects
   * @property {string} cover                  cover attachment id, default null
   * @constructor
   * @extends Document
   */
  var Base = function (opt) {
    var spec = $.extend({}, opt);
    Document.call(this, spec);
    this.dsAttachments = spec.dsAttachments;
    // ApiDataSource for the attachments coll
    this.crtype = spec.crtype;
    // e.g. cheqroom.types.customer
    this.modified = spec.modified || DEFAULTS.modified;
    // last modified timestamp in momentjs
    this.flag = spec.flag || DEFAULTS.flag;
    // flag
    this.fields = spec.fields || $.extend({}, DEFAULTS.fields);
    // fields dictionary
    this.comments = spec.comments || DEFAULTS.comments.slice();
    // comments array
    this.attachments = spec.attachments || DEFAULTS.attachments.slice();
    // attachments array
    this.cover = spec.cover || DEFAULTS.cover;
    // cover attachment id, default null
    this.barcodes = spec.barcodes || DEFAULTS.barcodes.slice();  // barcodes array
  };
  Base.prototype = new tmp();
  Base.prototype.constructor = Base;
  //
  // Document overrides
  //
  Base.prototype._getDefaults = function () {
    return DEFAULTS;
  };
  /**
   * Checks if the object is empty
   * after calling reset() isEmpty() should return true
   * We'll only check for fields, comments, attachments here
   * @name  Base#isEmpty
   * @method
   * @returns {boolean}
   * @override
   */
  Base.prototype.isEmpty = function () {
    return this.flag == DEFAULTS.flag && (this.fields == null || Object.keys(this.fields).length == 0) && (this.comments == null || this.comments.length == 0) && (this.attachments == null || this.attachments.length == 0);
  };
  /**
   * Checks if the base is dirty and needs saving
   * @name Base#isDirty
   * @returns {boolean}
   */
  Base.prototype.isDirty = function () {
    return this._isDirtyFlag() || this._isDirtyFields();
  };
  /**
   * Checks via the api if we can delete the document
   * @name  Base#canDelete
   * @method
   * @returns {promise}
   * @override
   */
  Base.prototype.canDelete = function () {
    // Documents can only be deleted when they have a pk
    if (this.existsInDb()) {
      return this.ds.call(this.id, 'canDelete');
    } else {
      return $.Deferred().resolve({
        result: false,
        message: ''
      });
    }
  };
  // Comments
  // ----
  /**
   * Adds a comment by string
   * @name  Base#addComment
   * @method
   * @param comment
   * @param skipRead
   * @returns {promise}
   */
  Base.prototype.addComment = function (comment, skipRead) {
    return this._doApiCall({
      method: 'addComment',
      params: { comment: comment },
      skipRead: skipRead
    });
  };
  /**
   * Updates a comment by id
   * @name  Base#updateComment
   * @method
   * @param id
   * @param comment
   * @param skipRead
   * @returns {promise}
   */
  Base.prototype.updateComment = function (id, comment, skipRead) {
    return this._doApiCall({
      method: 'updateComment',
      params: {
        commentId: id,
        comment: comment
      },
      skipRead: skipRead
    });
  };
  /**
   * Deletes a Comment by id
   * @name  Base#deleteComment
   * @method
   * @param id
   * @param skipRead
   * @returns {promise}
   */
  Base.prototype.deleteComment = function (id, skipRead) {
    return this._doApiCall({
      method: 'removeComment',
      params: { commentId: id },
      skipRead: skipRead
    });
  };
  // Field stuff
  // ----
  /**
   * Sets multiple custom fields in a single call
   * @name Base#setFields
   * @method
   * @param fields
   * @param skipRead
   * @returns {promise}
   */
  Base.prototype.setFields = function (fields, skipRead) {
    var that = this, changedFields = {};
    $.each(fields, function (key, value) {
      if (that.raw.fields[key] != fields[key]) {
        changedFields[key] = value;
      }
    });
    return this._doApiCall({
      method: 'setFields',
      params: { fields: changedFields },
      skipRead: skipRead,
      usePost: true
    });
  };
  /**
   * Sets a custom field
   * @name Base#setField
   * @method
   * @param field
   * @param value
   * @param skipRead
   * @returns {promise}
   */
  Base.prototype.setField = function (field, value, skipRead) {
    return this._doApiCall({
      method: 'setField',
      params: {
        field: field,
        value: value
      },
      skipRead: skipRead
    });
  };
  /**
   * Clears a custom field
   * @name Base#clearField
   * @method
   * @param field
   * @param skipRead
   */
  Base.prototype.clearField = function (field, skipRead) {
    return this._doApiCall({
      method: 'clearField',
      params: { field: field },
      skipRead: skipRead
    });
  };
  /**
   * Adds a barcode
   * @name Base#addBarcode
   * @param code
   * @param skipRead
   * @returns {promise}
   */
  Base.prototype.addBarcode = function (code, skipRead) {
    return this._doApiCall({
      method: 'addBarcode',
      params: { barcode: code },
      skipRead: skipRead
    });
  };
  /**
   * Removes a barcode
   * @name Item#removeBarcode
   * @param code
   * @param skipRead
   * @returns {promise}
   */
  Base.prototype.removeBarcode = function (code, skipRead) {
    return this._doApiCall({
      method: 'removeBarcode',
      params: { barcode: code },
      skipRead: skipRead
    });
  };
  // Attachments stuff
  // ----
  /**
   * Gets an url for a user avatar
   * 'XS': (64, 64),
   * 'S': (128, 128),
   * 'M': (256, 256),
   * 'L': (512, 512)
   * @param size {string} default null is original size
   * @param groupId {string} Group primary key (only when you're passing an attachment)
   * @param att {string} attachment primary key, by default we take the cover
   * @param bustCache {boolean}
   * @returns {string}
   */
  Base.prototype.getImageUrl = function (size, groupId, att, bustCache) {
    var attachment = att || this.cover;
    return attachment != null && attachment.length > 0 ? this.helper.getImageCDNUrl(groupId, attachment, size) : this.helper.getImageUrl(this.ds, this.id, size, bustCache);
  };
  /**
   * Set the cover image to an Attachment
   * @name  Base#setCover
   * @method
   * @param att
   * @param skipRead
   * @returns {promise}
   */
  Base.prototype.setCover = function (att, skipRead) {
    return this._doApiCall({
      method: 'setCover',
      params: { attachmentId: att._id },
      skipRead: skipRead
    });
  };
  /**
   * Clears the cover image
   * @name  Base#clearCover
   * @method
   * @param skipRead
   * @returns {promise}
   */
  Base.prototype.clearCover = function (skipRead) {
    return this._doApiCall({
      method: 'clearCover',
      params: {},
      skipRead: skipRead
    });
  };
  /**
   * attaches an Attachment object
   * @name  Base#attach
   * @method
   * @param attachmentId
   * @param skipRead
   * @returns {promise}
   */
  Base.prototype.attach = function (attachmentId, skipRead) {
    if (this.existsInDb()) {
      return this._doApiCall({
        method: 'attach',
        params: { attachments: [attachmentId] },
        skipRead: skipRead
      });
    } else {
      return $.Deferred().reject(new api.ApiError('Cannot attach attachment, id is empty or null'));
    }
  };
  /**
   * detaches an Attachment by kvId (guid)
   * @name  Base#detach
   * @method
   * @param attachmentId
   * @param skipRead
   * @returns {promise}
   */
  Base.prototype.detach = function (attachmentId, skipRead) {
    if (this.existsInDb()) {
      return this._doApiCall({
        method: 'detach',
        params: { attachments: [attachmentId] },
        skipRead: skipRead
      });
    } else {
      return $.Deferred().reject(new api.ApiError('Cannot detach attachment, id is empty or null'));
    }
  };
  // Flags stuff
  // ----
  /**
   * Sets the flag of an item
   * @name Base#setFlag
   * @param flag
   * @param skipRead
   * @returns {promise}
   */
  Base.prototype.setFlag = function (flag, skipRead) {
    return this._doApiCall({
      method: 'setFlag',
      params: { flag: flag },
      skipRead: skipRead
    });
  };
  /**
   * Clears the flag of an item
   * @name Base#clearFlag
   * @param skipRead
   * @returns {promise}
   */
  Base.prototype.clearFlag = function (skipRead) {
    return this._doApiCall({
      method: 'clearFlag',
      params: {},
      skipRead: skipRead
    });
  };
  /**
   * Returns a list of Field objects
   * @param fieldDefs         array of field definitions
   * @param onlyFormFields    should return only form fields
   * @param limit             return no more than x fields
   * @return {Array}
   */
  Base.prototype.getSortedFields = function (fieldDefs, onlyFormFields, limit) {
    var that = this, fields = [], fieldDef = null, fieldValue = null;
    // Work on copy of fieldDefs array
    fieldDefs = fieldDefs.slice();
    // Return only form field definitions?
    fieldDefs = fieldDefs.filter(function (def) {
      return onlyFormFields == true ? def.form : true;
    });
    // Create a Field object for each field definition
    for (var i = 0; i < fieldDefs.length; i++) {
      fieldDef = fieldDefs[i];
      fieldValue = that.fields[fieldDef.name];
      if (limit == null || limit > fields.length) {
        fields.push(that._getField($.extend({ value: fieldValue }, fieldDef)));
      }
    }
    return fields;
  };
  /**
   * Update item fields based on the given Field objects
   * @param {Array} fields    array of Field objects
   */
  Base.prototype.setSortedFields = function (fields) {
    for (var i = 0; i < fields.length; i++) {
      var field = fields[i];
      if (field.isEmpty()) {
        delete this.fields[field.name];
      } else {
        this.fields[field.name] = field.value;
      }
    }
  };
  /**
   * Checks if all item fields are valid
   * @param  {Array}  fields
   * @return {Boolean}        
   */
  Base.prototype.validateSortedFields = function (fields) {
    for (var i = 0; i < fields.length; i++) {
      if (!fields[i].isValid()) {
        return false;
      }
    }
    return true;
  };
  // Implementation
  // ----
  /**
   * Checks if the flag is dirty compared to the raw response
   * @returns {boolean}
   * @private
   */
  Base.prototype._isDirtyFlag = function () {
    if (this.raw) {
      return this.flag != this.raw.flag;
    } else {
      return false;
    }
  };
  /**
   * Checks if the fields are dirty compared to the raw response
   * @returns {boolean}
   * @private
   */
  Base.prototype._isDirtyFields = function () {
    if (this.raw) {
      return !common.areEqual(this.fields, this.raw.fields);
    } else {
      return false;
    }
  };
  /**
   * Runs over the custom fields that are dirty and calls `setField`
   * @returns {*}
   * @private
   */
  Base.prototype._updateFields = function () {
    var calls = [];
    if (this.raw) {
      for (var key in this.fields) {
        if (this.fields[key] != this.raw.fields[key]) {
          calls.push(this.setField(key, this.fields[key], true));
        }
      }
    }
    if (calls.length > 0) {
      return $.when(calls);
    } else {
      return $.Deferred().resolve(this);
    }
  };
  // toJson, fromJson
  // ----
  /**
   * _toJson, makes a dict of params to use during create / update
   * @param options
   * @returns {{}}
   * @private
   */
  Base.prototype._toJson = function (options) {
    return Document.prototype._toJson.call(this, options);
  };
  /**
   * _fromJson: read some basic information
   * @method
   * @param {object} data the json response
   * @param {object} options dict
   * @private
   */
  Base.prototype._fromJson = function (data, options) {
    var that = this;
    return Document.prototype._fromJson.call(this, data, options).then(function () {
      that.flag = data.flag || DEFAULTS.flag;
      that.fields = data.fields != null ? $.extend({}, data.fields) : $.extend({}, DEFAULTS.fields);
      that.modified = data.modified || DEFAULTS.modified;
      that.barcodes = data.barcodes || DEFAULTS.barcodes;
      return that._fromCommentsJson(data, options).then(function () {
        return that._fromAttachmentsJson(data, options);
      });
    });
  };
  /**
   * _toJsonFields: makes json which can be used to set fields during `create`
   * @method
   * @param options
   * @returns {{}}
   * @private
   */
  Base.prototype._toJsonFields = function (options) {
    var fields = {};
    if (this.fields) {
      for (var key in this.fields) {
        fields['fields__' + key] = this.fields[key];
      }
    }
    return fields;
  };
  /**
   * _fromCommentsJson: reads the data.comments
   * @param data
   * @param options
   * @returns {*}
   * @private
   */
  Base.prototype._fromCommentsJson = function (data, options) {
    var obj = null, that = this;
    this.comments = DEFAULTS.comments.slice();
    if (data.comments && data.comments.length > 0) {
      $.each(data.comments, function (i, comment) {
        obj = that._getComment(comment, options);
        if (obj) {
          that.comments.push(obj);
        }
      });
    }
    return $.Deferred().resolve(data);
  };
  /**
   * _fromAttachmentsJson: reads the data.attachments
   * @param data
   * @param options
   * @returns {*}
   * @private
   */
  Base.prototype._fromAttachmentsJson = function (data, options) {
    var obj = null, that = this;
    this.attachments = DEFAULTS.attachments.slice();
    if (data.attachments && data.attachments.length > 0) {
      $.each(data.attachments, function (i, att) {
        obj = that._getAttachment(att, options);
        if (obj) {
          that.attachments.push(obj);
        }
      });
    }
    return $.Deferred().resolve(data);
  };
  Base.prototype._getComment = function (data, options) {
    var spec = $.extend({ ds: this.ds }, options || {}, data);
    return new Comment(spec);
  };
  Base.prototype._getAttachment = function (data, options) {
    var spec = $.extend({ ds: this.ds }, options || {}, data);
    return new Attachment(spec);
  };
  Base.prototype._getField = function (data, options) {
    var spec = $.extend({}, options || {}, data);
    return new Field(spec);
  };
  return Base;
}(jquery, common, api, document, comment, attachment, field);
Category = function ($, common, api, Document) {
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
    modified: null
  };
  // Allow overriding the ctor during inheritance
  // http://stackoverflow.com/questions/4152931/javascript-inheritance-call-super-constructor-or-use-prototype-chain
  var tmp = function () {
  };
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
    var spec = $.extend({}, opt);
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
    this.name = $.trim(this.name);
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
    return this._doApiCall({
      pk: this.id,
      method: 'changeName',
      params: { name: name }
    });
  };
  /**
   * Checks via the api if we can change the parent of a Category document
   * e.g. if it would not clash with any existing categories
   * @param parentId
   * @returns {promise}
   */
  Category.prototype.canChangeParent = function (parentId) {
    return this.ds.call(this.id, 'canChangeParent', {
      parent: parentId,
      omitFields: true
    });
  };
  /**
   * Changes the parent of a category
   * @param parentId
   * @returns {promise}
   */
  Category.prototype.changeParent = function (parentId) {
    return this._doApiCall({
      pk: this.id,
      method: 'changeParent',
      params: {
        parent: parentId,
        omitFields: true
      }
    });
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
  return Category;
}(jquery, common, api, document);
Comment = function ($) {
  var DEFAULTS = {
    id: '',
    value: null,
    created: null,
    modified: null,
    by: null
  };
  /**
   * @name  Comment
   * @class
   * @param spec
   * @constructor
   */
  var Comment = function (spec) {
    spec = spec || {};
    this.ds = spec.ds;
    this.raw = null;
    // the raw json object
    this.id = spec.id || DEFAULTS.id;
    this.value = spec.value || DEFAULTS.value;
    this.created = spec.created || DEFAULTS.created;
    this.modified = spec.modified || DEFAULTS.modified;
    this.by = spec.by || DEFAULTS.by;
    this.fromReservation = spec.fromReservation || false;
  };
  /**
   * _toJson, makes a dict of the object
   * @method
   * @param options
   * @returns {object}
   * @private
   */
  Comment.prototype._toJson = function (options) {
    return {
      id: this.id,
      value: this.value,
      created: this.created,
      modified: this.modified,
      by: this.by
    };
  };
  /**
   * _fromJson: reads the Comment object from json
   * @method
   * @param {object} data the json response
   * @param {object} options dict
   * @returns promise
   * @private
   */
  Comment.prototype._fromJson = function (data, options) {
    this.raw = data;
    this.id = data.id || DEFAULTS.id;
    this.value = data.value || DEFAULTS.value;
    this.created = data.created || DEFAULTS.created;
    this.modified = data.modified || DEFAULTS.modified;
    this.by = data.by || DEFAULTS.by;
    return $.Deferred().resolve(data);
  };
  return Comment;
}(jquery);
Conflict = function ($) {
  var DEFAULTS = {
    kind: '',
    doc: '',
    item: '',
    itemName: '',
    locationCurrent: '',
    locationDesired: '',
    fromDate: null,
    toDate: null
  };
  /**
   * Conflict class
   * @name  Conflict
   * @class    
   * @constructor
   * 
   * @param spec
   * @property {string}  kind                   - The conflict kind (status, order, reservation, location)
   * @property {string}  doc                    - The id of the document with which it conflicts
   * @property {string}  item                   - The Item id for this conflict
   * @property {string}  itemName               - The Item name for this conflict
   * @property {string}  locationCurrent        - The Location the item is now
   * @property {string}  locationDesired        - The Location where the item should be
   * @property {moment}  fromDate               - From when does the conflict start
   * @property {moment}  toDate                 - Until when does the conflict end
   */
  var Conflict = function (spec) {
    this.ds = spec.ds;
    this._fields = spec._fields;
    this.raw = null;
    // the raw json object
    this.kind = spec.kind || DEFAULTS.kind;
    this.doc = spec.doc || DEFAULTS.doc;
    this.item = spec.item || DEFAULTS.item;
    this.itemName = spec.itemName || DEFAULTS.itemName;
    this.locationCurrent = spec.locationCurrent || DEFAULTS.locationCurrent;
    this.locationDesired = spec.locationDesired || DEFAULTS.locationDesired;
    this.fromDate = spec.fromDate || DEFAULTS.fromDate;
    this.toDate = spec.toDate || DEFAULTS.toDate;
  };
  /**
   * _toJson, makes a dict of the object
   * @method
   * @param {object} opt dict
   * @returns {object}
   * @private
   */
  Conflict.prototype._toJson = function (opt) {
    return {
      kind: this.kind,
      doc: this.doc,
      item: this.item,
      itemName: this.itemName,
      locationCurrent: this.locationCurrent,
      locationDesired: this.locationDesired,
      fromDate: this.fromDate,
      toDate: this.toDate
    };
  };
  /**
   * _fromJson
   * @method
   * @param {object} data the json response
   * @param {object} opt dict
   * @returns promise
   * @private
   */
  Conflict.prototype._fromJson = function (data, opt) {
    this.raw = data;
    this.kind = data.kind || DEFAULTS.kind;
    this.item = data.item || DEFAULTS.item;
    this.itemName = data.itemName || DEFAULTS.itemName;
    this.fromDate = data.fromDate || DEFAULTS.fromDate;
    this.toDate = data.toDate || DEFAULTS.toDate;
    return $.Deferred().resolve(data);
  };
  return Conflict;
}(jquery);
base = function ($, common, api, Document, Comment, Attachment, Field) {
  // Some constant values
  var DEFAULTS = {
    id: '',
    modified: null,
    cover: null,
    flag: null,
    fields: {},
    comments: [],
    attachments: [],
    barcodes: []
  };
  // Allow overriding the ctor during inheritance
  // http://stackoverflow.com/questions/4152931/javascript-inheritance-call-super-constructor-or-use-prototype-chain
  var tmp = function () {
  };
  tmp.prototype = Document.prototype;
  /**
   * @name  Base
   * @class
   * @property {ApiDataSource} dsAttachments   attachments datasource
   * @property {string} crtype                 e.g. cheqroom.types.customer
   * @property {moment} modified               last modified timestamp
   * @property {string} flag                   the document flag
   * @property {object} fields                 dictionary of document fields
   * @property {array} comments                array of Comment objects
   * @property {array} attachments             array of Attachment objects
   * @property {string} cover                  cover attachment id, default null
   * @constructor
   * @extends Document
   */
  var Base = function (opt) {
    var spec = $.extend({}, opt);
    Document.call(this, spec);
    this.dsAttachments = spec.dsAttachments;
    // ApiDataSource for the attachments coll
    this.crtype = spec.crtype;
    // e.g. cheqroom.types.customer
    this.modified = spec.modified || DEFAULTS.modified;
    // last modified timestamp in momentjs
    this.flag = spec.flag || DEFAULTS.flag;
    // flag
    this.fields = spec.fields || $.extend({}, DEFAULTS.fields);
    // fields dictionary
    this.comments = spec.comments || DEFAULTS.comments.slice();
    // comments array
    this.attachments = spec.attachments || DEFAULTS.attachments.slice();
    // attachments array
    this.cover = spec.cover || DEFAULTS.cover;
    // cover attachment id, default null
    this.barcodes = spec.barcodes || DEFAULTS.barcodes.slice();  // barcodes array
  };
  Base.prototype = new tmp();
  Base.prototype.constructor = Base;
  //
  // Document overrides
  //
  Base.prototype._getDefaults = function () {
    return DEFAULTS;
  };
  /**
   * Checks if the object is empty
   * after calling reset() isEmpty() should return true
   * We'll only check for fields, comments, attachments here
   * @name  Base#isEmpty
   * @method
   * @returns {boolean}
   * @override
   */
  Base.prototype.isEmpty = function () {
    return this.flag == DEFAULTS.flag && (this.fields == null || Object.keys(this.fields).length == 0) && (this.comments == null || this.comments.length == 0) && (this.attachments == null || this.attachments.length == 0);
  };
  /**
   * Checks if the base is dirty and needs saving
   * @name Base#isDirty
   * @returns {boolean}
   */
  Base.prototype.isDirty = function () {
    return this._isDirtyFlag() || this._isDirtyFields();
  };
  /**
   * Checks via the api if we can delete the document
   * @name  Base#canDelete
   * @method
   * @returns {promise}
   * @override
   */
  Base.prototype.canDelete = function () {
    // Documents can only be deleted when they have a pk
    if (this.existsInDb()) {
      return this.ds.call(this.id, 'canDelete');
    } else {
      return $.Deferred().resolve({
        result: false,
        message: ''
      });
    }
  };
  // Comments
  // ----
  /**
   * Adds a comment by string
   * @name  Base#addComment
   * @method
   * @param comment
   * @param skipRead
   * @returns {promise}
   */
  Base.prototype.addComment = function (comment, skipRead) {
    return this._doApiCall({
      method: 'addComment',
      params: { comment: comment },
      skipRead: skipRead
    });
  };
  /**
   * Updates a comment by id
   * @name  Base#updateComment
   * @method
   * @param id
   * @param comment
   * @param skipRead
   * @returns {promise}
   */
  Base.prototype.updateComment = function (id, comment, skipRead) {
    return this._doApiCall({
      method: 'updateComment',
      params: {
        commentId: id,
        comment: comment
      },
      skipRead: skipRead
    });
  };
  /**
   * Deletes a Comment by id
   * @name  Base#deleteComment
   * @method
   * @param id
   * @param skipRead
   * @returns {promise}
   */
  Base.prototype.deleteComment = function (id, skipRead) {
    return this._doApiCall({
      method: 'removeComment',
      params: { commentId: id },
      skipRead: skipRead
    });
  };
  // Field stuff
  // ----
  /**
   * Sets multiple custom fields in a single call
   * @name Base#setFields
   * @method
   * @param fields
   * @param skipRead
   * @returns {promise}
   */
  Base.prototype.setFields = function (fields, skipRead) {
    var that = this, changedFields = {};
    $.each(fields, function (key, value) {
      if (that.raw.fields[key] != fields[key]) {
        changedFields[key] = value;
      }
    });
    return this._doApiCall({
      method: 'setFields',
      params: { fields: changedFields },
      skipRead: skipRead,
      usePost: true
    });
  };
  /**
   * Sets a custom field
   * @name Base#setField
   * @method
   * @param field
   * @param value
   * @param skipRead
   * @returns {promise}
   */
  Base.prototype.setField = function (field, value, skipRead) {
    return this._doApiCall({
      method: 'setField',
      params: {
        field: field,
        value: value
      },
      skipRead: skipRead
    });
  };
  /**
   * Clears a custom field
   * @name Base#clearField
   * @method
   * @param field
   * @param skipRead
   */
  Base.prototype.clearField = function (field, skipRead) {
    return this._doApiCall({
      method: 'clearField',
      params: { field: field },
      skipRead: skipRead
    });
  };
  /**
   * Adds a barcode
   * @name Base#addBarcode
   * @param code
   * @param skipRead
   * @returns {promise}
   */
  Base.prototype.addBarcode = function (code, skipRead) {
    return this._doApiCall({
      method: 'addBarcode',
      params: { barcode: code },
      skipRead: skipRead
    });
  };
  /**
   * Removes a barcode
   * @name Item#removeBarcode
   * @param code
   * @param skipRead
   * @returns {promise}
   */
  Base.prototype.removeBarcode = function (code, skipRead) {
    return this._doApiCall({
      method: 'removeBarcode',
      params: { barcode: code },
      skipRead: skipRead
    });
  };
  // Attachments stuff
  // ----
  /**
   * Gets an url for a user avatar
   * 'XS': (64, 64),
   * 'S': (128, 128),
   * 'M': (256, 256),
   * 'L': (512, 512)
   * @param size {string} default null is original size
   * @param groupId {string} Group primary key (only when you're passing an attachment)
   * @param att {string} attachment primary key, by default we take the cover
   * @param bustCache {boolean}
   * @returns {string}
   */
  Base.prototype.getImageUrl = function (size, groupId, att, bustCache) {
    var attachment = att || this.cover;
    return attachment != null && attachment.length > 0 ? this.helper.getImageCDNUrl(groupId, attachment, size) : this.helper.getImageUrl(this.ds, this.id, size, bustCache);
  };
  /**
   * Set the cover image to an Attachment
   * @name  Base#setCover
   * @method
   * @param att
   * @param skipRead
   * @returns {promise}
   */
  Base.prototype.setCover = function (att, skipRead) {
    return this._doApiCall({
      method: 'setCover',
      params: { attachmentId: att._id },
      skipRead: skipRead
    });
  };
  /**
   * Clears the cover image
   * @name  Base#clearCover
   * @method
   * @param skipRead
   * @returns {promise}
   */
  Base.prototype.clearCover = function (skipRead) {
    return this._doApiCall({
      method: 'clearCover',
      params: {},
      skipRead: skipRead
    });
  };
  /**
   * attaches an Attachment object
   * @name  Base#attach
   * @method
   * @param attachmentId
   * @param skipRead
   * @returns {promise}
   */
  Base.prototype.attach = function (attachmentId, skipRead) {
    if (this.existsInDb()) {
      return this._doApiCall({
        method: 'attach',
        params: { attachments: [attachmentId] },
        skipRead: skipRead
      });
    } else {
      return $.Deferred().reject(new api.ApiError('Cannot attach attachment, id is empty or null'));
    }
  };
  /**
   * detaches an Attachment by kvId (guid)
   * @name  Base#detach
   * @method
   * @param attachmentId
   * @param skipRead
   * @returns {promise}
   */
  Base.prototype.detach = function (attachmentId, skipRead) {
    if (this.existsInDb()) {
      return this._doApiCall({
        method: 'detach',
        params: { attachments: [attachmentId] },
        skipRead: skipRead
      });
    } else {
      return $.Deferred().reject(new api.ApiError('Cannot detach attachment, id is empty or null'));
    }
  };
  // Flags stuff
  // ----
  /**
   * Sets the flag of an item
   * @name Base#setFlag
   * @param flag
   * @param skipRead
   * @returns {promise}
   */
  Base.prototype.setFlag = function (flag, skipRead) {
    return this._doApiCall({
      method: 'setFlag',
      params: { flag: flag },
      skipRead: skipRead
    });
  };
  /**
   * Clears the flag of an item
   * @name Base#clearFlag
   * @param skipRead
   * @returns {promise}
   */
  Base.prototype.clearFlag = function (skipRead) {
    return this._doApiCall({
      method: 'clearFlag',
      params: {},
      skipRead: skipRead
    });
  };
  /**
   * Returns a list of Field objects
   * @param fieldDefs         array of field definitions
   * @param onlyFormFields    should return only form fields
   * @param limit             return no more than x fields
   * @return {Array}
   */
  Base.prototype.getSortedFields = function (fieldDefs, onlyFormFields, limit) {
    var that = this, fields = [], fieldDef = null, fieldValue = null;
    // Work on copy of fieldDefs array
    fieldDefs = fieldDefs.slice();
    // Return only form field definitions?
    fieldDefs = fieldDefs.filter(function (def) {
      return onlyFormFields == true ? def.form : true;
    });
    // Create a Field object for each field definition
    for (var i = 0; i < fieldDefs.length; i++) {
      fieldDef = fieldDefs[i];
      fieldValue = that.fields[fieldDef.name];
      if (limit == null || limit > fields.length) {
        fields.push(that._getField($.extend({ value: fieldValue }, fieldDef)));
      }
    }
    return fields;
  };
  /**
   * Update item fields based on the given Field objects
   * @param {Array} fields    array of Field objects
   */
  Base.prototype.setSortedFields = function (fields) {
    for (var i = 0; i < fields.length; i++) {
      var field = fields[i];
      if (field.isEmpty()) {
        delete this.fields[field.name];
      } else {
        this.fields[field.name] = field.value;
      }
    }
  };
  /**
   * Checks if all item fields are valid
   * @param  {Array}  fields
   * @return {Boolean}        
   */
  Base.prototype.validateSortedFields = function (fields) {
    for (var i = 0; i < fields.length; i++) {
      if (!fields[i].isValid()) {
        return false;
      }
    }
    return true;
  };
  // Implementation
  // ----
  /**
   * Checks if the flag is dirty compared to the raw response
   * @returns {boolean}
   * @private
   */
  Base.prototype._isDirtyFlag = function () {
    if (this.raw) {
      return this.flag != this.raw.flag;
    } else {
      return false;
    }
  };
  /**
   * Checks if the fields are dirty compared to the raw response
   * @returns {boolean}
   * @private
   */
  Base.prototype._isDirtyFields = function () {
    if (this.raw) {
      return !common.areEqual(this.fields, this.raw.fields);
    } else {
      return false;
    }
  };
  /**
   * Runs over the custom fields that are dirty and calls `setField`
   * @returns {*}
   * @private
   */
  Base.prototype._updateFields = function () {
    var calls = [];
    if (this.raw) {
      for (var key in this.fields) {
        if (this.fields[key] != this.raw.fields[key]) {
          calls.push(this.setField(key, this.fields[key], true));
        }
      }
    }
    if (calls.length > 0) {
      return $.when(calls);
    } else {
      return $.Deferred().resolve(this);
    }
  };
  // toJson, fromJson
  // ----
  /**
   * _toJson, makes a dict of params to use during create / update
   * @param options
   * @returns {{}}
   * @private
   */
  Base.prototype._toJson = function (options) {
    return Document.prototype._toJson.call(this, options);
  };
  /**
   * _fromJson: read some basic information
   * @method
   * @param {object} data the json response
   * @param {object} options dict
   * @private
   */
  Base.prototype._fromJson = function (data, options) {
    var that = this;
    return Document.prototype._fromJson.call(this, data, options).then(function () {
      that.flag = data.flag || DEFAULTS.flag;
      that.fields = data.fields != null ? $.extend({}, data.fields) : $.extend({}, DEFAULTS.fields);
      that.modified = data.modified || DEFAULTS.modified;
      that.barcodes = data.barcodes || DEFAULTS.barcodes;
      return that._fromCommentsJson(data, options).then(function () {
        return that._fromAttachmentsJson(data, options);
      });
    });
  };
  /**
   * _toJsonFields: makes json which can be used to set fields during `create`
   * @method
   * @param options
   * @returns {{}}
   * @private
   */
  Base.prototype._toJsonFields = function (options) {
    var fields = {};
    if (this.fields) {
      for (var key in this.fields) {
        fields['fields__' + key] = this.fields[key];
      }
    }
    return fields;
  };
  /**
   * _fromCommentsJson: reads the data.comments
   * @param data
   * @param options
   * @returns {*}
   * @private
   */
  Base.prototype._fromCommentsJson = function (data, options) {
    var obj = null, that = this;
    this.comments = DEFAULTS.comments.slice();
    if (data.comments && data.comments.length > 0) {
      $.each(data.comments, function (i, comment) {
        obj = that._getComment(comment, options);
        if (obj) {
          that.comments.push(obj);
        }
      });
    }
    return $.Deferred().resolve(data);
  };
  /**
   * _fromAttachmentsJson: reads the data.attachments
   * @param data
   * @param options
   * @returns {*}
   * @private
   */
  Base.prototype._fromAttachmentsJson = function (data, options) {
    var obj = null, that = this;
    this.attachments = DEFAULTS.attachments.slice();
    if (data.attachments && data.attachments.length > 0) {
      $.each(data.attachments, function (i, att) {
        obj = that._getAttachment(att, options);
        if (obj) {
          that.attachments.push(obj);
        }
      });
    }
    return $.Deferred().resolve(data);
  };
  Base.prototype._getComment = function (data, options) {
    var spec = $.extend({ ds: this.ds }, options || {}, data);
    return new Comment(spec);
  };
  Base.prototype._getAttachment = function (data, options) {
    var spec = $.extend({ ds: this.ds }, options || {}, data);
    return new Attachment(spec);
  };
  Base.prototype._getField = function (data, options) {
    var spec = $.extend({}, options || {}, data);
    return new Field(spec);
  };
  return Base;
}(jquery, common, api, document, comment, attachment, field);
user = function ($, Base, common) {
  var DEFAULTS = {
    name: '',
    email: '',
    group: '',
    // groupid
    picture: '',
    role: 'user',
    // user, admin
    active: true,
    isOwner: false,
    archived: null
  };
  // Allow overriding the ctor during inheritance
  // http://stackoverflow.com/questions/4152931/javascript-inheritance-call-super-constructor-or-use-prototype-chain
  var tmp = function () {
  };
  tmp.prototype = Base.prototype;
  /**
   * @name User
   * @class User
   * @constructor
   * @extends Base
   * @property {string}  name               - The name
   * @property {string}  role               - The role (admin, user)
   * @property {boolean} active             - Is the user active?
   */
  var User = function (opt) {
    var spec = $.extend({
      _fields: [
        '*',
        'group',
        'picture'
      ]
    }, opt);
    Base.call(this, spec);
    this.helper = spec.helper;
    this.name = spec.name || DEFAULTS.name;
    this.picture = spec.picture || DEFAULTS.picture;
    this.email = spec.email || DEFAULTS.email;
    this.role = spec.role || DEFAULTS.role;
    this.group = spec.group || DEFAULTS.group;
    this.active = spec.active != null ? spec.active : DEFAULTS.active;
    this.isOwner = spec.isOwner != null ? spec.isOwner : DEFAULTS.isOwner;
    this.archived = spec.archived || DEFAULTS.archived;
    this.dsAnonymous = spec.dsAnonymous;
  };
  User.prototype = new tmp();
  User.prototype.constructor = User;
  //
  // Document overrides
  //
  User.prototype.isValidName = function () {
    this.name = $.trim(this.name);
    return this.name.length >= 4;
  };
  User.prototype.isValidEmail = function () {
    this.email = $.trim(this.email);
    return common.isValidEmail(this.email);
  };
  User.prototype.isValidRole = function () {
    switch (this.role) {
    case 'user':
    case 'admin':
    case 'root':
    case 'selfservice':
      return true;
    default:
      return false;
    }
  };
  User.prototype.emailExists = function () {
    if (this.isValidEmail()) {
      // Don't check for emailExists for exisiting user
      if (this.id != null && this.email == this.raw.email) {
        return $.Deferred().resolve(false);
      }
      return this.dsAnonymous.call('emailExists', { email: this.email }).then(function (resp) {
        return resp.result;
      });
    } else {
      return $.Deferred().resolve(false);
    }
  };
  User.prototype.isValidPassword = function () {
    this.password = $.trim(this.password);
    return common.isValidPassword(this.password);
  };
  /**
   * Checks if the user is valid
   * @returns {boolean}
   */
  User.prototype.isValid = function () {
    return this.isValidName() && this.isValidEmail() && this.isValidRole();
  };
  /**
   * Checks if the user is empty
   * @method
   * @name User#isEmpty
   * @returns {boolean}
   */
  User.prototype.isEmpty = function () {
    // We check: name, role
    return Base.prototype.isEmpty.call(this) && this.name == DEFAULTS.name && this.email == DEFAULTS.email && this.role == DEFAULTS.role;
  };
  /**
   * Checks if the user is dirty and needs saving
   * @method
   * @name User#isDirty
   * @returns {boolean}
   */
  User.prototype.isDirty = function () {
    var isDirty = Base.prototype.isDirty.call(this);
    if (!isDirty && this.raw) {
      var name = this.raw.name || DEFAULTS.name;
      var role = this.raw.role || DEFAULTS.role;
      var email = this.raw.email || DEFAULTS.email;
      var active = this.raw.active != null ? this.raw.active : DEFAULTS.active;
      return this.name != name || this.email != email || this.role != role || this.active != active;
    }
    return isDirty;
  };
  /**
   * Gets a url for a user avatar
   * 'XS': (64, 64),
   * 'S': (128, 128),
   * 'M': (256, 256),
   * 'L': (512, 512)
   * @param size {string} default null is original size
   * @param bustCache {boolean}
   * @returns {string}
   */
  User.prototype.getImageUrl = function (size, bustCache) {
    return this.picture != null && this.picture.length > 0 ? this.helper.getImageCDNUrl(this.group, this.picture, size, bustCache) : this.helper.getImageUrl(this.ds, this.id, size, bustCache);
  };
  User.prototype._getDefaults = function () {
    return DEFAULTS;
  };
  // OVERRIDE BASE: addKeyValue not implemented
  User.prototype.addKeyValue = function (key, value, kind, skipRead) {
    return $.Deferred().reject('Not implemented for User, use setPicture instead?');
  };
  // OVERRIDE BASE: addKeyValue not implemented
  User.prototype.addKeyValue = function (id, key, value, kind, skipRead) {
    return $.Deferred().reject('Not implemented for User, use setPicture instead?');
  };
  // OVERRIDE BASE: removeKeyValue not implemented
  User.prototype.removeKeyValue = function (id, skipRead) {
    return $.Deferred().reject('Not implemented for User, use clearPicture instead?');
  };
  User.prototype.setPicture = function (attachmentId, skipRead) {
    if (!this.existsInDb()) {
      return $.Deferred().reject('User does not exist in database');
    }
    this.picture = attachmentId;
    return this._doApiCall({
      method: 'setPicture',
      params: { attachment: attachmentId },
      skipRead: skipRead
    });
  };
  User.prototype.clearPicture = function (skipRead) {
    if (!this.existsInDb()) {
      return $.Deferred().reject('User does not exist in database');
    }
    return this._doApiCall({
      method: 'clearPicture',
      skipRead: skipRead
    });
  };
  //
  // Business logic
  //
  /**
   * Checks if a user can be activated
   * @returns {boolean}
   */
  User.prototype.canActivate = function () {
    return !this.active && this.archived == null;
  };
  /**
   * Checks if a user can be deactivated
   * @returns {boolean}
   */
  User.prototype.canDeactivate = function () {
    return this.active && this.archived == null && !this.isOwner;
  };
  /**
   * Checks if a user can be archived
   * @returns {boolean}
   */
  User.prototype.canArchive = function () {
    return this.archived == null && !this.isOwner;
  };
  /**
   * Checks if a user can be unarchived
   * @returns {boolean}
   */
  User.prototype.canUndoArchive = function () {
    return this.archived != null;
  };
  /**
   * Checks if a user can be owner
   * @returns {boolean}
   */
  User.prototype.canBeOwner = function () {
    return this.archived == null && this.active && !this.isOwner && this.role == 'admin';
  };
  /**
   * Activates a user
   * @param skipRead
   * @returns {promise}
   */
  User.prototype.activate = function (skipRead) {
    if (!this.existsInDb()) {
      return $.Deferred().reject('User does not exist in database');
    }
    return this._doApiCall({
      method: 'activate',
      skipRead: skipRead
    });
  };
  /**
   * Deactivates a user
   * @param skipRead
   * @returns {promise}
   */
  User.prototype.deactivate = function (skipRead) {
    if (!this.existsInDb()) {
      return $.Deferred().reject('User does not exist in database');
    }
    return this._doApiCall({
      method: 'deactivate',
      skipRead: skipRead
    });
  };
  /**
   * Archives a user
   * @param skipRead
   * @returns {promise}
   */
  User.prototype.archive = function (skipRead) {
    if (!this.existsInDb()) {
      return $.Deferred().reject('User does not exist in database');
    }
    return this._doApiCall({
      method: 'archive',
      skipRead: skipRead
    });
  };
  /**
   * Unarchives a user
   * @param skipRead
   * @returns {promise}
   */
  User.prototype.undoArchive = function (skipRead) {
    if (!this.existsInDb()) {
      return $.Deferred().reject('User does not exist in database');
    }
    return this._doApiCall({
      method: 'undoArchive',
      skipRead: skipRead
    });
  };
  /**
   * Writes the user to a json object
   * @param options
   * @returns {object}
   * @private
   */
  User.prototype._toJson = function (options) {
    var data = Base.prototype._toJson.call(this, options);
    data.name = this.name || DEFAULTS.name;
    data.email = this.email || DEFAULTS.email;
    data.group = this.group || DEFAULTS.group;
    data.role = this.role || DEFAULTS.role;
    return data;
  };
  /**
   * Reads the user from the json object
   * @param data
   * @param options
   * @returns {promise}
   * @private
   */
  User.prototype._fromJson = function (data, options) {
    var that = this;
    return Base.prototype._fromJson.call(this, data, options).then(function () {
      // Read the group id from group or group._id
      // depending on the fields
      that.group = data.group && data.group._id != null ? data.group._id : data.group || DEFAULTS.group;
      that.name = data.name || DEFAULTS.name;
      that.picture = data.picture || DEFAULTS.picture;
      that.email = data.email || DEFAULTS.email;
      that.role = data.role || DEFAULTS.role;
      that.active = data.active != null ? data.active : DEFAULTS.active;
      that.isOwner = data.isOwner != null ? data.isOwner : DEFAULTS.isOwner;
      that.archived = data.archived || DEFAULTS.archived;
      $.publish('user.fromJson', data);
      return data;
    });
  };
  return User;
}(jquery, base, common);
helper = function ($, defaultSettings, common) {
  /**
   * Allows you to call helpers based on the settings file 
   * and also settings in group.profile and user.profile
   * @name Helper
   * @class Helper
   * @constructor
   * @property {object} settings         
   */
  return function (settings) {
    settings = settings || defaultSettings;
    return {
      /**
       * getSettings return settings file which helper uses internally
       * @return {object}
       */
      getSettings: function () {
        return settings;
      },
      /**
       * getImageCDNUrl gets an image by using the path to a CDN location
       *
       * @memberOf helper
       * @method
       * @name  helper#getImageCDNUrl
       * 
       * @param groupId
       * @param attachmentId
       * @param size
       * @returns {string}
       */
      getImageCDNUrl: function (groupId, attachmentId, size) {
        return common.getImageCDNUrl(settings, groupId, attachmentId, size);
      },
      /**
       * getImageUrl gets an image by using the datasource /get style and a mimeType
       * 'XS': (64, 64),
       * 'S': (128, 128),
       * 'M': (256, 256),
       * 'L': (512, 512)
       *
       * @memberOf helper
       * @method
       * @name  helper#getImageUrl
       * 
       * @param ds
       * @param pk
       * @param size
       * @param bustCache
       * @returns {string}
       */
      getImageUrl: function (ds, pk, size, bustCache) {
        var url = ds.getBaseUrl() + pk + '?mimeType=image/jpeg';
        if (size) {
          url += '&size=' + size;
        }
        if (bustCache) {
          url += '&_bust=' + new Date().getTime();
        }
        return url;
      },
      getICalUrl: function (urlApi, userId, userPublicKey, showOrders, showReservations, customerId, locationId) {
        var url = urlApi + '/ical/' + userId + '/' + userPublicKey + '/public/locations/call/ical', parts = [];
        if (locationId) {
          parts.push('locations[]=' + locationId);
        }
        if (customerId) {
          parts.push('customer=' + customerId);
        }
        if (!showOrders) {
          parts.push('skipOpenOrders=true');
        }
        if (!showReservations) {
          parts.push('skipOpenReservations=true');
        }
        return parts.length > 0 ? url + '?' + parts.join('&') : url;
      },
      /**
       * getQRCodeUrl 
       *
       * @memberOf helper
       * @method
       * @name  helper#getQRCodeUrl
       * 
       * @param  {string} code 
       * @param  {number} size 
       * @return {string}      
       */
      getQRCodeUrl: function (code, size) {
        return common.getQRCodeUrl(settings.urlApi, code, size);
      },
      /**
       * getBarcodeUrl 
       *
       * @memberOf helper
       * @method
       * @name  helper#getBarcodeUrl
       * 
       * @param  {string} code 
       * @param  {number} size 
       * @return {string}      
       */
      getBarcodeUrl: function (code, width, height) {
        return common.getBarcodeUrl(settings.urlApi, code, width, height);
      },
      /**
       * getNumItemsLeft
       *
       * @memberOf helper
       * @method
       * @name  helper#getNumItemsLeft
       * 
       * @param limits
       * @param stats 
       * @return {Number}
       */
      getNumItemsLeft: function (limits, stats) {
        var itemsPerStatus = this.getStat(stats, 'items', 'status');
        return limits.maxItems - this.getStat(stats, 'items', 'total') + itemsPerStatus.expired;
      },
      /**
       * getNumUsersLeft
       *
       * @memberOf helper
       * @method
       * @name  helper#getNumUsersLeft
       *  
       * @param limits
       * @param stats 
       * @return {Number}
       */
      getNumUsersLeft: function (limits, stats) {
        var usersPerStatus = this.getStat(stats, 'users', 'status');
        return limits.maxUsers - usersPerStatus.active;
      },
      /**
       * getStat for location
       *
       * @memberOf helper
       * @method
       * @name  helper#getStat
       *
       * @param stats
       * @param location
       * @param type
       * @param name
       * @param mode
       * @return {object}         number or object
       */
      getStat: function (stats, type, name, location, mode) {
        // make sure stats object isn't undefined
        stats = stats || {};
        //if no stats for given location found, use all stats object
        stats = stats[location && location != 'null' ? location : 'all'] || stats['all'];
        if (stats === undefined)
          throw 'Invalid stats';
        // load stats for given mode (defaults to production)
        stats = stats[mode || 'production'];
        var statType = stats[type];
        if (statType === undefined)
          throw 'Stat doesn\'t exist';
        if (!name)
          return statType;
        var statTypeValue = statType[name];
        if (statTypeValue === undefined)
          throw 'Stat value doesn\'t exist';
        return statTypeValue;
      },
      /**
       * getAccessRights returns access rights based on the user role, profile settings 
       * and account limits
       *
       * Deprecated: Use PermissionHandler instead
       *
       * @memberOf helper
       * @method
       * @name  helper#getAccessRights 
       * 
       * @param  role   
       * @param  profile 
       * @param  limits
       * @return {object}       
       */
      getAccessRights: function (role, profile, limits) {
        var isRootOrAdmin = role == 'root' || role == 'admin';
        var isRootOrAdminOrUser = role == 'root' || role == 'admin' || role == 'user';
        var useOrders = limits.allowOrders && profile.useOrders;
        var useReservations = limits.allowReservations && profile.useReservations;
        var useOrderAgreements = limits.allowGeneratePdf && profile.useOrderAgreements;
        var useWebHooks = limits.allowWebHooks;
        var useKits = limits.allowKits && profile.useKits;
        var useCustody = limits.allowCustody && profile.useCustody;
        var useOrderTransfers = limits.allowOrderTransfers && profile.useOrderTransfers;
        return {
          contacts: {
            create: isRootOrAdminOrUser,
            remove: isRootOrAdminOrUser,
            update: true,
            archive: isRootOrAdminOrUser
          },
          items: {
            create: isRootOrAdmin,
            remove: isRootOrAdmin,
            update: isRootOrAdmin,
            updateFlag: isRootOrAdmin,
            updateLocation: isRootOrAdmin,
            updateGeo: true
          },
          orders: {
            create: useOrders,
            remove: useOrders,
            update: useOrders,
            updateContact: role != 'selfservice',
            updateLocation: useOrders,
            generatePdf: useOrders && useOrderAgreements && isRootOrAdminOrUser,
            transferOrder: useOrders && useOrderTransfers,
            archive: useOrders && isRootOrAdminOrUser
          },
          reservations: {
            create: useReservations,
            remove: useReservations,
            update: useReservations,
            updateContact: useReservations && role != 'selfservice',
            updateLocation: useReservations,
            archive: useReservations && isRootOrAdminOrUser
          },
          locations: {
            create: isRootOrAdmin,
            remove: isRootOrAdmin,
            update: isRootOrAdmin
          },
          users: {
            create: isRootOrAdmin,
            remove: isRootOrAdmin,
            update: isRootOrAdmin,
            updateOther: isRootOrAdmin,
            updateOwn: true
          },
          webHooks: {
            create: useWebHooks && isRootOrAdmin,
            remove: useWebHooks && isRootOrAdmin,
            update: useWebHooks && isRootOrAdmin
          },
          stickers: {
            print: isRootOrAdmin,
            buy: isRootOrAdmin
          },
          categories: {
            create: isRootOrAdmin,
            update: isRootOrAdmin
          },
          account: { update: isRootOrAdmin }
        };
      },
      /**
       * ensureValue, returns specific prop value of object or if you pass a string it returns that exact string 
       * 
       * @memberOf helper
       * @method
       * @name  helper#ensureValue 
       * 
       * @param  obj   
       * @param  prop        
       * @return {string}       
       */
      ensureValue: function (obj, prop) {
        if (typeof obj === 'string') {
          return obj;
        } else if (obj && obj.hasOwnProperty(prop)) {
          return obj[prop];
        } else {
          return obj;
        }
      },
      /**
       * ensureId, returns id value of object or if you pass a string it returns that exact string 
       * For example:
       * ensureId("abc123") --> "abc123"
       * ensureId({ id:"abc123", name:"example" }) --> "abc123"
       *
       * @memberOf helper
       * @method
       * @name  helper#ensureId 
       * 
       * @param  obj   
       * @return {string}       
       */
      ensureId: function (obj) {
        return this.ensureValue(obj, '_id');
      }
    };
  };
}(jquery, settings, common);
Contact = function ($, Base, common, User, Helper) {
  var DEFAULTS = {
    name: '',
    email: '',
    status: 'active',
    user: {},
    kind: 'contact'
  };
  // Allow overriding the ctor during inheritance
  // http://stackoverflow.com/questions/4152931/javascript-inheritance-call-super-constructor-or-use-prototype-chain
  var tmp = function () {
  };
  tmp.prototype = Base.prototype;
  /**
   * Contact class
   * @name  Contact
   * @class
   * @constructor
   * @extends Base
   */
  var Contact = function (opt) {
    var spec = $.extend({
      _fields: ['*'],
      crtype: 'cheqroom.types.customer'
    }, opt);
    Base.call(this, spec);
    this.helper = spec.helper || new Helper();
    this.name = spec.name || DEFAULTS.name;
    this.email = spec.email || DEFAULTS.email;
    this.status = spec.status || DEFAULTS.status;
    this.user = spec.user || DEFAULTS.user;
    this.kind = spec.kind || DEFAULTS.kind;
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
    this.name = $.trim(this.name);
    return this.name.length >= 3;
  };
  /**
   * Check is email is valid
   * @name  Contact#isValidEmail
   * @method
   * @return {Boolean} [description]
   */
  Contact.prototype.isValidEmail = function () {
    this.email = $.trim(this.email);
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
   * Checks if a contact can be deleted (based on status and link to user)
   * @name Contact#canDelete
   * @returns {boolean}
   */
  Contact.prototype.canDelete = function () {
    var that = this;
    return Base.prototype.canDelete.call(this).then(function (resp) {
      return resp.result && common.contactCanDelete(that);
    });
  };
  /**
   * Archive a contact
   * @name Contact#archive
   * @param skipRead
   * @returns {promise}
   */
  Contact.prototype.archive = function (skipRead) {
    return this._doApiCall({
      method: 'archive',
      params: {},
      skipRead: skipRead
    });
  };
  /**
   * Undo archive of a contact
   * @name Contact#undoArchive
   * @param skipRead
   * @returns {promise}
   */
  Contact.prototype.undoArchive = function (skipRead) {
    return this._doApiCall({
      method: 'undoArchive',
      params: {},
      skipRead: skipRead
    });
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
    return this._doApiCall({
      method: 'generateDocument',
      params: {
        template: template,
        signature: signature
      },
      skipRead: skipRead
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
      isDirty = this._isDirtyStringProperty('name') || this._isDirtyStringProperty('email');
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
      $.publish('contact.fromJson', data);
      return data;
    });
  };
  Contact.prototype._create = function (skipRead) {
    // We override create because we also want
    // to set possible `fields` during the `create` command
    var that = this, data = $.extend({}, this._toJson(), this._toJsonFields());
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
    return this.ds.update(this.id, data, this._fields).then(function (data) {
      return skipRead == true ? data : that._fromJson(data);
    });
  };
  return Contact;
}(jquery, base, common, user, helper);
DateHelper = function ($, moment) {
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
  var INCREMENT = 15;
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
    format = format || this._momentFormat;
    var diff = now.diff(date, 'days');
    var str = Math.abs(diff) < 7 ? date.calendar() : date.format(format);
    return str.replace('AM', 'am').replace('PM', 'pm').split(' at ');
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
    return ranges;
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
    now = now || this.getNow();
    var sep = separator || ' - ', fromParts = this.getFriendlyDateParts(from, now, format), toParts = this.getFriendlyDateParts(to, now, format), result = {
        dayDiff: from.diff(to, 'days'),
        fromDate: fromParts[0],
        fromTime: useHours ? fromParts[1] : '',
        toDate: toParts[0],
        toTime: useHours ? toParts[1] : ''
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
        result.text = result.fromText + sep + result.toTime;
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
  return DateHelper;
}(jquery, moment);
Document = function ($, common, api) {
  // Some constant values
  var DEFAULTS = { id: '' };
  /**
   * @name Document
   * @class
   * @constructor
   * @property {ApiDataSource}  ds        - The documents primary key
   * @property {array}  _fields           - The raw, unprocessed json response
   * @property {string}  id               - The documents primary key
   * @property {string}  raw              - The raw, unprocessed json response
   */
  var Document = function (spec) {
    this.raw = null;
    // raw json object
    this.id = spec.id || DEFAULTS.id;
    // doc _id
    this.ds = spec.ds;
    // ApiDataSource object
    this._fields = spec._fields;  // e.g. [*]
  };
  /**
   * Resets the object
   * @name  Document#reset
   * @method
   * @returns {promise}
   */
  Document.prototype.reset = function () {
    // By default, reset just reads from the DEFAULTS dict again
    return this._fromJson(this._getDefaults(), null);
  };
  /**
   * Checks if the document exists in the database
   * @name  Document#existsInDb
   * @method
   * @returns {boolean}
   */
  Document.prototype.existsInDb = function () {
    // Check if we have a primary key
    return this.id != null && this.id.length > 0;
  };
  /**
   * Checks if the object is empty
   * @name  Document#isEmpty
   * @method
   * @returns {boolean}
   */
  Document.prototype.isEmpty = function () {
    return true;
  };
  /**
   * Checks if the object needs to be saved
   * We don't check any of the keyvalues (or comments, attachments) here
   * @name  Document#isDirty
   * @method
   * @returns {boolean}
   */
  Document.prototype.isDirty = function () {
    return false;
  };
  /**
   * Checks if the object is valid
   * @name  Document#isValid
   * @method
   * @returns {boolean}
   */
  Document.prototype.isValid = function () {
    return true;
  };
  /**
   * Discards any changes made to the object from the previously loaded raw response
   * or resets it when no old raw response was found
   * @name  Document#discardChanges
   * @method
   * @returns {promise}
   */
  Document.prototype.discardChanges = function () {
    return this.raw ? this._fromJson(this.raw, null) : this.reset();
  };
  /**
   * Reloads the object from db
   * @name  Document#reload
   * @method
   * @param _fields
   * @returns {promise}
   */
  Document.prototype.reload = function (_fields) {
    if (this.existsInDb()) {
      return this.get(_fields);
    } else {
      return $.Deferred().reject(new api.ApiError('Cannot reload document, id is empty or null'));
    }
  };
  /**
   * Gets an object by the default api.get
   * @name  Document#get
   * @method
   * @param _fields
   * @returns {promise}
   */
  Document.prototype.get = function (_fields) {
    if (this.existsInDb()) {
      var that = this;
      return this.ds.get(this.id, _fields || this._fields).then(function (data) {
        return that._fromJson(data);
      });
    } else {
      return $.Deferred().reject(new api.ApiError('Cannot get document, id is empty or null'));
    }
  };
  /**
   * Creates an object by the default api.create
   * @name  Document#create
   * @method
   * @param skipRead skips reading the response via _fromJson (false)
   * @returns {promise}
   */
  Document.prototype.create = function (skipRead) {
    if (this.existsInDb()) {
      return $.Deferred().reject(new Error('Cannot create document, already exists in database'));
    }
    if (this.isEmpty()) {
      return $.Deferred().reject(new Error('Cannot create empty document'));
    }
    if (!this.isValid()) {
      return $.Deferred().reject(new Error('Cannot create, invalid document'));
    }
    return this._create(skipRead);
  };
  /**
   * Updates an object by the default api.update
   * @name  Document#update
   * @method
   * @param skipRead skips reading the response via _fromJson (false)
   * @returns {promise}
   */
  Document.prototype.update = function (skipRead) {
    if (!this.existsInDb()) {
      return $.Deferred().reject(new Error('Cannot update document without id'));
    }
    if (this.isEmpty()) {
      return $.Deferred().reject(new Error('Cannot update to empty document'));
    }
    if (!this.isValid()) {
      return $.Deferred().reject(new Error('Cannot update, invalid document'));
    }
    return this._update(skipRead);
  };
  /**
   * Deletes an object by the default api.delete
   * @name  Document#delete
   * @method
   * @returns {promise}
   */
  Document.prototype.delete = function () {
    // Call the api /delete on this document
    if (this.existsInDb()) {
      return this._delete();
    } else {
      return $.Deferred().reject(new Error('Document does not exist'));
    }
  };
  // toJson, fromJson
  // ----
  Document.prototype._getDefaults = function () {
    return DEFAULTS;
  };
  /**
   * _toJson, makes a dict of this object
   * Possibly inheriting classes will override this method,
   * because not all fields can be set during create / update
   * @method
   * @param options
   * @returns {{}}
   * @private
   */
  Document.prototype._toJson = function (options) {
    return { id: this.id };
  };
  /**
   * _fromJson: in this implementation we'll only read
   * the data.keyValues into: comments, attachments, keyValues
   * @method
   * @param {object} data the json response
   * @param {object} options dict
   * @private
   */
  Document.prototype._fromJson = function (data, options) {
    this.raw = data;
    this.id = data._id || DEFAULTS.id;
    return $.Deferred().resolve(data);
  };
  // Implementation stuff
  // ---
  /**
   * The actual _create implementation (after all the checks are done)
   * @param skipRead
   * @returns {*}
   * @private
   */
  Document.prototype._create = function (skipRead) {
    var that = this;
    var data = this._toJson();
    delete data.id;
    return this.ds.create(data, this._fields).then(function (data) {
      return skipRead == true ? data : that._fromJson(data);
    });
  };
  /**
   * The actual _update implementation (after all the checks are done)
   * @param skipRead
   * @returns {*}
   * @private
   */
  Document.prototype._update = function (skipRead) {
    var that = this;
    var data = this._toJson();
    delete data.id;
    return this.ds.update(this.id, data, this._fields).then(function (data) {
      return skipRead == true ? data : that._fromJson(data);
    });
  };
  /**
   * The actual _delete implementation (after all the checks are done)
   * @returns {*}
   * @private
   */
  Document.prototype._delete = function () {
    var that = this;
    return this.ds.delete(this.id).then(function () {
      return that.reset();
    });
  };
  /**
   * Helper for checking if a simple object property is dirty
   * compared to the original raw result
   * @param prop
   * @returns {boolean}
   * @private
   */
  Document.prototype._isDirtyProperty = function (prop) {
    return this.raw ? this[prop] != this.raw[prop] : false;
  };
  /**
   * Helper for checking if a simple object property is dirty
   * compared to the original raw result
   * Because we know that the API doesn't return empty string properties,
   * we do a special, extra check on that.
   * @param prop
   * @returns {boolean}
   * @private
   */
  Document.prototype._isDirtyStringProperty = function (prop) {
    if (this.raw) {
      var same = this[prop] == this.raw[prop] || this[prop] == '' && this.raw[prop] == null;
      return !same;
    } else {
      return false;
    }
  };
  /**
   * Helper for checking if a simple object property is dirty
   * compared to the original raw result
   * @param prop
   * @returns {boolean}
   * @private
   */
  Document.prototype._isDirtyMomentProperty = function (prop) {
    if (this.raw) {
      var newVal = this[prop], oldVal = this.raw[prop];
      if (newVal == null && oldVal == null) {
        return false;
      } else if (newVal && oldVal) {
        return !newVal.isSame(oldVal);
      } else {
        return true;
      }
    } else {
      return false;
    }
  };
  /**
   * Gets the id of a document
   * @param obj
   * @param prop
   * @returns {string}
   * @private
   */
  Document.prototype._getId = function (obj, prop) {
    return typeof obj === 'string' ? obj : obj[prop || '_id'];
  };
  Document.prototype._getIds = function (objs, prop) {
    return objs.map(function (obj) {
      return typeof obj == 'string' ? obj : obj[prop || '_id'];
    });
  };
  /**
   * Wrapping the this.ds.call method
   * {pk: '', method: '', params: {}, _fields: '', timeOut: null, usePost: null, skipRead: null}
   * @method
   * @param spec
   * @returns {promise}
   * @private
   */
  Document.prototype._doApiCall = function (spec) {
    var that = this;
    return this.ds.call(spec.collectionCall == true ? null : spec.pk || this.id, spec.method, spec.params, spec._fields || this._fields, spec.timeOut, spec.usePost).then(function (data) {
      return spec.skipRead == true ? data : that._fromJson(data);
    });
  };
  return Document;
}(jquery, common, api);
Group = function ($, common, api, Document) {
  // Some constant values
  var DEFAULTS = {
    id: '',
    name: '',
    itemFlags: [],
    kitFlags: [],
    customerFlags: [],
    orderFlags: [],
    reservationFlags: [],
    itemFields: [],
    kitFields: [],
    customerFields: [],
    orderFields: [],
    reservationFields: [],
    cancelled: null
  };
  // Allow overriding the ctor during inheritance
  // http://stackoverflow.com/questions/4152931/javascript-inheritance-call-super-constructor-or-use-prototype-chain
  var tmp = function () {
  };
  tmp.prototype = Document.prototype;
  /**
   * Group describes a group which can trigger on certain events (signals)
   * @name  Group
   * @class
   * @property {string} name              the group name
   * @property {array} itemFlags          the groups item flags
   * @property {array} kitFlags           the groups kit flags
   * @property {array} customerFlags      the groups customer flags
   * @property {array} orderFlags         the groups order flags
   * @property {array} reservationFlags   the groups reservation flags
   * @property {array} itemFields         the groups item fields
   * @property {array} kitFields          the groups kit fields
   * @property {array} customerFields     the groups customer fields
   * @property {array} reservationFields  the groups reservation fields
   * @property {array} orderFields        the groups order fields
   * @constructor
   * @extends Document
   */
  var Group = function (opt) {
    var spec = $.extend({}, opt);
    Document.call(this, spec);
    this.name = spec.name || DEFAULTS.name;
    this.itemFlags = spec.itemFlags || DEFAULTS.itemFlags.slice();
    this.kitFlags = spec.kitFlags || DEFAULTS.kitFlags.slice();
    this.customerFlags = spec.customerFlags || DEFAULTS.customerFlags.slice();
    this.orderFlags = spec.orderFlags || DEFAULTS.orderFlags.slice();
    this.reservationFlags = spec.reservationFlags || DEFAULTS.reservationFlags.slice();
    this.itemFields = spec.itemFields || DEFAULTS.itemFields.slice();
    this.kitFields = spec.kitFields || DEFAULTS.kitFields.slice();
    this.customerFields = spec.customerFields || DEFAULTS.customerFields.slice();
    this.reservationFields = spec.reservationFields || DEFAULTS.reservationFields.slice();
    this.orderFields = spec.orderFields || DEFAULTS.orderFields.slice();
  };
  Group.prototype = new tmp();
  Group.prototype.constructor = Group;
  // Business logic
  // ----
  /**
   * Sets the name for a group
   * @param name
   * @returns {promise}
   */
  Group.prototype.updateName = function (name) {
    return this._doApiCall({
      pk: this.id,
      method: 'updateName',
      location: name
    });
  };
  /**
   * Gets the stats (for a specific location)
   * @param locationId
   * @returns {promise}
   */
  Group.prototype.getStats = function (locationId) {
    return this._doApiCall({
      pk: this.id,
      method: 'getStats',
      location: locationId
    });
  };
  /**
   * Updates the flags for a certain collection of documents
   * @param collection (items, kits, customers, reservations, orders)
   * @param flags
   * @param skipRead
   * @returns {promise}
   */
  Group.prototype.updateFlags = function (collection, flags, skipRead) {
    return this._doApiCall({
      pk: this.id,
      method: 'updateFlags',
      collection: collection,
      flags: flags,
      skipRead: skipRead
    });
  };
  /**
   * Creates a field definition for a certain collection of documents
   * @param collection (items, kits, customers, reservations, orders)
   * @param name
   * @param kind
   * @param required
   * @param form
   * @param unit
   * @param editor
   * @param description
   * @param skipRead
   * @returns {promise}
   */
  Group.prototype.createField = function (collection, name, kind, required, form, unit, editor, description, skipRead) {
    return this._doApiCall({
      pk: this.id,
      method: 'createField',
      skipRead: skipRead,
      params: {
        collection: collection,
        name: name,
        kind: kind,
        required: required,
        form: form,
        unit: unit,
        editor: editor,
        description: description
      }
    });
  };
  /**
   * Updates a field definition for a certain collection of documents
   * Also renames the field key on each of the documents that contain that field
   * @param collection (items, kits, customers, reservations, orders)
   * @param name
   * @param newName
   * @param kind
   * @param required
   * @param form
   * @param unit
   * @param editor
   * @param description
   * @param skipRead
   * @returns {promise}
   */
  Group.prototype.updateField = function (collection, name, newName, kind, required, form, unit, editor, description, skipRead) {
    return this._doApiCall({
      pk: this.id,
      method: 'updateField',
      skipRead: skipRead,
      params: {
        collection: collection,
        name: name,
        newName: newName,
        kind: kind,
        required: required,
        form: form,
        unit: unit,
        editor: editor,
        description: description
      }
    });
  };
  /**
   * Deletes a field definition for a certain collection of documents
   * It will remove the field on all documents of that type
   * @param collection (items, kits, customers, reservations, orders)
   * @param name
   * @param skipRead
   * @returns {promise}
   */
  Group.prototype.deleteField = function (collection, name, skipRead) {
    return this._doApiCall({
      pk: this.id,
      method: 'deleteField',
      skipRead: skipRead,
      params: {
        collection: collection,
        name: name
      }
    });
  };
  /**
   * Moves a field definition for a certain collection of documents
   * @param collection (items, kits, customers, reservations, orders)
   * @param oldPos
   * @param newPos
   * @param skipRead
   * @returns {promise}
   */
  Group.prototype.moveField = function (collection, oldPos, newPos, skipRead) {
    return this._doApiCall({
      pk: this.id,
      method: 'moveField',
      skipRead: skipRead,
      params: {
        collection: collection,
        oldPos: oldPos,
        newPos: newPos
      }
    });
  };
  /**
   * Buys a single product from our in-app store
   * @param productId
   * @param quantity
   * @param shipping
   * @returns {promise}
   */
  Group.prototype.buyProduct = function (productId, quantity, shipping) {
    return this._doApiCall({
      pk: this.id,
      method: 'buyProduct',
      skipRead: true,
      params: {
        productId: productId,
        quantity: quantity,
        shipping: shipping
      }
    });
  };
  /**
   * Buys multiple products from our in-app store
   * @param listOfProductQtyTuples
   * @param shipping
   * @returns {promise}
   */
  Group.prototype.buyProducts = function (listOfProductQtyTuples, shipping) {
    return this._doApiCall({
      pk: this.id,
      method: 'buyProducts',
      skipRead: true,
      params: {
        products: listOfProductQtyTuples,
        shipping: shipping
      }
    });
  };
  /**
   * Add tags
   * @param {Array} tags 
   */
  Group.prototype.addTags = function (tags) {
    return this._doApiCall({
      pk: this.id,
      method: 'addTags',
      skipRead: true,
      params: { tags: tags }
    });
  };
  /**
   * Remove tags
   * @param {Array} tags 
   */
  Group.prototype.removeTags = function (tags) {
    return this._doApiCall({
      pk: this.id,
      method: 'removeTags',
      skipRead: true,
      params: { tags: tags }
    });
  };
  // Helpers
  // ----
  /**
   * Helper method that gets all known fields for a certain collection of documents
   * @param coll
   * @param form
   * @returns {Array}
   */
  Group.prototype.getFieldsForCollection = function (coll, form) {
    var fields = [];
    switch (coll) {
    case 'items':
      fields = this.itemFields;
      break;
    case 'kits':
      fields = this.kitFields;
      break;
    case 'contacts':
    case 'customers':
      fields = this.customerFields;
      break;
    case 'reservations':
      fields = this.reservationFields;
      break;
    case 'checkouts':
    case 'orders':
      fields = this.orderFields;
      break;
    default:
      break;
    }
    if (form != null) {
      fields = $.grep(fields, function (f, i) {
        return f.form == form;
      });
    }
    return fields;
  };
  /**
   * Helper method that gets all known flags for a certain collection of documents
   * @param coll
   * @returns {Array}
   */
  Group.prototype.getFlagsForCollection = function (coll) {
    switch (coll) {
    case 'items':
      return this.itemFlags;
    case 'kits':
      return this.kitFlags;
    case 'contacts':
    case 'customers':
      return this.customerFlags;
    case 'reservations':
      return this.reservationFlags;
    case 'checkouts':
    case 'orders':
      return this.orderFlags;
    default:
      return [];
    }
  };
  //
  // Specific validators
  /**
   * Checks if name is valid
   * @name Group#isValidName
   * @method
   * @return {Boolean}
   */
  Group.prototype.isValidName = function () {
    this.name = $.trim(this.name);
    return this.name.length >= 3;
  };
  // toJson, fromJson
  // ----
  /**
   * _toJson, makes a dict of params to use during create / update
   * @param options
   * @returns {{}}
   * @private
   */
  Group.prototype._toJson = function (options) {
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
  Group.prototype._fromJson = function (data, options) {
    var that = this;
    return Document.prototype._fromJson.call(this, data, options).then(function () {
      that.name = data.name || DEFAULTS.name;
      that.itemFlags = data.itemFlags || DEFAULTS.itemFlags.slice();
      that.kitFlags = data.kitFlags || DEFAULTS.kitFlags.slice();
      that.customerFlags = data.customerFlags || DEFAULTS.customerFlags.slice();
      that.orderFlags = data.orderFlags || DEFAULTS.orderFlags.slice();
      that.reservationFlags = data.reservationFlags || DEFAULTS.reservationFlags.slice();
      that.itemFields = data.itemFields || DEFAULTS.itemFields.slice();
      that.kitFields = data.kitFields || DEFAULTS.kitFields.slice();
      that.customerFields = data.customerFields || DEFAULTS.customerFields.slice();
      that.reservationFields = data.reservationFields || DEFAULTS.reservationFields.slice();
      that.orderFields = data.orderFields || DEFAULTS.orderFields.slice();
      that.cancelled = data.cancelled || DEFAULTS.cancelled;
      return data;
    });
  };
  return Group;
}(jquery, common, api, document);
Item = function ($, common, Base) {
  var FLAG = 'cheqroom.prop.Custom', DEFAULT_LAT = 0, DEFAULT_LONG = 0, DEFAULTS = {
      name: '',
      status: '',
      codes: [],
      brand: '',
      model: '',
      warrantyDate: null,
      purchaseDate: null,
      purchasePrice: null,
      location: '',
      category: '',
      geo: [
        DEFAULT_LAT,
        DEFAULT_LONG
      ],
      address: '',
      order: null,
      kit: null,
      custody: null,
      cover: '',
      catalog: null
    };
  // Allow overriding the ctor during inheritance
  // http://stackoverflow.com/questions/4152931/javascript-inheritance-call-super-constructor-or-use-prototype-chain
  var tmp = function () {
  };
  tmp.prototype = Base.prototype;
  /**
   * Item represents a single piece of equipment
   * @name Item
   * @class Item
   * @constructor
   * @property {string} name              the name of the item
   * @property {string} status            the status of the item in an order, or expired
   * @property {string} brand             the item brand
   * @property {string} model             the item model
   * @property {moment} warrantyDate      the item warranty date
   * @property {moment} purchaseDate      the item purchase date
   * @property {string} purchasePrice     the item purchase price
   * @property {Array} codes              the item qr codes
   * @property {string} location          the item location primary key (empty if in_custody)
   * @property {string} category          the item category primary key
   * @property {Array} geo                the item geo position in lat lng array
   * @property {string} address           the item geo position address
   * @property {string} order             the order pk, if the item is currently in an order
   * @property {string} kit               the kit pk, if the item is currently in a kit
   * @property {string} custody           the customer pk, if the item is currently in custody of someone
   * @property {string} cover             the attachment pk of the main image
   * @property {string} catalog           the catalog pk, if the item was made based on a product in the catalog
   * @extends Base
   */
  var Item = function (opt) {
    var spec = $.extend({
      _fields: ['*'],
      crtype: 'cheqroom.types.item'
    }, opt);
    Base.call(this, spec);
    this.name = spec.name || DEFAULTS.name;
    this.status = spec.status || DEFAULTS.status;
    this.brand = spec.brand || DEFAULTS.brand;
    this.model = spec.model || DEFAULTS.model;
    this.warrantyDate = spec.warrantyDate || DEFAULTS.warrantyDate;
    this.purchaseDate = spec.purchaseDate || DEFAULTS.purchaseDate;
    this.purchasePrice = spec.purchasePrice || DEFAULTS.purchasePrice;
    this.codes = spec.codes || DEFAULTS.codes;
    this.location = spec.location || DEFAULTS.location;
    // location._id
    this.category = spec.category || DEFAULTS.category;
    // category._id
    this.geo = spec.geo || DEFAULTS.geo.slice();
    // null or an array with 2 floats
    this.address = spec.address || DEFAULTS.address;
    this.order = spec.order || DEFAULTS.order;
    this.kit = spec.kit || DEFAULTS.kit;
    this.custody = spec.custody || DEFAULTS.custody;
    this.cover = spec.cover || DEFAULTS.cover;
    this.catalog = spec.catalog || DEFAULTS.catalog;
  };
  Item.prototype = new tmp();
  Item.prototype.constructor = Item;
  //
  // Base overrides
  //
  Item.prototype.isValidName = function () {
    this.name = $.trim(this.name);
    return this.name.length >= 3;
  };
  Item.prototype.isValidCategory = function () {
    return $.trim(this.category).length > 0;
  };
  Item.prototype.isValidLocation = function () {
    return $.trim(this.location).length > 0;
  };
  Item.prototype.isValid = function () {
    return this.isValidName() && this.isValidCategory() && (this.status == 'in_custody' ? true : this.isValidLocation());
  };
  /**
   * Checks if the item is empty
   * @name Item#isEmpty
   * @returns {boolean}
   */
  Item.prototype.isEmpty = function () {
    // Checks for: name, status, brand, model, purchaseDate, purchasePrice, codes, location, category
    return Base.prototype.isEmpty.call(this) && this.name == DEFAULTS.name && this.status == DEFAULTS.status && this.brand == DEFAULTS.brand && this.model == DEFAULTS.model && this.warrantyDate == DEFAULTS.warrantyDate && this.purchaseDate == DEFAULTS.purchaseDate && this.purchasePrice == DEFAULTS.purchasePrice && this.codes.length == 0 && this.location == DEFAULTS.location && this.category == DEFAULTS.category;
  };
  /**
   * Checks if the item is dirty and needs saving
   * @name Item#isDirty
   * @returns {boolean}
   */
  Item.prototype.isDirty = function () {
    return Base.prototype.isDirty.call(this) || this._isDirtyName() || this._isDirtyBrand() || this._isDirtyModel() || this._isDirtyWarrantyDate() || this._isDirtyPurchaseDate() || this._isDirtyPurchasePrice() || this._isDirtyCategory() || this._isDirtyLocation() || this._isDirtyGeo() || this._isDirtyFlag();
  };
  Item.prototype._getDefaults = function () {
    return DEFAULTS;
  };
  Item.prototype._toJson = function (options) {
    // Writes out: id, name,
    //             brand, model, purchaseDate, purchasePrice
    //             category, location, catalog
    var data = Base.prototype._toJson.call(this, options);
    data.name = this.name || DEFAULTS.name;
    data.brand = this.brand || DEFAULTS.brand;
    data.model = this.model || DEFAULTS.model;
    data.warrantyDate = this.warrantyDate || DEFAULTS.warrantyDate;
    data.purchaseDate = this.purchaseDate || DEFAULTS.purchaseDate;
    data.purchasePrice = this.purchasePrice || DEFAULTS.purchasePrice;
    data.category = this.category || DEFAULTS.category;
    data.location = this.location || DEFAULTS.location;
    data.catalog = this.catalog || DEFAULTS.catalog;
    // Remove values of null during create
    // Avoids: 422 Unprocessable Entity
    // ValidationError (Item:TZe33wVKWwkKkpACp6Xy5T) (FloatField only accepts float values: ['purchasePrice'])
    for (var k in data) {
      if (data[k] == null) {
        delete data[k];
      }
    }
    return data;
  };
  Item.prototype._fromJson = function (data, options) {
    var that = this;
    return Base.prototype._fromJson.call(this, data, options).then(function () {
      that.name = data.name || DEFAULTS.name;
      that.status = data.status || DEFAULTS.status;
      that.brand = data.brand || DEFAULTS.brand;
      that.model = data.model || DEFAULTS.model;
      that.warrantyDate = data.warrantyDate || DEFAULTS.warrantyDate;
      that.purchaseDate = data.purchaseDate || DEFAULTS.purchaseDate;
      that.purchasePrice = data.purchasePrice || DEFAULTS.purchasePrice;
      that.codes = data.codes || DEFAULTS.codes;
      that.address = data.address || DEFAULTS.address;
      that.geo = data.geo || DEFAULTS.geo.slice();
      that.cover = data.cover || DEFAULTS.cover;
      that.catalog = data.catalog || DEFAULTS.catalog;
      // Depending on the fields we'll need to get the _id directly or from the dicts
      var locId = DEFAULTS.location;
      if (data.location) {
        locId = data.location._id ? data.location._id : data.location;
      }
      that.location = locId;
      var catId = DEFAULTS.category;
      if (data.category) {
        catId = data.category._id ? data.category._id : data.category;
      }
      that.category = catId;
      var orderId = DEFAULTS.order;
      if (data.order) {
        orderId = data.order._id ? data.order._id : data.order;
      }
      that.order = orderId;
      var kitId = DEFAULTS.kit;
      if (data.kit) {
        kitId = data.kit._id ? data.kit._id : data.kit;
      }
      that.kit = kitId;
      var custodyId = DEFAULTS.custody;
      if (data.custody) {
        custodyId = data.custody._id ? data.custody._id : data.custody;
      }
      that.custody = custodyId;
      $.publish('item.fromJson', data);
      return data;
    });
  };
  // Deprecated
  Item.prototype._toJsonKeyValues = function () {
    var that = this;
    var params = {};
    if (this.keyValues != null && this.keyValues.length > 0) {
      $.each(this.keyValues, function (i, kv) {
        var param = 'keyValues__' + kv.key;
        params[param + '__kind'] = kv.kind;
        params[param + '__value'] = kv.value;
      });
    }
    return params;
  };
  // Deprecated
  Item.prototype._isDirtyName = function () {
    return this._isDirtyStringProperty('name');
  };
  Item.prototype._isDirtyBrand = function () {
    return this._isDirtyStringProperty('brand');
  };
  Item.prototype._isDirtyModel = function () {
    return this._isDirtyStringProperty('model');
  };
  Item.prototype._isDirtyWarrantyDate = function () {
    return this._isDirtyMomentProperty('warrantyDate');
  };
  Item.prototype._isDirtyPurchaseDate = function () {
    return this._isDirtyMomentProperty('purchaseDate');
  };
  Item.prototype._isDirtyPurchasePrice = function () {
    return this._isDirtyProperty('purchasePrice');
  };
  Item.prototype._isDirtyLocation = function () {
    if (this.raw && this.status != 'in_custody') {
      var locId = DEFAULTS.location;
      if (this.raw.location) {
        locId = this.raw.location._id ? this.raw.location._id : this.raw.location;
      }
      return this.location != locId;
    } else {
      return false;
    }
  };
  Item.prototype._isDirtyCategory = function () {
    if (this.raw) {
      var catId = DEFAULTS.category;
      if (this.raw.category) {
        catId = this.raw.category._id ? this.raw.category._id : this.raw.category;
      }
      return this.category != catId;
    } else {
      return false;
    }
  };
  Item.prototype._isDirtyGeo = function () {
    if (this.raw) {
      var address = this.raw.address || DEFAULTS.address;
      var geo = this.raw.geo || DEFAULTS.geo.slice();
      return this.address != address || this.geo[0] != geo[0] || this.geo[1] != geo[1];
    } else {
      return false;
    }
  };
  Item.prototype._isDirtyFlag = function () {
    return this._isDirtyStringProperty('flag');
  };
  //
  // Business logic
  //
  /**
   * Checks if the Item is unavailable between from / to dates (optional)
   * @name Item#getAvailabilities
   * @param {Moment} from       the from date (optional)
   * @param {Moment} to         the to date (optional)
   * @returns {promise}
   */
  Item.prototype.getAvailabilities = function (from, to) {
    return this.ds.call(this.id, 'getAvailability', {
      fromDate: from,
      toDate: to
    });
  };
  /**
   * updates the Item
   * We override because Item.update does not support updating categories
   * @param skipRead
   * @returns {*}
   */
  Item.prototype.update = function (skipRead) {
    if (this.isEmpty()) {
      return $.Deferred().reject(new Error('Cannot update to empty document'));
    }
    if (!this.existsInDb()) {
      return $.Deferred().reject(new Error('Cannot update document without id'));
    }
    if (!this.isValid()) {
      return $.Deferred().reject(new Error('Cannot update, invalid document'));
    }
    var that = this, dfdCheck = $.Deferred(), dfdCategory = $.Deferred(), dfdLocation = $.Deferred(), dfdFields = $.Deferred(), dfdFlags = $.Deferred(), dfdBasic = $.Deferred();
    if (this._isDirtyCategory()) {
      this.canChangeCategory(this.category).done(function (data) {
        if (data.result) {
          dfdCheck.resolve();
        } else {
          dfdCheck.reject(new Error('Unable to change item category'));
        }
      });
    } else {
      dfdCheck.resolve();
    }
    return dfdCheck.then(function () {
      if (that._isDirtyCategory()) {
        dfdCategory = that.changeCategory(that.category);
      } else {
        dfdCategory.resolve();
      }
      // Skip update location if item is in custody
      if (that._isDirtyLocation() && that.status != 'in_custody') {
        dfdLocation = that.changeLocation(that.location);
      } else {
        dfdLocation.resolve();
      }
      if (that._isDirtyFields()) {
        dfdFields = that._updateFields();
      } else {
        dfdFields.resolve();
      }
      if (that._isDirtyFlag()) {
        if (that.flag == '' || that.flag == null) {
          dfdFlags = that.setFlag(that.flag);
        } else {
          dfdFlags = that.clearFlag(that.flag);
        }
      } else {
        dfdFlags.resolve();
      }
      if (that._isDirtyName() || that._isDirtyBrand() || that._isDirtyModel() || that._isDirtyWarrantyDate() || that._isDirtyPurchaseDate() || that._isDirtyPurchasePrice()) {
        dfdBasic = that.updateBasicFields(that.name, that.brand, that.model, that.warrantyDate, that.purchaseDate, that.purchasePrice);
      } else {
        dfdBasic.resolve();
      }
      return $.when(dfdCategory, dfdLocation, dfdFields, dfdFlags, dfdBasic);
    });
  };
  /**
   * Creates an Item
   * @name  Item#create
   * @method
   * @param skipRead skips reading the response via _fromJson (false)
   * @returns {promise}
   */
  Item.prototype.create = function (skipRead) {
    if (this.existsInDb()) {
      return $.Deferred().reject(new Error('Cannot create document, already exists in database'));
    }
    if (this.isEmpty()) {
      return $.Deferred().reject(new Error('Cannot create empty document'));
    }
    if (!this.isValid()) {
      return $.Deferred().reject(new Error('Cannot create, invalid document'));
    }
    var that = this, data = $.extend(this._toJson(), this._toJsonFields());
    delete data.id;
    return this.ds.create(data, this._fields).then(function (data) {
      return skipRead == true ? data : that._fromJson(data);
    });
  };
  /**
   * Creates multiple instances of the same item
   * @name  Item#createMultiple
   * @method
   * @param  times
   * @param  autoNumber
   * @param  startFrom
   * @return {promise}
   */
  Item.prototype.createMultiple = function (times, autoNumber, startFrom, skipRead) {
    if (this.existsInDb()) {
      return $.Deferred().reject(new Error('Cannot create document, already exists in database'));
    }
    if (this.isEmpty()) {
      return $.Deferred().reject(new Error('Cannot create empty document'));
    }
    if (!this.isValid()) {
      return $.Deferred().reject(new Error('Cannot create, invalid document'));
    }
    var that = this;
    var data = $.extend(this._toJson(), this._toJsonFields(), {
      times: times || 1,
      autoNumber: autoNumber || false,
      startFrom: startFrom
    });
    delete data.id;
    // BUGFFIX model name clash issue
    // model == Item property
    // model == database model
    if (data.model != null) {
      data.brandModel = data.model;
      delete data.model;
    }
    return this._doApiCall({
      method: 'createMultiple',
      params: data
    }).then(function (data) {
      var dfd = skipRead == true ? $.Deferred().resolve(data[0]) : that._fromJson(data[0]);
      return dfd.then(function () {
        return data;
      });
    });
  };
  /**
   * Duplicates an item a number of times
   * @name Item#duplicate
   * @param times
   * @param location
   * @returns {promise}
   */
  Item.prototype.duplicate = function (times, location, autoNumber, startFrom) {
    return this._doApiCall({
      method: 'duplicate',
      params: {
        times: times,
        location: location,
        autoNumber: autoNumber,
        startFrom: startFrom
      },
      skipRead: true  // response is an array of new Item objects!!
    });
  };
  /**
   * Checks if an item can be reserved (based on status)
   * @name Item#canReserve
   * @returns {boolean}
   */
  Item.prototype.canReserve = function () {
    return common.itemCanReserve(this);
  };
  /**
   * Checks if an item can be checked out (based on status)
   * @name Item#canCheckout
   * @returns {boolean}
   */
  Item.prototype.canCheckout = function () {
    return common.itemCanCheckout(this);
  };
  /**
   * Checks if we can go to the checkout of an item (based on status)
   * @name Item#canGoToCheckout
   * @returns {boolean}
   */
  Item.prototype.canGoToCheckout = function () {
    return common.itemCanGoToCheckout(this);
  };
  /**
   * Checks if an item can be checked in (based on status)
   * @name Item#canCheckin
   * @returns {boolean}
   */
  Item.prototype.canCheckin = function () {
    return common.itemCanCheckin(this);
  };
  /**
   * Checks if an item can be expired (based on status)
   * @name Item#canExpire
   * @returns {boolean}
   */
  Item.prototype.canExpire = function () {
    return common.itemCanExpire(this);
  };
  /**
   * Checks if an item can be made available again (based on status)
   * @name Item#canUndoExpire
   * @returns {boolean}
   */
  Item.prototype.canUndoExpire = function () {
    return common.itemCanUndoExpire(this);
  };
  /**
   * Checks if an item can be deleted
   * @name Item#canDelete
   * @returns {boolean}
   */
  Item.prototype.canDelete = function () {
    var can = Base.prototype.canDelete.call(this);
    return can && common.itemCanDelete(this);
  };
  /**
   * Expires an item, puts it in the *expired* status
   * @name Item#expire
   * @param skipRead
   * @returns {promise}
   */
  Item.prototype.expire = function (skipRead) {
    return this._doApiCall({
      method: 'expire',
      skipRead: skipRead
    });
  };
  /**
   * Un-expires an item, puts it in the *available* status again
   * @name Item#undoExpire
   * @param skipRead
   * @returns {promise}
   */
  Item.prototype.undoExpire = function (skipRead) {
    return this._doApiCall({
      method: 'undoExpire',
      skipRead: skipRead
    });
  };
  /**
   * Change the location of an item
   * @name Item#changeLocation
   * @param skipRead
   * @returns {promise}
   */
  Item.prototype.changeLocation = function (locationId, skipRead) {
    return this._doApiCall({
      method: 'changeLocation',
      params: { location: locationId },
      skipRead: skipRead
    });
  };
  /**
   * Adds a QR code to the item
   * @name Item#addCode
   * @param code
   * @param skipRead
   * @returns {promise}
   */
  Item.prototype.addCode = function (code, skipRead) {
    return this._doApiCall({
      method: 'addCodes',
      params: { codes: [code] },
      skipRead: skipRead
    });
  };
  /**
   * Removes a QR code from the item
   * @name Item#removeCode
   * @param code
   * @param skipRead
   * @returns {promise}
   */
  Item.prototype.removeCode = function (code, skipRead) {
    return this._doApiCall({
      method: 'removeCodes',
      params: { codes: [code] },
      skipRead: skipRead
    });
  };
  /**
   * Updates the geo position of an item
   * @name Item#updateGeo
   * @param lat
   * @param lng
   * @param address
   * @param skipRead
   * @returns {promise}
   */
  Item.prototype.updateGeo = function (lat, lng, address, skipRead) {
    return this._doApiCall({
      method: 'updateGeo',
      params: {
        lat: lat,
        lng: lng,
        address: address
      },
      skipRead: skipRead
    });
  };
  /**
   * Gets the last number for items with this name
   * @name Item#getLastNumber
   * @returns {promise}
   */
  Item.prototype.getLastNumber = function () {
    // Do a collection API call to get the last number for items with this name
    return this.ds.call(null, 'getLastItemNumber', { name: this.name });
  };
  /**
   * Updates the basic fields of an item
   * @name Item#updateBasicFields
   * @param name
   * @param skipRead
   * @returns {promise}
   */
  Item.prototype.updateBasicFields = function (name, brand, model, warrantyDate, purchaseDate, purchasePrice, skipRead) {
    var that = this, params = {};
    if (name != null && name != this.raw.name) {
      params['name'] = name;
    }
    if (brand != null && brand != this.raw.brand) {
      params['brand'] = brand;
    }
    if (model != null && model != this.raw.model) {
      params['model'] = model;
    }
    if (warrantyDate != null && !warrantyDate.isSame(this.raw.warrantyDate)) {
      params['warrantyDate'] = warrantyDate;
    }
    if (purchaseDate != null && !purchaseDate.isSame(this.raw.purchaseDate)) {
      params['purchaseDate'] = purchaseDate;
    }
    if (purchasePrice != null && purchasePrice != this.raw.purchasePrice) {
      params['purchasePrice'] = purchasePrice;
    }
    // Remove values of null during create
    // Avoids: 422 Unprocessable Entity
    // ValidationError (Item:TZe33wVKWwkKkpACp6Xy5T) (FloatField only accepts float values: ['purchasePrice'])
    //for (var k in params) {
    //    if (params[k] == null) {
    //        delete params[k];
    //    }
    //}
    return this.ds.update(this.id, params, this._fields).then(function (data) {
      return skipRead == true ? data : that._fromJson(data);
    });
  };
  /**
   * Checks if the item can be moved to another category
   * @name Item#canChangeCategory
   * @param category
   * @returns {promise}
   */
  Item.prototype.canChangeCategory = function (category) {
    return this._doApiCall({
      collectionCall: true,
      // it's a collection call, not an Item call
      method: 'canChangeCategory',
      params: {
        pks: [this.id],
        category: category
      },
      skipRead: true,
      // the response is a hash with results and conflicts
      _fields: '*'
    });
  };
  /**
   * Moves the item to another category
   * @name Item#changeCategory
   * @param category
   * @param skipRead
   * @returns {promise}
   */
  Item.prototype.changeCategory = function (category, skipRead) {
    var that = this;
    return this._doApiCall({
      collectionCall: true,
      // it's a collection call, not an Item call
      method: 'changeCategory',
      params: {
        pks: [this.id],
        category: category
      },
      skipRead: true  // the response is a list of changed Items
    }).then(function (data) {
      return skipRead == true ? data : that._fromJson(data[0]);
    });
  };
  /**
   * Checks if custody can be taken for an item (based on status)
   * @name Item#canTakeCustody
   * @returns {boolean}
   */
  Item.prototype.canTakeCustody = function () {
    return common.itemCanTakeCustody(this);
  };
  /**
   * Checks if custody can be released for an item (based on status)
   * @name Item#canReleaseCustody
   * @returns {boolean}
   */
  Item.prototype.canReleaseCustody = function () {
    return common.itemCanReleaseCustody(this);
  };
  /**
   * Checks if custody can be transferred for an item (based on status)
   * @name Item#canTransferCustody
   * @returns {boolean}
   */
  Item.prototype.canTransferCustody = function () {
    return common.itemCanTransferCustody(this);
  };
  /**
   * Takes custody of an item
   * Puts it in the *in_custody* status
   * @name Item#takeCustody
   * @param customerId (when null, we'll take the customer of the user making the API call)
   * @param skipRead
   * @returns {promise}
   */
  Item.prototype.takeCustody = function (customerId, skipRead) {
    return this._doApiCall({
      method: 'takeCustody',
      params: { customer: customerId },
      skipRead: skipRead
    });
  };
  /**
   * Releases custody of an item at a certain location
   * Puts it in the *available* status again
   * @name Item#releaseCustody
   * @param locationId
   * @param skipRead
   * @returns {promise}
   */
  Item.prototype.releaseCustody = function (locationId, skipRead) {
    return this._doApiCall({
      method: 'releaseCustody',
      params: { location: locationId },
      skipRead: skipRead
    });
  };
  /**
   * Transfers custody of an item
   * Keeps it in the *in_custody* status
   * @name Item#transferCustody
   * @param customerId (when null, we'll take the customer of the user making the API call)
   * @param skipRead
   * @returns {promise}
   */
  Item.prototype.transferCustody = function (customerId, skipRead) {
    return this._doApiCall({
      method: 'transferCustody',
      params: { customer: customerId },
      skipRead: skipRead
    });
  };
  return Item;
}(jquery, common, base);
Kit = function ($, Base, common) {
  var DEFAULTS = {
    name: '',
    items: [],
    status: 'unknown',
    cover: ''
  };
  // Allow overriding the ctor during inheritance
  // http://stackoverflow.com/questions/4152931/javascript-inheritance-call-super-constructor-or-use-prototype-chain
  var tmp = function () {
  };
  tmp.prototype = Base.prototype;
  /**
   * Kit class
   * @name  Kit
   * @class
   * @constructor
   * @extends Base
   */
  var Kit = function (opt) {
    var spec = $.extend({
      _fields: ['*'],
      crtype: 'cheqroom.types.kit'
    }, opt);
    Base.call(this, spec);
    this.name = spec.name || DEFAULTS.name;
    this.items = spec.items || DEFAULTS.items.slice();
    this.codes = [];
    this.conflicts = [];
    this.status = spec.status || DEFAULTS.status;
    this.cover = spec.cover || DEFAULTS.cover;
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
    this.name = $.trim(this.name);
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
      return $.Deferred().resolve(true);
    }
    // If a previous name available check is pending, abort it
    if (this._dfdNameAvailable) {
      this._dfdNameAvailable.abort();
    }
    this._dfdNameAvailable = this.ds.search({ name: $.trim(this.name) }, '_id');
    return this._dfdNameAvailable.then(function (resp) {
      return resp.count == 0;
    }, function (error) {
      return false;
    });
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
    return isDirty;
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
    return common.kitCanCheckout(this);
  };
  /**
   * Checks if a Kit can be reserved (based on status)
   * @name Kit#canReserve
   * @method
   * @returns {boolean}
   */
  Kit.prototype.canReserve = function () {
    return common.kitCanReserve(this);
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
      return $.Deferred().reject(new Error('Cannot addItems from document without id'));
    }
    return this._doApiCall({
      method: 'addItems',
      params: { items: items },
      skipRead: skipRead
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
      return $.Deferred().reject(new Error('Cannot removeItems from document without id'));
    }
    return this._doApiCall({
      method: 'removeItems',
      params: { items: items },
      skipRead: skipRead
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
      return $.Deferred().reject(new Error('Cannot moveItem from document without id'));
    }
    return this._doApiCall({
      method: 'moveItem',
      params: {
        item: item,
        toPos: toPos
      },
      skipRead: skipRead
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
    return this._doApiCall({
      method: 'addCodes',
      params: { codes: [code] },
      skipRead: skipRead
    });
  };
  /**
   * Removes a QR code from the kit
   * @name Kit#removeCode
   * @param code
   * @param skipRead
   * @returns {promise}
   */
  Kit.prototype.removeCode = function (code, skipRead) {
    return this._doApiCall({
      method: 'removeCodes',
      params: { codes: [code] },
      skipRead: skipRead
    });
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
      params: {
        times: times,
        location: location
      },
      skipRead: skipRead || true
    });
  };
  /**
   * Checks if custody can be taken for a kit (based on status)
   * @name Kit#canTakeCustody
   * @returns {boolean}
   */
  Kit.prototype.canTakeCustody = function () {
    return common.kitCanTakeCustody(this);
  };
  /**
   * Checks if custody can be released for a kit (based on status)
   * @name Kit#canReleaseCustody
   * @returns {boolean}
   */
  Kit.prototype.canReleaseCustody = function () {
    return common.kitCanReleaseCustody(this);
  };
  /**
   * Checks if custody can be transferred for a kit (based on status)
   * @name Kit#canTransferCustody
   * @returns {boolean}
   */
  Kit.prototype.canTransferCustody = function () {
    return common.kitCanTransferCustody(this);
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
    return this._doApiCall({
      method: 'takeCustody',
      params: { customer: customerId },
      skipRead: skipRead
    });
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
    return this._doApiCall({
      method: 'releaseCustody',
      params: { location: locationId },
      skipRead: skipRead
    });
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
    return this._doApiCall({
      method: 'transferCustody',
      params: { customer: customerId },
      skipRead: skipRead
    });
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
    //data.items --> not via update
    return data;
  };
  Kit.prototype._fromJson = function (data, options) {
    var that = this;
    return Base.prototype._fromJson.call(this, data, options).then(function (data) {
      that.name = data.name || DEFAULTS.name;
      that.items = data.items || DEFAULTS.items.slice();
      that.codes = data.codes || [];
      that.status = data.status || DEFAULTS.status;
      that.cover = data.cover || DEFAULTS.cover;
      that._loadConflicts(that.items);
      $.publish('Kit.fromJson', data);
      return data;
    });
  };
  // Override create method so we can pass items
  // We don't override _toJson to include items, because this would
  // mean that on an update items would also be passed
  Kit.prototype.create = function (skipRead) {
    if (this.existsInDb()) {
      return $.Deferred().reject(new Error('Cannot create document, already exists in database'));
    }
    // Don't check for isEmpty/isValid, if no name is given,
    // that we automatically generate a name on the server
    //if (this.isEmpty()) {
    //    return $.Deferred().reject(new Error("Cannot create empty document"));
    //}
    //if (!this.isValid()) {
    //    return $.Deferred().reject(new Error("Cannot create, invalid document"));
    //}
    var that = this, data = {
        name: this.name,
        items: this._getIds(this.items)
      };
    // Also add any possible fields we need during `create`
    $.extend(data, this._toJsonFields());
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
      $.each(items, function (i, item) {
        switch (item.status) {
        case 'await_checkout':
          conflicts.push({
            kind: 'status',
            item: item._id,
            itemName: item.name,
            itemStatus: item.status,
            order: item.order
          });
          break;
        case 'checkedout':
          conflicts.push({
            kind: 'order',
            item: item._id,
            itemName: item.name,
            itemStatus: item.status,
            order: item.order
          });
          break;
        case 'expired':
          conflicts.push({
            kind: 'status',
            item: item._id,
            itemName: item.name,
            itemStatus: item.status
          });
          break;
        }
      });
    }
    this.conflicts = conflicts;
  };
  return Kit;
}(jquery, base, common);
Location = function ($, Base) {
  var DEFAULTS = {
    name: '',
    address: ''
  };
  // Allow overriding the ctor during inheritance
  // http://stackoverflow.com/questions/4152931/javascript-inheritance-call-super-constructor-or-use-prototype-chain
  var tmp = function () {
  };
  tmp.prototype = Base.prototype;
  /**
   * @name Location
   * @class Location
   * @constructor
   * @extends Base
   * @property {string}  name        - the location name
   * @property {string}  address     - the location address
   * @example
   * var loc = new cr.api.Location({ds: dsLocations});
   * loc.name = "Headquarters";
   * loc.address = "4280 Express Road, Sarasota, FL 34238";
   * loc.create()
   *     .done(function() {
   *         console.log(loc);
   *     });
   */
  var Location = function (opt) {
    var spec = $.extend({ _fields: ['*'] }, opt);
    Base.call(this, spec);
    this.name = spec.name || DEFAULTS.name;
    this.address = spec.address || DEFAULTS.address;
  };
  Location.prototype = new tmp();
  Location.prototype.constructor = Location;
  //
  // Document overrides
  //
  /**
   * Checks if the location is empty
   * @method
   * @name Location#isEmpty
   * @returns {boolean}
   */
  Location.prototype.isEmpty = function () {
    return Base.prototype.isEmpty.call(this) && this.name == DEFAULTS.name && this.address == DEFAULTS.address;
  };
  /**
   * Checks if the location is dirty and needs saving
   * @method
   * @name Location#isDirty
   * @returns {boolean}
   */
  Location.prototype.isDirty = function () {
    var isDirty = Base.prototype.isDirty.call(this);
    if (!isDirty && this.raw) {
      var name = this.raw.name || DEFAULTS.name;
      var address = this.raw.address || DEFAULTS.address;
      return this.name != name || this.address != address;
    }
    return isDirty;
  };
  Location.prototype._getDefaults = function () {
    return DEFAULTS;
  };
  Location.prototype._toJson = function (options) {
    var data = Base.prototype._toJson.call(this, options);
    data.name = this.name || DEFAULTS.name;
    data.address = this.address || DEFAULTS.address;
    return data;
  };
  Location.prototype._fromJson = function (data, options) {
    var that = this;
    return Base.prototype._fromJson.call(this, data, options).then(function () {
      that.name = data.name || DEFAULTS.name;
      that.address = data.address || DEFAULTS.address;
      $.publish('location.fromJson', data);
      return data;
    });
  };
  return Location;
}(jquery, base);
location = function ($, Base) {
  var DEFAULTS = {
    name: '',
    address: ''
  };
  // Allow overriding the ctor during inheritance
  // http://stackoverflow.com/questions/4152931/javascript-inheritance-call-super-constructor-or-use-prototype-chain
  var tmp = function () {
  };
  tmp.prototype = Base.prototype;
  /**
   * @name Location
   * @class Location
   * @constructor
   * @extends Base
   * @property {string}  name        - the location name
   * @property {string}  address     - the location address
   * @example
   * var loc = new cr.api.Location({ds: dsLocations});
   * loc.name = "Headquarters";
   * loc.address = "4280 Express Road, Sarasota, FL 34238";
   * loc.create()
   *     .done(function() {
   *         console.log(loc);
   *     });
   */
  var Location = function (opt) {
    var spec = $.extend({ _fields: ['*'] }, opt);
    Base.call(this, spec);
    this.name = spec.name || DEFAULTS.name;
    this.address = spec.address || DEFAULTS.address;
  };
  Location.prototype = new tmp();
  Location.prototype.constructor = Location;
  //
  // Document overrides
  //
  /**
   * Checks if the location is empty
   * @method
   * @name Location#isEmpty
   * @returns {boolean}
   */
  Location.prototype.isEmpty = function () {
    return Base.prototype.isEmpty.call(this) && this.name == DEFAULTS.name && this.address == DEFAULTS.address;
  };
  /**
   * Checks if the location is dirty and needs saving
   * @method
   * @name Location#isDirty
   * @returns {boolean}
   */
  Location.prototype.isDirty = function () {
    var isDirty = Base.prototype.isDirty.call(this);
    if (!isDirty && this.raw) {
      var name = this.raw.name || DEFAULTS.name;
      var address = this.raw.address || DEFAULTS.address;
      return this.name != name || this.address != address;
    }
    return isDirty;
  };
  Location.prototype._getDefaults = function () {
    return DEFAULTS;
  };
  Location.prototype._toJson = function (options) {
    var data = Base.prototype._toJson.call(this, options);
    data.name = this.name || DEFAULTS.name;
    data.address = this.address || DEFAULTS.address;
    return data;
  };
  Location.prototype._fromJson = function (data, options) {
    var that = this;
    return Base.prototype._fromJson.call(this, data, options).then(function () {
      that.name = data.name || DEFAULTS.name;
      that.address = data.address || DEFAULTS.address;
      $.publish('location.fromJson', data);
      return data;
    });
  };
  return Location;
}(jquery, base);
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
  var INCREMENT = 15;
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
    format = format || this._momentFormat;
    var diff = now.diff(date, 'days');
    var str = Math.abs(diff) < 7 ? date.calendar() : date.format(format);
    return str.replace('AM', 'am').replace('PM', 'pm').split(' at ');
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
    return ranges;
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
    now = now || this.getNow();
    var sep = separator || ' - ', fromParts = this.getFriendlyDateParts(from, now, format), toParts = this.getFriendlyDateParts(to, now, format), result = {
        dayDiff: from.diff(to, 'days'),
        fromDate: fromParts[0],
        fromTime: useHours ? fromParts[1] : '',
        toDate: toParts[0],
        toTime: useHours ? toParts[1] : ''
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
        result.text = result.fromText + sep + result.toTime;
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
  return DateHelper;
}(jquery, moment);
transaction = function ($, api, Base, Location, DateHelper, Helper) {
  var DEFAULTS = {
    status: 'creating',
    from: null,
    to: null,
    due: null,
    contact: null,
    location: null,
    number: '',
    items: [],
    conflicts: [],
    by: null,
    archived: null,
    itemSummary: null,
    name: null
  };
  // Allow overriding the ctor during inheritance
  // http://stackoverflow.com/questions/4152931/javascript-inheritance-call-super-constructor-or-use-prototype-chain
  var tmp = function () {
  };
  tmp.prototype = Base.prototype;
  /**
   * @name Transaction
   * @class Transaction
   * @constructor
   * @extends Base
   * @property {boolean} autoCleanup      - Automatically cleanup the transaction if it becomes empty?
   * @property {DateHelper} dateHelper    - A DateHelper object ref
   * @property {string} status            - The transaction status
   * @property {moment} from              - The transaction from date
   * @property {moment} to                - The transaction to date
   * @property {moment} due               - The transaction due date
   * @property {string} number            - The booking number
   * @property {string} contact           - The Contact.id for this transaction
   * @property {string} location          - The Location.id for this transaction
   * @property {Array} items              - A list of Item.id strings
   * @property {Array} conflicts          - A list of conflict hashes
   */
  var Transaction = function (opt) {
    var spec = $.extend({}, opt);
    Base.call(this, spec);
    this.dsItems = spec.dsItems;
    // we'll also access the /items collection
    // should we automatically delete the transaction from the database?
    this.autoCleanup = spec.autoCleanup != null ? spec.autoCleanup : false;
    this.dateHelper = spec.dateHelper || new DateHelper();
    this.helper = spec.helper || new Helper();
    this.status = spec.status || DEFAULTS.status;
    // the status of the order or reservation
    this.from = spec.from || DEFAULTS.from;
    // a date in the future
    this.to = spec.to || DEFAULTS.to;
    // a date in the future
    this.due = spec.due || DEFAULTS.due;
    // a date even further in the future, we suggest some standard avg durations
    this.number = spec.number || DEFAULTS.number;
    // a booking number
    this.contact = spec.contact || DEFAULTS.contact;
    // a contact id
    this.location = spec.location || DEFAULTS.location;
    // a location id
    this.items = spec.items || DEFAULTS.items.slice();
    // an array of item ids
    this.conflicts = spec.conflicts || DEFAULTS.conflicts.slice();
    // an array of Conflict objects
    this.by = spec.by || DEFAULTS.by;
    this.itemSummary = spec.itemSummary || DEFAULTS.itemSummary;
    this.name = spec.name || DEFAULTS.name;
  };
  Transaction.prototype = new tmp();
  Transaction.prototype.constructor = Base;
  //
  // Date helpers (possibly overwritten)
  //
  /**
   * Gets the now time
   * @returns {Moment}
   */
  Transaction.prototype.getNow = function () {
    return this._getDateHelper().getNow();
  };
  /**
   * Gets the now time rounded
   * @returns {Moment}
   */
  Transaction.prototype.getNowRounded = function () {
    return this._getDateHelper().roundTimeFrom(this.getNow());
  };
  /**
   * Gets the next time slot after a date, by default after now
   * @returns {Moment}
   */
  Transaction.prototype.getNextTimeSlot = function (d) {
    d = d || this.getNowRounded();
    var next = moment(d).add(this._getDateHelper().roundMinutes, 'minutes');
    if (next.isSame(d)) {
      next = next.add(this._getDateHelper().roundMinutes, 'minutes');
    }
    return next;
  };
  /**
   * Gets the lowest possible from date, by default now
   * @method
   * @name Transaction#getMinDateFrom
   * @returns {Moment}
   */
  Transaction.prototype.getMinDateFrom = function () {
    return this.getMinDate();
  };
  /**
   * Gets the highest possible from date, by default years from now
   * @method
   * @name Transaction#getMaxDateFrom
   * @returns {Moment}
   */
  Transaction.prototype.getMaxDateFrom = function () {
    return this.getMaxDate();
  };
  /**
   * Gets the lowest possible to date, by default from +1 timeslot
   * @method
   * @name Transaction#getMinDateTo
   * @returns {Moment}
   */
  Transaction.prototype.getMinDateTo = function () {
    // to can only be one timeslot after the min from date
    return this.getNextTimeSlot(this.getMinDateFrom());
  };
  /**
   * Gets the highest possible to date, by default years from now
   * @method
   * @name Transaction#getMaxDateTo
   * @returns {Moment}
   */
  Transaction.prototype.getMaxDateTo = function () {
    return this.getMaxDate();
  };
  /**
   * Gets the lowest possible due date, by default same as getMinDateTo
   * @method
   * @name Transaction#getMinDateDue
   * @returns {Moment}
   */
  Transaction.prototype.getMinDateDue = function () {
    return this.getMinDateTo();
  };
  /**
   * Gets the highest possible due date, by default same as getMaxDateDue
   * @method
   * @name Transaction#getMaxDateDue
   * @returns {Moment}
   */
  Transaction.prototype.getMaxDateDue = function () {
    return this.getMaxDateTo();
  };
  /**
   * DEPRECATED
   * Gets the lowest possible date to start this transaction
   * @method
   * @name Transaction#getMinDate
   * @returns {Moment} min date
   */
  Transaction.prototype.getMinDate = function () {
    return this.getNow();
  };
  /**
   * DEPRECATED
   * Gets the latest possible date to end this transaction
   * @method
   * @name Transaction#getMaxDate
   * @returns {Moment} max date
   */
  Transaction.prototype.getMaxDate = function () {
    var dateHelper = this._getDateHelper();
    var now = dateHelper.getNow();
    var next = dateHelper.roundTimeTo(now);
    return next.add(365, 'day');  // TODO: Is this a sensible date?
  };
  /**
   * suggestEndDate, makes a new moment() object with a suggested end date,
   * already rounded up according to the group.profile settings
   * @method suggestEndDate
   * @name Transaction#suggestEndDate
   * @param {Moment} m a suggested end date for this transaction
   * @returns {*}
   */
  Transaction.prototype.suggestEndDate = function (m) {
    var dateHelper = this._getDateHelper();
    var end = dateHelper.addAverageDuration(m || dateHelper.getNow());
    return dateHelper.roundTimeTo(end);
  };
  //
  // Base overrides
  //
  /**
   * Checks if the transaction is empty
   * @method isEmpty
   * @name Transaction#isEmpty
   * @returns {boolean}
   */
  Transaction.prototype.isEmpty = function () {
    return Base.prototype.isEmpty.call(this) && this.status == DEFAULTS.status && (this.crtype == 'cheqroom.types.order' ? true : this.from == DEFAULTS.from) && this.to == DEFAULTS.to && this.due == DEFAULTS.due && this.number == DEFAULTS.number && this.contact == DEFAULTS.contact && this.location == DEFAULTS.location && this.items.length == 0  // not DEFAULTS.items? :)
;
  };
  /**
   * Checks if the transaction is dirty and needs saving
   * @method
   * @name Transaction#isDirty
   * @returns {boolean}
   */
  Transaction.prototype.isDirty = function () {
    return Base.prototype.isDirty.call(this) || this._isDirtyBasic() || this._isDirtyDates() || this._isDirtyLocation() || this._isDirtyContact() || this._isDirtyItems();
  };
  Transaction.prototype._isDirtyBasic = function () {
    if (this.raw) {
      var status = this.raw.status || DEFAULTS.status;
      return this.status != status;
    } else {
      return false;
    }
  };
  Transaction.prototype._isDirtyDates = function () {
    if (this.raw) {
      var from = this.raw.from || DEFAULTS.from;
      var to = this.raw.to || DEFAULTS.to;
      var due = this.raw.due || DEFAULTS.due;
      return this.from != from || this.to != to || this.due != due;
    } else {
      return false;
    }
  };
  Transaction.prototype._isDirtyLocation = function () {
    if (this.raw) {
      var location = DEFAULTS.location;
      if (this.raw.location) {
        location = this.raw.location._id ? this.raw.location._id : this.raw.location;
      }
      return this.location != location;
    } else {
      return false;
    }
  };
  Transaction.prototype._isDirtyContact = function () {
    if (this.raw) {
      var contact = DEFAULTS.contact;
      if (this.raw.customer) {
        contact = this.raw.customer._id ? this.raw.customer._id : this.raw.customer;
      }
      return this.contact != contact;
    } else {
      return false;
    }
  };
  Transaction.prototype._isDirtyItems = function () {
    if (this.raw) {
      var items = DEFAULTS.items.slice();
      if (this.raw.items) {
      }
      return false;
    } else {
      return false;
    }
  };
  Transaction.prototype._getDefaults = function () {
    return DEFAULTS;
  };
  /**
   * Writes out some shared fields for all transactions
   * Inheriting classes will probably add more to this
   * @param options
   * @returns {object}
   * @private
   */
  Transaction.prototype._toJson = function (options) {
    var data = Base.prototype._toJson.call(this, options);
    //data.started = this.from;  // VT: Will be set during checkout
    //data.finished = this.to;  // VT: Will be set during final checkin
    data.due = this.due;
    if (this.location) {
      // Make sure we send the location as id, not the entire object
      data.location = this._getId(this.location);
    }
    if (this.contact) {
      // Make sure we send the contact as id, not the entire object
      // VT: It's still called the "customer" field on the backend!
      data.customer = this._getId(this.contact);
    }
    return data;
  };
  /**
   * Reads the transaction from a json object
   * @param data
   * @param options
   * @returns {promise}
   * @private
   */
  Transaction.prototype._fromJson = function (data, options) {
    var that = this;
    return Base.prototype._fromJson.call(this, data, options).then(function () {
      that.cover = null;
      // don't read cover property for Transactions
      that.status = data.status || DEFAULTS.status;
      that.number = data.number || DEFAULTS.number;
      that.location = data.location || DEFAULTS.location;
      that.contact = data.customer || DEFAULTS.contact;
      that.items = data.items || DEFAULTS.items.slice();
      that.by = data.by || DEFAULTS.by;
      that.archived = data.archived || DEFAULTS.archived;
      that.itemSummary = data.itemSummary || DEFAULTS.itemSummary;
      that.name = data.name || DEFAULTS.name;
      return that._getConflicts().then(function (conflicts) {
        that.conflicts = conflicts;
      });
    });
  };
  Transaction.prototype._toLog = function (options) {
    var obj = this._toJson(options);
    obj.minDateFrom = this.getMinDateFrom().toJSONDate();
    obj.maxDateFrom = this.getMaxDateFrom().toJSONDate();
    obj.minDateDue = this.getMinDateDue().toJSONDate();
    obj.maxDateDue = this.getMaxDateDue().toJSONDate();
    obj.minDateTo = this.getMinDateTo().toJSONDate();
    obj.maxDateTo = this.getMaxDateTo().toJSONDate();
    console.log(obj);
  };
  Transaction.prototype._checkFromDateBetweenMinMax = function (d) {
    return this._checkDateBetweenMinMax(d, this.getMinDateFrom(), this.getMaxDateFrom());
  };
  Transaction.prototype._checkDueDateBetweenMinMax = function (d) {
    return this._checkDateBetweenMinMax(d, this.getMinDateDue(), this.getMaxDateDue());
  };
  Transaction.prototype._checkToDateBetweenMinMax = function (d) {
    return this._checkDateBetweenMinMax(d, this.getMinDateTo(), this.getMaxDateTo());
  };
  // Setters
  // ----
  // From date setters
  /**
   * Clear the transaction from date
   * @method
   * @name Transaction#clearFromDate
   * @param skipRead
   * @returns {promise}
   */
  Transaction.prototype.clearFromDate = function (skipRead) {
    this.from = DEFAULTS.from;
    return this._handleTransaction(skipRead);
  };
  /**
   * Sets the transaction from date
   * @method
   * @name Transaction#setFromDate
   * @param date
   * @param skipRead
   * @returns {promise}
   */
  Transaction.prototype.setFromDate = function (date, skipRead) {
    this.from = this._getDateHelper().roundTimeFrom(date);
    return this._handleTransaction(skipRead);
  };
  // To date setters
  /**
   * Clear the transaction to date
   * @method
   * @name Transaction#clearToDate
   * @param skipRead
   * @returns {promise}
   */
  Transaction.prototype.clearToDate = function (skipRead) {
    this.to = DEFAULTS.to;
    return this._handleTransaction(skipRead);
  };
  /**
   * Sets the transaction to date
   * @method
   * @name Transaction#setToDate
   * @param date
   * @param skipRead
   * @returns {promise}
   */
  Transaction.prototype.setToDate = function (date, skipRead) {
    this.to = this._getDateHelper().roundTimeTo(date);
    return this._handleTransaction(skipRead);
  };
  // Due date setters
  /**
   * Clear the transaction due date
   * @method
   * @name Transaction#clearDueDate
   * @param skipRead
   * @returns {promise}
   */
  Transaction.prototype.clearDueDate = function (skipRead) {
    this.due = DEFAULTS.due;
    return this._handleTransaction(skipRead);
  };
  /**
   * Set the transaction due date
   * @method
   * @name Transaction#setDueDate
   * @param date
   * @param skipRead
   * @returns {promise}
   */
  Transaction.prototype.setDueDate = function (date, skipRead) {
    this.due = this._getDateHelper().roundTimeTo(date);
    return this._handleTransaction(skipRead);
  };
  // Location setters
  /**
   * Sets the location for this transaction
   * @method
   * @name Transaction#setLocation
   * @param locationId
   * @param skipRead skip parsing the returned json response into the transaction
   * @returns {promise}
   */
  Transaction.prototype.setLocation = function (locationId, skipRead) {
    this.location = locationId;
    if (this.existsInDb()) {
      return this._doApiCall({
        method: 'setLocation',
        params: { location: locationId },
        skipRead: skipRead
      });
    } else {
      return this._createTransaction(skipRead);
    }
  };
  /**
   * Clears the location for this transaction
   * @method
   * @name Transaction#clearLocation
   * @param skipRead skip parsing the returned json response into the transaction
   * @returns {promise}
   */
  Transaction.prototype.clearLocation = function (skipRead) {
    var that = this;
    this.location = DEFAULTS.location;
    return this._doApiCall({
      method: 'clearLocation',
      skipRead: skipRead
    }).then(function () {
      return that._ensureTransactionDeleted();
    });
  };
  // Contact setters
  /**
   * Sets the contact for this transaction
   * @method
   * @name Transaction#setContact
   * @param contactId
   * @param skipRead skip parsing the returned json response into the transaction
   * @returns {promise}
   */
  Transaction.prototype.setContact = function (contactId, skipRead) {
    this.contact = contactId;
    if (this.existsInDb()) {
      return this._doApiCall({
        method: 'setCustomer',
        params: { customer: contactId },
        skipRead: skipRead
      });
    } else {
      return this._createTransaction(skipRead);
    }
  };
  /**
   * Clears the contact for this transaction
   * @method
   * @name Transaction#clearContact
   * @param skipRead skip parsing the returned json response into the transaction
   * @returns {promise}
   */
  Transaction.prototype.clearContact = function (skipRead) {
    var that = this;
    this.contact = DEFAULTS.contact;
    return this._doApiCall({
      method: 'clearCustomer',
      skipRead: skipRead
    }).then(function () {
      return that._ensureTransactionDeleted();
    });
  };
  /**
   * Sets transaction name
   * @method
   * @name Transaction#setName
   * @param name
   * @param skipRead skip parsing the returned json response into the transaction
   * @returns {promise}
   */
  Transaction.prototype.setName = function (name, skipRead) {
    return this._doApiCall({
      method: 'setName',
      params: { name: name },
      skipRead: skipRead
    });
  };
  /**
   * Clears transaction name
   * @method
   * @name Transaction#clearName
   * @param skipRead skip parsing the returned json response into the transaction
   * @returns {promise}
   */
  Transaction.prototype.clearName = function (skipRead) {
    return this._doApiCall({
      method: 'clearName',
      skipRead: skipRead
    });
  };
  // Business logic
  // ----
  // Inheriting classes will use the setter functions below to update the object in memory
  // the _handleTransaction will create, update or delete the actual document via the API
  /**
   * addItems; adds a bunch of Items to the transaction using a list of item ids
   * It creates the transaction if it doesn't exist yet
   * @name Transaction#addItems
   * @method
   * @param items
   * @param skipRead
   * @returns {promise}
   */
  Transaction.prototype.addItems = function (items, skipRead) {
    var that = this;
    return this._ensureTransactionExists(skipRead).then(function () {
      return that._doApiCall({
        method: 'addItems',
        params: { items: items },
        skipRead: skipRead
      });
    });
  };
  /**
   * removeItems; removes a bunch of Items from the transaction using a list of item ids
   * It deletes the transaction if it's empty afterwards and autoCleanup is true
   * @name Transaction#removeItems
   * @method
   * @param items
   * @param skipRead
   * @returns {promise}
   */
  Transaction.prototype.removeItems = function (items, skipRead) {
    if (!this.existsInDb()) {
      return $.Deferred().reject(new Error('Cannot removeItems from document without id'));
    }
    var that = this;
    return this._doApiCall({
      method: 'removeItems',
      params: { items: items },
      skipRead: skipRead
    }).then(function (data) {
      return that._ensureTransactionDeleted().then(function () {
        return skipRead == true ? data : that._fromJson(data);
      });
    });
  };
  /**
   * clearItems; removes all Items from the transaction
   * It deletes the transaction if it's empty afterwards and autoCleanup is true
   * @name Transaction#clearItems
   * @method
   * @param skipRead
   * @returns {promise}
   */
  Transaction.prototype.clearItems = function (skipRead) {
    if (!this.existsInDb()) {
      return $.Deferred().reject(new Error('Cannot clearItems from document without id'));
    }
    var that = this;
    return this._doApiCall({
      method: 'clearItems',
      skipRead: skipRead
    }).then(function (data) {
      return that._ensureTransactionDeleted().then(function () {
        return skipRead == true ? data : that._fromJson(data);
      });
    });
  };
  /**
   * swapItem; swaps one item for another in a transaction
   * @name Transaction#swapItem
   * @method
   * @param fromItem
   * @param toItem
   * @param skipRead
   * @returns {promise}
   */
  Transaction.prototype.swapItem = function (fromItem, toItem, skipRead) {
    if (!this.existsInDb()) {
      return $.Deferred().reject(new Error('Cannot swapItem from document without id'));
    }
    // swapItem cannot create or delete a transaction
    return this._doApiCall({
      method: 'swapItem',
      params: {
        fromItem: fromItem,
        toItem: toItem
      },
      skipRead: skipRead
    });
  };
  /**
   * hasItems; Gets a list of items that are already part of the transaction
   * @name Transaction#hasItems
   * @method
   * @param itemIds        array of string values
   * @returns {Array}
   */
  Transaction.prototype.hasItems = function (itemIds) {
    var allItems = this.items || [];
    var duplicates = [];
    var found = null;
    $.each(itemIds, function (i, itemId) {
      $.each(allItems, function (i, it) {
        if (it._id == itemId) {
          found = itemId;
          return false;
        }
      });
      if (found != null) {
        duplicates.push(found);
      }
    });
    return duplicates;
  };
  /**
   * Archive a transaction
   * @name Transaction#archive
   * @param skipRead
   * @returns {promise}
   */
  Transaction.prototype.archive = function (skipRead) {
    if (!this.canArchive()) {
      return $.Deferred().reject(new Error('Cannot archive document'));
    }
    return this._doApiCall({
      method: 'archive',
      params: {},
      skipRead: skipRead
    });
  };
  /**
   * Undo archive of a transaction
   * @name Transaction#undoArchive
   * @param skipRead
   * @returns {promise}
   */
  Transaction.prototype.undoArchive = function (skipRead) {
    if (!this.canUndoArchive()) {
      return $.Deferred().reject(new Error('Cannot unarchive document'));
    }
    return this._doApiCall({
      method: 'undoArchive',
      params: {},
      skipRead: skipRead
    });
  };
  /**
   * Checks if we can archive a transaction (based on status)
   * @name Transaction#canArchive
   * @returns {boolean}
   */
  Transaction.prototype.canArchive = function () {
    return this.archived == null && (this.status == 'cancelled' || this.status == 'closed');
  };
  /**
   * Checks if we can unarchive a transaction (based on status)
   * @name Transaction#canUndoArchive
   * @returns {boolean}
   */
  Transaction.prototype.canUndoArchive = function () {
    return this.archived != null && (this.status == 'cancelled' || this.status == 'closed');
  };
  Transaction.prototype.setField = function (field, value, skipRead) {
    var that = this;
    return this._ensureTransactionExists(skipRead).then(function () {
      return that._doApiCall({
        method: 'setField',
        params: {
          field: field,
          value: value
        },
        skipRead: skipRead
      });
    });
  };
  //
  // Implementation stuff
  //
  /**
   * Gets a list of Conflict objects for this transaction
   * Will be overriden by inheriting classes
   * @returns {promise}
   * @private
   */
  Transaction.prototype._getConflicts = function () {
    return $.Deferred().resolve([]);
  };
  Transaction.prototype._getDateHelper = function () {
    return this.dateHelper;
  };
  /**
   * Searches for Items that are available for this transaction
   * @param params: a dict with params, just like items/search
   * @param listName: restrict search to a certain list
   * @param useAvailabilities (uses items/searchAvailable instead of items/search)
   * @param onlyUnbooked (true by default, only used when useAvailabilities=true)
   * @param skipItems array of item ids that should be skipped
   * @private
   * @returns {*}
   */
  Transaction.prototype._searchItems = function (params, listName, useAvailabilities, onlyUnbooked, skipItems) {
    if (this.dsItems == null) {
      return $.Deferred().reject(new api.ApiBadRequest(this.crtype + ' has no DataSource for items'));
    }
    // Restrict the search to just the Items that are:
    // - at this location
    // - in the specified list (if any)
    params = params || {};
    params.location = this._getId(this.location);
    if (listName != null && listName.length > 0) {
      params.listName = listName;
    }
    // Make sure we only pass the item ids,
    // and not the entire items
    var that = this;
    var skipList = null;
    if (skipItems && skipItems.length) {
      skipList = skipItems.slice(0);
      $.each(skipList, function (i, item) {
        skipList[i] = that._getId(item);
      });
    }
    if (useAvailabilities == true) {
      // We'll use a more advanced API call /items/searchAvailable
      // It's a bit slower and the .count result is not usable
      // It requires some more parameters to be set
      params.onlyUnbooked = onlyUnbooked != null ? onlyUnbooked : true;
      params.fromDate = this.from;
      params.toDate = this.to;
      params._limit = params._limit || 20;
      params._skip = params._skip || 0;
      if (skipList && skipList.length) {
        params.skipItems = skipList;
      }
      return this.dsItems.call(null, 'searchAvailable', params);
    } else {
      // We don't need to use availabilities,
      // we should better use the regular /search
      // it's faster and has better paging :)
      if (skipList && skipList.length) {
        params.pk__nin = skipList;
      }
      return this.dsItems.search(params);
    }
  };
  /**
   * Returns a rejected promise when a date is not between min and max date
   * Otherwise the deferred just resolves to the date
   * It's used to do some quick checks of transaction dates
   * @param date
   * @returns {*}
   * @private
   */
  Transaction.prototype._checkDateBetweenMinMax = function (date, minDate, maxDate) {
    minDate = minDate || this.getMinDate();
    maxDate = maxDate || this.getMaxDate();
    if (date < minDate || date > maxDate) {
      var msg = 'date ' + date.toJSONDate() + ' is outside of min max range ' + minDate.toJSONDate() + '->' + maxDate.toJSONDate();
      return $.Deferred().reject(new api.ApiUnprocessableEntity(msg));
    } else {
      return $.Deferred().resolve(date);
    }
  };
  /**
   * _handleTransaction: creates, updates or deletes a transaction document
   * @returns {*}
   * @private
   */
  Transaction.prototype._handleTransaction = function (skipRead) {
    var isEmpty = this.isEmpty();
    if (this.existsInDb()) {
      if (isEmpty) {
        if (this.autoCleanup) {
          return this._deleteTransaction();
        } else {
          return $.Deferred().resolve();
        }
      } else {
        return this._updateTransaction(skipRead);
      }
    } else if (!isEmpty) {
      return this._createTransaction(skipRead);
    } else {
      return $.Deferred().resolve();
    }
  };
  Transaction.prototype._deleteTransaction = function () {
    return this.delete();
  };
  Transaction.prototype._updateTransaction = function (skipRead) {
    return this.update(skipRead);
  };
  Transaction.prototype._createTransaction = function (skipRead) {
    return this.create(skipRead);
  };
  Transaction.prototype._ensureTransactionExists = function (skipRead) {
    return !this.existsInDb() ? this._createTransaction(skipRead) : $.Deferred().resolve();
  };
  Transaction.prototype._ensureTransactionDeleted = function () {
    return this.isEmpty() && this.autoCleanup ? this._deleteTransaction() : $.Deferred().resolve();
  };
  return Transaction;
}(jquery, api, base, location, dateHelper, helper);
conflict = function ($) {
  var DEFAULTS = {
    kind: '',
    doc: '',
    item: '',
    itemName: '',
    locationCurrent: '',
    locationDesired: '',
    fromDate: null,
    toDate: null
  };
  /**
   * Conflict class
   * @name  Conflict
   * @class    
   * @constructor
   * 
   * @param spec
   * @property {string}  kind                   - The conflict kind (status, order, reservation, location)
   * @property {string}  doc                    - The id of the document with which it conflicts
   * @property {string}  item                   - The Item id for this conflict
   * @property {string}  itemName               - The Item name for this conflict
   * @property {string}  locationCurrent        - The Location the item is now
   * @property {string}  locationDesired        - The Location where the item should be
   * @property {moment}  fromDate               - From when does the conflict start
   * @property {moment}  toDate                 - Until when does the conflict end
   */
  var Conflict = function (spec) {
    this.ds = spec.ds;
    this._fields = spec._fields;
    this.raw = null;
    // the raw json object
    this.kind = spec.kind || DEFAULTS.kind;
    this.doc = spec.doc || DEFAULTS.doc;
    this.item = spec.item || DEFAULTS.item;
    this.itemName = spec.itemName || DEFAULTS.itemName;
    this.locationCurrent = spec.locationCurrent || DEFAULTS.locationCurrent;
    this.locationDesired = spec.locationDesired || DEFAULTS.locationDesired;
    this.fromDate = spec.fromDate || DEFAULTS.fromDate;
    this.toDate = spec.toDate || DEFAULTS.toDate;
  };
  /**
   * _toJson, makes a dict of the object
   * @method
   * @param {object} opt dict
   * @returns {object}
   * @private
   */
  Conflict.prototype._toJson = function (opt) {
    return {
      kind: this.kind,
      doc: this.doc,
      item: this.item,
      itemName: this.itemName,
      locationCurrent: this.locationCurrent,
      locationDesired: this.locationDesired,
      fromDate: this.fromDate,
      toDate: this.toDate
    };
  };
  /**
   * _fromJson
   * @method
   * @param {object} data the json response
   * @param {object} opt dict
   * @returns promise
   * @private
   */
  Conflict.prototype._fromJson = function (data, opt) {
    this.raw = data;
    this.kind = data.kind || DEFAULTS.kind;
    this.item = data.item || DEFAULTS.item;
    this.itemName = data.itemName || DEFAULTS.itemName;
    this.fromDate = data.fromDate || DEFAULTS.fromDate;
    this.toDate = data.toDate || DEFAULTS.toDate;
    return $.Deferred().resolve(data);
  };
  return Conflict;
}(jquery);
Order = function ($, api, Transaction, Conflict, common) {
  // Allow overriding the ctor during inheritance
  // http://stackoverflow.com/questions/4152931/javascript-inheritance-call-super-constructor-or-use-prototype-chain
  var tmp = function () {
  };
  tmp.prototype = Transaction.prototype;
  /**
   * @name Order
   * @class Order
   * @constructor
   * @extends Transaction
   */
  var Order = function (opt) {
    var spec = $.extend({
      crtype: 'cheqroom.types.order',
      _fields: ['*']
    }, opt);
    Transaction.call(this, spec);
    this.dsReservations = spec.dsReservations;
  };
  Order.prototype = new tmp();
  Order.prototype.constructor = Order;
  //
  // Date helpers; we'll need these for sliding from / to dates during a long user session
  //
  // getMinDateFrom (overwritten)
  // getMaxDateFrom (default)
  // getMinDateDue (default, same as getMinDateTo)
  // getMaxDateDue (default, same as getMinDateTo)
  /**
   * Overwrite min date for order so it is rounded by default
   * Although it's really the server who sets the actual date
   * While an order is creating, we'll always overwrite its from date
   */
  Order.prototype.getMinDateFrom = function () {
    return this.getNowRounded();
  };
  /**
   * Overwrite how the Order.due min date works
   * We want "open" orders to be set due at least 1 timeslot from now
   */
  Order.prototype.getMinDateDue = function () {
    if (this.status == 'open') {
      // Open orders can set their date to be due
      // at least 1 timeslot from now,
      // we can just call the default getMinDateTo function
      return this.getNextTimeSlot();
    } else {
      return Transaction.prototype.getMinDateDue.call(this);
    }
  };
  //
  // Document overrides
  //
  Order.prototype._toJson = function (options) {
    // Should only be used during create
    // and never be called on order update
    // since most updates are done via setter methods
    var data = Transaction.prototype._toJson.call(this, options);
    data.fromDate = this.fromDate != null ? this.fromDate.toJSONDate() : 'null';
    data.toDate = this.toDate != null ? this.toDate.toJSONDate() : 'null';
    data.due = this.due != null ? this.due.toJSONDate() : 'null';
    return data;
  };
  Order.prototype._fromJson = function (data, options) {
    var that = this;
    // Already set the from, to and due dates
    // Transaction._fromJson might need it during _getConflicts
    that.from = data.started == null || data.started == 'null' ? null : data.started;
    that.to = data.finished == null || data.finished == 'null' ? null : data.finished;
    that.due = data.due == null || data.due == 'null' ? null : data.due;
    that.reservation = data.reservation || null;
    return Transaction.prototype._fromJson.call(this, data, options).then(function () {
      $.publish('order.fromJson', data);
      return data;
    });
  };
  //
  // Helpers
  //
  /**
   * Gets a moment duration object
   * @method
   * @name Order#getDuration
   * @returns {duration}
   */
  Order.prototype.getDuration = function () {
    return common.getOrderDuration(this.raw);
  };
  /**
   * Gets a friendly order duration or empty string
   * @method
   * @name Order#getFriendlyDuration
   * @returns {string}
   */
  Order.prototype.getFriendlyDuration = function () {
    return common.getFriendlyOrderDuration(this.raw, this._getDateHelper());
  };
  /**
   * Checks if a PDF document can be generated
   * @method
   * @name Order#canGenerateAgreement
   * @returns {boolean}
   */
  Order.prototype.canGenerateAgreement = function () {
    return this.status == 'open' || this.status == 'closed';
  };
  /**
   * Checks if order can be checked in
   * @method
   * @name Order#canCheckin
   * @returns {boolean}
   */
  Order.prototype.canCheckin = function () {
    return this.status == 'open';
  };
  /**
   * Checks if the order has an reservation linked to it
   * @method
   * @name Order#canGoToReservation
   * @returns {boolean}
   */
  Order.prototype.canGoToReservation = function () {
    return this.reservation != null;
  };
  /**
   * Checks if due date is valid for an creating order
   * oterwise return true
   *
   * @name Order#isValidDueDate
   * @return {Boolean} 
   */
  Order.prototype.isValidDueDate = function () {
    var due = this.due, now = this.getNow(), status = this.status;
    if (status == 'creating') {
      return due != null && due.isAfter(now);
    }
    return true;
  };
  /**
   * Checks if order can be checked out
   * @method
   * @name Order#canCheckout
   * @returns {boolean}
   */
  Order.prototype.canCheckout = function () {
    var that = this;
    return this.status == 'creating' && this.location != null && (this.contact != null && this.contact.status == 'active') && this.isValidDueDate() && (this.items && this.items.length > 0 && this.items.filter(function (item) {
      return that.id == that.helper.ensureId(item.order);
    }).length > 0);
  };
  /**
   * Checks if order can undo checkout
   * @method
   * @name Order#canUndoCheckout
   * @returns {boolean}
   */
  Order.prototype.canUndoCheckout = function () {
    return this.status == 'open';
  };
  /**
   * Checks if the order can be deleted (based on status)
   * @method
   * @name Order#canDelete
   * @returns {boolean}
   */
  Order.prototype.canDelete = function () {
    return this.status == 'creating';
  };
  /**
   * Checks if items can be added to the checkout (based on status)
   * @method
   * @name Order#canAddItems
   * @returns {boolean}
   */
  Order.prototype.canAddItems = function () {
    return this.status == 'creating';
  };
  /**
   * Checks if items can be removed from the checkout (based on status)
   * @method
   * @name Order#canRemoveItems
   * @returns {boolean}
   */
  Order.prototype.canRemoveItems = function () {
    return this.status == 'creating';
  };
  /**
   * Checks if items can be swapped in the checkout (based on status)
   * @method
   * @name Order#canSwapItems
   * @returns {boolean}
   */
  Order.prototype.canSwapItems = function () {
    return this.status == 'creating';
  };
  /**
   * Checks if we can generate a document for this order (based on status)
   * @name Order#canGenerateDocument
   * @returns {boolean}
   */
  Order.prototype.canGenerateDocument = function () {
    return this.status == 'open' || this.status == 'closed';
  };
  //
  // Base overrides
  //
  //
  // Transaction overrides
  //
  Order.prototype._getConflictsForExtend = function () {
    var conflicts = [];
    // Only orders which are incomplete,
    // but have items and / or due date can have conflicts
    if (this.status == 'open') {
      // Only check for new conflicts on the items
      // that are still checked out under this order
      var items = [], that = this;
      $.each(this.items, function (i, item) {
        if (item.status == 'checkedout' && item.order == that.id) {
          items.push(item);
        }
      });
      // If we have a due date,
      // check if it conflicts with any reservations
      if (this.due) {
        return this._getServerConflicts(this.items, this.from, this.due, this.id, // orderId
        this.helper.ensureId(this.reservation))  // reservationId
.then(function (serverConflicts) {
          return conflicts.concat(serverConflicts);
        });
      }
    }
    return $.Deferred().resolve(conflicts);
  };
  /**
   * Gets a list of Conflict objects
   * used during Transaction._fromJson
   * @returns {promise}
   * @private
   */
  Order.prototype._getConflicts = function () {
    var conflicts = [];
    // Only orders which are incomplete,
    // but have items and / or due date can have conflicts
    if (this.status == 'creating' && this.items.length > 0) {
      // Get some conflicts we can already calculate on the client side
      conflicts = this._getClientConflicts();
      // If we have a due date,
      // check if it conflicts with any reservations
      if (this.due) {
        return this._getServerConflicts(this.items, this.from, this.due, this.id, // orderId
        this.helper.ensureId(this.reservation))  // reservationId
.then(function (serverConflicts) {
          return conflicts.concat(serverConflicts);
        });
      }
    }
    return $.Deferred().resolve(conflicts);
  };
  /**
   * Get server side conflicts for items between two dates
   * Also pass extra info like own order and reservation
   * so we can avoid listing conflicts with ourselves
   * @param items array of item objects (not just the ids)
   * @param fromDate
   * @param dueDate
   * @param orderId
   * @param reservationId
   * @returns {*}
   * @private
   */
  Order.prototype._getServerConflicts = function (items, fromDate, dueDate, orderId, reservationId) {
    var conflicts = [], kind = '', transItem = null, itemIds = common.getItemIds(items);
    // Get the availabilities for these items
    return this.dsItems.call(null, 'getAvailabilities', {
      items: itemIds,
      fromDate: fromDate,
      toDate: dueDate
    }).then(function (data) {
      // Run over unavailabilties for these items
      $.each(data, function (i, av) {
        // Find back the more complete item object via the `items` param
        // It has useful info like item.name we can use in the conflict message
        // $.grep returns an array with 1 item,
        // we need reference to the 1st item for transItem
        transItem = $.grep(items, function (item) {
          return item._id == av.item;
        });
        if (transItem && transItem.length > 0) {
          transItem = transItem[0];
        }
        if (transItem != null && transItem.status != 'expired') {
          // Order cannot conflict with itself
          // or with the Reservation from which it was created
          if (av.order != orderId && av.reservation != reservationId) {
            kind = '';
            kind = kind || (av.order ? 'order' : '');
            kind = kind || (av.reservation ? 'reservation' : '');
            conflicts.push(new Conflict({
              kind: kind,
              item: transItem._id,
              itemName: transItem.name,
              fromDate: av.fromDate,
              toDate: av.toDate,
              doc: av.order || av.reservation
            }));
          }
        }
      });
      return conflicts;
    });
  };
  Order.prototype._getClientConflicts = function () {
    // Some conflicts can be checked already on the client
    // We can check if all the items are:
    // - at the right location
    // - not expired
    var conflicts = [], locId = this.helper.ensureId(this.location || '');
    $.each(this.items, function (i, item) {
      if (item.status == 'expired') {
        conflicts.push(new Conflict({
          kind: 'expired',
          item: item._id,
          itemName: item.name,
          locationCurrent: item.location,
          locationDesired: locId
        }));  // If order location is defined, check if item
              // is at the right location
      } else if (locId && item.location != locId) {
        conflicts.push(new Conflict({
          kind: 'location',
          item: item._id,
          itemName: item.name,
          locationCurrent: item.location,
          locationDesired: locId
        }));
      }
    });
    return conflicts;
  };
  /**
   * Sets the Order from and due date in a single call
   * _checkFromDueDate will handle the special check for when the order is open
   * @method
   * @name Order#setFromDueDate
   * @param from
   * @param due (optional) if null, we'll take the default average checkout duration as due date
   * @param skipRead
   * @returns {promise}
   */
  Order.prototype.setFromDueDate = function (from, due, skipRead) {
    if (this.status != 'creating') {
      return $.Deferred().reject(new api.ApiUnprocessableEntity('Cannot set order from / due date, status is ' + this.status));
    }
    var that = this;
    var roundedFromDate = this.getMinDateFrom();
    var roundedDueDate = due ? this._getDateHelper().roundTimeTo(due) : this._getDateHelper().addAverageDuration(roundedFromDate);
    return this._checkFromDueDate(roundedFromDate, roundedDueDate).then(function () {
      that.from = roundedFromDate;
      that.due = roundedDueDate;
      return that._handleTransaction(skipRead);
    });
  };
  /**
   * Sets the Order from date
   * @method
   * @name Order#setFromDate
   * @param date
   * @param skipRead
   * @returns {promise}
   */
  Order.prototype.setFromDate = function (date, skipRead) {
    if (this.status != 'creating') {
      return $.Deferred().reject(new api.ApiUnprocessableEntity('Cannot set order from date, status is ' + this.status));
    }
    var that = this;
    var roundedFromDate = this._getDateHelper().roundTimeFrom(date);
    return this._checkFromDueDate(roundedFromDate, this.due).then(function () {
      that.from = roundedFromDate;
      return that._handleTransaction(skipRead);
    });
  };
  /**
   * Clears the order from date
   * @method
   * @name Order#clearFromDate
   * @param skipRead
   * @returns {promise}
   */
  Order.prototype.clearFromDate = function (skipRead) {
    if (this.status != 'creating') {
      return $.Deferred().reject(new api.ApiUnprocessableEntity('Cannot clear order from date, status is ' + this.status));
    }
    this.from = null;
    return this._handleTransaction(skipRead);
  };
  /**
   * Sets the order due date
   * _checkFromDueDate will handle the special check for when the order is open
   * @method
   * @name Order#setDueDate
   * @param due
   * @param skipRead
   * @returns {promise}
   */
  Order.prototype.setDueDate = function (due, skipRead) {
    // Cannot change the to-date of a reservation that is not in status "creating"
    if (this.status != 'creating' && this.status != 'open') {
      return $.Deferred().reject(new api.ApiUnprocessableEntity('Cannot set order due date, status is ' + this.status));
    }
    // The to date must be:
    // 1) at least 30 minutes into the future
    // 2) at least 15 minutes after the from date (if set)
    var that = this;
    var roundedDueDate = this._getDateHelper().roundTimeTo(due);
    this.from = this.getMinDateFrom();
    return this._checkDueDateBetweenMinMax(roundedDueDate).then(function () {
      that.due = roundedDueDate;
      //If order doesn't exist yet, we set due date in create call
      //otherwise use setDueDate to update transaction
      if (!that.existsInDb()) {
        return that._createTransaction(skipRead);
      } else {
        // If status is open when due date is changed, 
        // we need to check for conflicts
        if (that.status == 'open') {
          return that.canExtend(roundedDueDate).then(function (resp) {
            if (resp && resp.result == true) {
              return that.extend(roundedDueDate, skipRead);
            } else {
              return $.Deferred().reject('Cannot extend order to given date because it has conflicts.', resp);
            }
          });
        } else {
          return that._doApiCall({
            method: 'setDueDate',
            params: { due: roundedDueDate },
            skipRead: skipRead
          });
        }
      }
    });
  };
  /**
   * Clears the order due date
   * @method
   * @name Order#clearDueDate
   * @param skipRead
   * @returns {*}
   */
  Order.prototype.clearDueDate = function (skipRead) {
    if (this.status != 'creating') {
      return $.Deferred().reject(new api.ApiUnprocessableEntity('Cannot clear order due date, status is ' + this.status));
    }
    this.due = null;
    return this._doApiCall({
      method: 'clearDueDate',
      skipRead: skipRead
    });
  };
  Order.prototype.setToDate = function (date, skipRead) {
    throw 'Order.setToDate not implemented, it is set during order close';
  };
  Order.prototype.clearToDate = function (date, skipRead) {
    throw 'Order.clearToDate not implemented, it is set during order close';
  };
  //
  // Business logic calls
  //
  /**
   * Searches for items that could match this order
   * @method
   * @name Order#searchItems
   * @param params
   * @param useAvailabilies
   * @param onlyUnbooked
   * @param skipItems
   * @returns {promise}
   */
  Order.prototype.searchItems = function (params, useAvailabilies, onlyUnbooked, skipItems, listName) {
    return this._searchItems(params, listName != null ? listName : 'available', useAvailabilies, onlyUnbooked, skipItems || this.items);
  };
  /**
   * Checks in the order
   * @method
   * @name Order#checkin
   * @param itemIds
   * @param location
   * @param skipRead
   * @returns {promise}
   */
  Order.prototype.checkin = function (itemIds, location, skipRead) {
    return this._doApiCall({
      method: 'checkin',
      params: {
        items: itemIds,
        location: location
      },
      skipRead: skipRead
    });
  };
  /**
   * Checks out the order
   * @method
   * @name Order#checkout
   * @param skipRead
   * @returns {promise}
   */
  Order.prototype.checkout = function (skipRead) {
    return this._doApiCall({
      method: 'checkout',
      skipRead: skipRead
    });
  };
  /**
   * Undoes the order checkout
   * @method
   * @name Order#undoCheckout
   * @param skipRead
   * @returns {promise}
   */
  Order.prototype.undoCheckout = function (skipRead) {
    return this._doApiCall({
      method: 'undoCheckout',
      skipRead: skipRead
    });
  };
  /**
   * Checks of order due date can be extended to given date
   * @param  {moment} due
   * @param  {bool} skipRead
   * @return {promise}
   */
  Order.prototype.canExtend = function (due) {
    //return this._doApiCall({ method: "canExtend", params: { due: due }, skipRead: true });
    // TODO CHANGE THIS
    // Currently always allow order to be extended
    return $.Deferred().resolve({ result: true });
  };
  /**
   * Extends order due date
   * @param  {moment} due
   * @param  {bool} skipRead
   * @return {promise}
   */
  Order.prototype.extend = function (due, skipRead) {
    return this._doApiCall({
      method: 'extend',
      params: { due: due },
      skipRead: skipRead
    });
  };
  /**
   * Generates a PDF document for the order
   * @method
   * @name Order#generateDocument
   * @param {string} template id
   * @param {string} signature (base64)
   * @param {bool} skipRead
   * @returns {promise}
   */
  Order.prototype.generateDocument = function (template, signature, skipRead) {
    return this._doApiCall({
      method: 'generateDocument',
      params: {
        template: template,
        signature: signature
      },
      skipRead: skipRead
    });
  };
  /**
   * Override _fromCommentsJson to also include linked reservation comments 
   * @param data
   * @param options
   * @returns {*}
   * @private
   */
  Order.prototype._fromCommentsJson = function (data, options) {
    var that = this;
    // Also parse reservation comments?
    if (that.dsReservations && data.reservation && data.reservation.comments && data.reservation.comments.length > 0) {
      // Parse Reservation keyValues
      return Base.prototype._fromCommentsJson.call(that, data.reservation, $.extend(options, {
        ds: that.dsReservations,
        fromReservation: true
      })).then(function () {
        var reservationComments = that.comments;
        return Base.prototype._fromCommentsJson.call(that, data, options).then(function () {
          // Add reservation comments
          that.comments = that.comments.concat(reservationComments).sort(function (a, b) {
            return b.modified > a.modified;
          });
        });
      });
    }
    // Use Default comments parser
    return Base.prototype._fromCommentsJson.call(that, data, options);
  };
  /**
   * Override _fromAttachmentsJson to also include linked reservation attachments
   * @param data
   * @param options
   * @returns {*}
   * @private
   */
  Order.prototype._fromAttachmentsJson = function (data, options) {
    var that = this;
    // Also parse reservation comments?
    if (that.dsReservations && data.reservation && data.reservation.comments && data.reservation.comments.length > 0) {
      // Parse Reservation keyValues
      return Base.prototype._fromAttachmentsJson.call(that, data.reservation, $.extend(options, {
        ds: that.dsReservations,
        fromReservation: true
      })).then(function () {
        var reservationAttachments = that.attachments;
        return Base.prototype._fromAttachmentsJson.call(that, data, options).then(function () {
          // Add reservation attachments
          that.attachments = that.attachments.concat(reservationAttachments).sort(function (a, b) {
            return b.modified > a.modified;
          });
        });
      });
    }
    // Use Default attachments parser
    return Base.prototype._fromAttachmentsJson.call(that, data, options);
  };
  //
  // Implementation
  //
  Order.prototype._checkFromDueDate = function (from, due) {
    var dateHelper = this._getDateHelper();
    var roundedFromDate = from;
    //(from) ? this._getHelper().roundTimeFrom(from) : null;
    var roundedDueDate = due;
    //(due) ? this._getHelper().roundTimeTo(due) : null;
    if (roundedFromDate && roundedDueDate) {
      return $.when(this._checkDateBetweenMinMax(roundedFromDate), this._checkDateBetweenMinMax(roundedDueDate)).then(function (fromRes, dueRes) {
        var interval = dateHelper.roundMinutes;
        if (roundedDueDate.diff(roundedFromDate, 'minutes') < interval) {
          return $.Deferred().reject(new api.ApiUnprocessableEntity('Cannot set order from date, after (or too close to) to date ' + roundedDueDate.toJSONDate()));
        }
        if (roundedFromDate.diff(roundedDueDate, 'minutes') > interval) {
          return $.Deferred().reject(new api.ApiUnprocessableEntity('Cannot set order due date, before (or too close to) from date ' + roundedFromDate.toJSONDate()));
        }
      });
    } else if (roundedFromDate) {
      return this._checkDateBetweenMinMax(roundedFromDate);
    } else if (roundedDueDate) {
      return this._checkDateBetweenMinMax(roundedDueDate);
    } else {
      return $.Deferred().reject(new api.ApiUnprocessableEntity('Cannot from/due date, both are null'));
    }
  };
  return Order;
}(jquery, api, transaction, conflict, common);
PermissionHandler = function () {
  /**
   * PermissionHandler
   * @name PermissionHandler
   * @class PermissionHandler
   * @param user - a user dict
   * @param profile - a group profile dict
   * @param limits - a group limits dict
   * @constructor
   */
  var PermissionHandler = function (user, profile, limits) {
    this.user = user;
    this.profile = profile;
    this.limits = limits;
    // Helper booleans that mix a bunch of role stuff and profile / limits stuff
    this._isOwner = user.isOwner;
    this._isRootOrAdmin = user.role == 'root' || user.role == 'admin';
    this._isRootOrAdminOrUser = user.role == 'root' || user.role == 'admin' || user.role == 'user';
    this._isSelfService = user.role == 'selfservice';
    this._useWebHooks = limits.allowWebHooks;
    this._useOrders = limits.allowOrders && profile.useOrders;
    this._useReservations = limits.allowReservations && profile.useReservations;
    this._usePdf = limits.allowGeneratePdf;
    this._useKits = limits.allowKits && profile.useKits;
    this._useCustody = limits.allowCustody && profile.useCustody;
    this._useGeo = profile.useGeo;
    this._useSelfService = limits.allowSelfService && profile.useSelfService;
    this._useCheckinLocation = this._useOrders && profile.orderCheckinLocation;
    this._usePublicSelfService = limits.allowSelfService && profile.usePublicSelfService;
    this._useOrderTransfers = limits.allowOrderTransfers && profile.useOrderTransfers;
    this._useSendMessage = limits.allowSendMessage && profile.useSendMessage;
    this._useUserSync = limits.allowUserSync && profile.useUserSync;
    this._useFlags = profile.useFlags;
    this._useGeo = profile.useGeo;
    this._canSetFlag = false;
    this._canClearFlag = false;
    switch (user.role) {
    case 'selfservice':
      this._canSetFlag = profile.selfServiceCanSetFlag;
      this._canClearFlag = profile.selfServiceCanClearFlag;
      break;
    case 'user':
      this._canSetFlag = profile.userCanSetFlag;
      this._canClearFlag = profile.userCanClearFlag;
      break;
    default:
      this._canSetFlag = true;
      this._canClearFlag = true;
      break;
    }
    if (this._isSelfService) {
      // Override some permissions for selfservice users
      this._useOrders = this._useOrders && this._useSelfService && profile.selfServiceCanOrder;
      this._useReservations = this._useReservations && this._useSelfService && profile.selfServiceCanReserve;
      this._useCustody = this._useCustody && this._useSelfService && profile.selfServiceCanCustody;
    }
  };
  PermissionHandler.prototype.hasAnyAdminPermission = function () {
    return this.hasPermission('create', 'locations') || this.hasPermission('create', 'categories') || this.hasPermission('create', 'webhooks') || this.hasPermission('create', 'users') || this.hasPermission('create', 'templates') || this.hasPermission('create', 'syncs');
  };
  PermissionHandler.prototype.hasDashboardPermission = function (action, data, location) {
    // Selfservice cannot see dashboard if it doesn't has reservation or checkout permissions
    if (this._isSelfService) {
      return this.hasReservationPermission('read') || this.hasCheckoutPermission('read');
    }
    return true;
  };
  PermissionHandler.prototype.hasCalendarPermission = function (action, data, location) {
    // Calendar permission depends on reservation or checkout permission
    return this.hasReservationPermission('read') || this.hasCheckoutPermission('read');
  };
  PermissionHandler.prototype.hasItemPermission = function (action, data, location) {
    return this.hasPermission(action, 'items', data, location);
  };
  PermissionHandler.prototype.hasItemCustodyPermission = function () {
    return this._useCustody;
  };
  PermissionHandler.prototype.hasItemFlagPermission = function () {
    return this._useFlags;
  };
  PermissionHandler.prototype.hasItemGeoPermission = function () {
    return this._useGeo;
  };
  PermissionHandler.prototype.hasItemGeoPermission = function () {
    return this._useGeo;
  };
  PermissionHandler.prototype.hasKitPermission = function (action, data, location) {
    return this.hasPermission(action || 'read', 'kits', data, location);
  };
  PermissionHandler.prototype.hasContactPermission = function (action, data, location) {
    return this.hasPermission(action, 'contacts', data, location);
  };
  PermissionHandler.prototype.hasContactReadOtherPermission = function (action, data, location) {
    return !this._isSelfService;
  };
  PermissionHandler.prototype.hasCheckoutPermission = function (action, data, location) {
    return this.hasPermission(action || 'read', 'orders', data, location);
  };
  PermissionHandler.prototype.hasReservationPermission = function (action, data, location) {
    return this.hasPermission(action || 'read', 'reservations', data, location);
  };
  PermissionHandler.prototype.hasCategoriesPermission = function (action, data, location) {
    return this.hasPermission(action, 'categories', data, location);
  };
  PermissionHandler.prototype.hasWebhooksPermission = function (action, data, location) {
    return this.hasPermission(action, 'webhooks', data, location);
  };
  PermissionHandler.prototype.hasUserPermission = function (action, data, location) {
    return this.hasPermission(action, 'users', data, location);
  };
  PermissionHandler.prototype.hasLocationPermission = function (action, data, location) {
    return this.hasPermission(action, 'locations', data, location);
  };
  PermissionHandler.prototype.hasWebhookPermission = function (action, data, location) {
    return this.hasPermission(action, 'webhooks', data, location);
  };
  PermissionHandler.prototype.hasAccountPermission = function (action, data, location) {
    return this.hasPermission(action, 'account', data, location);
  };
  PermissionHandler.prototype.hasAccountInvoicesPermission = function (action, data, location) {
    return this.hasPermission(action, 'invoices', data, location);
  };
  PermissionHandler.prototype.hasAccountSubscriptionPermission = function (action, data, location) {
    return this.hasPermission(action, 'subscription', data, location);
  };
  PermissionHandler.prototype.hasAccountBillingPermission = function (action, data, location) {
    return this.hasPermission(action, 'billing', data, location);
  };
  PermissionHandler.prototype.hasAccountTemplatePermission = function (action, data, location) {
    return this.hasPermission(action, 'templates', data, location);
  };
  PermissionHandler.prototype.hasAccountUserSyncPermission = function (action, data, location) {
    return this.hasPermission(action, 'syncs', data, location);
  };
  PermissionHandler.prototype.hasAssetTagsPermission = function (action, data, location) {
    //return this.hasPermission(action, "asset-tags", data, location);
    return this.hasAnyAdminPermission();
  };
  PermissionHandler.prototype.hasPermission = function (action, collection, data, location) {
    if (this._isSelfService && !this._useSelfService) {
      return false;
    }
    switch (collection) {
    default:
      return false;
    case 'items':
      switch (action) {
      default:
        return false;
      case 'read':
        return true;
      case 'create':
      case 'duplicate':
      case 'update':
      case 'delete':
      case 'expire':
      case 'undoExpire':
      case 'setFields':
      case 'setField':
      case 'clearField':
      case 'addAttachment':
      case 'addComment':
      case 'updateComment':
      case 'removeComment':
      case 'import':
      case 'export':
      case 'updateGeo':
      case 'changeLocation':
      case 'changeCategory':
        return this._isRootOrAdmin;
      // Permissings for asset labels
      case 'printLabel':
        return this._isRootOrAdmin;
      // Permissions for flags
      case 'setFlag':
        return this._useFlags && this._canSetFlag;
      case 'clearFlag':
        return this._useFlags && this._canClearFlag;
      // Modules
      case 'reserve':
        return this._useReservations;
      case 'checkout':
        return this._useOrders;
      case 'takeCustody':
      case 'releaseCustody':
        return this._useCustody;
      case 'transferCustody':
        return this._useCustody && this._isRootOrAdmin;
      }
      break;
    case 'kits':
      switch (action) {
      default:
        return false;
      case 'read':
        return this._useKits;
      case 'create':
      case 'duplicate':
      case 'update':
      case 'delete':
      case 'setFields':
      case 'setField':
      case 'clearField':
      case 'addAttachment':
      case 'addComment':
      case 'updateComment':
      case 'removeComment':
      case 'addItems':
      case 'removeItems':
      case 'moveItem':
      case 'export':
        return this._useKits && this._isRootOrAdmin;
      // Permissings for asset labels
      case 'printLabel':
        return this._isRootOrAdmin;
      // Permissions for flags
      case 'setFlag':
        return this._useFlags && this._canSetFlag;
      case 'clearFlag':
        return this._useFlags && this._canClearFlag;
      // Other
      case 'takeApart':
        return this.profile.canTakeApartKits;
      // Modules
      // Modules
      case 'reserve':
        return this._useReservations;
      case 'checkout':
        return this._useOrders;
      case 'takeCustody':
      case 'releaseCustody':
        return this._useCustody;
      case 'transferCustody':
      case 'giveCustody':
        return this._useCustody && this._isRootOrAdmin;
      }
      break;
    case 'orders':
    case 'checkouts':
      switch (action) {
      default:
        return false;
      // TODO: Checkin at location
      // TODO: Add items to open check-out
      // CRUD
      case 'create':
      case 'read':
      case 'update':
      case 'delete':
      // Order specific actions
      case 'setCustomer':
      case 'clearCustomer':
      case 'setLocation':
      case 'clearLocation':
      case 'addItems':
      case 'removeItems':
      case 'swapItems':
      case 'undoCheckout':
      case 'checkin':
      case 'checkout':
      // Generic actions
      case 'setFields':
      case 'setField':
      case 'clearField':
      case 'addAttachment':
      case 'addComment':
      case 'updateComment':
      case 'removeComment':
      case 'export':
      case 'archive':
      case 'undoArchive':
        return this._useOrders;
      // Permissions for flags
      case 'setFlag':
        return this._useFlags && this._canSetFlag;
      case 'clearFlag':
        return this._useFlags && this._canClearFlag;
      // Other
      case 'generateDocument':
        return this._usePdf;
      case 'checkinAt':
        return this._useCheckinLocation;
      case 'forceConflictResolving':
        return false;  // this.profile.forceConflictResolving;
      }
      break;
    case 'reservations':
      switch (action) {
      default:
        return false;
      // TODO: Add items to open reservation
      // CRUD
      case 'create':
      case 'read':
      case 'update':
      case 'delete':
      // Reservation specific actions
      case 'setFromToDate':
      case 'setCustomer':
      case 'clearCustomer':
      case 'setLocation':
      case 'clearLocation':
      case 'addItems':
      case 'removeItems':
      case 'swapItems':
      case 'reserve':
      case 'undoReserve':
      case 'cancel':
      case 'undoCancel':
      case 'switchToOrder':
      case 'makeOrder':
      case 'reserveAgain':
      case 'reserveRepeat':
      // Generic actions
      case 'setFields':
      case 'setField':
      case 'clearField':
      case 'addAttachment':
      case 'addComment':
      case 'updateComment':
      case 'removeComment':
      case 'export':
      case 'archive':
      case 'undoArchive':
        return this._useReservations;
      // Permissions for flags
      case 'setFlag':
        return this._useFlags && this._canSetFlag;
      case 'clearFlag':
        return this._useFlags && this._canClearFlag;
      // Other
      case 'generateDocument':
        return this._usePdf;
      }
      break;
    case 'customers':
    case 'contacts':
      switch (action) {
      default:
        return false;
      case 'read':
      case 'create':
      case 'update':
      case 'delete':
      case 'archive':
      case 'undoArchive':
      case 'setFields':
      case 'setField':
      case 'clearField':
      case 'addAttachment':
      case 'addComment':
      case 'updateComment':
      case 'removeComment':
      case 'import':
      case 'export':
        return this._isRootOrAdminOrUser;
      // Permissions for flags
      case 'setFlag':
        return this._useFlags && this._canSetFlag;
      case 'clearFlag':
        return this._useFlags && this._canClearFlag;
      // Other
      case 'generateDocument':
        return this._usePdf;
      }
      break;
    case 'users':
      switch (action) {
      default:
        return false;
      case 'read':
        return true;
      case 'create':
      case 'update':
      case 'delete':
      case 'linkNewCustomer':
      case 'linkCustomer':
      case 'unLinkCustomer':
      case 'inviteUser':
      case 'archive':
      case 'undoArchive':
      case 'activate':
      case 'deactivate':
        return this._isRootOrAdmin;
      case 'changeAccountOwner':
        return this._isOwner;
      }
      break;
    case 'categories':
    case 'locations':
      switch (action) {
      default:
        return false;
      case 'read':
        return true;
      case 'create':
      case 'update':
      case 'delete':
        return this._isRootOrAdmin;
      }
      break;
    case 'syncs':
      switch (action) {
      default:
        return false;
      case 'read':
      case 'create':
      case 'update':
      case 'delete':
      case 'clone':
      case 'testConnection':
      case 'syncUsers':
        return this._useUserSync && this._isRootOrAdmin;
      }
      break;
    case 'webhooks':
      switch (action) {
      default:
        return false;
      case 'read':
      case 'create':
      case 'update':
      case 'delete':
        return this._useWebHooks && this._isRootOrAdmin;
      }
      break;
    case 'account':
      switch (action) {
      default:
        return this._isRootOrAdmin;
      case 'reset':
      case 'cancelPlan':
      case 'changePlan':
        return this._isOwner;
      }
      break;
    case 'subscription':
    case 'invoices':
    case 'billing':
    case 'templates':
      switch (action) {
      default:
        return false;
      case 'read':
        return true;
      case 'create':
      case 'update':
      case 'delete':
      case 'archive':
      case 'undoArchive':
      case 'activate':
      case 'deactivate':
      case 'clone':
        return this._isRootOrAdmin;
      }
      break;
    case 'asset-tags':
      switch (action) {
      default:
        return this._isRootOrAdmin;
      }
      break;
    }
  };
  return PermissionHandler;
}();
Reservation = function ($, api, Transaction, Conflict) {
  // Allow overriding the ctor during inheritance
  // http://stackoverflow.com/questions/4152931/javascript-inheritance-call-super-constructor-or-use-prototype-chain
  var tmp = function () {
  };
  tmp.prototype = Transaction.prototype;
  /**
   * @name Reservation
   * @class Reservation
   * @constructor
   * @extends Transaction
   * @propery {Array}  conflicts               - The reservation conflicts
   */
  var Reservation = function (opt) {
    var spec = $.extend({
      crtype: 'cheqroom.types.reservation',
      _fields: ['*']
    }, opt);
    Transaction.call(this, spec);
    this.conflicts = [];
    this.order = null;
  };
  Reservation.prototype = new tmp();
  Reservation.prototype.constructor = Reservation;
  //
  // Date helpers; we'll need these for sliding from / to dates during a long user session
  //
  // getMinDateFrom (overwritten)
  // getMaxDateFrom (default)
  // getMinDateTo (overwritten)
  // getMaxDateTo (default)
  /**
   * Overwrite how we get a min date for reservation
   * Min date is a timeslot after now
   */
  Reservation.prototype.getMinDateFrom = function () {
    return this.getNextTimeSlot();
  };
  Reservation.prototype.getMinDateTo = function () {
    return this.getNextTimeSlot(this.from);
  };
  //
  // Helpers
  //
  /**
   * Gets a moment duration object
   * @method
   * @name Reservation#getDuration
   * @returns {duration}
   */
  Reservation.prototype.getDuration = function () {
    return common.getReservationDuration(this.raw);
  };
  /**
   * Gets a friendly order duration or empty string
   * @method
   * @name Reservation#getFriendlyDuration
   * @returns {string}
   */
  Reservation.prototype.getFriendlyDuration = function () {
    return common.getFriendlyReservationDuration(this.raw, this._getDateHelper());
  };
  /**
   * Checks if from date is valid for open/creating reservation
   * otherwise return always true
   *
   * @return {Boolean}
   */
  Reservation.prototype.isValidFromDate = function () {
    var from = this.from, status = this.status, now = this.getNow();
    if (status == 'creating' || status == 'open') {
      return from != null && from.isAfter(now);
    }
    return true;
  };
  /**
   * Checks if to date is valid for open/creating reservation
   * otherwise return always true
   *
   * @return {Boolean}
   */
  Reservation.prototype.isValidToDate = function () {
    var from = this.from, to = this.to, status = this.status;
    if (status == 'creating' || status == 'open') {
      return to != null && to.isAfter(from);
    }
    return true;
  };
  /**
   * Checks if the reservation can be booked
   * @method
   * @name Reservation#canReserve
   * @returns {boolean}
   */
  Reservation.prototype.canReserve = function () {
    return this.status == 'creating' && this.location && (this.contact && this.contact.status == 'active') && this.isValidFromDate() && this.isValidToDate() && this.items && this.items.length;
  };
  /**
   * Checks if the reservation can be undone (based on status)
   * @method
   * @name Reservation#canUndoReserve
   * @returns {boolean}
   */
  Reservation.prototype.canUndoReserve = function () {
    return this.status == 'open';
  };
  /**
   * Checks if the reservation can be cancelled
   * @method
   * @name Reservation#canCancel
   * @returns {boolean}
   */
  Reservation.prototype.canCancel = function () {
    return this.status == 'open';
  };
  /**
   * Checks if the reservation can be edited
   * @method
   * @name Reservation#canEdit
   * @returns {boolean}
   */
  Reservation.prototype.canEdit = function () {
    return this.status == 'creating';
  };
  /**
   * Checks if the reservation can be deleted
   * @method
   * @name Reservation#canDelete
   * @returns {boolean}
   */
  Reservation.prototype.canDelete = function () {
    return this.status == 'creating';
  };
  /**
   * Checks if items can be added to the reservation (based on status)
   * @method
   * @name Reservation#canAddItems
   * @returns {boolean}
   */
  Reservation.prototype.canAddItems = function () {
    return this.status == 'creating';
  };
  /**
   * Checks if items can be removed from the reservation (based on status)
   * @method
   * @name Reservation#canRemoveItems
   * @returns {boolean}
   */
  Reservation.prototype.canRemoveItems = function () {
    return this.status == 'creating';
  };
  /**
   * Checks if items can be swapped in the reservation (based on status)
   * @method
   * @name Reservation#canSwapItems
   * @returns {boolean}
   */
  Reservation.prototype.canSwapItems = function () {
    return this.status == 'creating' || this.status == 'open';
  };
  /**
   * Checks if the reservation can be turned into an order
   * @method
   * @name Reservation#canMakeOrder
   * @returns {boolean}
   */
  Reservation.prototype.canMakeOrder = function () {
    // Only reservations that meet the following conditions can be made into an order
    // - status: open
    // - to date: is in the future
    // - items: all are available
    if (this.status == 'open' && this.to != null && this.to.isAfter(this.getNow())) {
      var unavailable = this._getUnavailableItems();
      var len = $.map(unavailable, function (n, i) {
        return i;
      }).length;
      // TODO: Why do we need this?
      return len == 0;
    } else {
      return false;
    }
  };
  /**
   * Checks if the reservation has an order linked to it
   * @method
   * @name Reservation#canGoToOrder
   * @returns {boolean}
   */
  Reservation.prototype.canGoToOrder = function () {
    return this.order != null;
  };
  /**
   * Checks if the reservation can be reserved again (based on status)
   * @method
   * @name Reservation#canReserveAgain
   * @returns {boolean}
   */
  Reservation.prototype.canReserveAgain = function () {
    return this.status == 'open' || (this.status == 'closed' || this.status == 'cancelled');
  };
  /**
   * Checks if the reservation can be into recurring reservations (based on status)
   * @method
   * @name Reservation#canReserveRepeat
   * @returns {boolean}
   */
  Reservation.prototype.canReserveRepeat = function () {
    return this.status == 'open' || this.status == 'closed';
  };
  /**
   * Checks if we can generate a document for this reservation (based on status)
   * @name Reservation#canGenerateDocument
   * @returns {boolean}
   */
  Reservation.prototype.canGenerateDocument = function () {
    return this.status == 'open' || this.status == 'closed';
  };
  //
  // Document overrides
  //
  Reservation.prototype._toJson = function (options) {
    var data = Transaction.prototype._toJson.call(this, options);
    data.fromDate = this.from != null ? this.from.toJSONDate() : 'null';
    data.toDate = this.to != null ? this.to.toJSONDate() : 'null';
    return data;
  };
  Reservation.prototype._fromJson = function (data, options) {
    var that = this;
    // Already set the from, to and due dates
    // Transaction._fromJson might need it during _getConflicts
    that.from = data.fromDate == null || data.fromDate == 'null' ? null : data.fromDate;
    that.to = data.toDate == null || data.toDate == 'null' ? null : data.toDate;
    that.due = null;
    that.order = data.order || null;
    return Transaction.prototype._fromJson.call(this, data, options).then(function () {
      $.publish('reservation.fromJson', data);
    });
  };
  //
  // Base overrides
  //
  //
  // Transaction overrides
  //
  /**
   * Gets a list of Conflict objects
   * used during Transaction._fromJson
   * @returns {promise}
   * @private
   */
  Reservation.prototype._getConflicts = function () {
    var that = this, conflicts = [], conflict = null;
    // Reservations can only have conflicts
    // when we have a (location OR (from AND to)) AND at least 1 item
    // So we'll only hit the server if there are possible conflicts.
    //
    // However, some conflicts only start making sense when the reservation fields filled in
    // When you don't have any dates set yet, it makes no sense to show "checked out" conflict
    if (this.items && this.items.length && (this.location || this.from && this.to)) {
      var locId = this.location ? this._getId(this.location) : null;
      var showOrderConflicts = this.from && this.to;
      var showLocationConflicts = this.location != null;
      var showStatusConflicts = true;
      // always show conflicts for expired, custody
      return this.ds.call(this.id, 'getConflicts').then(function (cnflcts) {
        cnflcts = cnflcts || [];
        // Now we have 0 or more conflicts for this reservation
        // run over the items again and find the conflict for each item
        $.each(that.items, function (i, item) {
          conflict = cnflcts.find(function (conflictObj) {
            return conflictObj.item == item._id;
          });
          // Does this item have a server-side conflict?
          if (conflict) {
            var kind = conflict.kind || '';
            kind = kind || (conflict.order ? 'order' : '');
            kind = kind || (conflict.reservation ? 'reservation' : '');
            conflicts.push(new Conflict({
              kind: kind,
              item: item._id,
              itemName: item.name,
              doc: conflict.conflictsWith
            }));
          } else {
            if (showStatusConflicts && item.status == 'expired') {
              conflicts.push(new Conflict({
                kind: 'expired',
                item: item._id,
                itemName: item.name,
                doc: item.order
              }));
            } else if (showStatusConflicts && item.status == 'in_custody') {
              conflicts.push(new Conflict({
                kind: 'custody',
                item: item._id,
                itemName: item.name,
                doc: item.order
              }));
            } else if (showOrderConflicts && item.status != 'available') {
              conflicts.push(new Conflict({
                kind: 'order',
                item: item._id,
                itemName: item.name,
                doc: item.order
              }));
            } else if (showLocationConflicts && item.location != locId) {
              conflicts.push(new Conflict({
                kind: 'location',
                item: item._id,
                itemName: item.name,
                locationCurrent: item.location,
                locationDesired: locId,
                doc: item.order
              }));
            }
          }
        });
        return conflicts;
      });
    }
    return $.Deferred().resolve(conflicts);
  };
  /**
   * Sets the reservation from / to dates in a single call
   * @method
   * @name Reservation#setFromToDate
   * @param from
   * @param to (optional) if null, we'll take the default average checkout duration as due date
   * @param skipRead
   * @returns {*}
   */
  Reservation.prototype.setFromToDate = function (from, to, skipRead) {
    if (this.status != 'creating') {
      return $.Deferred().reject(new api.ApiUnprocessableEntity('Cannot set reservation from / to date, status is ' + this.status));
    }
    var that = this;
    var roundedFromDate = this._getDateHelper().roundTimeFrom(from);
    var roundedToDate = to ? this._getDateHelper().roundTimeTo(to) : this._getDateHelper().addAverageDuration(roundedFromDate);
    return this._checkFromToDate(roundedFromDate, roundedToDate).then(function () {
      that.from = roundedFromDate;
      that.to = roundedToDate;
      return that._doApiCall({
        method: 'setFromToDate',
        params: {
          fromDate: roundedFromDate,
          toDate: roundedToDate
        },
        skipRead: skipRead
      });
    });
  };
  /**
   * setFromDate
   * The from date must be:
   * - bigger than minDate
   * - smaller than maxDate
   * - at least one interval before .to date (if set)
   * @method
   * @name Reservation#setFromDate
   * @param date
   * @param skipRead
   * @returns {*}
   */
  Reservation.prototype.setFromDate = function (date, skipRead) {
    if (this.status != 'creating') {
      return $.Deferred().reject(new api.ApiUnprocessableEntity('Cannot set reservation from date, status is ' + this.status));
    }
    var that = this;
    var dateHelper = this._getDateHelper();
    var interval = dateHelper.roundMinutes;
    var roundedFromDate = dateHelper.roundTimeFrom(date);
    return this._checkFromDateBetweenMinMax(roundedFromDate).then(function () {
      // TODO: Should never get here
      // Must be at least 1 interval before to date, if it's already set
      if (that.to && that.to.diff(roundedFromDate, 'minutes') < interval) {
        return $.Deferred().reject(new api.ApiUnprocessableEntity('Cannot set reservation from date, after (or too close to) to date ' + that.to.toJSONDate()));
      }
      that.from = roundedFromDate;
      //If reservation doesn't exist yet, we set from date in create call
      //otherwise use setFromDate to update transaction
      if (!that.existsInDb()) {
        return that._createTransaction(skipRead);
      } else {
        return that._doApiCall({
          method: 'setFromDate',
          params: { fromDate: roundedFromDate },
          skipRead: skipRead
        });
      }
    });
  };
  /**
   * Clear the reservation from date
   * @method
   * @name Reservation#clearFromDate
   * @param skipRead
   * @returns {*}
   */
  Reservation.prototype.clearFromDate = function (skipRead) {
    if (this.status != 'creating') {
      return $.Deferred().reject(new api.ApiUnprocessableEntity('Cannot clear reservation from date, status is ' + this.status));
    }
    this.from = null;
    return this._doApiCall({
      method: 'clearFromDate',
      skipRead: skipRead
    });
  };
  /**
   * setToDate
   * The to date must be:
   * - bigger than minDate
   * - smaller than maxDate
   * - at least one interval after the .from date (if set)
   * @method
   * @name Reservation#setToDate
   * @param date
   * @param skipRead
   * @returns {*}
   */
  Reservation.prototype.setToDate = function (date, skipRead) {
    // Cannot change the to-date of a reservation that is not in status "creating"
    if (this.status != 'creating') {
      return $.Deferred().reject(new api.ApiUnprocessableEntity('Cannot set reservation to date, status is ' + this.status));
    }
    // The to date must be:
    // 1) at least 30 minutes into the feature
    // 2) at least 15 minutes after the from date (if set)
    var that = this;
    var dateHelper = this._getDateHelper();
    var interval = dateHelper.roundMinutes;
    var roundedToDate = dateHelper.roundTimeTo(date);
    return this._checkToDateBetweenMinMax(roundedToDate).then(function () {
      if (that.from && that.from.diff(roundedToDate, 'minutes') > interval) {
        return $.Deferred().reject(new api.ApiUnprocessableEntity('Cannot set reservation to date, before (or too close to) to date ' + that.from.toJSONDate()));
      }
      that.to = roundedToDate;
      //If reservation doesn't exist yet, we set to date in create call
      //otherwise use setToDate to update transaction
      if (!that.existsInDb()) {
        return that._createTransaction(skipRead);
      } else {
        return that._doApiCall({
          method: 'setToDate',
          params: { toDate: roundedToDate },
          skipRead: skipRead
        });
      }
    });
  };
  /**
   * Clears the reservation to date
   * @method
   * @name Reservation#clearToDate
   * @param skipRead
   * @returns {*}
   */
  Reservation.prototype.clearToDate = function (skipRead) {
    if (this.status != 'creating') {
      return $.Deferred().reject(new api.ApiUnprocessableEntity('Cannot clear reservation to date, status is ' + this.status));
    }
    this.to = null;
    return this._doApiCall({
      method: 'clearToDate',
      skipRead: skipRead
    });
  };
  // Reservation does not use due dates
  Reservation.prototype.clearDueDate = function (skipRead) {
    throw 'Reservation.clearDueDate not implemented';
  };
  Reservation.prototype.setDueDate = function (date, skipRead) {
    throw 'Reservation.setDueDate not implemented';
  };
  //
  // Business logic calls
  //
  /**
   * Searches for Items that are available for this reservation
   * @method
   * @name Reservation#searchItems
   * @param params
   * @param useAvailabilies (should always be true, we only use this flag for Order objects)
   * @param onlyUnbooked
   * @returns {*}
   */
  Reservation.prototype.searchItems = function (params, useAvailabilies, onlyUnbooked, skipItems) {
    return this._searchItems(params, null, true, onlyUnbooked, skipItems || this.items);
  };
  /**
   * Books the reservation and sets the status to `open`
   * @method
   * @name Reservation#reserve
   * @param skipRead
   * @returns {*}
   */
  Reservation.prototype.reserve = function (skipRead) {
    return this._doApiCall({
      method: 'reserve',
      skipRead: skipRead
    });
  };
  /**
   * Unbooks the reservation and sets the status to `creating` again
   * @method
   * @name Reservation#undoReserve
   * @param skipRead
   * @returns {*}
   */
  Reservation.prototype.undoReserve = function (skipRead) {
    return this._doApiCall({
      method: 'undoReserve',
      skipRead: skipRead
    });
  };
  /**
   * Cancels the booked reservation and sets the status to `cancelled`
   * @method
   * @name Reservation#cancel
   * @param skipRead
   * @returns {*}
   */
  Reservation.prototype.cancel = function (skipRead) {
    return this._doApiCall({
      method: 'cancel',
      skipRead: skipRead
    });
  };
  /**
   * Turns an open reservation into an order (which still needs to be checked out)
   * @method
   * @name Reservation#makeOrder
   * @returns {*}
   */
  Reservation.prototype.makeOrder = function () {
    return this._doApiCall({
      method: 'makeOrder',
      skipRead: true
    });  // response is an Order object!!
  };
  /**
   * Switch reservation to order
   * @method
   * @name Reservation#switchToOrder
   * @return {*}
   */
  Reservation.prototype.switchToOrder = function () {
    return this._doApiCall({
      method: 'switchToOrder',
      skipRead: true
    });
  };
  /**
   * Generates a PDF document for the reservation
   * @method
   * @name Reservation#generateDocument
   * @param {string} template id
   * @param {string} signature (base64)
   * @param {bool} skipRead
   * @returns {promise}
   */
  Reservation.prototype.generateDocument = function (template, signature, skipRead) {
    return this._doApiCall({
      method: 'generateDocument',
      params: {
        template: template,
        signature: signature
      },
      skipRead: skipRead
    });
  };
  /**
   * Creates a new, incomplete reservation with the same info
   * as the original reservation but other fromDate, toDate
   * Important; the response will be another Reservation document!
   * @method
   * @name Reservation#reserveAgain
   * @param fromDate
   * @param toDate
   * @param customer
   * @param location
   * @param skipRead
   * @returns {promise}
   */
  Reservation.prototype.reserveAgain = function (fromDate, toDate, customer, location, skipRead) {
    return this._doApiCall({
      method: 'reserveAgain',
      params: {
        fromDate: fromDate,
        toDate: toDate,
        location: location,
        customer: customer
      },
      skipRead: skipRead
    });
  };
  /**
   * Creates a list of new reservations with `open` status
   * as the original reservation but other fromDate, toDate
   * Important; the response will be a list of other Reservation documents
   * @method
   * @name Reservation#reserveRepeat
   * @param frequency (days, weeks, weekdays, months)
   * @param customer
   * @param location
   * @param until
   * @returns {promise}
   */
  Reservation.prototype.reserveRepeat = function (frequency, until, customer, location) {
    return this._doApiCall({
      method: 'reserveRepeat',
      params: {
        frequency: frequency,
        until: until,
        customer: customer,
        location: location
      },
      skipRead: true
    });  // response is a array of reservations
  };
  //
  // Implementation
  //
  Reservation.prototype._checkFromToDate = function (from, to) {
    var dateHelper = this._getDateHelper();
    var roundedFromDate = from;
    //(from) ? this._getHelper().roundTimeFrom(from) : null;
    var roundedToDate = to;
    //(due) ? this._getHelper().roundTimeTo(due) : null;
    if (roundedFromDate && roundedToDate) {
      return $.when(this._checkFromDateBetweenMinMax(roundedFromDate), this._checkToDateBetweenMinMax(roundedToDate)).then(function (fromRes, toRes) {
        var interval = dateHelper.roundMinutes;
        // TODO: We should never get here
        if (roundedToDate.diff(roundedFromDate, 'minutes') < interval) {
          return $.Deferred().reject(new api.ApiUnprocessableEntity('Cannot set order from date, after (or too close to) to date ' + roundedToDate.toJSONDate()));
        }
        if (roundedFromDate.diff(roundedToDate, 'minutes') > interval) {
          return $.Deferred().reject(new api.ApiUnprocessableEntity('Cannot set order due date, before (or too close to) from date ' + roundedFromDate.toJSONDate()));
        }
      });
    } else if (roundedFromDate) {
      return this._checkFromDateBetweenMinMax(roundedFromDate);
    } else if (roundedToDate) {
      return this._checkToDateBetweenMinMax(roundedToDate);
    } else {
      return $.Deferred().reject(new api.ApiUnprocessableEntity('Cannot from/due date, both are null'));
    }
  };
  Reservation.prototype._getUnavailableItems = function () {
    var unavailable = {};
    if (this.status == 'open' && this.location && this.items != null && this.items.length > 0) {
      var that = this;
      var locId = that._getId(that.location);
      $.each(this.items, function (i, item) {
        if (item.status != 'available') {
          unavailable['status'] = unavailable['status'] || [];
          unavailable['status'].push(item._id);
        }
      });
    }
    return unavailable;
  };
  return Reservation;
}(jquery, api, transaction, conflict);
Template = function ($, common, api, Document) {
  // Some constant values
  var DEFAULTS = {
    id: '',
    status: 'inactive',
    name: '',
    body: '',
    format: '',
    kind: '',
    width: 0,
    height: 0,
    unit: 'inch',
    askSignature: false,
    system: true,
    archived: null,
    createdBy: null,
    createdOn: null,
    modifiedBy: null,
    modifiedOn: null
  };
  // Allow overriding the ctor during inheritance
  // http://stackoverflow.com/questions/4152931/javascript-inheritance-call-super-constructor-or-use-prototype-chain
  var tmp = function () {
  };
  tmp.prototype = Document.prototype;
  /**
   * Template serves as a starting point for a document or asset label
   * @name  Template
   * @class
   * @property {string} name          the name
   * @property {string} status        the status
   * @property {string} body          the body (in html, xml, text, ... depending on the `format`)
   * @property {string} format        the format (pdf, label, dymo)
   * @property {string} kind          the kind of pdf (order, reservation, customer)
   * @property {boolean} askSignature should we ask for a signature when generating a pdf
   * @property {float} width          the width of the template
   * @property {float} height         the height of the template
   * @property {string} unit          this unit that is used for dimensions (mm, inch)
   * @property {boolean} system       is it a system template which cannot be changed?
   * @property {Moment} archived      is the template archived
   * @property {string} createdBy     the user that created the template (null for system templates)
   * @property {Moment} createdOn     when the template was created
   * @property {string} modifiedBy    the user that modified the template (null for system templates)
   * @property {Moment} modifiedOn    when the template was modified
   * @constructor
   * @extends Document
   */
  var Template = function (opt) {
    var spec = $.extend({}, opt);
    Document.call(this, spec);
    this.name = spec.name || DEFAULTS.name;
    this.status = spec.status || DEFAULTS.status;
    this.body = spec.body || DEFAULTS.body;
    this.format = spec.format || DEFAULTS.format;
    this.kind = spec.kind || DEFAULTS.kind;
    this.askSignature = spec.askSignature != null ? spec.askSignature == true : DEFAULTS.askSignature;
    this.width = spec.width || DEFAULTS.width;
    this.height = spec.height || DEFAULTS.height;
    this.unit = spec.unit || DEFAULTS.unit;
    this.system = spec.system != null ? spec.system == true : DEFAULTS.system;
    this.archived = spec.archived || DEFAULTS.archived;
    this.createdBy = spec.createdBy || DEFAULTS.createdBy;
    this.createdOn = spec.createdOn || DEFAULTS.createdOn;
    this.modifiedBy = spec.modifiedBy || DEFAULTS.modifiedBy;
    this.modifiedOn = spec.modifiedOn || DEFAULTS.modifiedOn;
  };
  Template.prototype = new tmp();
  Template.prototype.constructor = Template;
  //
  // Specific validators
  /**
   * Checks if name is valid
   * @name Template#isValidName
   * @method
   * @return {Boolean}
   */
  Template.prototype.isValidName = function () {
    this.name = $.trim(this.name);
    return this.name.length >= 3;
  };
  //
  // Document overrides
  //
  /**
   * Checks if the template has any validation errors
   * @name Template#isValid
   * @method
   * @returns {boolean}
   * @override
   */
  Template.prototype.isValid = function () {
    // TODO: Check if the format, kind, etc is correct
    return this.isValidName();
  };
  Template.prototype._getDefaults = function () {
    return DEFAULTS;
  };
  /**
   * Checks if the object is empty, it never is
   * @name  Template#isEmpty
   * @method
   * @returns {boolean}
   * @override
   */
  Template.prototype.isEmpty = function () {
    return Document.prototype.isEmpty.call(this) && this.name == DEFAULTS.name;
  };
  /**
   * Checks if the object is archived
   * @name Template#isArchived
   * @method
   * @returns {boolean}
   */
  Template.prototype.isArchived = function () {
    return common.templateIsArchived(this);
  };
  /**
   * Checks if the template is dirty and needs saving
   * @returns {boolean}
   * @override
   */
  Template.prototype.isDirty = function () {
    var isDirty = Document.prototype.isDirty.call(this);
    if (!isDirty && this.raw) {
      isDirty = this.name != this.raw.name || this.body != this.raw.body || this.format != this.raw.format || this.kind != this.raw.kind || this.askSignature != this.raw.askSignature || this.width != this.raw.width || this.height != this.raw.height || this.unit != this.raw.unit;
    }
    return isDirty;
  };
  //
  // Business logic
  //
  /**
   * Clones the template to a new one
   * @name Template#clone
   * @returns {promise}
   */
  Template.prototype.clone = function () {
    return this.ds.call(this.id, 'clone');
  };
  /**
   * Archives this template
   * @name Template#archive
   * @param skipRead
   * @returns {promise}
   */
  Template.prototype.archive = function (skipRead) {
    return this._doApiCall({
      method: 'archive',
      skipRead: skipRead
    });
  };
  /**
   * Unarchives this template
   * @name Template#undoArchive
   * @param skipRead
   * @returns {promise}
   */
  Template.prototype.undoArchive = function (skipRead) {
    return this._doApiCall({
      method: 'undoArchive',
      skipRead: skipRead
    });
  };
  /**
   * Activates this template
   * @name Template#activate
   * @param skipRead
   * @returns {promise}
   */
  Template.prototype.activate = function (skipRead) {
    return this._doApiCall({
      method: 'activate',
      skipRead: skipRead
    });
  };
  /**
   * Deactivates this template
   * @name Template#deactivate
   * @param skipRead
   * @returns {promise}
   */
  Template.prototype.deactivate = function (skipRead) {
    return this._doApiCall({
      method: 'deactivate',
      skipRead: skipRead
    });
  };
  /**
   * Checks if we can delete the Template document
   * @name  Template#canDelete
   * @method
   * @returns {boolean}
   * @override
   */
  Template.prototype.canDelete = function () {
    return common.templateCanDelete(this);
  };
  /**
   * Checks if we can activate a template
   * @name Template#canActivate
   * @returns {boolean}
   */
  Template.prototype.canActivate = function () {
    return common.templateCanActivate(this);
  };
  /**
   * Checks if we can deactivate a template
   * @name Template#canDeactivate
   * @returns {boolean}
   */
  Template.prototype.canDeactivate = function () {
    return common.templateCanDeactivate(this);
  };
  /**
   * Checks if we can archive a template
   * @name Template#canArchive
   * @returns {boolean}
   */
  Template.prototype.canArchive = function () {
    return common.templateCanArchive(this);
  };
  /**
   * Checks if we can undoArchive a template
   * @name Template#canUndoArchive
   * @returns {boolean}
   */
  Template.prototype.canUndoArchive = function () {
    return common.templateCanUndoArchive(this);
  };
  // toJson, fromJson
  // ----
  /**
   * _toJson, makes a dict of params to use during create / update
   * @param options
   * @returns {{}}
   * @private
   */
  Template.prototype._toJson = function (options) {
    var data = Document.prototype._toJson.call(this, options);
    data.name = this.name;
    data.body = this.body;
    data.kind = this.kind;
    data.askSignature = this.askSignature;
    data.width = this.width;
    data.height = this.height;
    data.unit = this.unit;
    // don't write out fields for:
    // - format
    // - status
    // - system
    // - created, modified
    return data;
  };
  /**
   * _fromJson: read some basic information
   * @method
   * @param {object} data the json response
   * @param {object} options dict
   * @returns {Promise}
   * @private
   */
  Template.prototype._fromJson = function (data, options) {
    var that = this;
    return Document.prototype._fromJson.call(this, data, options).then(function () {
      that.name = data.name || DEFAULTS.name;
      that.status = data.status || DEFAULTS.status;
      that.body = data.body || DEFAULTS.body;
      that.format = data.format || DEFAULTS.format;
      that.kind = data.kind || DEFAULTS.kind;
      that.askSignature = data.askSignature != null ? data.askSignature == true : DEFAULTS.askSignature;
      that.width = data.width || DEFAULTS.width;
      that.height = data.height || DEFAULTS.height;
      that.unit = data.unit || DEFAULTS.unit;
      that.system = data.system != null ? data.system == true : DEFAULTS.system;
      that.archived = data.archived || DEFAULTS.archived;
      that.createdBy = data.createdBy || DEFAULTS.createdBy;
      that.createdOn = data.createdOn || DEFAULTS.createdOn;
      that.modifiedBy = data.modifiedBy || DEFAULTS.modifiedBy;
      that.modifiedOn = data.modifiedOn || DEFAULTS.modifiedOn;
      return data;
    });
  };
  return Template;
}(jquery, common, api, document);
Transaction = function ($, api, Base, Location, DateHelper, Helper) {
  var DEFAULTS = {
    status: 'creating',
    from: null,
    to: null,
    due: null,
    contact: null,
    location: null,
    number: '',
    items: [],
    conflicts: [],
    by: null,
    archived: null,
    itemSummary: null,
    name: null
  };
  // Allow overriding the ctor during inheritance
  // http://stackoverflow.com/questions/4152931/javascript-inheritance-call-super-constructor-or-use-prototype-chain
  var tmp = function () {
  };
  tmp.prototype = Base.prototype;
  /**
   * @name Transaction
   * @class Transaction
   * @constructor
   * @extends Base
   * @property {boolean} autoCleanup      - Automatically cleanup the transaction if it becomes empty?
   * @property {DateHelper} dateHelper    - A DateHelper object ref
   * @property {string} status            - The transaction status
   * @property {moment} from              - The transaction from date
   * @property {moment} to                - The transaction to date
   * @property {moment} due               - The transaction due date
   * @property {string} number            - The booking number
   * @property {string} contact           - The Contact.id for this transaction
   * @property {string} location          - The Location.id for this transaction
   * @property {Array} items              - A list of Item.id strings
   * @property {Array} conflicts          - A list of conflict hashes
   */
  var Transaction = function (opt) {
    var spec = $.extend({}, opt);
    Base.call(this, spec);
    this.dsItems = spec.dsItems;
    // we'll also access the /items collection
    // should we automatically delete the transaction from the database?
    this.autoCleanup = spec.autoCleanup != null ? spec.autoCleanup : false;
    this.dateHelper = spec.dateHelper || new DateHelper();
    this.helper = spec.helper || new Helper();
    this.status = spec.status || DEFAULTS.status;
    // the status of the order or reservation
    this.from = spec.from || DEFAULTS.from;
    // a date in the future
    this.to = spec.to || DEFAULTS.to;
    // a date in the future
    this.due = spec.due || DEFAULTS.due;
    // a date even further in the future, we suggest some standard avg durations
    this.number = spec.number || DEFAULTS.number;
    // a booking number
    this.contact = spec.contact || DEFAULTS.contact;
    // a contact id
    this.location = spec.location || DEFAULTS.location;
    // a location id
    this.items = spec.items || DEFAULTS.items.slice();
    // an array of item ids
    this.conflicts = spec.conflicts || DEFAULTS.conflicts.slice();
    // an array of Conflict objects
    this.by = spec.by || DEFAULTS.by;
    this.itemSummary = spec.itemSummary || DEFAULTS.itemSummary;
    this.name = spec.name || DEFAULTS.name;
  };
  Transaction.prototype = new tmp();
  Transaction.prototype.constructor = Base;
  //
  // Date helpers (possibly overwritten)
  //
  /**
   * Gets the now time
   * @returns {Moment}
   */
  Transaction.prototype.getNow = function () {
    return this._getDateHelper().getNow();
  };
  /**
   * Gets the now time rounded
   * @returns {Moment}
   */
  Transaction.prototype.getNowRounded = function () {
    return this._getDateHelper().roundTimeFrom(this.getNow());
  };
  /**
   * Gets the next time slot after a date, by default after now
   * @returns {Moment}
   */
  Transaction.prototype.getNextTimeSlot = function (d) {
    d = d || this.getNowRounded();
    var next = moment(d).add(this._getDateHelper().roundMinutes, 'minutes');
    if (next.isSame(d)) {
      next = next.add(this._getDateHelper().roundMinutes, 'minutes');
    }
    return next;
  };
  /**
   * Gets the lowest possible from date, by default now
   * @method
   * @name Transaction#getMinDateFrom
   * @returns {Moment}
   */
  Transaction.prototype.getMinDateFrom = function () {
    return this.getMinDate();
  };
  /**
   * Gets the highest possible from date, by default years from now
   * @method
   * @name Transaction#getMaxDateFrom
   * @returns {Moment}
   */
  Transaction.prototype.getMaxDateFrom = function () {
    return this.getMaxDate();
  };
  /**
   * Gets the lowest possible to date, by default from +1 timeslot
   * @method
   * @name Transaction#getMinDateTo
   * @returns {Moment}
   */
  Transaction.prototype.getMinDateTo = function () {
    // to can only be one timeslot after the min from date
    return this.getNextTimeSlot(this.getMinDateFrom());
  };
  /**
   * Gets the highest possible to date, by default years from now
   * @method
   * @name Transaction#getMaxDateTo
   * @returns {Moment}
   */
  Transaction.prototype.getMaxDateTo = function () {
    return this.getMaxDate();
  };
  /**
   * Gets the lowest possible due date, by default same as getMinDateTo
   * @method
   * @name Transaction#getMinDateDue
   * @returns {Moment}
   */
  Transaction.prototype.getMinDateDue = function () {
    return this.getMinDateTo();
  };
  /**
   * Gets the highest possible due date, by default same as getMaxDateDue
   * @method
   * @name Transaction#getMaxDateDue
   * @returns {Moment}
   */
  Transaction.prototype.getMaxDateDue = function () {
    return this.getMaxDateTo();
  };
  /**
   * DEPRECATED
   * Gets the lowest possible date to start this transaction
   * @method
   * @name Transaction#getMinDate
   * @returns {Moment} min date
   */
  Transaction.prototype.getMinDate = function () {
    return this.getNow();
  };
  /**
   * DEPRECATED
   * Gets the latest possible date to end this transaction
   * @method
   * @name Transaction#getMaxDate
   * @returns {Moment} max date
   */
  Transaction.prototype.getMaxDate = function () {
    var dateHelper = this._getDateHelper();
    var now = dateHelper.getNow();
    var next = dateHelper.roundTimeTo(now);
    return next.add(365, 'day');  // TODO: Is this a sensible date?
  };
  /**
   * suggestEndDate, makes a new moment() object with a suggested end date,
   * already rounded up according to the group.profile settings
   * @method suggestEndDate
   * @name Transaction#suggestEndDate
   * @param {Moment} m a suggested end date for this transaction
   * @returns {*}
   */
  Transaction.prototype.suggestEndDate = function (m) {
    var dateHelper = this._getDateHelper();
    var end = dateHelper.addAverageDuration(m || dateHelper.getNow());
    return dateHelper.roundTimeTo(end);
  };
  //
  // Base overrides
  //
  /**
   * Checks if the transaction is empty
   * @method isEmpty
   * @name Transaction#isEmpty
   * @returns {boolean}
   */
  Transaction.prototype.isEmpty = function () {
    return Base.prototype.isEmpty.call(this) && this.status == DEFAULTS.status && (this.crtype == 'cheqroom.types.order' ? true : this.from == DEFAULTS.from) && this.to == DEFAULTS.to && this.due == DEFAULTS.due && this.number == DEFAULTS.number && this.contact == DEFAULTS.contact && this.location == DEFAULTS.location && this.items.length == 0  // not DEFAULTS.items? :)
;
  };
  /**
   * Checks if the transaction is dirty and needs saving
   * @method
   * @name Transaction#isDirty
   * @returns {boolean}
   */
  Transaction.prototype.isDirty = function () {
    return Base.prototype.isDirty.call(this) || this._isDirtyBasic() || this._isDirtyDates() || this._isDirtyLocation() || this._isDirtyContact() || this._isDirtyItems();
  };
  Transaction.prototype._isDirtyBasic = function () {
    if (this.raw) {
      var status = this.raw.status || DEFAULTS.status;
      return this.status != status;
    } else {
      return false;
    }
  };
  Transaction.prototype._isDirtyDates = function () {
    if (this.raw) {
      var from = this.raw.from || DEFAULTS.from;
      var to = this.raw.to || DEFAULTS.to;
      var due = this.raw.due || DEFAULTS.due;
      return this.from != from || this.to != to || this.due != due;
    } else {
      return false;
    }
  };
  Transaction.prototype._isDirtyLocation = function () {
    if (this.raw) {
      var location = DEFAULTS.location;
      if (this.raw.location) {
        location = this.raw.location._id ? this.raw.location._id : this.raw.location;
      }
      return this.location != location;
    } else {
      return false;
    }
  };
  Transaction.prototype._isDirtyContact = function () {
    if (this.raw) {
      var contact = DEFAULTS.contact;
      if (this.raw.customer) {
        contact = this.raw.customer._id ? this.raw.customer._id : this.raw.customer;
      }
      return this.contact != contact;
    } else {
      return false;
    }
  };
  Transaction.prototype._isDirtyItems = function () {
    if (this.raw) {
      var items = DEFAULTS.items.slice();
      if (this.raw.items) {
      }
      return false;
    } else {
      return false;
    }
  };
  Transaction.prototype._getDefaults = function () {
    return DEFAULTS;
  };
  /**
   * Writes out some shared fields for all transactions
   * Inheriting classes will probably add more to this
   * @param options
   * @returns {object}
   * @private
   */
  Transaction.prototype._toJson = function (options) {
    var data = Base.prototype._toJson.call(this, options);
    //data.started = this.from;  // VT: Will be set during checkout
    //data.finished = this.to;  // VT: Will be set during final checkin
    data.due = this.due;
    if (this.location) {
      // Make sure we send the location as id, not the entire object
      data.location = this._getId(this.location);
    }
    if (this.contact) {
      // Make sure we send the contact as id, not the entire object
      // VT: It's still called the "customer" field on the backend!
      data.customer = this._getId(this.contact);
    }
    return data;
  };
  /**
   * Reads the transaction from a json object
   * @param data
   * @param options
   * @returns {promise}
   * @private
   */
  Transaction.prototype._fromJson = function (data, options) {
    var that = this;
    return Base.prototype._fromJson.call(this, data, options).then(function () {
      that.cover = null;
      // don't read cover property for Transactions
      that.status = data.status || DEFAULTS.status;
      that.number = data.number || DEFAULTS.number;
      that.location = data.location || DEFAULTS.location;
      that.contact = data.customer || DEFAULTS.contact;
      that.items = data.items || DEFAULTS.items.slice();
      that.by = data.by || DEFAULTS.by;
      that.archived = data.archived || DEFAULTS.archived;
      that.itemSummary = data.itemSummary || DEFAULTS.itemSummary;
      that.name = data.name || DEFAULTS.name;
      return that._getConflicts().then(function (conflicts) {
        that.conflicts = conflicts;
      });
    });
  };
  Transaction.prototype._toLog = function (options) {
    var obj = this._toJson(options);
    obj.minDateFrom = this.getMinDateFrom().toJSONDate();
    obj.maxDateFrom = this.getMaxDateFrom().toJSONDate();
    obj.minDateDue = this.getMinDateDue().toJSONDate();
    obj.maxDateDue = this.getMaxDateDue().toJSONDate();
    obj.minDateTo = this.getMinDateTo().toJSONDate();
    obj.maxDateTo = this.getMaxDateTo().toJSONDate();
    console.log(obj);
  };
  Transaction.prototype._checkFromDateBetweenMinMax = function (d) {
    return this._checkDateBetweenMinMax(d, this.getMinDateFrom(), this.getMaxDateFrom());
  };
  Transaction.prototype._checkDueDateBetweenMinMax = function (d) {
    return this._checkDateBetweenMinMax(d, this.getMinDateDue(), this.getMaxDateDue());
  };
  Transaction.prototype._checkToDateBetweenMinMax = function (d) {
    return this._checkDateBetweenMinMax(d, this.getMinDateTo(), this.getMaxDateTo());
  };
  // Setters
  // ----
  // From date setters
  /**
   * Clear the transaction from date
   * @method
   * @name Transaction#clearFromDate
   * @param skipRead
   * @returns {promise}
   */
  Transaction.prototype.clearFromDate = function (skipRead) {
    this.from = DEFAULTS.from;
    return this._handleTransaction(skipRead);
  };
  /**
   * Sets the transaction from date
   * @method
   * @name Transaction#setFromDate
   * @param date
   * @param skipRead
   * @returns {promise}
   */
  Transaction.prototype.setFromDate = function (date, skipRead) {
    this.from = this._getDateHelper().roundTimeFrom(date);
    return this._handleTransaction(skipRead);
  };
  // To date setters
  /**
   * Clear the transaction to date
   * @method
   * @name Transaction#clearToDate
   * @param skipRead
   * @returns {promise}
   */
  Transaction.prototype.clearToDate = function (skipRead) {
    this.to = DEFAULTS.to;
    return this._handleTransaction(skipRead);
  };
  /**
   * Sets the transaction to date
   * @method
   * @name Transaction#setToDate
   * @param date
   * @param skipRead
   * @returns {promise}
   */
  Transaction.prototype.setToDate = function (date, skipRead) {
    this.to = this._getDateHelper().roundTimeTo(date);
    return this._handleTransaction(skipRead);
  };
  // Due date setters
  /**
   * Clear the transaction due date
   * @method
   * @name Transaction#clearDueDate
   * @param skipRead
   * @returns {promise}
   */
  Transaction.prototype.clearDueDate = function (skipRead) {
    this.due = DEFAULTS.due;
    return this._handleTransaction(skipRead);
  };
  /**
   * Set the transaction due date
   * @method
   * @name Transaction#setDueDate
   * @param date
   * @param skipRead
   * @returns {promise}
   */
  Transaction.prototype.setDueDate = function (date, skipRead) {
    this.due = this._getDateHelper().roundTimeTo(date);
    return this._handleTransaction(skipRead);
  };
  // Location setters
  /**
   * Sets the location for this transaction
   * @method
   * @name Transaction#setLocation
   * @param locationId
   * @param skipRead skip parsing the returned json response into the transaction
   * @returns {promise}
   */
  Transaction.prototype.setLocation = function (locationId, skipRead) {
    this.location = locationId;
    if (this.existsInDb()) {
      return this._doApiCall({
        method: 'setLocation',
        params: { location: locationId },
        skipRead: skipRead
      });
    } else {
      return this._createTransaction(skipRead);
    }
  };
  /**
   * Clears the location for this transaction
   * @method
   * @name Transaction#clearLocation
   * @param skipRead skip parsing the returned json response into the transaction
   * @returns {promise}
   */
  Transaction.prototype.clearLocation = function (skipRead) {
    var that = this;
    this.location = DEFAULTS.location;
    return this._doApiCall({
      method: 'clearLocation',
      skipRead: skipRead
    }).then(function () {
      return that._ensureTransactionDeleted();
    });
  };
  // Contact setters
  /**
   * Sets the contact for this transaction
   * @method
   * @name Transaction#setContact
   * @param contactId
   * @param skipRead skip parsing the returned json response into the transaction
   * @returns {promise}
   */
  Transaction.prototype.setContact = function (contactId, skipRead) {
    this.contact = contactId;
    if (this.existsInDb()) {
      return this._doApiCall({
        method: 'setCustomer',
        params: { customer: contactId },
        skipRead: skipRead
      });
    } else {
      return this._createTransaction(skipRead);
    }
  };
  /**
   * Clears the contact for this transaction
   * @method
   * @name Transaction#clearContact
   * @param skipRead skip parsing the returned json response into the transaction
   * @returns {promise}
   */
  Transaction.prototype.clearContact = function (skipRead) {
    var that = this;
    this.contact = DEFAULTS.contact;
    return this._doApiCall({
      method: 'clearCustomer',
      skipRead: skipRead
    }).then(function () {
      return that._ensureTransactionDeleted();
    });
  };
  /**
   * Sets transaction name
   * @method
   * @name Transaction#setName
   * @param name
   * @param skipRead skip parsing the returned json response into the transaction
   * @returns {promise}
   */
  Transaction.prototype.setName = function (name, skipRead) {
    return this._doApiCall({
      method: 'setName',
      params: { name: name },
      skipRead: skipRead
    });
  };
  /**
   * Clears transaction name
   * @method
   * @name Transaction#clearName
   * @param skipRead skip parsing the returned json response into the transaction
   * @returns {promise}
   */
  Transaction.prototype.clearName = function (skipRead) {
    return this._doApiCall({
      method: 'clearName',
      skipRead: skipRead
    });
  };
  // Business logic
  // ----
  // Inheriting classes will use the setter functions below to update the object in memory
  // the _handleTransaction will create, update or delete the actual document via the API
  /**
   * addItems; adds a bunch of Items to the transaction using a list of item ids
   * It creates the transaction if it doesn't exist yet
   * @name Transaction#addItems
   * @method
   * @param items
   * @param skipRead
   * @returns {promise}
   */
  Transaction.prototype.addItems = function (items, skipRead) {
    var that = this;
    return this._ensureTransactionExists(skipRead).then(function () {
      return that._doApiCall({
        method: 'addItems',
        params: { items: items },
        skipRead: skipRead
      });
    });
  };
  /**
   * removeItems; removes a bunch of Items from the transaction using a list of item ids
   * It deletes the transaction if it's empty afterwards and autoCleanup is true
   * @name Transaction#removeItems
   * @method
   * @param items
   * @param skipRead
   * @returns {promise}
   */
  Transaction.prototype.removeItems = function (items, skipRead) {
    if (!this.existsInDb()) {
      return $.Deferred().reject(new Error('Cannot removeItems from document without id'));
    }
    var that = this;
    return this._doApiCall({
      method: 'removeItems',
      params: { items: items },
      skipRead: skipRead
    }).then(function (data) {
      return that._ensureTransactionDeleted().then(function () {
        return skipRead == true ? data : that._fromJson(data);
      });
    });
  };
  /**
   * clearItems; removes all Items from the transaction
   * It deletes the transaction if it's empty afterwards and autoCleanup is true
   * @name Transaction#clearItems
   * @method
   * @param skipRead
   * @returns {promise}
   */
  Transaction.prototype.clearItems = function (skipRead) {
    if (!this.existsInDb()) {
      return $.Deferred().reject(new Error('Cannot clearItems from document without id'));
    }
    var that = this;
    return this._doApiCall({
      method: 'clearItems',
      skipRead: skipRead
    }).then(function (data) {
      return that._ensureTransactionDeleted().then(function () {
        return skipRead == true ? data : that._fromJson(data);
      });
    });
  };
  /**
   * swapItem; swaps one item for another in a transaction
   * @name Transaction#swapItem
   * @method
   * @param fromItem
   * @param toItem
   * @param skipRead
   * @returns {promise}
   */
  Transaction.prototype.swapItem = function (fromItem, toItem, skipRead) {
    if (!this.existsInDb()) {
      return $.Deferred().reject(new Error('Cannot swapItem from document without id'));
    }
    // swapItem cannot create or delete a transaction
    return this._doApiCall({
      method: 'swapItem',
      params: {
        fromItem: fromItem,
        toItem: toItem
      },
      skipRead: skipRead
    });
  };
  /**
   * hasItems; Gets a list of items that are already part of the transaction
   * @name Transaction#hasItems
   * @method
   * @param itemIds        array of string values
   * @returns {Array}
   */
  Transaction.prototype.hasItems = function (itemIds) {
    var allItems = this.items || [];
    var duplicates = [];
    var found = null;
    $.each(itemIds, function (i, itemId) {
      $.each(allItems, function (i, it) {
        if (it._id == itemId) {
          found = itemId;
          return false;
        }
      });
      if (found != null) {
        duplicates.push(found);
      }
    });
    return duplicates;
  };
  /**
   * Archive a transaction
   * @name Transaction#archive
   * @param skipRead
   * @returns {promise}
   */
  Transaction.prototype.archive = function (skipRead) {
    if (!this.canArchive()) {
      return $.Deferred().reject(new Error('Cannot archive document'));
    }
    return this._doApiCall({
      method: 'archive',
      params: {},
      skipRead: skipRead
    });
  };
  /**
   * Undo archive of a transaction
   * @name Transaction#undoArchive
   * @param skipRead
   * @returns {promise}
   */
  Transaction.prototype.undoArchive = function (skipRead) {
    if (!this.canUndoArchive()) {
      return $.Deferred().reject(new Error('Cannot unarchive document'));
    }
    return this._doApiCall({
      method: 'undoArchive',
      params: {},
      skipRead: skipRead
    });
  };
  /**
   * Checks if we can archive a transaction (based on status)
   * @name Transaction#canArchive
   * @returns {boolean}
   */
  Transaction.prototype.canArchive = function () {
    return this.archived == null && (this.status == 'cancelled' || this.status == 'closed');
  };
  /**
   * Checks if we can unarchive a transaction (based on status)
   * @name Transaction#canUndoArchive
   * @returns {boolean}
   */
  Transaction.prototype.canUndoArchive = function () {
    return this.archived != null && (this.status == 'cancelled' || this.status == 'closed');
  };
  Transaction.prototype.setField = function (field, value, skipRead) {
    var that = this;
    return this._ensureTransactionExists(skipRead).then(function () {
      return that._doApiCall({
        method: 'setField',
        params: {
          field: field,
          value: value
        },
        skipRead: skipRead
      });
    });
  };
  //
  // Implementation stuff
  //
  /**
   * Gets a list of Conflict objects for this transaction
   * Will be overriden by inheriting classes
   * @returns {promise}
   * @private
   */
  Transaction.prototype._getConflicts = function () {
    return $.Deferred().resolve([]);
  };
  Transaction.prototype._getDateHelper = function () {
    return this.dateHelper;
  };
  /**
   * Searches for Items that are available for this transaction
   * @param params: a dict with params, just like items/search
   * @param listName: restrict search to a certain list
   * @param useAvailabilities (uses items/searchAvailable instead of items/search)
   * @param onlyUnbooked (true by default, only used when useAvailabilities=true)
   * @param skipItems array of item ids that should be skipped
   * @private
   * @returns {*}
   */
  Transaction.prototype._searchItems = function (params, listName, useAvailabilities, onlyUnbooked, skipItems) {
    if (this.dsItems == null) {
      return $.Deferred().reject(new api.ApiBadRequest(this.crtype + ' has no DataSource for items'));
    }
    // Restrict the search to just the Items that are:
    // - at this location
    // - in the specified list (if any)
    params = params || {};
    params.location = this._getId(this.location);
    if (listName != null && listName.length > 0) {
      params.listName = listName;
    }
    // Make sure we only pass the item ids,
    // and not the entire items
    var that = this;
    var skipList = null;
    if (skipItems && skipItems.length) {
      skipList = skipItems.slice(0);
      $.each(skipList, function (i, item) {
        skipList[i] = that._getId(item);
      });
    }
    if (useAvailabilities == true) {
      // We'll use a more advanced API call /items/searchAvailable
      // It's a bit slower and the .count result is not usable
      // It requires some more parameters to be set
      params.onlyUnbooked = onlyUnbooked != null ? onlyUnbooked : true;
      params.fromDate = this.from;
      params.toDate = this.to;
      params._limit = params._limit || 20;
      params._skip = params._skip || 0;
      if (skipList && skipList.length) {
        params.skipItems = skipList;
      }
      return this.dsItems.call(null, 'searchAvailable', params);
    } else {
      // We don't need to use availabilities,
      // we should better use the regular /search
      // it's faster and has better paging :)
      if (skipList && skipList.length) {
        params.pk__nin = skipList;
      }
      return this.dsItems.search(params);
    }
  };
  /**
   * Returns a rejected promise when a date is not between min and max date
   * Otherwise the deferred just resolves to the date
   * It's used to do some quick checks of transaction dates
   * @param date
   * @returns {*}
   * @private
   */
  Transaction.prototype._checkDateBetweenMinMax = function (date, minDate, maxDate) {
    minDate = minDate || this.getMinDate();
    maxDate = maxDate || this.getMaxDate();
    if (date < minDate || date > maxDate) {
      var msg = 'date ' + date.toJSONDate() + ' is outside of min max range ' + minDate.toJSONDate() + '->' + maxDate.toJSONDate();
      return $.Deferred().reject(new api.ApiUnprocessableEntity(msg));
    } else {
      return $.Deferred().resolve(date);
    }
  };
  /**
   * _handleTransaction: creates, updates or deletes a transaction document
   * @returns {*}
   * @private
   */
  Transaction.prototype._handleTransaction = function (skipRead) {
    var isEmpty = this.isEmpty();
    if (this.existsInDb()) {
      if (isEmpty) {
        if (this.autoCleanup) {
          return this._deleteTransaction();
        } else {
          return $.Deferred().resolve();
        }
      } else {
        return this._updateTransaction(skipRead);
      }
    } else if (!isEmpty) {
      return this._createTransaction(skipRead);
    } else {
      return $.Deferred().resolve();
    }
  };
  Transaction.prototype._deleteTransaction = function () {
    return this.delete();
  };
  Transaction.prototype._updateTransaction = function (skipRead) {
    return this.update(skipRead);
  };
  Transaction.prototype._createTransaction = function (skipRead) {
    return this.create(skipRead);
  };
  Transaction.prototype._ensureTransactionExists = function (skipRead) {
    return !this.existsInDb() ? this._createTransaction(skipRead) : $.Deferred().resolve();
  };
  Transaction.prototype._ensureTransactionDeleted = function () {
    return this.isEmpty() && this.autoCleanup ? this._deleteTransaction() : $.Deferred().resolve();
  };
  return Transaction;
}(jquery, api, base, location, dateHelper, helper);
User = function ($, Base, common) {
  var DEFAULTS = {
    name: '',
    email: '',
    group: '',
    // groupid
    picture: '',
    role: 'user',
    // user, admin
    active: true,
    isOwner: false,
    archived: null
  };
  // Allow overriding the ctor during inheritance
  // http://stackoverflow.com/questions/4152931/javascript-inheritance-call-super-constructor-or-use-prototype-chain
  var tmp = function () {
  };
  tmp.prototype = Base.prototype;
  /**
   * @name User
   * @class User
   * @constructor
   * @extends Base
   * @property {string}  name               - The name
   * @property {string}  role               - The role (admin, user)
   * @property {boolean} active             - Is the user active?
   */
  var User = function (opt) {
    var spec = $.extend({
      _fields: [
        '*',
        'group',
        'picture'
      ]
    }, opt);
    Base.call(this, spec);
    this.helper = spec.helper;
    this.name = spec.name || DEFAULTS.name;
    this.picture = spec.picture || DEFAULTS.picture;
    this.email = spec.email || DEFAULTS.email;
    this.role = spec.role || DEFAULTS.role;
    this.group = spec.group || DEFAULTS.group;
    this.active = spec.active != null ? spec.active : DEFAULTS.active;
    this.isOwner = spec.isOwner != null ? spec.isOwner : DEFAULTS.isOwner;
    this.archived = spec.archived || DEFAULTS.archived;
    this.dsAnonymous = spec.dsAnonymous;
  };
  User.prototype = new tmp();
  User.prototype.constructor = User;
  //
  // Document overrides
  //
  User.prototype.isValidName = function () {
    this.name = $.trim(this.name);
    return this.name.length >= 4;
  };
  User.prototype.isValidEmail = function () {
    this.email = $.trim(this.email);
    return common.isValidEmail(this.email);
  };
  User.prototype.isValidRole = function () {
    switch (this.role) {
    case 'user':
    case 'admin':
    case 'root':
    case 'selfservice':
      return true;
    default:
      return false;
    }
  };
  User.prototype.emailExists = function () {
    if (this.isValidEmail()) {
      // Don't check for emailExists for exisiting user
      if (this.id != null && this.email == this.raw.email) {
        return $.Deferred().resolve(false);
      }
      return this.dsAnonymous.call('emailExists', { email: this.email }).then(function (resp) {
        return resp.result;
      });
    } else {
      return $.Deferred().resolve(false);
    }
  };
  User.prototype.isValidPassword = function () {
    this.password = $.trim(this.password);
    return common.isValidPassword(this.password);
  };
  /**
   * Checks if the user is valid
   * @returns {boolean}
   */
  User.prototype.isValid = function () {
    return this.isValidName() && this.isValidEmail() && this.isValidRole();
  };
  /**
   * Checks if the user is empty
   * @method
   * @name User#isEmpty
   * @returns {boolean}
   */
  User.prototype.isEmpty = function () {
    // We check: name, role
    return Base.prototype.isEmpty.call(this) && this.name == DEFAULTS.name && this.email == DEFAULTS.email && this.role == DEFAULTS.role;
  };
  /**
   * Checks if the user is dirty and needs saving
   * @method
   * @name User#isDirty
   * @returns {boolean}
   */
  User.prototype.isDirty = function () {
    var isDirty = Base.prototype.isDirty.call(this);
    if (!isDirty && this.raw) {
      var name = this.raw.name || DEFAULTS.name;
      var role = this.raw.role || DEFAULTS.role;
      var email = this.raw.email || DEFAULTS.email;
      var active = this.raw.active != null ? this.raw.active : DEFAULTS.active;
      return this.name != name || this.email != email || this.role != role || this.active != active;
    }
    return isDirty;
  };
  /**
   * Gets a url for a user avatar
   * 'XS': (64, 64),
   * 'S': (128, 128),
   * 'M': (256, 256),
   * 'L': (512, 512)
   * @param size {string} default null is original size
   * @param bustCache {boolean}
   * @returns {string}
   */
  User.prototype.getImageUrl = function (size, bustCache) {
    return this.picture != null && this.picture.length > 0 ? this.helper.getImageCDNUrl(this.group, this.picture, size, bustCache) : this.helper.getImageUrl(this.ds, this.id, size, bustCache);
  };
  User.prototype._getDefaults = function () {
    return DEFAULTS;
  };
  // OVERRIDE BASE: addKeyValue not implemented
  User.prototype.addKeyValue = function (key, value, kind, skipRead) {
    return $.Deferred().reject('Not implemented for User, use setPicture instead?');
  };
  // OVERRIDE BASE: addKeyValue not implemented
  User.prototype.addKeyValue = function (id, key, value, kind, skipRead) {
    return $.Deferred().reject('Not implemented for User, use setPicture instead?');
  };
  // OVERRIDE BASE: removeKeyValue not implemented
  User.prototype.removeKeyValue = function (id, skipRead) {
    return $.Deferred().reject('Not implemented for User, use clearPicture instead?');
  };
  User.prototype.setPicture = function (attachmentId, skipRead) {
    if (!this.existsInDb()) {
      return $.Deferred().reject('User does not exist in database');
    }
    this.picture = attachmentId;
    return this._doApiCall({
      method: 'setPicture',
      params: { attachment: attachmentId },
      skipRead: skipRead
    });
  };
  User.prototype.clearPicture = function (skipRead) {
    if (!this.existsInDb()) {
      return $.Deferred().reject('User does not exist in database');
    }
    return this._doApiCall({
      method: 'clearPicture',
      skipRead: skipRead
    });
  };
  //
  // Business logic
  //
  /**
   * Checks if a user can be activated
   * @returns {boolean}
   */
  User.prototype.canActivate = function () {
    return !this.active && this.archived == null;
  };
  /**
   * Checks if a user can be deactivated
   * @returns {boolean}
   */
  User.prototype.canDeactivate = function () {
    return this.active && this.archived == null && !this.isOwner;
  };
  /**
   * Checks if a user can be archived
   * @returns {boolean}
   */
  User.prototype.canArchive = function () {
    return this.archived == null && !this.isOwner;
  };
  /**
   * Checks if a user can be unarchived
   * @returns {boolean}
   */
  User.prototype.canUndoArchive = function () {
    return this.archived != null;
  };
  /**
   * Checks if a user can be owner
   * @returns {boolean}
   */
  User.prototype.canBeOwner = function () {
    return this.archived == null && this.active && !this.isOwner && this.role == 'admin';
  };
  /**
   * Activates a user
   * @param skipRead
   * @returns {promise}
   */
  User.prototype.activate = function (skipRead) {
    if (!this.existsInDb()) {
      return $.Deferred().reject('User does not exist in database');
    }
    return this._doApiCall({
      method: 'activate',
      skipRead: skipRead
    });
  };
  /**
   * Deactivates a user
   * @param skipRead
   * @returns {promise}
   */
  User.prototype.deactivate = function (skipRead) {
    if (!this.existsInDb()) {
      return $.Deferred().reject('User does not exist in database');
    }
    return this._doApiCall({
      method: 'deactivate',
      skipRead: skipRead
    });
  };
  /**
   * Archives a user
   * @param skipRead
   * @returns {promise}
   */
  User.prototype.archive = function (skipRead) {
    if (!this.existsInDb()) {
      return $.Deferred().reject('User does not exist in database');
    }
    return this._doApiCall({
      method: 'archive',
      skipRead: skipRead
    });
  };
  /**
   * Unarchives a user
   * @param skipRead
   * @returns {promise}
   */
  User.prototype.undoArchive = function (skipRead) {
    if (!this.existsInDb()) {
      return $.Deferred().reject('User does not exist in database');
    }
    return this._doApiCall({
      method: 'undoArchive',
      skipRead: skipRead
    });
  };
  /**
   * Writes the user to a json object
   * @param options
   * @returns {object}
   * @private
   */
  User.prototype._toJson = function (options) {
    var data = Base.prototype._toJson.call(this, options);
    data.name = this.name || DEFAULTS.name;
    data.email = this.email || DEFAULTS.email;
    data.group = this.group || DEFAULTS.group;
    data.role = this.role || DEFAULTS.role;
    return data;
  };
  /**
   * Reads the user from the json object
   * @param data
   * @param options
   * @returns {promise}
   * @private
   */
  User.prototype._fromJson = function (data, options) {
    var that = this;
    return Base.prototype._fromJson.call(this, data, options).then(function () {
      // Read the group id from group or group._id
      // depending on the fields
      that.group = data.group && data.group._id != null ? data.group._id : data.group || DEFAULTS.group;
      that.name = data.name || DEFAULTS.name;
      that.picture = data.picture || DEFAULTS.picture;
      that.email = data.email || DEFAULTS.email;
      that.role = data.role || DEFAULTS.role;
      that.active = data.active != null ? data.active : DEFAULTS.active;
      that.isOwner = data.isOwner != null ? data.isOwner : DEFAULTS.isOwner;
      that.archived = data.archived || DEFAULTS.archived;
      $.publish('user.fromJson', data);
      return data;
    });
  };
  return User;
}(jquery, base, common);
UserSync = function ($, Base, common) {
  var DEFAULTS = {
    kind: 'ldap',
    name: '',
    enabled: false,
    host: 'ldap://yourdomain.com',
    port: 389,
    timeOut: 10,
    login: '',
    password: '',
    newUsers: 'ignore',
    existingUsers: 'ignore',
    missingUsers: 'ignore',
    autoSync: false,
    role: 'selfservice',
    query: '(cn=*)',
    base: 'ou=team,dc=yourdomain,dc=com',
    loginField: 'uid',
    nameField: 'cn',
    emailField: 'mail'
  };
  // Allow overriding the ctor during inheritance
  // http://stackoverflow.com/questions/4152931/javascript-inheritance-call-super-constructor-or-use-prototype-chain
  var tmp = function () {
  };
  tmp.prototype = Base.prototype;
  /**
   * @name UserSync
   * @class UserSync
   * @constructor
   * @extends Base
   * @property {string} kind                  - The kind
   * @property {string} name                  - The name
   * @property {boolean} enabled              - Is the usersync active?
   * @property {string} host                  - The url of the host
   * @property {int} port                     - The port number
   * @property {int} timeOut                  - The timeOut in seconds
   * @property {string} login                 - The login for the host
   * @property {string} password              - The password for the host
   * @property {string} newUsers              - What to with new Users (ignore, create)
   * @property {string} existingUsers         - What to with existing Users (ignore, update)
   * @property {string} missingUsers          - What to with missing Users (ignore, archive, deactivate)
   * @property {boolean} autoSync             - Do a nightly sync automatically?
   * @property {string} role                  - Sync users under which role? (selfservice, user, admin)
   * @property {string} query                 - The query
   * @property {string} base                  - The base
   * @property {string} loginField            - The loginField
   * @property {string} nameField             - The nameField
   * @property {string} emailField            - The emailField
   */
  var UserSync = function (opt) {
    var spec = $.extend({ _fields: ['*'] }, opt);
    Base.call(this, spec);
    this.helper = spec.helper;
    this.kind = spec.kind || DEFAULTS.kind;
    this.name = spec.name || DEFAULTS.name;
    this.enabled = spec.enabled != null ? spec.enabled : DEFAULTS.enabled;
    this.host = spec.host || DEFAULTS.host;
    this.port = spec.port || DEFAULTS.port;
    this.timeOut = spec.timeOut || DEFAULTS.timeOut;
    this.login = spec.login || DEFAULTS.login;
    this.password = spec.password || DEFAULTS.password;
    this.newUsers = spec.newUsers || DEFAULTS.newUsers;
    this.existingUsers = spec.existingUsers || DEFAULTS.existingUsers;
    this.missingUsers = spec.missingUsers || DEFAULTS.missingUsers;
    this.autoSync = spec.autoSync != null ? spec.autoSync : DEFAULTS.autoSync;
    this.role = spec.role || DEFAULTS.role;
    this.query = spec.query || DEFAULTS.query;
    this.base = spec.base || DEFAULTS.base;
    this.loginField = spec.loginField || DEFAULTS.loginField;
    this.nameField = spec.nameField || DEFAULTS.nameField;
    this.emailField = spec.emailField || DEFAULTS.emailField;
  };
  UserSync.prototype = new tmp();
  UserSync.prototype.constructor = UserSync;
  //
  // Document overrides
  //
  UserSync.prototype.isValidName = function () {
    this.name = $.trim(this.name);
    return this.name.length >= 3;
  };
  UserSync.prototype.isValidRole = function () {
    switch (this.role) {
    case 'user':
    case 'admin':
    case 'selfservice':
      return true;
    default:
      return false;
    }
  };
  /**
   * Checks if the usersync is valid
   * @method
   * @name UserSync#isValid
   * @returns {boolean}
   */
  UserSync.prototype.isValid = function () {
    return this.isValidName() && this.isValidRole();
  };
  /**
   * Checks if the user is empty
   * @method
   * @name UserSync#isEmpty
   * @returns {boolean}
   */
  UserSync.prototype.isEmpty = function () {
    return Base.prototype.isEmpty.call(this) && this.kind == DEFAULTS.kind && this.name == DEFAULTS.name && this.enabled == DEFAULTS.enabled && this.host == DEFAULTS.host && this.port == DEFAULTS.port && this.timeOut == DEFAULTS.timeOut && this.login == DEFAULTS.login && this.password == DEFAULTS.password && this.newUsers == DEFAULTS.newUsers && this.existsingUsers == DEFAULTS.existingUsers && this.missingUsers == DEFAULTS.missingUsers && this.autoSync == DEFAULTS.autoSync && this.role == DEFAULTS.role && this.query == DEFAULTS.query && this.base == DEFAULTS.base && this.loginField == DEFAULTS.loginField && this.nameField == DEFAULTS.nameField && this.emailField == DEFAULTS.emailField;
  };
  /**
   * Checks if the user is dirty and needs saving
   * @method
   * @name UserSync#isDirty
   * @returns {boolean}
   */
  UserSync.prototype.isDirty = function () {
    var isDirty = Base.prototype.isDirty.call(this);
    if (!isDirty && this.raw) {
      var kind = this.raw.kind || DEFAULTS.kind;
      var name = this.raw.name || DEFAULTS.name;
      var enabled = this.raw.enabled != null ? this.raw.enabled : DEFAULTS.enabled;
      var host = this.raw.host || DEFAULTS.host;
      var port = this.raw.port || DEFAULTS.port;
      var timeOut = this.raw.timeOut || DEFAULTS.timeOut;
      var login = this.raw.login || DEFAULTS.login;
      var password = this.raw.password || DEFAULTS.password;
      var newUsers = this.raw.newUsers || DEFAULTS.newUsers;
      var existingUsers = this.raw.existingUsers || DEFAULTS.existingUsers;
      var missingUsers = this.raw.missingUsers || DEFAULTS.missingUsers;
      var autoSync = this.raw.autoSync != null ? this.raw.autoSync : DEFAULTS.autoSync;
      var role = this.raw.role || DEFAULTS.role;
      var query = this.raw.query || DEFAULTS.query;
      var base = this.raw.base || DEFAULTS.base;
      var loginField = this.raw.loginField || DEFAULTS.loginField;
      var nameField = this.raw.nameField || DEFAULTS.nameField;
      var emailField = this.raw.emailField || DEFAULTS.emailField;
      return this.kind != kind || this.name != name || this.enabled != enabled || this.host != host || this.port != port || this.timeOut != timeOut || this.login != login || this.password != password || this.newUsers != newUsers || this.existingUsers != existingUsers || this.missingUsers != missingUsers || this.autoSync != autoSync || this.role != role || this.query != query || this.base != base || this.loginField != loginField || this.nameField != nameField || this.emailField != emailField;
    }
    return isDirty;
  };
  UserSync.prototype._getDefaults = function () {
    return DEFAULTS;
  };
  //
  // Business logic
  //
  /**
   * Clones the template to a new one
   * @name UserSync#clone
   * @returns {promise}
   */
  UserSync.prototype.clone = function () {
    return this.ds.call(this.id, 'clone');
  };
  /**
   * Tests the specified connection
   * @name UserSync#testConnection
   * @returns {promise}
   */
  UserSync.prototype.testConnection = function () {
    return this.ds.call(this.id, 'testConnection');
  };
  /**
   * Tests the specified sync
   * @name UserSync#syncUsers
   * @param wetRun
   * @returns {promise}
   */
  UserSync.prototype.syncUsers = function (wetRun) {
    return this.ds.call(this.id, 'syncUsers', { wetRun: wetRun });
  };
  /**
   * Writes the usersync to a json object
   * @param options
   * @returns {object}
   * @private
   */
  UserSync.prototype._toJson = function (options) {
    var data = Base.prototype._toJson.call(this, options);
    data.kind = this.kind || DEFAULTS.kind;
    data.name = this.name || DEFAULTS.name;
    data.enabled = this.enabled != null ? this.enabled : DEFAULTS.enabled;
    data.host = this.host || DEFAULTS.host;
    data.port = this.port || DEFAULTS.port;
    data.timeOut = this.timeOut || DEFAULTS.timeOut;
    data.login = this.login || DEFAULTS.login;
    data.password = this.password || DEFAULTS.password;
    data.newUsers = this.newUsers || DEFAULTS.newUsers;
    data.existingUsers = this.existingUsers || DEFAULTS.existingUsers;
    data.missingUsers = this.missingUsers || DEFAULTS.missingUsers;
    data.autoSync = this.autoSync != null ? this.autoSync : DEFAULTS.autoSync;
    data.role = this.role || DEFAULTS.role;
    data.query = this.query || DEFAULTS.query;
    data.base = this.base || DEFAULTS.base;
    data.loginField = this.loginField || DEFAULTS.loginField;
    data.nameField = this.nameField || DEFAULTS.nameField;
    data.emailField = this.emailField || DEFAULTS.emailField;
    return data;
  };
  /**
   * Reads the usersync from the json object
   * @param data
   * @param options
   * @returns {promise}
   * @private
   */
  UserSync.prototype._fromJson = function (data, options) {
    var that = this;
    return Base.prototype._fromJson.call(this, data, options).then(function () {
      // Read the group id from group or group._id
      // depending on the fields
      that.kind = data.kind || DEFAULTS.kind;
      that.name = data.name || DEFAULTS.name;
      that.enabled = data.enabled != null ? data.enabled : DEFAULTS.enabled;
      that.host = data.host || DEFAULTS.host;
      that.port = data.port || DEFAULTS.port;
      that.timeOut = data.timeOut || DEFAULTS.timeOut;
      that.login = data.login || DEFAULTS.login;
      that.password = data.password || DEFAULTS.password;
      that.newUsers = data.newUsers || DEFAULTS.newUsers;
      that.existingUsers = data.existingUsers || DEFAULTS.existingUsers;
      that.missingUsers = data.missingUsers || DEFAULTS.missingUsers;
      that.autoSync = data.autoSync != null ? data.autoSync : DEFAULTS.autoSync;
      that.role = data.role || DEFAULTS.role;
      that.query = data.query || DEFAULTS.query;
      that.base = data.base || DEFAULTS.base;
      that.loginField = data.loginField || DEFAULTS.loginField;
      that.nameField = data.nameField || DEFAULTS.nameField;
      that.emailField = data.emailField || DEFAULTS.emailField;
      $.publish('usersync.fromJson', data);
      return data;
    });
  };
  return UserSync;
}(jquery, base, common);
WebHook = function ($, common, api, Document) {
  // Some constant values
  var DEFAULTS = {
    id: '',
    name: '',
    address: '',
    topic: '',
    hookFields: '*, location.*, items.*, customer.*',
    // avoid clash with Document.fields
    format: '',
    created: null,
    modified: null,
    enabled: true,
    log10: [],
    fails: 0
  };
  // Allow overriding the ctor during inheritance
  // http://stackoverflow.com/questions/4152931/javascript-inheritance-call-super-constructor-or-use-prototype-chain
  var tmp = function () {
  };
  tmp.prototype = Document.prototype;
  /**
   * WebHook describes a webhook which can trigger on certain events (signals)
   * @name  WebHook
   * @class
   * @property {string} name          the name
   * @property {string} address       the url which will be called
   * @property {string} topic         the topic name ('item.changelocation', 'item.changegeo', 'item.expire', ...)
   * @property {string} hookFields    the fields which should be fetched from the db (default: `*, location.*, items.*, customer.*)
   * @property {string} format        the output format (only `json` is supported)
   * @property {Moment} created       the creation date of the webhook
   * @property {Moment} modified      the modified date of the webhook
   * @property {boolean} enabled      whether or not the webhook is enabled
   * @property {array} log10          the last 10 logs of the webhook
   * @property {int} fails            the number of consequtive fails
   * @constructor
   * @extends Document
   */
  var WebHook = function (opt) {
    var spec = $.extend({}, opt);
    Document.call(this, spec);
    this.name = spec.name || DEFAULTS.name;
    this.address = spec.address || DEFAULTS.address;
    this.topic = spec.topic || DEFAULTS.topic;
    this.hookFields = spec.hookFields || DEFAULTS.hookFields;
    this.created = spec.created || DEFAULTS.created;
    this.modified = spec.modified || DEFAULTS.modified;
    this.enabled = spec.enabled != null ? spec.enabled == true : DEFAULTS.enabled;
    this.log10 = spec.log10 || DEFAULTS.log10.slice();
    this.fails = spec.fails || DEFAULTS.fails;
  };
  WebHook.prototype = new tmp();
  WebHook.prototype.constructor = WebHook;
  //
  // Specific validators
  /**
   * Checks if name is valid
   * @name WebHook#isValidName
   * @method
   * @return {Boolean}
   */
  WebHook.prototype.isValidName = function () {
    this.name = $.trim(this.name);
    return this.name.length >= 3;
  };
  /**
   * Checks if address is valid
   * @name  WebHook#isValidAddress
   * @method
   * @return {Boolean}
   */
  WebHook.prototype.isValidAddress = function () {
    this.address = $.trim(this.address);
    return common.isValidURL(this.address);
  };
  //
  // Document overrides
  //
  /**
   * Checks if the webhook has any validation errors
   * @name WebHook#isValid
   * @method
   * @returns {boolean}
   * @override
   */
  WebHook.prototype.isValid = function () {
    return this.isValidName() && this.isValidAddress() && this.topic;  // TODO: We need a better check here
  };
  WebHook.prototype._getDefaults = function () {
    return DEFAULTS;
  };
  /**
   * Checks if the object is empty, it never is
   * @name  WebHook#isEmpty
   * @method
   * @returns {boolean}
   * @override
   */
  WebHook.prototype.isEmpty = function () {
    return Document.prototype.isEmpty.call(this) && this.name == DEFAULTS.name && this.address == DEFAULTS.address && this.topic == DEFAULTS.topic;
  };
  /**
   * Checks if the webhook is dirty and needs saving
   * @returns {boolean}
   * @override
   */
  WebHook.prototype.isDirty = function () {
    var isDirty = Document.prototype.isDirty.call(this);
    if (!isDirty && this.raw) {
      isDirty = this.name != this.raw.name || this.address != this.raw.address || this.topic != this.raw.topic || this.enabled != this.raw.enabled;
    }
    return isDirty;
  };
  /**
   * Checks via the api if we can delete the WebHook document
   * @name  WebHook#canDelete
   * @method
   * @returns {promise}
   * @override
   */
  WebHook.prototype.canDelete = function () {
    // An WebHook can always be deleted
    return $.Deferred().resolve(true);
  };
  // toJson, fromJson
  // ----
  /**
   * _toJson, makes a dict of params to use during create / update
   * @param options
   * @returns {{}}
   * @private
   */
  WebHook.prototype._toJson = function (options) {
    var data = Document.prototype._toJson.call(this, options);
    data.name = this.name;
    data.address = this.address;
    data.topic = this.topic;
    data.fields = this.hookFields;
    data.modified = this.modified;
    data.enabled = this.enabled;
    // don't write out fields for:
    // - created_at
    // - log10, log
    // - nr_consecutive_fails
    return data;
  };
  /**
   * _fromJson: read some basic information
   * @method
   * @param {object} data the json response
   * @param {object} options dict
   * @returns {Promise}
   * @private
   */
  WebHook.prototype._fromJson = function (data, options) {
    var that = this;
    return Document.prototype._fromJson.call(this, data, options).then(function () {
      that.name = data.name || DEFAULTS.name;
      that.address = data.address || DEFAULTS.address;
      that.topic = data.topic || DEFAULTS.topic;
      that.hookFields = data.fields || DEFAULTS.hookFields;
      // !
      that.created = data.created_at || DEFAULTS.created;
      // !
      that.modified = data.modified || DEFAULTS.modified;
      that.enabled = data.enabled != null ? data.enabled == true : DEFAULTS.enabled;
      that.log10 = data.log10 || DEFAULTS.log10.slice();
      that.fails = data.nr_consecutive_fails || DEFAULTS.fails;
      return data;
    });
  };
  return WebHook;
}(jquery, common, api, document);
OrderTransfer = function ($, Base) {
  var DEFAULTS = {
    by: null,
    created: null,
    modified: null,
    status: 'creating',
    items: [],
    started: null,
    accepted: null,
    fromOrder: null,
    toOrder: null,
    startedBy: null
  };
  // Allow overriding the ctor during inheritance
  // http://stackoverflow.com/questions/4152931/javascript-inheritance-call-super-constructor-or-use-prototype-chain
  var tmp = function () {
  };
  tmp.prototype = Base.prototype;
  /**
   * OrderTransfer
   * @name OrderTransfer
   * @class OrderTransfer
   * @constructor
   * @property {string} id            short UUID
   * @property {cr.User} by           who created this doc
   * @property {Date} created         when was this doc created
   * @property {Date} modified        when was this doc last modified
   * @property {string} status        creating, open, closed
   * @property {Array} items          list of items
   * @property {Date} started         when was the transfer started
   * @property {Date} accepted        when was the transfer accepted
   * @property {Date} fromOrder       from order
   * @property {Date} toOrder         to order    
   * @property {cr.User} startedBy    who started the transfer    
   * @extends Base
   */
  var OrderTransfer = function (opt) {
    var spec = $.extend({
      _fields: ['*'],
      crtype: 'cheqroom.types.reservation.ordertransfer'
    }, opt);
    Base.call(this, spec);
    this.by = spec.by || DEFAULTS.by;
    this.created = spec.created || DEFAULTS.created;
    this.modified = spec.modified || DEFAULTS.modified;
    this.status = spec.status || DEFAULTS.status;
    this.items = spec.items || DEFAULTS.items;
    this.started = spec.started || DEFAULTS.started;
    this.accepted = spec.accepted || DEFAULTS.accepted;
    this.fromOrder = spec.fromOrder || DEFAULTS.fromOrder;
    this.toOrder = spec.toOrder || DEFAULTS.toOrder;
    this.startedBy = spec.startedBy || DEFAULTS.startedBy;
  };
  OrderTransfer.prototype = new tmp();
  OrderTransfer.prototype.constructor = OrderTransfer;
  // Base overrides
  // ----
  /**
   * Checks if the order transfer is empty
   * @name OrderTransfer#isEmpty
   * @returns {boolean}
   */
  OrderTransfer.prototype.isEmpty = function () {
    return false;
  };
  OrderTransfer.prototype._toJson = function (options) {
    // Writes out; id, items
    var data = Base.prototype._toJson.call(this, options);
    data.items = this.items || DEFAULTS.items;
    return data;
  };
  OrderTransfer.prototype._fromJson = function (data, options) {
    var that = this;
    return Base.prototype._fromJson.call(this, data, options).then(function () {
      that.by = data.by || DEFAULTS.by;
      that.created = data.created || DEFAULTS.created;
      that.modified = data.modified || DEFAULTS.modified;
      that.items = data.items || DEFAULTS.items;
      that.status = data.status || DEFAULTS.status;
      that.started = data.started || DEFAULTS.started;
      that.accepted = data.accepted || DEFAULTS.accepted;
      that.fromOrder = data.fromOrder || DEFAULTS.fromOrder;
      that.toOrder = data.toOrder || DEFAULTS.toOrder;
      that.startedBy = data.startedBy || DEFAULTS.startedBy;
      return data;
    });
  };
  // Business logic
  // ----
  /**
   * addItems adds items to transfer from an order (must be items of the same order)
   *
   * @name OrderTransfer#addItems
   * @returns {promise}
   */
  OrderTransfer.prototype.addItems = function (items, skipRead) {
    return this._doApiCall({
      method: 'addItems',
      params: { items: items },
      skipRead: skipRead
    });
  };
  /**
   * removeItems removes items from transfer
   * 
   * @name OrderTransfer#removeItems
   * @returns {promise}
   */
  OrderTransfer.prototype.removeItems = function (items, skipRead) {
    return this._doApiCall({
      method: 'removeItems',
      params: { items: items },
      skipRead: skipRead
    });
  };
  /**
   * start puts the transfer in status "open"
   * 
   * @name OrderTransfer#start
   * @return {promise}
   */
  OrderTransfer.prototype.start = function (skipRead) {
    return this._doApiCall({
      method: 'start',
      params: {},
      skipRead: skipRead
    });
  };
  /**
   * undoStart puts the transfer in status "creating" again
   * 
   * @name OrderTransfer#undoStart
   * @return {promise}
   */
  OrderTransfer.prototype.undoStart = function (skipRead) {
    return this._doApiCall({
      method: 'undoStart',
      params: {},
      skipRead: skipRead
    });
  };
  /**
   * accept transfers the items to another customer
   * 
   * @name OrderTransfer#accept
   * @return {promise}
   */
  OrderTransfer.prototype.accept = function (params, skipRead) {
    return this._doApiCall({
      method: 'accept',
      params: params,
      skipRead: skipRead
    });
  };
  /**
   * getQRUrl returns path to transfer qr code
   * 
   * @name OrderTransfer#qr
   * @return {string}
   */
  OrderTransfer.prototype.getQRUrl = function (size) {
    return this.ds._baseUrl + '/' + this.id + '/call/qr?size=' + (size || 300);
  };
  return OrderTransfer;
}(jquery, base);
core = function (api, Availability, Attachment, Base, Category, Comment, Conflict, Contact, DateHelper, Document, Group, Item, Kit, Location, Order, Helper, PermissionHandler, Reservation, Template, Transaction, User, UserSync, WebHook, common, OrderTransfer) {
  var core = {};
  // namespaces
  core.api = api;
  core.common = common;
  // Constructors
  core.Availability = Availability;
  core.Attachment = Attachment;
  core.Base = Base;
  core.Category = Category;
  core.Comment = Comment;
  core.Conflict = Conflict;
  core.Contact = Contact;
  core.DateHelper = DateHelper;
  core.Document = Document;
  core.Group = Group;
  core.Item = Item;
  core.Kit = Kit;
  core.Location = Location;
  core.Order = Order;
  core.PermissionHandler = PermissionHandler;
  core.Reservation = Reservation;
  core.Template = Template;
  core.Transaction = Transaction;
  core.User = User;
  core.UserSync = UserSync;
  core.WebHook = WebHook;
  core.OrderTransfer = OrderTransfer;
  core.Helper = Helper;
  return core;
}(api, Availability, Attachment, Base, Category, Comment, Conflict, Contact, DateHelper, Document, Group, Item, Kit, Location, Order, helper, PermissionHandler, Reservation, Template, Transaction, User, UserSync, WebHook, common, OrderTransfer);
return core;
}))