/**
 * Provides the classes needed to communicate with the CHECKROOM API
 * @module api
 * @namespace api
 * @copyright CHECKROOM NV 2015
 */
define([
    'jquery',
    'moment'], function ($, moment) {
    var MAX_QUERYSTRING_LENGTH = 2048;

    //TODO change this
    //system.log fallback
    var system = {
        log: function(){
            // do something
        }
    };

    // Disable caching AJAX requests in IE
    // http://stackoverflow.com/questions/5502002/jquery-ajax-producing-304-responses-when-it-shouldnt
    $.ajaxSetup({cache: false});

    var api = {};

    //*************
    // ApiErrors
    //*************
    // Network
    api.NetworkNotConnected = function (msg, opt) {       this.code = 999; this.message = msg || "Connection interrupted"; this.opt = opt; };
    api.NetworkNotConnected.prototype = new Error();
    api.NetworkTimeout = function (msg, opt) {            this.code = 408; this.message = msg || "Could not reach the server in time"; this.opt = opt; };
    api.NetworkTimeout.prototype = new Error();
    // Api
    api.ApiError = function (msg, opt) {                  this.code = 500; this.message = msg || "Something went wrong on the server"; this.opt = opt; };
    api.ApiError.prototype = new Error();
    api.ApiNotFound = function (msg, opt) {               this.code = 404; this.message = msg || "Could not find what you're looking for"; this.opt = opt; };
    api.ApiNotFound.prototype = new Error();
    api.ApiBadRequest = function (msg, opt) {             this.code = 400; this.message = msg || "The server did not understand your request"; this.opt = opt; };
    api.ApiBadRequest.prototype = new Error();
    api.ApiUnauthorized = function (msg, opt) {           this.code = 401; this.message = msg || "Your session has expired"; this.opt = opt; };
    api.ApiUnauthorized.prototype = new Error();
    api.ApiForbidden = function (msg, opt) {              this.code = 403; this.message = msg || "You don't have sufficient rights"; this.opt = opt; };
    api.ApiForbidden.prototype = new Error();
    api.ApiUnprocessableEntity = function (msg, opt) {    this.code = 422; this.message = msg || "Some data is invalid"; this.opt = opt; };
    api.ApiUnprocessableEntity.prototype = new Error();
    api.ApiSubscriptionLimit = function (msg, opt) {       this.code = 422; this.message = msg || "You have reached your subscription limit"; this.opt = opt; };
    api.ApiSubscriptionLimit.prototype = new Error();
    api.ApiPaymentRequired = function (msg, opt) {        this.code = 402; this.message = msg || "Your subscription has expired"; this.opt = opt; };
    api.ApiPaymentRequired.prototype = new Error();
    api.ApiServerCapicity = function(msg, opt){           this.code = 503; this.message = msg || "Back-end server is at capacity"; this.opt = opt; };
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
    api.ApiAjax = function(spec) {
        spec = spec || {};
        this.timeOut = spec.timeOut || 10000;
        this.responseInTz = true;
    };

    api.ApiAjax.prototype.get = function(url, timeOut) {
        system.log('ApiAjax: get '+url);
        return this._getAjax(url, timeOut);
    };

    api.ApiAjax.prototype.post = function(url, data, timeOut) {
        system.log('ApiAjax: post '+url);
        return this._postAjax(url, data, timeOut);
    };

    // Implementation
    // ----
    api.ApiAjax.prototype._handleAjaxSuccess = function(dfd, data, opt) {
        if (this.responseInTz) {
            data = this._fixDates(data);
        }
        return dfd.resolve(data);
    };

    api.ApiAjax.prototype._handleAjaxError = function(dfd, x, t, m, opt) {
        // ajax call was aborted
        if(t == "abort") return;

        var msg = "";
        if (m==="timeout") {
            dfd.reject(new api.NetworkTimeout(msg, opt));
        } else {
            if (x){
                if((x.statusText) &&
                    (x.statusText.indexOf("Notify user:") > -1)) {
                    msg = x.statusText.slice(x.statusText.indexOf("Notify user:") + 13);
                }

                if( (x.status == 422) &&
                    (x.responseText) &&
                    (x.responseText.match(/HTTPError: \(.+\)/g).length > 0)){
                    opt = {
                        detail: x.responseText.match(/HTTPError: \(.+\)/g)[0]
                    }
                }
            }

            switch(x.status) {
                case 400: dfd.reject(new api.ApiBadRequest(msg, opt)); break;
                case 401: dfd.reject(new api.ApiUnauthorized(msg, opt)); break;
                case 402: dfd.reject(new api.ApiPaymentRequired(msg, opt)); break;
                case 403: dfd.reject(new api.ApiForbidden(msg, opt)); break;
                case 404: dfd.reject(new api.ApiNotFound(msg, opt)); break;
                case 408: dfd.reject(new api.NetworkTimeout(msg, opt)); break;
                case 422:
                    // 422 Notify user: Cannot create item, max limit 50 items reached
                    if( (msg) &&
                        (msg.indexOf('limit') >= 0) &&
                        (msg.indexOf('reach') >= 0)) {
                        dfd.reject(new api.ApiSubscriptionLimit(msg, opt));
                    } else {
                        dfd.reject(new api.ApiUnprocessableEntity(msg, opt));
                    }
                    break;
                case 503: dfd.reject(new api.ApiServerCapicity(msg, opt)); break;
                case 500:
                default: dfd.reject(new api.ApiError(msg, opt)); break;
            }
        }
    };

    api.ApiAjax.prototype._postAjax = function(url, data, timeOut, opt) {
        var dfd = $.Deferred();
        var that = this;

        var xhr = $.ajax({
            type: "POST",
            url: url,
            data: JSON.stringify(this._prepareDict(data)),
            contentType: "application/json; charset=utf-8",
            timeout: timeOut || this.timeOut,
            success: function(data) {return that._handleAjaxSuccess(dfd, data, opt);},
            error: function(x, t, m) {return that._handleAjaxError(dfd, x, t, m, opt);}
        });

        // Extend promise with abort method
        // to abort xhr request if needed
        // http://stackoverflow.com/questions/21766428/chained-jquery-promises-with-abort
        var promise = dfd.promise();
        promise.abort = function(){
            xhr.abort();
        };

        return promise;
    };

    api.ApiAjax.prototype._getAjax = function(url, timeOut,  opt) {
        var dfd = $.Deferred();
        var that = this;

        var xhr = $.ajax({
            url: url,
            timeout: timeOut || this.timeOut,
            success: function(data) {return that._handleAjaxSuccess(dfd, data, opt);},
            error: function(x, t, m) {return that._handleAjaxError(dfd, x, t, m, opt);}
        });

        // Extend promise with abort method
        // to abort xhr request if needed
        // http://stackoverflow.com/questions/21766428/chained-jquery-promises-with-abort
        var promise = dfd.promise();
        promise.abort = function(){
            xhr.abort();
        };

        return promise;
    };

    api.ApiAjax.prototype._prepareDict = function(data) {
        // Makes sure all values from the dict are serializable and understandable for json
        if (!data) {
            return {};
        }

        $.each(data, function(key, value) {
            if(moment.isMoment(value)) {
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
    api.ApiAjax.prototype._fixDates = function(data){
        if (typeof data == 'string' || data instanceof String) {
            // "2014-04-03T12:15:00+00:00" (length 25)
            // "2014-04-03T09:32:43.841000+00:00" (length 32)
            if (data.endsWith('+00:00')) {
                var len = data.length;
                if (len==25) {
                    return moment(data.substring(0, len-6));
                } else if (len==32) {
                    return moment(data.substring(0, len-6).split('.')[0]);
                }
            }
        } else if (
            (data instanceof Object) ||
            ($.isArray(data))) {
            var that = this;
            $.each(data, function(k, v) {
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
    api.ApiUser = function(spec) {
        spec = spec || {};
        this.userId = spec.userId || '';
        this.userToken = spec.userToken || '';
        this.tokenType = spec.tokenType || '';
    };

    api.ApiUser.prototype.fromStorage = function() {
        this.userId = window.localStorage.getItem("userId") || '';
        this.userToken = window.localStorage.getItem("userToken") || '';
        this.tokenType = window.localStorage.getItem("tokenType") || '';
    };

    api.ApiUser.prototype.toStorage = function() {
        window.localStorage.setItem("userId", this.userId);
        window.localStorage.setItem("userToken", this.userToken);
        window.localStorage.setItem("tokenType", this.tokenType);
    };

    api.ApiUser.prototype.removeFromStorage = function() {
        window.localStorage.removeItem("userId");
        window.localStorage.removeItem("userToken");
        window.localStorage.removeItem("tokenType");
    };

    api.ApiUser.prototype.clearToken = function() {
        window.localStorage.setItem("userToken", null);
        window.localStorage.setItem("tokenType", null);
    };

    api.ApiUser.prototype.isValid = function() {
        system.log('ApiUser: isValid');
        return (this.userId != null && this.userId.length>0) && (this.userToken != null && this.userToken.length>0);
    };

    api.ApiUser.prototype._reset = function() {
        this.userId = '';
        this.userToken = '';
        this.tokenType = '';
    };

    //*************
    // ApiAuth
    //*************

    api.ApiAuth = function(spec) {
        spec = spec || {};
        this.urlAuth = spec.urlAuth || '';
        this.ajax = spec.ajax;
        this.version = spec.version;
        this.platform = spec.platform;
        this.device = spec.device;
        this.allowAccountOwner = spec.allowAccountOwner !== undefined ? spec.allowAccountOwner:true;
    };

    api.ApiAuth.prototype.authenticate = function(userId, password) {
        system.log('ApiAuth: authenticate '+userId);

        var that = this;
        var params = {
            user: userId, 
            password: password, 
            _v: this.version
        };
        if(this.platform){
            params.platform = this.platform;
        }
        if(this.device){
            params.device = this.device;
        }

        var dfd = $.Deferred();
        this.ajax.post(this.urlAuth, params, 30000)
            .done(function(resp) {
                // Check if login is ok AND if login is ok but account is expired, check if we allow login or not (allowAccountOwner)
                // 
                // REMARK
                // - web app allows owners to still login on expired/cancelled account
                // - mobile doesn't allow expired logins also not for owners
                if ((resp.status=="OK") && 
                    (['expired', 'cancelled_expired', 'archived'].indexOf(resp.subscription) != -1?that.allowAccountOwner:true)) {
                    dfd.resolve(resp.data);
                } else {
                    dfd.reject(resp);
                }
            }).fail(function(err) {
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
    api.ApiAnonymous = function(spec) {
        spec = spec || {};
        this.ajax = spec.ajax;
        this.urlApi = spec.urlApi || '';
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
    api.ApiAnonymous.prototype.call = function(method, params, timeOut, usePost) {
        system.log('ApiAnonymous: call ' + method);
        if (this.version) {
            params = params || {};
            params["_v"] = this.version;
        }

        var cmd = "call." + method;
        var url = this.urlApi + '/' + method; 
        var getUrl = url + "?" + $.param(this.ajax._prepareDict(params));

        if( (usePost) ||
            (getUrl.length >= MAX_QUERYSTRING_LENGTH)) {
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
    api.ApiAnonymous.prototype.longCall = function(method, params, usePost) {
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
    api.ApiDataSource = function(spec) {
        spec = spec || {};
        this.collection = spec.collection || '';
        this.urlApi = spec.urlApi || '';
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
    api.ApiDataSource.prototype.exists = function(pk, fields) {
        system.log('ApiDataSource: ' + this.collection + ': exists ' + pk);
        var cmd = "exists";
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

        this._ajaxGet(cmd, url)
            .done(function(data) {
                dfd.resolve(data);
            }).fail(function(error) {
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
    api.ApiDataSource.prototype.get = function(pk, fields) {
        system.log('ApiDataSource: ' + this.collection + ': get ' + pk);
        var cmd = "get";
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
    api.ApiDataSource.prototype.getIgnore404 = function(pk, fields) {
        system.log('ApiDataSource: ' + this.collection + ': getIgnore404 ' + pk);
        var that = this;
        var dfd = $.Deferred();
        this.get(pk, fields)
            .done(function(data) {
                dfd.resolve(data);
            })
            .fail(function(err) {
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
    api.ApiDataSource.prototype.getMultiple = function(pks, fields) {
        system.log('ApiDataSource: ' + this.collection + ': getMultiple ' + pks);
        var cmd = "getMultiple";
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
    api.ApiDataSource.prototype.delete = function(pk) {
        system.log('ApiDataSource: ' + this.collection + ': delete ' + pk);
        var cmd = "delete";
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
    api.ApiDataSource.prototype.deleteMultiple = function(pks, usePost) {
        system.log('ApiDataSource: ' + this.collection + ': deleteMultiple ' + pks);
        var cmd = "deleteMultiple";
        var url = this.getBaseUrl() + 'delete';

        var p = { pk: pks };
        var geturl = url + '?' + this.getParams(p);

        if( (usePost) || 
            (geturl.length >= MAX_QUERYSTRING_LENGTH)) {
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
    api.ApiDataSource.prototype.update = function(pk, params, fields, timeOut, usePost) {
        system.log('ApiDataSource: ' + this.collection + ': update ' + pk);
        var cmd = "update";
        var url = this.getBaseUrl() + pk + '/update';
        var p = $.extend({}, params);
        if( (fields!=null) &&
            (fields.length>0)) {
            p['_fields'] = $.isArray(fields) ? fields.join(',') : fields;
        }
        var geturl = url + '?' + this.getParams(p);

        if( (usePost) || 
            (geturl.length >= MAX_QUERYSTRING_LENGTH)) {
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
    api.ApiDataSource.prototype.create = function(params, fields, timeOut, usePost) {
        system.log('ApiDataSource: ' + this.collection + ': create');
        var cmd = "create";
        var url = this.getBaseUrl() + 'create';
        var p = $.extend({}, params);
        if( (fields!=null) &&
            (fields.length>0)) {
            p['_fields'] = $.isArray(fields) ? fields.join(',') : fields;
        }

        var geturl = url + '?' + this.getParams(p);

        if( (usePost) || 
            (geturl.length >= MAX_QUERYSTRING_LENGTH)) {
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
    api.ApiDataSource.prototype.createMultiple = function(objects, fields) {
        system.log('ApiDataSource: ' + this.collection + ': createMultiple (' + objects.length + ')');

        var dfd = $.Deferred();
        var that = this;
        var todoObjs = objects.slice(0);
        var doneIds = [];

        // Trigger the creates sequentially
        var createRecurse = function(todoObjs) {
            if (todoObjs.length>0) {
                var obj = todoObjs.pop();
                that.create(obj, fields)
                    .done(function(resp) {
                        doneIds.push(resp._id);
                        return createRecurse(todoObjs);
                    }).fail(function(error) {
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
    api.ApiDataSource.prototype.list = function(name, fields, limit, skip, sort) {
        name = name || "";

        system.log('ApiDataSource: ' + this.collection + ': list ' + name);
        var cmd = "list." + name;
        var url = this.getBaseUrl();
        if( (name!=null) && (name.length>0)) {
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
    api.ApiDataSource.prototype.search = function(params, fields, limit, skip, sort, mimeType) {
        system.log('ApiDataSource: ' + this.collection + ': search ' + params);
        var cmd = "search";
        var url = this.searchUrl(params, fields, limit, skip, sort, mimeType);
        return this._ajaxGet(cmd, url);
    };

    api.ApiDataSource.prototype.searchUrl = function(params, fields, limit, skip, sort, mimeType) {
        var url = this.getBaseUrl() + 'search';
        var p = $.extend(this.getParamsDict(fields, limit, skip, sort), params);
        if( (mimeType!=null) &&
            (mimeType.length>0)) {
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
    api.ApiDataSource.prototype.call = function(pk, method, params, fields, timeOut, usePost) {
        system.log('ApiDataSource: ' + this.collection + ': call ' + method);
        var cmd = "call." + method;
        var url = ((pk!=null) && (pk.length>0)) ?
            this.getBaseUrl() + pk + '/call/' + method :
            this.getBaseUrl() + 'call/' + method;
        var p = $.extend({}, this.getParamsDict(fields, null, null, null), params);
        var getUrl = url + '?' + this.getParams(p);

        if( (usePost) ||
            (getUrl.length >= MAX_QUERYSTRING_LENGTH)) {
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
    api.ApiDataSource.prototype.callMultiple = function(pks, method, params, fields, timeOut, usePost) {
        system.log('ApiDataSource: ' + this.collection + ': call ' + method);
        var cmd = "call." + method;
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
    api.ApiDataSource.prototype.longCall = function(pk, method, params, fields, usePost) {
        return this.call(pk, method, params, fields, 60000, usePost);
    };

    /**
     * Gets the base url for all calls to this collection
     * @method
     * @name ApiDataSource#getBaseUrl
     * @returns {string}
     */
    api.ApiDataSource.prototype.getBaseUrl = function() {
        var tokenType = ((this.user.tokenType != null) && (this.user.tokenType.length>0)) ? this.user.tokenType : 'null';            
   
        //Don't use cached version of this because when user session gets expired
        //a new token is generated
        return this.urlApi + '/' +
            this.user.userId + '/' +
            this.user.userToken + '/' +
            tokenType + '/' +
            this.collection + '/';
    };

    /**
     * Prepare some parameters so we can use them during a request
     * @method
     * @name ApiDataSource#getParams
     * @param data
     * @returns {object}
     */
    api.ApiDataSource.prototype.getParams = function(data) {
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
    api.ApiDataSource.prototype.getParamsDict = function(fields, limit, skip, sort) {
        var p = {};
        if (fields) {       p['_fields'] = $.isArray(fields) ? fields.join(',') : fields.replace(/\s/g, ""); }
        if (limit) {        p['_limit'] = limit; }
        if (skip) {         p['_skip'] = skip; }
        if (sort) {         p['_sort'] = sort; }
        if (this.version) { p['_v'] = this.version; }
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
    api.ApiDataSource.prototype._ajaxGet = function(cmd, url, timeout) {
        return this.ajax.get(url, timeout, {coll: this.collection, cmd: cmd});
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
    api.ApiDataSource.prototype._ajaxPost = function(cmd, url, data, timeout) {
        return this.ajax.post(url, data, timeout, {coll: this.collection, cmd: cmd});
    };

    return api;
});
