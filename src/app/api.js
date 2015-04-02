/**
 * Provides the classes needed to communicate with the CHECKROOM API
 * @module api
 * @namespace api
 * @copyright CHECKROOM NV 2015
 */
define([
    'jquery',
    'jquery-jsonp',
    'moment',
    'common',
    'dateHelper'], function ($, jsonp, moment, common, DateHelper) {

    //TODO change this
    //system.log fallback
    var system = {
        log: function(){
            // do something
        }
    };

    var api = {};

    //*************
    // ApiErrors
    //*************
    api.ApiNetworkNotConnected = function(msg) {       this.code=999; this.message = msg || "Connection interrupted"; };
    api.ApiNetworkNotConnected.prototype = new Error();
    api.ApiNetworkTimeout = function(msg) {            this.code=408; this.message = msg || "Could not reach the server in time"; };
    api.ApiNetworkTimeout.prototype = new Error();

    api.ApiError = function(msg) {                  this.code=500; this.message = msg || "Something went wrong on the server"; };
    api.ApiError.prototype = new Error();
    api.ApiNotFound = function(msg) {               this.code=404; this.message = msg || "Could not find what you're looking for"; };
    api.ApiNotFound.prototype = new Error();
    api.ApiBadRequest = function(msg) {             this.code=400; this.message = msg || "The server did not understand your request"; };
    api.ApiBadRequest.prototype = new Error();
    api.ApiUnauthorized = function(msg) {           this.code=401; this.message = msg || "Your session has expired"; };
    api.ApiUnauthorized.prototype = new Error();
    api.ApiPaymentRequired = function(msg) {        this.code=402; this.message = msg || "Your subscription has expired"; };
    api.ApiPaymentRequired.prototype = new Error();
    api.ApiForbidden = function(msg) {              this.code=403; this.message = msg || "You have insufficient rights"; };
    api.ApiForbidden.prototype = new Error();
    api.ApiUnprocessableEntity = function(msg) {    this.code=422; this.message = msg || "Some data is invalid"; };
    api.ApiUnprocessableEntity.prototype = new Error();

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
    api.ApiAjax = function(spec) {
        spec = spec || {};
        this.useJsonp = (spec.useJsonp!=null) ? spec.useJsonp : true;
        this.timeOut = spec.timeOut || 10000;
        this.responseInTz = true;
    };

    api.ApiAjax.prototype.get = function(url, timeOut) {
        system.log('ApiAjax: get '+url);
        return this.useJsonp ? this._getJsonp(url, timeOut) : this._getAjax(url, timeOut);
    };

    api.ApiAjax.prototype.post = function(url, data, timeOut) {
        system.log('ApiAjax: post '+url);
        if (this.useJsonp) {
            throw "ApiAjax cannot post while useJsonp is true";
        }
        return this._postAjax(url, data, timeOut);
    };

    // Implementation
    // ----
    api.ApiAjax.prototype._handleAjaxSuccess = function(dfd, data) {
        if (this.responseInTz) {
            data = this._fixDates(data);
        }
        return dfd.resolve(data);
    };

    api.ApiAjax.prototype._handleAjaxError = function(dfd, x, t, m) {
        if (m==="timeout") {
            dfd.reject(new api.ApiNetworkTimeout());
        } else {
            switch(x.status) {
                case 400: dfd.reject(new api.ApiBadRequest()); break;
                case 401: dfd.reject(new api.ApiUnauthorized()); break;
                case 403: dfd.reject(new api.ApiForbidden()); break;
                case 404: dfd.reject(new api.ApiNotFound()); break;
                case 422: dfd.reject(new api.ApiUnprocessableEntity()); break;
                case 500:
                default: dfd.reject(new api.ApiError()); break;
            }
        }
    };

    api.ApiAjax.prototype._postAjax = function(url, data, timeOut) {
        var dfd = $.Deferred();
        var that = this;

        $.ajax({
            type: "POST",
            url: url,
            data: JSON.stringify(this._prepareDict(data)),
            contentType: "application/json; charset=utf-8",
            timeout: timeOut || this.timeOut,
            success: function(data) {return that._handleAjaxSuccess(dfd, data);},
            error: function(x, t, m) {return that._handleAjaxError(dfd, x, t, m);}
        });

        return dfd.promise();
    };

    api.ApiAjax.prototype._getAjax = function(url, timeOut) {
        var dfd = $.Deferred();
        var that = this;

        $.ajax({
            url: url,
            timeout: timeOut || this.timeOut,
            success: function(data) {return that._handleAjaxSuccess(dfd, data);},
            error: function(x, t, m) {return that._handleAjaxError(dfd, x, t, m);}
        });

        return dfd.promise();
    };

    api.ApiAjax.prototype._getJsonp = function(url, timeOut) {
        var dfd = $.Deferred();
        var that = this;

        $.jsonp({
            url: url,
            type: 'GET',
            timeout: timeOut || this.timeOut,
            dataType:' jsonp',
            callbackParameter: 'callback',
            success: function(data, textStatus, xOptions) {return that._handleAjaxSuccess(dfd, data);},
            error: function(xOptions, textStatus) {
                // JSONP doesn't support HTTP status codes
                // https://github.com/jaubourg/jquery-jsonp/issues/37
                // so we can only return a simple error
                dfd.reject(new api.ApiError());
            }
        });

        return dfd.promise();
    };

    api.ApiAjax.prototype._prepareDict = function(data) {
        // Makes sure all values from the dict are serializable and understandable for json
        $.each(data, function(key, value) {
            if(moment.isMoment(value)) {
                data[key] = value.toJSONDate();
            }
        });
        return data;
    };

    api.ApiAjax.prototype._fixDates = function(data) {
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
        } else if( (data instanceof Object) ||  $.isArray(data)) {
            var that = this;
            $.each(data, function(k,v) {
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
        return (
            (this.userId) &&
            (this.userId.length>0) &&
            (this.userToken) &&
            (this.userToken.length>0) &&
            (this.tokenType));
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
    };

    api.ApiAuth.prototype.authenticate = function(userId, password) {
        system.log('ApiAuth: authenticate '+userId);
        var url = this.urlAuth + '?' + $.param({user: userId, password: password, auth_v: 2});
        var dfd = $.Deferred();
        this.ajax.get(url)
            .done(function(resp) {
                if (resp.status=="OK") {
                    dfd.resolve(resp.data);
                } else {
                    dfd.reject(new Error("Your username or password is not correct"));
                }
            }).fail(function(err) {
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
     * var auth = new cr.api.ApiAuthV2({ajax: ajax, urlAuth: baseUrl + '/authenticate'});
     * var authUser = null;
     *
     * auth.authenticate(userName, password)
     *     .done(function(data) {
     *         authUser = new cr.api.ApiUser({userId: data.userId, userToken: data.token});
     *     });
     *
     */
    api.ApiAuthV2 = function(spec) {
        spec = spec || {};
        this.urlAuth = spec.urlAuth || '';
        this.ajax = spec.ajax;
    };

    /**
     * The call to authenticate a user with userid an dpassword
     * @method
     * @name ApiAuthV2#authenticate
     * @param userId
     * @param password
     * @returns {object}
     */
    api.ApiAuthV2.prototype.authenticate = function(userId, password) {
        system.log('ApiAuthV2: authenticate '+userId);
        var url = this.urlAuth + '?' + $.param({user: userId, password: password, auth_v: 2});
        var dfd = $.Deferred();
        this.ajax.get(url)
            .done(function(resp) {
                // {"status": "OK", "message": "", "data": {"token": "547909916c092811d3bebcb4", "userid": "heavy"}
                // TODO: Handle case for password incorrect, no rights or subscription expired
                if (resp.status=="OK") {
                    dfd.resolve(resp.data);
                } else {
                    dfd.reject(new Error("Your username or password is not correct"));
                }
            }).fail(function(err) {
                dfd.reject(err);
            });

        return dfd.promise();
    };

    //*************
    // ApiAnonymous
    // Communicates with the API without having token authentication
    //*************
    api.ApiAnonymous = function(spec) {
        spec = spec || {};
        this.ajax = spec.ajax;
        this.urlApi = spec.urlApi || '';
    };

    api.ApiAnonymous.prototype.call = function(method, params, timeOut) {
        system.log('ApiAnonymous: call ' + method);
        var url =
            this.urlApi +
            '/' +
            method +
            '?' +
            $.param(this.ajax._prepareDict(params));
        return this.ajax.get(url, timeOut);
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
     * @param {ApiAuthUser} spec.user          - the user auth object
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

        // Make the baseurl only once, we assume the collection and user never changes
        var tokenType = ((this.user.tokenType != null) && (this.user.tokenType.length>0)) ? this.user.tokenType : 'null';
        this._baseUrl =
            this.urlApi + '/' +
            this.user.userId + '/' +
            this.user.userToken + '/' +
            tokenType + '/' +
            this.collection + '/';
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
        var dfd = $.Deferred();
        var that = this;
        this.get(pk, fields)
            .done(function(data) {
                dfd.resolve(data);
            }).fail(function(error) {
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
    api.ApiDataSource.prototype.get = function(pk, fields) {
        system.log('ApiDataSource: ' + this.collection + ': get ' + pk);
        var url = this.getBaseUrl() + pk;
        var p = this.getParamsDict(fields);
        if (!$.isEmptyObject(p)) {
            url += '?' + this.getParams(p);
        }
        return this.ajax.get(url);
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
        var that = this;
        var dfd = $.Deferred();
        this.get(pk, fields)
            .done(function(data) {
                dfd.resolve(data);
            })
            .fail(function(err) {
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
    api.ApiDataSource.prototype.getMultiple = function(pks, fields) {
        system.log('ApiDataSource: ' + this.collection + ': getMultiple ' + pks);
        var url = this.getBaseUrl() + pks.join(',') + ',';
        var p = this.getParamsDict(fields);
        if (!$.isEmptyObject(p)) {
            url += '?' + this.getParams(p);
        }
        return this.ajax.get(url);
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
        var url = this.getBaseUrl() + pk + '/delete';
        return this.ajax.get(url);
    };

    /**
     * Updates a document by its primary key and a params objects
     * @method
     * @name ApiDataSource#update
     * @param pk
     * @param params
     * @param fields
     * @returns {promise}
     */
    api.ApiDataSource.prototype.update = function(pk, params, fields) {
        system.log('ApiDataSource: ' + this.collection + ': update ' + pk);
        var url = this.getBaseUrl() + pk + '/update';
        var p = $.extend({}, params);
        if( (fields!=null) &&
            (fields.length>0)) {
            p['_fields'] = $.isArray(fields) ? fields.join(',') : fields;
        }
        url += '?' + this.getParams(p);
        return this.ajax.get(url);
    };

    /**
     * Creates a document with some data in an object
     * @method
     * @name ApiDataSource#create
     * @param params
     * @param fields
     * @returns {promise}
     */
    api.ApiDataSource.prototype.create = function(params, fields) {
        system.log('ApiDataSource: ' + this.collection + ': create');
        var url = this.getBaseUrl() + 'create';
        var p = $.extend({}, params);
        if( (fields!=null) &&
            (fields.length>0)) {
            p['_fields'] = $.isArray(fields) ? fields.join(',') : fields;
        }

        url += '?' + this.getParams(p);
        return this.ajax.get(url);
    };

    /**
     * Creates multiple objects in one goe
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
        system.log('ApiDataSource: ' + this.collection + ': list ' + name);
        var url = this.getBaseUrl();
        if( (name!=null) && (name.length>0)) {
            url += 'list/' + name + '/';
        }
        var p = this.getParamsDict(fields, limit, skip, sort);
        if (!$.isEmptyObject(p)) {
            url += '?' + this.getParams(p);
        }
        return this.ajax.get(url);
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
        var url = this.searchUrl(params, fields, limit, skip, sort, mimeType);
        return this.ajax.get(url);
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
        var url = ((pk!=null) && (pk.length>0)) ?
            this.getBaseUrl() + pk + '/call/' + method :
            this.getBaseUrl() + 'call/' + method;
        var p = $.extend({}, this.getParamsDict(fields, null, null, null), params);

        if (usePost) {
            return this.ajax.post(url, p, timeOut);
        } else {
            url += '?' + this.getParams(p);
            return this.ajax.get(url, timeOut);
        }
    };

    /**
     * Gets the base url for all calls to this collection
     * @method
     * @name ApiDataSource#getBaseUrl
     * @returns {string}
     */
    api.ApiDataSource.prototype.getBaseUrl = function() {
        return this._baseUrl;
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
        if (fields) {   p['_fields'] = $.isArray(fields) ? fields.join(',') : fields; }
        if (limit) {    p['_limit'] = limit; }
        if (skip) {     p['_skip'] = skip; }
        if (sort) {     p['_sort'] = sort; }
        return p;
    };

    return api;
});