(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD.
    define(['jquery',
        	  'jquery-jsonp',
            'jquery-pubsub',
        	  'moment'], factory);
  } else {
    // Browser globals.
    root.cr = factory($, jsonp, pubsub, moment);
  }
}(this, function($, jsonp, pubsub, moment) {/**
 * @license almond 0.3.0 Copyright (c) 2011-2014, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/almond for details
 */
//Going sloppy to avoid 'use strict' string cost, but strict practices should
//be followed.
/*jslint sloppy: true */
/*global setTimeout: false */

var requirejs, require, define;
(function (undef) {
    var main, req, makeMap, handlers,
        defined = {},
        waiting = {},
        config = {},
        defining = {},
        hasOwn = Object.prototype.hasOwnProperty,
        aps = [].slice,
        jsSuffixRegExp = /\.js$/;

    function hasProp(obj, prop) {
        return hasOwn.call(obj, prop);
    }

    /**
     * Given a relative module name, like ./something, normalize it to
     * a real name that can be mapped to a path.
     * @param {String} name the relative name
     * @param {String} baseName a real name that the name arg is relative
     * to.
     * @returns {String} normalized name
     */
    function normalize(name, baseName) {
        var nameParts, nameSegment, mapValue, foundMap, lastIndex,
            foundI, foundStarMap, starI, i, j, part,
            baseParts = baseName && baseName.split("/"),
            map = config.map,
            starMap = (map && map['*']) || {};

        //Adjust any relative paths.
        if (name && name.charAt(0) === ".") {
            //If have a base name, try to normalize against it,
            //otherwise, assume it is a top-level require that will
            //be relative to baseUrl in the end.
            if (baseName) {
                //Convert baseName to array, and lop off the last part,
                //so that . matches that "directory" and not name of the baseName's
                //module. For instance, baseName of "one/two/three", maps to
                //"one/two/three.js", but we want the directory, "one/two" for
                //this normalization.
                baseParts = baseParts.slice(0, baseParts.length - 1);
                name = name.split('/');
                lastIndex = name.length - 1;

                // Node .js allowance:
                if (config.nodeIdCompat && jsSuffixRegExp.test(name[lastIndex])) {
                    name[lastIndex] = name[lastIndex].replace(jsSuffixRegExp, '');
                }

                name = baseParts.concat(name);

                //start trimDots
                for (i = 0; i < name.length; i += 1) {
                    part = name[i];
                    if (part === ".") {
                        name.splice(i, 1);
                        i -= 1;
                    } else if (part === "..") {
                        if (i === 1 && (name[2] === '..' || name[0] === '..')) {
                            //End of the line. Keep at least one non-dot
                            //path segment at the front so it can be mapped
                            //correctly to disk. Otherwise, there is likely
                            //no path mapping for a path starting with '..'.
                            //This can still fail, but catches the most reasonable
                            //uses of ..
                            break;
                        } else if (i > 0) {
                            name.splice(i - 1, 2);
                            i -= 2;
                        }
                    }
                }
                //end trimDots

                name = name.join("/");
            } else if (name.indexOf('./') === 0) {
                // No baseName, so this is ID is resolved relative
                // to baseUrl, pull off the leading dot.
                name = name.substring(2);
            }
        }

        //Apply map config if available.
        if ((baseParts || starMap) && map) {
            nameParts = name.split('/');

            for (i = nameParts.length; i > 0; i -= 1) {
                nameSegment = nameParts.slice(0, i).join("/");

                if (baseParts) {
                    //Find the longest baseName segment match in the config.
                    //So, do joins on the biggest to smallest lengths of baseParts.
                    for (j = baseParts.length; j > 0; j -= 1) {
                        mapValue = map[baseParts.slice(0, j).join('/')];

                        //baseName segment has  config, find if it has one for
                        //this name.
                        if (mapValue) {
                            mapValue = mapValue[nameSegment];
                            if (mapValue) {
                                //Match, update name to the new value.
                                foundMap = mapValue;
                                foundI = i;
                                break;
                            }
                        }
                    }
                }

                if (foundMap) {
                    break;
                }

                //Check for a star map match, but just hold on to it,
                //if there is a shorter segment match later in a matching
                //config, then favor over this star map.
                if (!foundStarMap && starMap && starMap[nameSegment]) {
                    foundStarMap = starMap[nameSegment];
                    starI = i;
                }
            }

            if (!foundMap && foundStarMap) {
                foundMap = foundStarMap;
                foundI = starI;
            }

            if (foundMap) {
                nameParts.splice(0, foundI, foundMap);
                name = nameParts.join('/');
            }
        }

        return name;
    }

    function makeRequire(relName, forceSync) {
        return function () {
            //A version of a require function that passes a moduleName
            //value for items that may need to
            //look up paths relative to the moduleName
            var args = aps.call(arguments, 0);

            //If first arg is not require('string'), and there is only
            //one arg, it is the array form without a callback. Insert
            //a null so that the following concat is correct.
            if (typeof args[0] !== 'string' && args.length === 1) {
                args.push(null);
            }
            return req.apply(undef, args.concat([relName, forceSync]));
        };
    }

    function makeNormalize(relName) {
        return function (name) {
            return normalize(name, relName);
        };
    }

    function makeLoad(depName) {
        return function (value) {
            defined[depName] = value;
        };
    }

    function callDep(name) {
        if (hasProp(waiting, name)) {
            var args = waiting[name];
            delete waiting[name];
            defining[name] = true;
            main.apply(undef, args);
        }

        if (!hasProp(defined, name) && !hasProp(defining, name)) {
            throw new Error('No ' + name);
        }
        return defined[name];
    }

    //Turns a plugin!resource to [plugin, resource]
    //with the plugin being undefined if the name
    //did not have a plugin prefix.
    function splitPrefix(name) {
        var prefix,
            index = name ? name.indexOf('!') : -1;
        if (index > -1) {
            prefix = name.substring(0, index);
            name = name.substring(index + 1, name.length);
        }
        return [prefix, name];
    }

    /**
     * Makes a name map, normalizing the name, and using a plugin
     * for normalization if necessary. Grabs a ref to plugin
     * too, as an optimization.
     */
    makeMap = function (name, relName) {
        var plugin,
            parts = splitPrefix(name),
            prefix = parts[0];

        name = parts[1];

        if (prefix) {
            prefix = normalize(prefix, relName);
            plugin = callDep(prefix);
        }

        //Normalize according
        if (prefix) {
            if (plugin && plugin.normalize) {
                name = plugin.normalize(name, makeNormalize(relName));
            } else {
                name = normalize(name, relName);
            }
        } else {
            name = normalize(name, relName);
            parts = splitPrefix(name);
            prefix = parts[0];
            name = parts[1];
            if (prefix) {
                plugin = callDep(prefix);
            }
        }

        //Using ridiculous property names for space reasons
        return {
            f: prefix ? prefix + '!' + name : name, //fullName
            n: name,
            pr: prefix,
            p: plugin
        };
    };

    function makeConfig(name) {
        return function () {
            return (config && config.config && config.config[name]) || {};
        };
    }

    handlers = {
        require: function (name) {
            return makeRequire(name);
        },
        exports: function (name) {
            var e = defined[name];
            if (typeof e !== 'undefined') {
                return e;
            } else {
                return (defined[name] = {});
            }
        },
        module: function (name) {
            return {
                id: name,
                uri: '',
                exports: defined[name],
                config: makeConfig(name)
            };
        }
    };

    main = function (name, deps, callback, relName) {
        var cjsModule, depName, ret, map, i,
            args = [],
            callbackType = typeof callback,
            usingExports;

        //Use name if no relName
        relName = relName || name;

        //Call the callback to define the module, if necessary.
        if (callbackType === 'undefined' || callbackType === 'function') {
            //Pull out the defined dependencies and pass the ordered
            //values to the callback.
            //Default to [require, exports, module] if no deps
            deps = !deps.length && callback.length ? ['require', 'exports', 'module'] : deps;
            for (i = 0; i < deps.length; i += 1) {
                map = makeMap(deps[i], relName);
                depName = map.f;

                //Fast path CommonJS standard dependencies.
                if (depName === "require") {
                    args[i] = handlers.require(name);
                } else if (depName === "exports") {
                    //CommonJS module spec 1.1
                    args[i] = handlers.exports(name);
                    usingExports = true;
                } else if (depName === "module") {
                    //CommonJS module spec 1.1
                    cjsModule = args[i] = handlers.module(name);
                } else if (hasProp(defined, depName) ||
                           hasProp(waiting, depName) ||
                           hasProp(defining, depName)) {
                    args[i] = callDep(depName);
                } else if (map.p) {
                    map.p.load(map.n, makeRequire(relName, true), makeLoad(depName), {});
                    args[i] = defined[depName];
                } else {
                    throw new Error(name + ' missing ' + depName);
                }
            }

            ret = callback ? callback.apply(defined[name], args) : undefined;

            if (name) {
                //If setting exports via "module" is in play,
                //favor that over return value and exports. After that,
                //favor a non-undefined return value over exports use.
                if (cjsModule && cjsModule.exports !== undef &&
                        cjsModule.exports !== defined[name]) {
                    defined[name] = cjsModule.exports;
                } else if (ret !== undef || !usingExports) {
                    //Use the return value from the function.
                    defined[name] = ret;
                }
            }
        } else if (name) {
            //May just be an object definition for the module. Only
            //worry about defining if have a module name.
            defined[name] = callback;
        }
    };

    requirejs = require = req = function (deps, callback, relName, forceSync, alt) {
        if (typeof deps === "string") {
            if (handlers[deps]) {
                //callback in this case is really relName
                return handlers[deps](callback);
            }
            //Just return the module wanted. In this scenario, the
            //deps arg is the module name, and second arg (if passed)
            //is just the relName.
            //Normalize module name, if it contains . or ..
            return callDep(makeMap(deps, callback).f);
        } else if (!deps.splice) {
            //deps is a config object, not an array.
            config = deps;
            if (config.deps) {
                req(config.deps, config.callback);
            }
            if (!callback) {
                return;
            }

            if (callback.splice) {
                //callback is an array, which means it is a dependency list.
                //Adjust args if there are dependencies
                deps = callback;
                callback = relName;
                relName = null;
            } else {
                deps = undef;
            }
        }

        //Support require(['a'])
        callback = callback || function () {};

        //If relName is a function, it is an errback handler,
        //so remove it.
        if (typeof relName === 'function') {
            relName = forceSync;
            forceSync = alt;
        }

        //Simulate async callback;
        if (forceSync) {
            main(undef, deps, callback, relName);
        } else {
            //Using a non-zero value because of concern for what old browsers
            //do, and latest browsers "upgrade" to 4 if lower value is used:
            //http://www.whatwg.org/specs/web-apps/current-work/multipage/timers.html#dom-windowtimers-settimeout:
            //If want a value immediately, use require('id') instead -- something
            //that works in almond on the global level, but not guaranteed and
            //unlikely to work in other AMD implementations.
            setTimeout(function () {
                main(undef, deps, callback, relName);
            }, 4);
        }

        return req;
    };

    /**
     * Just drops the config on the floor, but returns req in case
     * the config return value is used.
     */
    req.config = function (cfg) {
        return req(cfg);
    };

    /**
     * Expose module registry for debugging and tooling
     */
    requirejs._defined = defined;

    define = function (name, deps, callback) {

        //This module may not have dependencies
        if (!deps.splice) {
            //deps is not an array, so probably means
            //an object literal or factory function for
            //the value. Adjust args.
            callback = deps;
            deps = [];
        }

        if (!hasProp(defined, name) && !hasProp(waiting, name)) {
            waiting[name] = [name, deps, callback];
        }
    };

    define.amd = {
        jQuery: true
    };
}());

define("../../tests/js/lib/almond/almond", function(){});

/**
 * Provides some common helper functions
 * @module common
 */
define('common',[], function () {

    // Extending the string type with some helpers
    // ----
    String.prototype.startsWith = function (str){
        return this.indexOf(str) == 0;
    };

    String.prototype.endsWith = function (str){
        if (this.length<str.length) {
            return false;
        } else {
            return this.lastIndexOf(str) == (this.length-str.length);
        }
    };

    String.prototype.pluralize = function (count, suffix) {
        if( (this == 'is') && (count!=1)) {
            return 'are';
        } else if (this.endsWith('s')) {
            suffix = suffix || 'es';
            return (count==1) ? this : this+suffix;
        } else if (this.endsWith('y')) {
            suffix = suffix || 'ies';
            return (count==1) ? this : this.substr(0, this.length-1) + suffix;
        } else {
            suffix = suffix || 's';
            return (count==1) ? this : this+suffix;
        }
    };

    String.prototype.capitalize = function() {
        return this.charAt(0).toUpperCase() + this.slice(1);
    };

    String.prototype.truncate = function(len){
        len = (len!=null) ? len : 25;
        var re = this.match(RegExp("^.{0,"+len+"}[\S]*"));
        var l = re[0].length;
        re = re[0].replace(/\s$/,'');
        if(l < this.length) {
            re = re + "&hellip;";
        }
        return re;
    };

    // Other helpers
    // ----
    return {
        getUrlParam: function(name) {
            name = name.replace(/[\[]/,"\\\[").replace(/[\]]/,"\\\]");
            var regexS = "[\\?&]"+name+"=([^&#]*)";
            var regex = new RegExp( regexS );
            var results = regex.exec( window.location.href );
            return (results) ? decodeURIComponent(results[1].replace(/\+/g, " ")) : null;
        }
    };

});
/**
 * The DateHelper module
 * @module dateHelper
 * a DateHelper class
 */
define('dateHelper',["jquery", "moment"], function ($, moment) {

    // Add a new function to moment
    moment.fn.toJSONDate = function() {
        // toISOString gives the time in Zulu timezone
        // we want the local timezone but in ISO formatting
        return this.format("YYYY-MM-DDTHH:mm:ss.000[Z]");
    };

    // https://github.com/moment/moment/pull/1595
    //m.roundTo('minute', 15); // Round the moment to the nearest 15 minutes.
    //m.roundTo('minute', 15, 'up'); // Round the moment up to the nearest 15 minutes.
    //m.roundTo('minute', 15, 'down'); // Round the moment down to the nearest 15 minutes.
    moment.fn.roundTo = function(units, offset, midpoint) {
        units = moment.normalizeUnits(units);
        offset = offset || 1;
        var roundUnit = function(unit) {
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
    var DateHelper = function(spec) {
        spec = spec || {};
        this.roundType = spec.roundType || "nearest";
        this.roundMinutes = spec.roundMinutes || INCREMENT;
    };

    DateHelper.prototype.getNow = function() {
        // TODO: Use the right MomentJS constructor
        //       This one will be deprecated in the next version
        return moment();
    };

    DateHelper.prototype.getFriendlyDuration = function(duration) {
        return duration.humanize();
    };

    /**
     * Turns all strings that look like datetimes into moment objects recursively
     * @param data
     * @returns {*}
     */
    DateHelper.prototype.fixDates = function(data) {
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
                data[k] = that.fixDates(v);
            });
        }
        return data;
    };

    /**
     * roundTimeFrom uses the time rounding rules to round a begin datetime
     * @param m
     */
    DateHelper.prototype.roundTimeFrom = function(m) {
        return (this.roundMinutes<=1) ? m : this.roundTime(m, this.roundMinutes, this._typeToDirection(this.roundType, "from"));
    };

    /**
     * roundTimeTo uses the time rounding rules to round an end datetime
     * @param m
     */
    DateHelper.prototype.roundTimeTo = function(m) {
        return (this.roundMinutes<=1) ? m : this.roundTime(m, this.roundMinutes, this._typeToDirection(this.roundType, "to"));
    };



    DateHelper.prototype.roundTime = function(m, inc, direction) {
        var mom = (moment.isMoment(m)) ? m : moment(m);
        mom.seconds(0).milliseconds(0);
        return mom.roundTo("minute", inc || INCREMENT, direction);
    };

    DateHelper.prototype.roundTimeUp = function(m, inc) {
        var mom = (moment.isMoment(m)) ? m : moment(m);
        mom.seconds(0).milliseconds(0);
        return mom.roundTo("minute", inc || INCREMENT, "up");
    };

    DateHelper.prototype.roundTimeDown = function(m, inc) {
        var mom = (moment.isMoment(m)) ? m : moment(m);
        mom.seconds(0).milliseconds(0);
        return mom.roundTo("minute", inc || INCREMENT, "down");
    };

    DateHelper.prototype._typeToDirection = function(type, fromto) {
        switch(type) {
            case "longer":
                switch(fromto) {
                    case "from": return "down";
                    case "to": return "up";
                    default: break;
                }
                break;
            case "shorter":
                switch(fromto) {
                    case "from": return "up";
                    case "to": return "down";
                    default: break;
                }
                break;
            default:
                break;
        }
    };

    return DateHelper;

});
/**
 * Provides the classes needed to communicate with the CHECKROOM API
 * @module api
 */
define('api',[
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
    api.ApiAuthV2 = function(spec) {
        spec = spec || {};
        this.urlAuth = spec.urlAuth || '';
        this.ajax = spec.ajax;
    };

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

    api.ApiDataSource.prototype.get = function(pk, fields) {
        system.log('ApiDataSource: ' + this.collection + ': get ' + pk);
        var url = this.getBaseUrl() + pk;
        var p = this.getParamsDict(fields);
        if (!$.isEmptyObject(p)) {
            url += '?' + this.getParams(p);
        }
        return this.ajax.get(url);
    };

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

    api.ApiDataSource.prototype.getMultiple = function(pks, fields) {
        system.log('ApiDataSource: ' + this.collection + ': getMultiple ' + pks);
        var url = this.getBaseUrl() + pks.join(',') + ',';
        var p = this.getParamsDict(fields);
        if (!$.isEmptyObject(p)) {
            url += '?' + this.getParams(p);
        }
        return this.ajax.get(url);
    };

    api.ApiDataSource.prototype.delete = function(pk) {
        system.log('ApiDataSource: ' + this.collection + ': delete ' + pk);
        var url = this.getBaseUrl() + pk + '/delete';
        return this.ajax.get(url);
    };

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

    api.ApiDataSource.prototype.getBaseUrl = function() {
        return this._baseUrl;
    };

    api.ApiDataSource.prototype.getParams = function(data) {
        return $.param(this.ajax._prepareDict(data));
    };

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
/**
 * The KeyValue module
 * @module KeyValue
 * a helper class that can read KeyValues
 * TODO: we'll use objects like these probably in a class inherited from Base
 * TODO: implement this just like in web_2014
 */
define('keyvalue',['jquery'], function ($) {

    var DEFAULTS = {
        id: '',
        pk: '',
        key: '',
        value: null,
        modified: null,
        by: null
    };

    /**
     * @class KeyValue
     * @constructor
     */
    var KeyValue = function(spec) {
        this.ds = spec.ds;
        this.fields = spec.fields;

        this.raw = null; // the raw json object
        this.id = spec.id || DEFAULTS.id;
        this.pk = spec.pk || DEFAULTS.pk;
        this.key = spec.key || DEFAULTS.key;
        this.value = spec.value || DEFAULTS.value;
        this.modified = spec.modified || DEFAULTS.modified;
        this.by = spec.by || DEFAULTS.by;
    };

    /**
     * Checks if the document exists in the database
     * @method existsInDb
     * @returns {boolean}
     */
    KeyValue.prototype.existsInDb = function() {
        return (this.id!=null) && (this.id.length>0);
    };

    /**
     * Gets the name for this keyValue
     * @method getName
     * @returns {string}
     */
    KeyValue.prototype.getName = function() {
        var keyParts = this.key.split(";");
        return keyParts[0].split('.').pop().split('+').join(' ');
    };

    /**
     * Gets the unit for this keyValue, if no unit returns ""
     * @method getUnit
     * @returns {string}
     */
    KeyValue.prototype.getUnit = function() {
        var keyParts = this.key.split(";");
        return (keyParts.length==2) ? keyParts[1] : "";
    };

    /**
     * Checks if the object is empty
     * after calling reset() isEmpty() should return true
     * @method isEmpty
     * @returns {boolean}
     */
    KeyValue.prototype.isEmpty = function() {
        return (
            (this.id == DEFAULTS.id) &&
            (this.pk == DEFAULTS.pk) &&
            (this.key == DEFAULTS.key) &&
            (this.value == DEFAULTS.value) &&
            (this.modified == DEFAULTS.modified) &&
            (this.by == DEFAULTS.by));
    };

    /**
     * Checks if the object has changed
     * @method isDirty
     * @returns {boolean}
     */
    KeyValue.prototype.isDirty = function() {
        return false;
    };

    /**
     * Checks if the object is valid
     * @method isValid
     * @returns {boolean}
     */
    KeyValue.prototype.isValid = function() {
        return true;
    };

    /**
     * Resets the object
     * @method reset
     * @returns promise
     */
    KeyValue.prototype.reset = function() {
        return this._fromJson(DEFAULTS, null);
    };

    /**
     * _toJson, makes a dict of the object
     * @method _toJson
     * @param options
     * @returns {{}}
     * @private
     */
    KeyValue.prototype._toJson = function(options) {
        return {
            id: this.id,
            pk: this.pk,
            key: this.key,
            value: this.value,
            modified: this.modified,
            by: this.by
        };
    };

    /**
     * _fromJson: in this implementation we'll only read
     * the data.keyValues into: comments, attachments, keyValues
     * @method _fromJson
     * @param {object} data the json response
     * @param {object} options dict
     * @returns promise
     */
    KeyValue.prototype._fromJson = function(data, options) {
        this.raw = data;
        this.id = data.id || DEFAULTS.id;
        this.pk = data.pk || DEFAULTS.pk;
        this.key = data.key || DEFAULTS.key;
        this.value = data.value || DEFAULTS.value;
        this.modified = data.modified || DEFAULTS.modified;
        this.by = data.by || DEFAULTS.by;
        return $.Deferred().resolve(data);
    };

//
//    KeyValue.prototype.canDelete = function(by) {
//        // Inheriting classes can do something useful with this
//        return true;
//    };
//
//    KeyValue.prototype.canEdit = function(by) {
//        // Inheriting classes can do something useful with this
//        return true;
//    };
//
//    /**
//     Managing document KeyValues
//     */
//
//    /**
//     * _addKeyValue adds a KeyValue by its key and a value
//     * @param key
//     * @param value
//     * @param kind
//     * @returns {*}
//     * @private
//     */
//    KeyValue.prototype._addKeyValue = function(key, value, kind) {
//        if (this.existsInDb()) {
//            return $.Deferred().reject(new Error("_addKeyValue cannot add if it already exists in the database"));
//        }
//
//        var that = this;
//        this.isBusy(true);
//        return this.ds.call(this.pk, 'addKeyValue', {key: key, value: value, kind: kind, _fields: this.fields})
//            .then(function() {
//                that.reset();
//            })
//            .always(function() {
//                that.isBusy(false);
//            });
//    };
//
//    /**
//     * _updateKeyValue updates a KeyValue by its key and a new value
//     * @param key
//     * @param value
//     * @param kind
//     * @returns {*}
//     * @private
//     */
//    KeyValue.prototype._updateKeyValue = function(key, value, kind) {
//        if (!this.existsInDb()) {
//            return $.Deferred().reject(new Error("_updateKeyValue cannot update if it doesn't exist in the database"));
//        }
//
//        var that = this;
//        this.isBusy(true);
//        return this.ds.call(this.pk, 'updateKeyValue', {key: key, value: value, kind: kind, _fields: this.fields})
//            .then(function() {
//                that.reset();
//            })
//            .always(function() {
//                that.isBusy(false);
//            });
//    };
//
//    /**
//     * _removeKeyValue removes a KeyValue by its guid id
//     * @returns {*}
//     * @private
//     */
//    KeyValue.prototype._removeKeyValue = function() {
//        if (!this.existsInDb()) {
//            return $.Deferred().reject(new Error("_removeKeyValue cannot remove keyvalue if it doesn't exist in the database"));
//        }
//
//        if (!this.canDelete(this.by)) {
//            return $.Deferred().reject(new Error("_removeKeyValue cannot remove keyvalue"));
//        }
//
//        var that = this;
//        this.isBusy(true);
//        this.isDeleting(true);
//        return this.ds.call(this.pk, 'removeKeyValue', {id: this.id, _fields: this.fields})
//            .then(function() {
//                that.reset();
//            })
//            .always(function() {
//                that.isBusy(false);
//                that.isDeleting(false);
//            });
//    };

    return KeyValue;
});
/**
 * The Attachment module
 * @module attachment
 * an Attachment class inheriting from KeyValue
 */
define('Attachment',[
    'jquery',
    'keyvalue'], function ($, KeyValue) {

    var EXT = /(?:\.([^.]+))?$/;
    var IMAGES = ['jpg', 'png'];
    var PREVIEWS = ['jpg', 'png', 'doc', 'docx', 'pdf'];
    var DEFAULTS = {
        isCover: false,
        canBeCover: true
    };

    // Allow overriding the ctor during inheritance
    // http://stackoverflow.com/questions/4152931/javascript-inheritance-call-super-constructor-or-use-prototype-chain
    var tmp = function() {};
    tmp.prototype = KeyValue.prototype;

    /**
     * @class Attachment
     * @constructor
     * @extends KeyValue
     */
    var Attachment = function(spec) {
        KeyValue.call(this, spec);

        this.isCover = (spec.isCover!=null) ? spec.isCover : DEFAULTS.isCover;
        this.canBeCover = (spec.canBeCover!=null) ? spec.canBeCover : DEFAULTS.canBeCover;
    };

    Attachment.prototype = new tmp();
    Attachment.prototype.constructor = Attachment;

    /**
     * Gets the extension part of a filename
     * @param name
     * @returns {string}
     */
    Attachment.prototype.getExt = function(name) {
        name = name || this.getName();
        return EXT.exec(name)[1] || "";
    };

    /**
     * Checks if the attachment is an image
     * @returns {boolean}
     */
    Attachment.prototype.isImage = function() {
        var name = this.getName();
        var ext = this.getExt(name);
        return ($.inArray(ext, IMAGES) >= 0);
    };

    /**
     * Checks if the attachment has a preview
     * @returns {boolean}
     */
    Attachment.prototype.hasPreview = function() {
        var name = this.getName();
        var ext = this.getExt(name);
        return ($.inArray(ext, PREVIEWS) >= 0);
    };

    return Attachment;
});
/**
 * The Document module
 * @module document
 * a base class for all documents from the CHECKROOM API
 */
define('document',[
    'jquery',
    'common',
    'api'], function ($, common, api) {

    // Some constant values
    var DEFAULTS = {
        id: ""
    };

    /**
     * @class Document
     * @constructor
     */
    var Document = function(spec) {
        this.ds = spec.ds;                                              // ApiDataSource object
        this.fields = spec.fields;                                      // e.g. [*]

        this.raw = null;                                                // raw json object
        this.id = spec.id || DEFAULTS.id;                               // doc _id
    };

    /**
     * Resets the object
     * @method reset
     * @returns {promise}
     */
    Document.prototype.reset = function() {
        // By default, reset just reads from the DEFAULTS dict again
        return this._fromJson(this._getDefaults(), null);
    };

    /**
     * Checks if the document exists in the database
     * @method existsInDb
     * @returns {boolean}
     */
    Document.prototype.existsInDb = function() {
        // Check if we have a primary key
        return (this.id!=null) && (this.id.length>0);
    };

    /**
     * Checks if the object is empty
     * @method isEmpty
     * @returns {boolean}
     */
    Document.prototype.isEmpty = function() {
        return true;
    };

    /**
     * Checks if the object needs to be saved
     * We don't check any of the keyvalues (or comments, attachments) here
     * @method isDirty
     * @returns {boolean}
     */
    Document.prototype.isDirty = function() {
        return false;
    };

    /**
     * Checks if the object is valid
     * @method isValid
     * @returns {boolean}
     */
    Document.prototype.isValid = function() {
        return true;
    };

    /**
     * Discards any changes made to the object from the previously loaded raw response
     * or resets it when no old raw response was found
     * @method discardChanges
     * @returns {promise}
     */
    Document.prototype.discardChanges = function() {
        return (this.raw) ? this._fromJson(this.raw, null) : this.reset();
    };

    /**
     * Reloads the object from db
     * @method reload
     * @param fields
     * @returns {promise}
     */
    Document.prototype.reload = function(fields) {
        if (this.existsInDb()) {
            return this.get(fields);
        } else {
            return $.Deferred().reject(new api.ApiError('Cannot reload document, id is empty or null'));
        }
    };

    /**
     * Gets an object by the default api.get
     * @method get
     * @param fields
     * @returns {promise}
     */
    Document.prototype.get = function(fields) {
        if (this.existsInDb()) {
            var that = this;
            return this.ds.get(this.id, fields || this.fields)
                .then(function(data) {
                    return that._fromJson(data);
                });
        } else {
            return $.Deferred().reject(new api.ApiError('Cannot get document, id is empty or null'));
        }
    };

    /**
     * Creates an object by the default api.create
     * @method create
     * @param skipRead skips reading the response via _fromJson (false)
     * @returns {promise}
     */
    Document.prototype.create = function(skipRead) {
        if (this.existsInDb()) {
            return $.Deferred().reject(new Error("Cannot create document, already exists in database"));
        }
        if (this.isEmpty()) {
            return $.Deferred().reject(new Error("Cannot create empty document"));
        }
        if (!this.isValid()) {
            return $.Deferred().reject(new Error("Cannot create, invalid document"));
        }

        var that = this;
        var data = this._toJson();
        delete data.id;
        return this.ds.create(data, this.fields)
            .then(function(data) {
                return (skipRead==true) ? data : that._fromJson(data);
            });
    };

    /**
     * Updates an object by the default api.update
     * @method update
     * @param skipRead skips reading the response via _fromJson (false)
     * @returns {promise}
     */
    Document.prototype.update = function(skipRead) {
        if (!this.existsInDb()) {
            return $.Deferred().reject(new Error("Cannot update document without id"));
        }
        if (this.isEmpty()) {
            return $.Deferred().reject(new Error("Cannot update to empty document"));
        }
        if (!this.isValid()) {
            return $.Deferred().reject(new Error("Cannot update, invalid document"));
        }

        var that = this;
        var data = this._toJson();
        delete data.id;
        return this.ds.update(this.id, data, this.fields)
            .then(function(data) {
                return (skipRead==true) ? data : that._fromJson(data);
            });
    };

    /**
     * Deletes an object by the default api.delete
     * @method delete
     * @returns {promise}
     */
    Document.prototype.delete = function() {
        // Call the api /delete on this document
        if (this.existsInDb()) {
            var that = this;
            return this.ds.delete(this.id)
                .then(function() {
                    return that.reset();
                });
        } else {
            return $.Deferred().reject(new Error("Contact does not exist"));
        }
    };


    // toJson, fromJson
    // ----
    Document.prototype._getDefaults = function() {
        return DEFAULTS;
    };

    /**
     * _toJson, makes a dict of this object
     * Possibly inheriting classes will override this method,
     * because not all fields can be set during create / update
     * @param options
     * @returns {{}}
     * @private
     */
    Document.prototype._toJson = function(options) {
        return {
            id: this.id
        };
    };

    /**
     * _fromJson: in this implementation we'll only read
     * the data.keyValues into: comments, attachments, keyValues
     * @method _fromJson
     * @param {object} data the json response
     * @param {object} options dict
     * @private
     */
    Document.prototype._fromJson = function(data, options) {
        this.raw = data;
        this.id = data._id || DEFAULTS.id;
        return $.Deferred().resolve(data);
    };

    // Implementation stuff
    // ---

    /**
     * Wrapping the this.ds.call method
     * {pk: '', method: '', params: {}, fields: '', timeOut: null, usePost: null, skipRead: null}
     * @param spec
     * @returns {promise}
     * @private
     */
    Document.prototype._doApiCall = function(spec) {
        var that = this;
        return this.ds.call(
                (spec.collectionCall==true) ? null : (spec.pk || this.id),
                spec.method,
                spec.params,
                spec.fields || this.fields,
                spec.timeOut,
                spec.usePost)
            .then(function(data) {
                return (spec.skipRead==true) ? data : that._fromJson(data);
            });
    };

    return Document;

});

/**
 * The Comment module
 * @module comment
 * a helper class that can read a Comment KeyValue
 * Comment inherits from KeyValue and adds some specifics to it
 */
define('comment',[
    'jquery',
    'keyvalue'], function ($, KeyValue) {

    var KEY = "cheqroom.Comment";
    var DEFAULTS = {
    };

    // Allow overriding the ctor during inheritance
    // http://stackoverflow.com/questions/4152931/javascript-inheritance-call-super-constructor-or-use-prototype-chain
    var tmp = function() {};
    tmp.prototype = KeyValue.prototype;

    /**
     * @class Comment
     * @constructor
     * @extends KeyValue
     */
    var Comment = function(spec) {
        KeyValue.call(this, spec);
    };

    Comment.prototype = new tmp();
    Comment.prototype.constructor = Comment;

//    Comment.prototype._fromJson = function(json) {
//        return KeyValue.prototype._fromJson.call(this, json)
//            .then(function() {
//                this.comment(json.value || DEFAULTS.comment);
//            });
//    };
//
//    Comment.prototype.isEmpty = function() {
//        // Comments have a special call for determining if they're empty or not
//        var comment = $.trim(this.comment());
//        return (comment.length == 0);
//    };
//
//    Comment.prototype.canDelete = function(by) {
//        // TODO: Comments can only be deleted by the same user that made them
//        return true;
//    };
//
//    Comment.prototype.canEdit = function(by) {
//        // TODO: Comments can only be edited by the same user that made them
//        return true;
//    };
//
//    /**
//    Managing document KeyValues
//     */
//    Comment.prototype.addComment = function() {
//        if (this.isEmpty()) {
//            return $.Deferred().reject(new Error("addComment cannot add empty comment"));
//        }
//        return KeyValue.prototype._addKeyValue(KEY, this.comment(), 'string');
//    };
//
//    Comment.prototype.updateComment = function() {
//        if (this.isEmpty()) {
//            return $.Deferred().reject(new Error("updateComment cannot update to empty comment"));
//        }
//        return KeyValue.prototype._updateKeyValue(KEY, this.comment(), 'string');
//    };
//
//    Comment.prototype.deleteComment = function() {
//        return KeyValue.prototype._removeKeyValue();
//    };

    return Comment;
});
/**
 * The Attachment module
 * @module attachment
 * an Attachment class inheriting from KeyValue
 */
define('attachment',[
    'jquery',
    'keyvalue'], function ($, KeyValue) {

    var EXT = /(?:\.([^.]+))?$/;
    var IMAGES = ['jpg', 'png'];
    var PREVIEWS = ['jpg', 'png', 'doc', 'docx', 'pdf'];
    var DEFAULTS = {
        isCover: false,
        canBeCover: true
    };

    // Allow overriding the ctor during inheritance
    // http://stackoverflow.com/questions/4152931/javascript-inheritance-call-super-constructor-or-use-prototype-chain
    var tmp = function() {};
    tmp.prototype = KeyValue.prototype;

    /**
     * @class Attachment
     * @constructor
     * @extends KeyValue
     */
    var Attachment = function(spec) {
        KeyValue.call(this, spec);

        this.isCover = (spec.isCover!=null) ? spec.isCover : DEFAULTS.isCover;
        this.canBeCover = (spec.canBeCover!=null) ? spec.canBeCover : DEFAULTS.canBeCover;
    };

    Attachment.prototype = new tmp();
    Attachment.prototype.constructor = Attachment;

    /**
     * Gets the extension part of a filename
     * @param name
     * @returns {string}
     */
    Attachment.prototype.getExt = function(name) {
        name = name || this.getName();
        return EXT.exec(name)[1] || "";
    };

    /**
     * Checks if the attachment is an image
     * @returns {boolean}
     */
    Attachment.prototype.isImage = function() {
        var name = this.getName();
        var ext = this.getExt(name);
        return ($.inArray(ext, IMAGES) >= 0);
    };

    /**
     * Checks if the attachment has a preview
     * @returns {boolean}
     */
    Attachment.prototype.hasPreview = function() {
        var name = this.getName();
        var ext = this.getExt(name);
        return ($.inArray(ext, PREVIEWS) >= 0);
    };

    return Attachment;
});
/**
 * The Base module
 * @module base
 * a base class for all documents that have: comments, attachments, other keyvalues
 * it inherits from Document to support some basic actions
 */
define('Base',[
    'jquery',
    'common',
    'api',
    'document',
    'comment',
    'attachment',
    'keyvalue'], function ($, common, api, Document, Comment, Attachment, KeyValue) {

    // Some constant values
    var COMMENT = "cheqroom.Comment",
        ATTACHMENT = "cheqroom.Attachment",
        IMAGE = "cheqroom.prop.Image",
        DEFAULTS = {
            id: "",
            modified: null,
            cover: null,
            comments: [],
            attachments: [],
            keyValues: []
        };

    // Allow overriding the ctor during inheritance
    // http://stackoverflow.com/questions/4152931/javascript-inheritance-call-super-constructor-or-use-prototype-chain
    var tmp = function(){};
    tmp.prototype = Document.prototype;

    /**
     * @class Base
     * @constructor
     * @extends Document
     */
    var Base = function(opt) {
        var spec = $.extend({}, opt);
        Document.call(this, spec);

        this.crtype = spec.crtype;                                              // e.g. cheqroom.types.customer
        this.modified = spec.modified || DEFAULTS.modified;                     // last modified timestamp in momentjs
        this.comments = spec.comments || DEFAULTS.comments.slice();             // comments array
        this.attachments = spec.attachments || DEFAULTS.attachments.slice();    // attachments array
        this.keyValues = spec.keyValues || DEFAULTS.keyValues.slice();          // keyValues array
        this.cover = spec.cover || DEFAULTS.cover;                              // cover attachment id, default null
    };

    Base.prototype = new tmp();
    Base.prototype.constructor = Base;

    //
    // Document overrides
    //
    Base.prototype._getDefaults = function() {
        return DEFAULTS;
    };

    /**
     * Checks if the object is empty
     * after calling reset() isEmpty() should return true
     * We'll only check for comments, attachments, keyValues here
     * @method isEmpty
     */
    Base.prototype.isEmpty = function() {
        return (
            ((this.comments==null) || (this.comments.length==0)) &&
                ((this.attachments==null) || (this.attachments.length==0)) &&
                ((this.keyValues==null) || (this.keyValues.length==0))
            );
    };

    /**
     * Checks via the api if we can delete the document
     * @method canDelete
     * @returns {promise}
     */
    Base.prototype.canDelete = function() {
        // Documents can only be deleted when they have a pk
        if (this.existsInDb()) {
            return this.ds.call(this.id, 'canDelete')
                .then(function(resp) {
                    return resp.result;
                });
        } else {
            return $.Deferred().resolve(false);
        }
    };

    // Comments
    // ----
    Base.prototype.addComment = function(comment, skipRead) {
        return this.addKeyValue(COMMENT, comment, "string", skipRead);
    };

    Base.prototype.updateComment = function(id, comment, skipRead) {
        return this.updateKeyValue(id, COMMENT, comment, "string", skipRead);
    };

    Base.prototype.deleteComment = function(id, skipRead) {
        return this.removeKeyValue(id);
    };

    // KeyValue stuff
    // ----
    Base.prototype.addKeyValue = function(key, value, kind, skipRead) {
        return this._doApiCall({
            method: 'addKeyValue',
            params: {key: key, value: value, kind: kind},
            skipRead: skipRead
        });
    };

    Base.prototype.updateKeyValue = function(id, key, value, kind, skipRead) {
        return this._doApiCall({
            method: 'updateKeyValue',
            params: {id: id, key: key, value: value, kind: kind},
            skipRead: skipRead
        });
    };

    Base.prototype.removeKeyValue = function(id, skipRead) {
        return this._doApiCall({
            method: 'removeKeyValue',
            params: {id: id},
            skipRead: skipRead
        });
    };

    Base.prototype.setKeyValue = function(id, key, value, kind, skipRead) {
        var params = {key: key, value: value, kind: kind};
        if( (id!=null) &&
            (id.length>0)) {
            params.id = id;
        }
        return this._doApiCall({
            method: 'setKeyValue',
            params: params,
            skipRead: skipRead
        });
    };

    // Attachments stuff
    // ----
    Base.prototype.setCover = function(att, skipRead) {
        return this._doApiCall({
            method: 'setCover',
            params: {kvId: att.id},
            skipRead: skipRead
        });
    };

    Base.prototype.attachImage = function(att, skipRead) {
        return this.attach(att, IMAGE, skipRead);
    };

    Base.prototype.attachFile = function(att, skipRead) {
        return this.attach(att, ATTACHMENT, skipRead);
    };

    /**
     attaches an Attachment object
     */
    Base.prototype.attach = function(att, key, skipRead) {
        if (this.existsInDb()) {
            return this._doApiCall({
                method: 'attach',
                params: {attachments: [att._id], key: key},
                skipRead: skipRead
            });
        } else {
            return $.Deferred().reject(new api.ApiError('Cannot attach attachment, id is empty or null'));
        }
    };

    /**
     detaches an Attachment by kvId (guid)
     */
    Base.prototype.detach = function(keyId, skipRead) {
        if (this.existsInDb()) {
            return this._doApiCall({
                method: 'detach',
                params: {attachments: [keyId], kvId: keyId},
                skipRead: skipRead
            });
        } else {
            return $.Deferred().reject(new api.ApiError('Cannot detach attachment, id is empty or null'));
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
    Base.prototype._toJson = function(options) {
        return Document.prototype._toJson.call(this, options);
    };

    /**
     * _fromJson: read some basic information
     * @method _fromJson
     * @param {object} data the json response
     * @param {object} options dict
     */
    Base.prototype._fromJson = function(data, options) {
        var that = this;
        return Document.prototype._fromJson.call(this, data, options)
            .then(function() {
                that.modified = data.modified || DEFAULTS.modified;
                return that._fromKeyValuesJson(data, options);
            });
    };

    /**
     * _fromKeyValuesJson: reads the data.keyValues
     * @method _fromKeyValuesJson
     * @param data
     * @param options
     * @returns {*}
     * @private
     */
    Base.prototype._fromKeyValuesJson = function(data, options) {
        // Read only the .keyValues part of the response
        var obj = null;
        var that = this;

        this.comments = DEFAULTS.comments.slice();
        this.attachments = DEFAULTS.attachments.slice();
        this.keyValues = DEFAULTS.keyValues.slice();
        this.cover = data.cover || DEFAULTS.cover;

        if( (data.keyValues) &&
            (data.keyValues.length)) {

            // Reverse sorting with underscorejs
            //var kvs = _.sortBy(data.keyValues, function(kv) { return kv.modified});
            //kvs.reverse();

            // TODO?
            // Sort so the newest keyvalues are first in the array
            var kvs = data.keyValues.sort(function(a, b) {
                return b.modified > a.modified;
            });

            $.each(kvs, function(i, kv) {
                switch(kv.key) {
                    case COMMENT:
                        obj = that._getComment(kv, options);
                        if (obj) {
                            that.comments = that.comments || [];
                            that.comments.push(obj);
                        }
                        break;
                    case IMAGE:
                    case ATTACHMENT:
                        obj = that._getAttachment(kv, options);
                        if (obj) {
                            that.attachments = that.attachments || [];
                            that.attachments.push(obj);
                        }
                        break;
                    default:
                        obj = that._getKeyValue(kv, options);
                        if (obj) {
                            that.keyValues = that.keyValues || [];
                            that.keyValues.push(obj);
                        }
                        break;
                }
            });
        }

        return $.Deferred().resolve(data);
    };

    Base.prototype._getComment = function(kv, options) {
        var spec = $.extend({
                ds: this.ds,
                fields: this.fields},
            options || {},
            kv);
        return new Comment(spec);
    };

    Base.prototype._getAttachment = function(kv, options) {
        var spec = $.extend({
                ds: this.ds,
                fields: this.fields},
            options || {},  // can contain; isCover, canBeCover
            kv);
        return new Attachment(spec);
    };

    Base.prototype._getKeyValue = function(kv, options) {
        var spec = $.extend({
                ds: this.ds,
                fields: this.fields},
            options || {},
            kv);
        return new KeyValue(spec);
    };

    return Base;

});

/**
 * The Comment module
 * @module comment
 * a helper class that can read a Comment KeyValue
 * Comment inherits from KeyValue and adds some specifics to it
 */
define('Comment',[
    'jquery',
    'keyvalue'], function ($, KeyValue) {

    var KEY = "cheqroom.Comment";
    var DEFAULTS = {
    };

    // Allow overriding the ctor during inheritance
    // http://stackoverflow.com/questions/4152931/javascript-inheritance-call-super-constructor-or-use-prototype-chain
    var tmp = function() {};
    tmp.prototype = KeyValue.prototype;

    /**
     * @class Comment
     * @constructor
     * @extends KeyValue
     */
    var Comment = function(spec) {
        KeyValue.call(this, spec);
    };

    Comment.prototype = new tmp();
    Comment.prototype.constructor = Comment;

//    Comment.prototype._fromJson = function(json) {
//        return KeyValue.prototype._fromJson.call(this, json)
//            .then(function() {
//                this.comment(json.value || DEFAULTS.comment);
//            });
//    };
//
//    Comment.prototype.isEmpty = function() {
//        // Comments have a special call for determining if they're empty or not
//        var comment = $.trim(this.comment());
//        return (comment.length == 0);
//    };
//
//    Comment.prototype.canDelete = function(by) {
//        // TODO: Comments can only be deleted by the same user that made them
//        return true;
//    };
//
//    Comment.prototype.canEdit = function(by) {
//        // TODO: Comments can only be edited by the same user that made them
//        return true;
//    };
//
//    /**
//    Managing document KeyValues
//     */
//    Comment.prototype.addComment = function() {
//        if (this.isEmpty()) {
//            return $.Deferred().reject(new Error("addComment cannot add empty comment"));
//        }
//        return KeyValue.prototype._addKeyValue(KEY, this.comment(), 'string');
//    };
//
//    Comment.prototype.updateComment = function() {
//        if (this.isEmpty()) {
//            return $.Deferred().reject(new Error("updateComment cannot update to empty comment"));
//        }
//        return KeyValue.prototype._updateKeyValue(KEY, this.comment(), 'string');
//    };
//
//    Comment.prototype.deleteComment = function() {
//        return KeyValue.prototype._removeKeyValue();
//    };

    return Comment;
});
/**
 * The Base module
 * @module base
 * a base class for all documents that have: comments, attachments, other keyvalues
 * it inherits from Document to support some basic actions
 */
define('base',[
    'jquery',
    'common',
    'api',
    'document',
    'comment',
    'attachment',
    'keyvalue'], function ($, common, api, Document, Comment, Attachment, KeyValue) {

    // Some constant values
    var COMMENT = "cheqroom.Comment",
        ATTACHMENT = "cheqroom.Attachment",
        IMAGE = "cheqroom.prop.Image",
        DEFAULTS = {
            id: "",
            modified: null,
            cover: null,
            comments: [],
            attachments: [],
            keyValues: []
        };

    // Allow overriding the ctor during inheritance
    // http://stackoverflow.com/questions/4152931/javascript-inheritance-call-super-constructor-or-use-prototype-chain
    var tmp = function(){};
    tmp.prototype = Document.prototype;

    /**
     * @class Base
     * @constructor
     * @extends Document
     */
    var Base = function(opt) {
        var spec = $.extend({}, opt);
        Document.call(this, spec);

        this.crtype = spec.crtype;                                              // e.g. cheqroom.types.customer
        this.modified = spec.modified || DEFAULTS.modified;                     // last modified timestamp in momentjs
        this.comments = spec.comments || DEFAULTS.comments.slice();             // comments array
        this.attachments = spec.attachments || DEFAULTS.attachments.slice();    // attachments array
        this.keyValues = spec.keyValues || DEFAULTS.keyValues.slice();          // keyValues array
        this.cover = spec.cover || DEFAULTS.cover;                              // cover attachment id, default null
    };

    Base.prototype = new tmp();
    Base.prototype.constructor = Base;

    //
    // Document overrides
    //
    Base.prototype._getDefaults = function() {
        return DEFAULTS;
    };

    /**
     * Checks if the object is empty
     * after calling reset() isEmpty() should return true
     * We'll only check for comments, attachments, keyValues here
     * @method isEmpty
     */
    Base.prototype.isEmpty = function() {
        return (
            ((this.comments==null) || (this.comments.length==0)) &&
                ((this.attachments==null) || (this.attachments.length==0)) &&
                ((this.keyValues==null) || (this.keyValues.length==0))
            );
    };

    /**
     * Checks via the api if we can delete the document
     * @method canDelete
     * @returns {promise}
     */
    Base.prototype.canDelete = function() {
        // Documents can only be deleted when they have a pk
        if (this.existsInDb()) {
            return this.ds.call(this.id, 'canDelete')
                .then(function(resp) {
                    return resp.result;
                });
        } else {
            return $.Deferred().resolve(false);
        }
    };

    // Comments
    // ----
    Base.prototype.addComment = function(comment, skipRead) {
        return this.addKeyValue(COMMENT, comment, "string", skipRead);
    };

    Base.prototype.updateComment = function(id, comment, skipRead) {
        return this.updateKeyValue(id, COMMENT, comment, "string", skipRead);
    };

    Base.prototype.deleteComment = function(id, skipRead) {
        return this.removeKeyValue(id);
    };

    // KeyValue stuff
    // ----
    Base.prototype.addKeyValue = function(key, value, kind, skipRead) {
        return this._doApiCall({
            method: 'addKeyValue',
            params: {key: key, value: value, kind: kind},
            skipRead: skipRead
        });
    };

    Base.prototype.updateKeyValue = function(id, key, value, kind, skipRead) {
        return this._doApiCall({
            method: 'updateKeyValue',
            params: {id: id, key: key, value: value, kind: kind},
            skipRead: skipRead
        });
    };

    Base.prototype.removeKeyValue = function(id, skipRead) {
        return this._doApiCall({
            method: 'removeKeyValue',
            params: {id: id},
            skipRead: skipRead
        });
    };

    Base.prototype.setKeyValue = function(id, key, value, kind, skipRead) {
        var params = {key: key, value: value, kind: kind};
        if( (id!=null) &&
            (id.length>0)) {
            params.id = id;
        }
        return this._doApiCall({
            method: 'setKeyValue',
            params: params,
            skipRead: skipRead
        });
    };

    // Attachments stuff
    // ----
    Base.prototype.setCover = function(att, skipRead) {
        return this._doApiCall({
            method: 'setCover',
            params: {kvId: att.id},
            skipRead: skipRead
        });
    };

    Base.prototype.attachImage = function(att, skipRead) {
        return this.attach(att, IMAGE, skipRead);
    };

    Base.prototype.attachFile = function(att, skipRead) {
        return this.attach(att, ATTACHMENT, skipRead);
    };

    /**
     attaches an Attachment object
     */
    Base.prototype.attach = function(att, key, skipRead) {
        if (this.existsInDb()) {
            return this._doApiCall({
                method: 'attach',
                params: {attachments: [att._id], key: key},
                skipRead: skipRead
            });
        } else {
            return $.Deferred().reject(new api.ApiError('Cannot attach attachment, id is empty or null'));
        }
    };

    /**
     detaches an Attachment by kvId (guid)
     */
    Base.prototype.detach = function(keyId, skipRead) {
        if (this.existsInDb()) {
            return this._doApiCall({
                method: 'detach',
                params: {attachments: [keyId], kvId: keyId},
                skipRead: skipRead
            });
        } else {
            return $.Deferred().reject(new api.ApiError('Cannot detach attachment, id is empty or null'));
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
    Base.prototype._toJson = function(options) {
        return Document.prototype._toJson.call(this, options);
    };

    /**
     * _fromJson: read some basic information
     * @method _fromJson
     * @param {object} data the json response
     * @param {object} options dict
     */
    Base.prototype._fromJson = function(data, options) {
        var that = this;
        return Document.prototype._fromJson.call(this, data, options)
            .then(function() {
                that.modified = data.modified || DEFAULTS.modified;
                return that._fromKeyValuesJson(data, options);
            });
    };

    /**
     * _fromKeyValuesJson: reads the data.keyValues
     * @method _fromKeyValuesJson
     * @param data
     * @param options
     * @returns {*}
     * @private
     */
    Base.prototype._fromKeyValuesJson = function(data, options) {
        // Read only the .keyValues part of the response
        var obj = null;
        var that = this;

        this.comments = DEFAULTS.comments.slice();
        this.attachments = DEFAULTS.attachments.slice();
        this.keyValues = DEFAULTS.keyValues.slice();
        this.cover = data.cover || DEFAULTS.cover;

        if( (data.keyValues) &&
            (data.keyValues.length)) {

            // Reverse sorting with underscorejs
            //var kvs = _.sortBy(data.keyValues, function(kv) { return kv.modified});
            //kvs.reverse();

            // TODO?
            // Sort so the newest keyvalues are first in the array
            var kvs = data.keyValues.sort(function(a, b) {
                return b.modified > a.modified;
            });

            $.each(kvs, function(i, kv) {
                switch(kv.key) {
                    case COMMENT:
                        obj = that._getComment(kv, options);
                        if (obj) {
                            that.comments = that.comments || [];
                            that.comments.push(obj);
                        }
                        break;
                    case IMAGE:
                    case ATTACHMENT:
                        obj = that._getAttachment(kv, options);
                        if (obj) {
                            that.attachments = that.attachments || [];
                            that.attachments.push(obj);
                        }
                        break;
                    default:
                        obj = that._getKeyValue(kv, options);
                        if (obj) {
                            that.keyValues = that.keyValues || [];
                            that.keyValues.push(obj);
                        }
                        break;
                }
            });
        }

        return $.Deferred().resolve(data);
    };

    Base.prototype._getComment = function(kv, options) {
        var spec = $.extend({
                ds: this.ds,
                fields: this.fields},
            options || {},
            kv);
        return new Comment(spec);
    };

    Base.prototype._getAttachment = function(kv, options) {
        var spec = $.extend({
                ds: this.ds,
                fields: this.fields},
            options || {},  // can contain; isCover, canBeCover
            kv);
        return new Attachment(spec);
    };

    Base.prototype._getKeyValue = function(kv, options) {
        var spec = $.extend({
                ds: this.ds,
                fields: this.fields},
            options || {},
            kv);
        return new KeyValue(spec);
    };

    return Base;

});

/**
 * The Contact module
 * Contact class inherits from Base so it supports KeyValues (Attachment, Comment)
 * @module contact
 * TODO: In v2 this is still the endpoint for customers
 * TODO: Right now it's just a rename
 */
define('Contact',[
    'jquery',
    'base'], function ($, Base) {

    var DEFAULTS = {
        name: "",
        company: "",
        phone: "",
        email: ""
    };

    // Allow overriding the ctor during inheritance
    // http://stackoverflow.com/questions/4152931/javascript-inheritance-call-super-constructor-or-use-prototype-chain
    var tmp = function() {};
    tmp.prototype = Base.prototype;

    /**
     * @class Contact
     * @constructor
     * @extends Base
     */
    var Contact = function(opt) {
        var spec = $.extend({
            fields: ['*'],
            crtype: 'cheqroom.types.customer'
        }, opt);
        Base.call(this, spec);

        this.name = spec.name || DEFAULTS.name;
        this.company = spec.company || DEFAULTS.company;
        this.phone = spec.phone || DEFAULTS.phone;
        this.email = spec.email || DEFAULTS.email;
    };

    Contact.prototype = new tmp();
    Contact.prototype.constructor = Contact;

    //
    // Specific validators
    //
    Contact.prototype.isValidName = function() {
        // TODO
        return ($.trim(this.name).length>=2);
    };

    Contact.prototype.isValidCompany = function() {
        // TODO
        return ($.trim(this.company).length>=2);
    };

    Contact.prototype.isValidPhone = function() {
        // TODO
        return ($.trim(this.phone).length>=2);
    };

    Contact.prototype.isValidEmail = function() {
        // TODO
        return ($.trim(this.email).length>=2);
    };

    //
    // Base overrides
    //

    /**
     * Checks if the contact has any validation errors
     * @returns {boolean}
     */
    Contact.prototype.isValid = function() {
        return this.isValidName() &&
            this.isValidCompany() &&
            this.isValidPhone() &&
            this.isValidEmail();
    };

    /**
     * Checks if the contact is empty
     * @returns {boolean}
     */
    Contact.prototype.isEmpty = function() {
        return (
            (Base.prototype.isEmpty.call(this)) &&
            (this.name==DEFAULTS.name) &&
            (this.company==DEFAULTS.company) &&
            (this.phone==DEFAULTS.phone) &&
            (this.email==DEFAULTS.email));
    };

    /**
     * Checks if the contact is dirty and needs saving
     * @returns {boolean}
     */
    Contact.prototype.isDirty = function() {
        var isDirty = Base.prototype.isDirty.call(this);
        if( (!isDirty) &&
            (this.raw)) {
            isDirty = (
                    (this.name!=this.raw.name)||
                    (this.company!=this.raw.company)||
                    (this.phone!=this.raw.phone)||
                    (this.email!=this.raw.email)
                );
        }
        return isDirty;
    };

    Contact.prototype._getDefaults = function() {
        return DEFAULTS;
    };

    Contact.prototype._toJson = function(options) {
        var data = Base.prototype._toJson.call(this, options);
        data.name = this.name || DEFAULTS.name;
        data.company = this.company || DEFAULTS.company;
        data.phone = this.phone || DEFAULTS.phone;
        data.email = this.email || DEFAULTS.email;
        return data;
    };

    Contact.prototype._fromJson = function(data, options) {
        var that = this;
        return Base.prototype._fromJson.call(this, data, options)
            .then(function(data) {
                that.name = data.name || DEFAULTS.name;
                that.company = data.company || DEFAULTS.company;
                that.phone = data.phone || DEFAULTS.phone;
                that.email = data.email || DEFAULTS.email;
                $.publish('contact.fromJson', data);
                return data;
            });
    };

    return Contact;
    
});
/**
 * The DateHelper module
 * @module dateHelper
 * a DateHelper class
 */
define('DateHelper',["jquery", "moment"], function ($, moment) {

    // Add a new function to moment
    moment.fn.toJSONDate = function() {
        // toISOString gives the time in Zulu timezone
        // we want the local timezone but in ISO formatting
        return this.format("YYYY-MM-DDTHH:mm:ss.000[Z]");
    };

    // https://github.com/moment/moment/pull/1595
    //m.roundTo('minute', 15); // Round the moment to the nearest 15 minutes.
    //m.roundTo('minute', 15, 'up'); // Round the moment up to the nearest 15 minutes.
    //m.roundTo('minute', 15, 'down'); // Round the moment down to the nearest 15 minutes.
    moment.fn.roundTo = function(units, offset, midpoint) {
        units = moment.normalizeUnits(units);
        offset = offset || 1;
        var roundUnit = function(unit) {
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
    var DateHelper = function(spec) {
        spec = spec || {};
        this.roundType = spec.roundType || "nearest";
        this.roundMinutes = spec.roundMinutes || INCREMENT;
    };

    DateHelper.prototype.getNow = function() {
        // TODO: Use the right MomentJS constructor
        //       This one will be deprecated in the next version
        return moment();
    };

    DateHelper.prototype.getFriendlyDuration = function(duration) {
        return duration.humanize();
    };

    /**
     * Turns all strings that look like datetimes into moment objects recursively
     * @param data
     * @returns {*}
     */
    DateHelper.prototype.fixDates = function(data) {
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
                data[k] = that.fixDates(v);
            });
        }
        return data;
    };

    /**
     * roundTimeFrom uses the time rounding rules to round a begin datetime
     * @param m
     */
    DateHelper.prototype.roundTimeFrom = function(m) {
        return (this.roundMinutes<=1) ? m : this.roundTime(m, this.roundMinutes, this._typeToDirection(this.roundType, "from"));
    };

    /**
     * roundTimeTo uses the time rounding rules to round an end datetime
     * @param m
     */
    DateHelper.prototype.roundTimeTo = function(m) {
        return (this.roundMinutes<=1) ? m : this.roundTime(m, this.roundMinutes, this._typeToDirection(this.roundType, "to"));
    };



    DateHelper.prototype.roundTime = function(m, inc, direction) {
        var mom = (moment.isMoment(m)) ? m : moment(m);
        mom.seconds(0).milliseconds(0);
        return mom.roundTo("minute", inc || INCREMENT, direction);
    };

    DateHelper.prototype.roundTimeUp = function(m, inc) {
        var mom = (moment.isMoment(m)) ? m : moment(m);
        mom.seconds(0).milliseconds(0);
        return mom.roundTo("minute", inc || INCREMENT, "up");
    };

    DateHelper.prototype.roundTimeDown = function(m, inc) {
        var mom = (moment.isMoment(m)) ? m : moment(m);
        mom.seconds(0).milliseconds(0);
        return mom.roundTo("minute", inc || INCREMENT, "down");
    };

    DateHelper.prototype._typeToDirection = function(type, fromto) {
        switch(type) {
            case "longer":
                switch(fromto) {
                    case "from": return "down";
                    case "to": return "up";
                    default: break;
                }
                break;
            case "shorter":
                switch(fromto) {
                    case "from": return "up";
                    case "to": return "down";
                    default: break;
                }
                break;
            default:
                break;
        }
    };

    return DateHelper;

});
/**
 * The Document module
 * @module document
 * a base class for all documents from the CHECKROOM API
 */
define('Document',[
    'jquery',
    'common',
    'api'], function ($, common, api) {

    // Some constant values
    var DEFAULTS = {
        id: ""
    };

    /**
     * @class Document
     * @constructor
     */
    var Document = function(spec) {
        this.ds = spec.ds;                                              // ApiDataSource object
        this.fields = spec.fields;                                      // e.g. [*]

        this.raw = null;                                                // raw json object
        this.id = spec.id || DEFAULTS.id;                               // doc _id
    };

    /**
     * Resets the object
     * @method reset
     * @returns {promise}
     */
    Document.prototype.reset = function() {
        // By default, reset just reads from the DEFAULTS dict again
        return this._fromJson(this._getDefaults(), null);
    };

    /**
     * Checks if the document exists in the database
     * @method existsInDb
     * @returns {boolean}
     */
    Document.prototype.existsInDb = function() {
        // Check if we have a primary key
        return (this.id!=null) && (this.id.length>0);
    };

    /**
     * Checks if the object is empty
     * @method isEmpty
     * @returns {boolean}
     */
    Document.prototype.isEmpty = function() {
        return true;
    };

    /**
     * Checks if the object needs to be saved
     * We don't check any of the keyvalues (or comments, attachments) here
     * @method isDirty
     * @returns {boolean}
     */
    Document.prototype.isDirty = function() {
        return false;
    };

    /**
     * Checks if the object is valid
     * @method isValid
     * @returns {boolean}
     */
    Document.prototype.isValid = function() {
        return true;
    };

    /**
     * Discards any changes made to the object from the previously loaded raw response
     * or resets it when no old raw response was found
     * @method discardChanges
     * @returns {promise}
     */
    Document.prototype.discardChanges = function() {
        return (this.raw) ? this._fromJson(this.raw, null) : this.reset();
    };

    /**
     * Reloads the object from db
     * @method reload
     * @param fields
     * @returns {promise}
     */
    Document.prototype.reload = function(fields) {
        if (this.existsInDb()) {
            return this.get(fields);
        } else {
            return $.Deferred().reject(new api.ApiError('Cannot reload document, id is empty or null'));
        }
    };

    /**
     * Gets an object by the default api.get
     * @method get
     * @param fields
     * @returns {promise}
     */
    Document.prototype.get = function(fields) {
        if (this.existsInDb()) {
            var that = this;
            return this.ds.get(this.id, fields || this.fields)
                .then(function(data) {
                    return that._fromJson(data);
                });
        } else {
            return $.Deferred().reject(new api.ApiError('Cannot get document, id is empty or null'));
        }
    };

    /**
     * Creates an object by the default api.create
     * @method create
     * @param skipRead skips reading the response via _fromJson (false)
     * @returns {promise}
     */
    Document.prototype.create = function(skipRead) {
        if (this.existsInDb()) {
            return $.Deferred().reject(new Error("Cannot create document, already exists in database"));
        }
        if (this.isEmpty()) {
            return $.Deferred().reject(new Error("Cannot create empty document"));
        }
        if (!this.isValid()) {
            return $.Deferred().reject(new Error("Cannot create, invalid document"));
        }

        var that = this;
        var data = this._toJson();
        delete data.id;
        return this.ds.create(data, this.fields)
            .then(function(data) {
                return (skipRead==true) ? data : that._fromJson(data);
            });
    };

    /**
     * Updates an object by the default api.update
     * @method update
     * @param skipRead skips reading the response via _fromJson (false)
     * @returns {promise}
     */
    Document.prototype.update = function(skipRead) {
        if (!this.existsInDb()) {
            return $.Deferred().reject(new Error("Cannot update document without id"));
        }
        if (this.isEmpty()) {
            return $.Deferred().reject(new Error("Cannot update to empty document"));
        }
        if (!this.isValid()) {
            return $.Deferred().reject(new Error("Cannot update, invalid document"));
        }

        var that = this;
        var data = this._toJson();
        delete data.id;
        return this.ds.update(this.id, data, this.fields)
            .then(function(data) {
                return (skipRead==true) ? data : that._fromJson(data);
            });
    };

    /**
     * Deletes an object by the default api.delete
     * @method delete
     * @returns {promise}
     */
    Document.prototype.delete = function() {
        // Call the api /delete on this document
        if (this.existsInDb()) {
            var that = this;
            return this.ds.delete(this.id)
                .then(function() {
                    return that.reset();
                });
        } else {
            return $.Deferred().reject(new Error("Contact does not exist"));
        }
    };


    // toJson, fromJson
    // ----
    Document.prototype._getDefaults = function() {
        return DEFAULTS;
    };

    /**
     * _toJson, makes a dict of this object
     * Possibly inheriting classes will override this method,
     * because not all fields can be set during create / update
     * @param options
     * @returns {{}}
     * @private
     */
    Document.prototype._toJson = function(options) {
        return {
            id: this.id
        };
    };

    /**
     * _fromJson: in this implementation we'll only read
     * the data.keyValues into: comments, attachments, keyValues
     * @method _fromJson
     * @param {object} data the json response
     * @param {object} options dict
     * @private
     */
    Document.prototype._fromJson = function(data, options) {
        this.raw = data;
        this.id = data._id || DEFAULTS.id;
        return $.Deferred().resolve(data);
    };

    // Implementation stuff
    // ---

    /**
     * Wrapping the this.ds.call method
     * {pk: '', method: '', params: {}, fields: '', timeOut: null, usePost: null, skipRead: null}
     * @param spec
     * @returns {promise}
     * @private
     */
    Document.prototype._doApiCall = function(spec) {
        var that = this;
        return this.ds.call(
                (spec.collectionCall==true) ? null : (spec.pk || this.id),
                spec.method,
                spec.params,
                spec.fields || this.fields,
                spec.timeOut,
                spec.usePost)
            .then(function(data) {
                return (spec.skipRead==true) ? data : that._fromJson(data);
            });
    };

    return Document;

});

/**
 * The Item module
 * @module item
 */
define('Item',[
    'jquery',
    'base'], function ($, Base) {

    var FLAG = "cheqroom.prop.Custom",
        DEFAULT_LAT = 0.0,
        DEFAULT_LONG = 0.0,
        DEFAULTS = {
        name: "",
        status: "",
        codes: [],
        flag: "",
        location: "",
        category: "",
        geo: [DEFAULT_LAT,DEFAULT_LONG],
        address: ""
    };
    
    // Allow overriding the ctor during inheritance
    // http://stackoverflow.com/questions/4152931/javascript-inheritance-call-super-constructor-or-use-prototype-chain
    var tmp = function() {};
    tmp.prototype = Base.prototype;

    /**
     * @class Item
     * @constructor
     * @extends Base
     */
    var Item = function(opt) {
        var spec = $.extend({
            fields: ['*'],
            crtype: 'cheqroom.types.item'
        }, opt);
        Base.call(this, spec);

        this.name = spec.name || DEFAULTS.name;
        this.status = spec.status || DEFAULTS.status;
        this.codes = spec.codes || DEFAULTS.codes;
        this.flag = spec.flag || DEFAULTS.flag;
        this.location = spec.location || DEFAULTS.location;     // location._id
        this.category = spec.category || DEFAULTS.category;     // category._id
        this.geo = spec.geo || DEFAULTS.geo.slice();            // null or an array with 2 floats
        this.address = spec.address || DEFAULTS.address;
    };

    Item.prototype = new tmp();
    Item.prototype.constructor = Item;

    //
    // Base overrides
    //

    /**
     * Checks if the item is empty
     * @returns {boolean}
     */
    Item.prototype.isEmpty = function() {
        // Checks for: name, status, codes, flag, location, category
        return (
            (Base.prototype.isEmpty.call(this)) &&
            (this.name==DEFAULTS.name) &&
            (this.status==DEFAULTS.status) &&
            (this.codes.length==0) &&  // not DEFAULTS.codes? :)
            (this.flag==DEFAULTS.flag) &&
            (this.location==DEFAULTS.location) &&
            (this.category==DEFAULTS.category));
    };

    /**
     * Checks if the item is dirty and needs saving
     * @returns {boolean}
     */
    Item.prototype.isDirty = function() {
        return (
            Base.prototype.isDirty.call(this) || 
            this._isDirtyName() ||
            this._isDirtyCategory() ||
            this._isDirtyLocation() ||
            this._isDirtyFlag() ||
            this._isDirtyGeo());
    };

    Item.prototype._getDefaults = function() {
        return DEFAULTS;
    };

    Item.prototype._toJson = function(options) {
        // Writes out; id, name, category, location
        var data = Base.prototype._toJson.call(this, options);
        data.name = this.name || DEFAULTS.name;
        data.category = this.category || DEFAULTS.category;
        data.location = this.location || DEFAULTS.location;
        return data;
    };

    Item.prototype._fromJson = function(data, options) {
        var that = this;
        return Base.prototype._fromJson.call(this, data, options)
            .then(function() {
                that.name = data.name || DEFAULTS.name;
                that.status = data.status || DEFAULTS.status;
                that.codes = data.codes || DEFAULTS.codes;
                that.address = data.address || DEFAULTS.address;
                that.geo = data.geo || DEFAULTS.geo.slice();

                // Depending on the fields we'll need to get the _id directly or from the dicts
                var locId = DEFAULTS.location;
                if (data.location) {
                    locId = (data.location._id) ? data.location._id : data.location;
                }
                that.location = locId;

                var catId = DEFAULTS.category;
                if (data.category) {
                    catId = (data.category._id) ? data.category._id : data.category;
                }
                that.category = catId;

                // Read the flag from the keyvalues
                return that._fromJsonFlag(data, options)
                    .then(function() {
                        $.publish('item.fromJson', data);
                        return data;
                    });
            });
    };

    Item.prototype._fromJsonFlag = function(data, options) {
        var that = this;
        this.flag = DEFAULTS.flag;

        if( (data.keyValues!=null) &&
            (data.keyValues.length>0)) {
            $.each(data.keyValues, function(i, kv) {
                 if (kv.key == FLAG) {
                     that.flag = kv.value;
                     return false;
                 }
            });
        }

        return $.Deferred().resolve(data);
    };

    Item.prototype._getKeyValue = function(kv, options) {
        // Flag is a special keyvalue, we won't read it into keyValues
        // but set it via _fromJsonFlag
        return (kv.key == FLAG) ? null : Base.prototype._getKeyValue(kv, options);
    };

    Item.prototype._isDirtyName = function() {
        if (this.raw) {
            return (this.name!=this.raw.name);
        } else {
            return false;
        }
    };

    Item.prototype._isDirtyLocation = function() {
        if (this.raw) {
            var locId = DEFAULTS.location;
            if (this.raw.location) {
                locId = (this.raw.location._id) ? this.raw.location._id : this.raw.location;
            }
            return (this.location!=locId);
        } else {
            return false;
        }
    };

    Item.prototype._isDirtyCategory = function() {
        if (this.raw) {
            var catId = DEFAULTS.category;
            if (this.raw.category) {
                catId = (this.raw.category._id) ? this.raw.category._id : this.raw.category;
            }
            return (this.category!=catId);
        } else {
            return false;
        }
    };

    Item.prototype._isDirtyFlag = function() {
        if (this.raw) {
            var flag = DEFAULTS.flag;
            if( (this.raw.keyValues) &&
                (this.raw.keyValues.length)) {
                $.each(this.raw.keyValues, function(i, kv) {
                     if (kv.key == FLAG) {
                         flag = kv.value;
                         return false;
                     }
                });
            }
            return (this.flag!=flag);
        } else {
            return false;
        }
    };

    Item.prototype._isDirtyGeo = function() {
        if (this.raw) {
            var address = this.raw.address || DEFAULTS.address;
            var geo = this.raw.geo || DEFAULTS.geo.slice();
            return (
                (this.address!=address) ||
                (this.geo[0]!=geo[0]) ||
                (this.geo[1]!=geo[1]));
        } else {
            return false;
        }
    };

    //
    // Business logic
    //
//
//    /**
//     * updates the Item
//     * We override because Item.update does not support updating categories
//     * @param skipRead
//     * @returns {*}
//     */
//    Item.prototype.update = function(skipRead) {
//        if (this.isEmpty()) {
//            return $.Deferred().reject(new Error("Cannot update to empty document"));
//        }
//        if (!this.existsInDb()) {
//            return $.Deferred().reject(new Error("Cannot update document without id"));
//        }
//        if (!this.isValid()) {
//            return $.Deferred().reject(new Error("Cannot update, invalid document"));
//        }
//
//        var that = this;
//        this.isBusy(true);
//        var pk = this.id;
//        var data = this._toJson();
//
//        // Category is not allowed during update
//        delete data.category;
//
//        return this.ds.update(pk, data, this.fields)
//            .then(function(data) {
//                return (skipRead==true) ? data : that._fromJson(data);
//            }).always(function() {
//                that.isBusy(false);
//            });
//    };
//
//    /**
//     * save
//     */
//    Item.prototype.save = function() {
//        // Works for: name, location, category, flag & geo
//
//        // Avoid doing saves if we try to change a category and it's not allowed
//        var isDirtyCategory = this._isDirtyCategory();
//        var okCategory = null;
//        if (isDirtyCategory) {
//            okCategory = this.canChangeCategory();
//        } else {
//            okCategory = $.Deferred().resolve({result: true});
//        }
//
//        okCategory
//            .done(function(resp) {
//
//            });
//
//        var isNameDirty = this._isDirtyName();
//        var isLocationDirty = this._isDirtyLocation();
//        var isDirtyFlag = this._isDirtyFlag();
//        var isDirtyGeo = this._isDirtyGeo();
//    };

    //
    // TODO: Function calls specific for Item
    // TODO: What with triggered events? Assume we'll handle Intercom on server side!
    //

    /**
     * Duplicates an item a number of tumes
     * @param times
     * @returns {promise}
     */
    Item.prototype.duplicate = function(times) {
        return this._doApiCall({
            method: 'duplicate',
            params: {times: times},
            skipRead: true  // response is an array of new Item objects!!
        });
    };

    /**
     * Expires an item, puts it in the *expired* status
     * @param skipRead
     * @returns {promise}
     */
    Item.prototype.expire = function(skipRead) {
        return this._doApiCall({method: 'expire', skipRead: skipRead});
    };

    /**
     * Un-expires an item, puts it in the *available* status again
     * @param skipRead
     * @returns {promise}
     */
    Item.prototype.undoExpire = function(skipRead) {
        return this._doApiCall({method: 'undoExpire', skipRead: skipRead});
    };

    /**
     * Change the location of an item
     * @param skipRead
     * @returns {promise}
     */
    Item.prototype.changeLocation = function(locationId, skipRead) {
        return this._doApiCall({method: 'changeLocation', params: {location: locationId}, skipRead: skipRead});
    };

    /**
     * Adds a QR code to the item
     * @param code
     * @param skipRead
     * @returns {promise}
     */
    Item.prototype.addCode = function(code, skipRead) {
        return this._doApiCall({method: 'addCodes', params: {codes: [code]}, skipRead: skipRead});
    };

    /**
     * Removes a QR code from the item
     * @param code
     * @param skipRead
     * @returns {promise}
     */
    Item.prototype.removeCode = function(code, skipRead) {
        return this._doApiCall({method: 'removeCodes', params: {codes: [code]}, skipRead: skipRead});
    };

    /**
     * Updates the geo position of an item
     * @param lat
     * @param lng
     * @param address
     * @param skipRead
     * @returns {promise}
     */
    Item.prototype.updateGeo = function(lat, lng, address, skipRead) {
        return this._doApiCall({method: 'updateGeo', params: {lat: lat, lng: lng, address: address}, skipRead: skipRead});
    };

    /**
     * Updates the name of an item
     * @param name
     * @param skipRead
     * @returns {promise}
     */
    Item.prototype.updateName = function(name, skipRead) {
        var that = this;
        return this.ds.update(this.id, {name: name}, this.fields)
            .then(function(data) {
                return (skipRead==true) ? data : that._fromJson(data);
            });
    };

    /**
     * Checks if the item can be moved to another category
     * @param category
     * @returns {promise}
     */
    Item.prototype.canChangeCategory = function(category) {
        return this._doApiCall({
            collectionCall: true,  // it's a collection call, not an Item call
            method: 'canChangeCategory',
            params: {pks:[this.id], category: category},
            skipRead: true  // the response is a hash with results and conflicts
        });
    };

    /**
     * Moves the item to another category
     * @param category
     * @param skipRead
     * @returns {promise}
     */
    Item.prototype.changeCategory = function(category, skipRead) {
        var that = this;
        return this._doApiCall({
            collectionCall: true,  // it's a collection call, not an Item call
            method: 'changeCategory',
            params: {pks:[this.id], category: category},
            skipRead: true  // the response is a list of changed Items
        })
            .then(function(data) {
                return (skipRead==true) ? data : that._fromJson(data[0]);
            });
    };

    /**
     * Sets the flag of an item
     * @param flag
     * @param skipRead
     * @returns {promise}
     */
    Item.prototype.setFlag = function(flag, skipRead) {
        return this.setKeyValue(null, FLAG, flag, "string", skipRead);
    };

    return Item;
    
});
/**
 * The KeyValue module
 * @module KeyValue
 * a helper class that can read KeyValues
 * TODO: we'll use objects like these probably in a class inherited from Base
 * TODO: implement this just like in web_2014
 */
define('KeyValue',['jquery'], function ($) {

    var DEFAULTS = {
        id: '',
        pk: '',
        key: '',
        value: null,
        modified: null,
        by: null
    };

    /**
     * @class KeyValue
     * @constructor
     */
    var KeyValue = function(spec) {
        this.ds = spec.ds;
        this.fields = spec.fields;

        this.raw = null; // the raw json object
        this.id = spec.id || DEFAULTS.id;
        this.pk = spec.pk || DEFAULTS.pk;
        this.key = spec.key || DEFAULTS.key;
        this.value = spec.value || DEFAULTS.value;
        this.modified = spec.modified || DEFAULTS.modified;
        this.by = spec.by || DEFAULTS.by;
    };

    /**
     * Checks if the document exists in the database
     * @method existsInDb
     * @returns {boolean}
     */
    KeyValue.prototype.existsInDb = function() {
        return (this.id!=null) && (this.id.length>0);
    };

    /**
     * Gets the name for this keyValue
     * @method getName
     * @returns {string}
     */
    KeyValue.prototype.getName = function() {
        var keyParts = this.key.split(";");
        return keyParts[0].split('.').pop().split('+').join(' ');
    };

    /**
     * Gets the unit for this keyValue, if no unit returns ""
     * @method getUnit
     * @returns {string}
     */
    KeyValue.prototype.getUnit = function() {
        var keyParts = this.key.split(";");
        return (keyParts.length==2) ? keyParts[1] : "";
    };

    /**
     * Checks if the object is empty
     * after calling reset() isEmpty() should return true
     * @method isEmpty
     * @returns {boolean}
     */
    KeyValue.prototype.isEmpty = function() {
        return (
            (this.id == DEFAULTS.id) &&
            (this.pk == DEFAULTS.pk) &&
            (this.key == DEFAULTS.key) &&
            (this.value == DEFAULTS.value) &&
            (this.modified == DEFAULTS.modified) &&
            (this.by == DEFAULTS.by));
    };

    /**
     * Checks if the object has changed
     * @method isDirty
     * @returns {boolean}
     */
    KeyValue.prototype.isDirty = function() {
        return false;
    };

    /**
     * Checks if the object is valid
     * @method isValid
     * @returns {boolean}
     */
    KeyValue.prototype.isValid = function() {
        return true;
    };

    /**
     * Resets the object
     * @method reset
     * @returns promise
     */
    KeyValue.prototype.reset = function() {
        return this._fromJson(DEFAULTS, null);
    };

    /**
     * _toJson, makes a dict of the object
     * @method _toJson
     * @param options
     * @returns {{}}
     * @private
     */
    KeyValue.prototype._toJson = function(options) {
        return {
            id: this.id,
            pk: this.pk,
            key: this.key,
            value: this.value,
            modified: this.modified,
            by: this.by
        };
    };

    /**
     * _fromJson: in this implementation we'll only read
     * the data.keyValues into: comments, attachments, keyValues
     * @method _fromJson
     * @param {object} data the json response
     * @param {object} options dict
     * @returns promise
     */
    KeyValue.prototype._fromJson = function(data, options) {
        this.raw = data;
        this.id = data.id || DEFAULTS.id;
        this.pk = data.pk || DEFAULTS.pk;
        this.key = data.key || DEFAULTS.key;
        this.value = data.value || DEFAULTS.value;
        this.modified = data.modified || DEFAULTS.modified;
        this.by = data.by || DEFAULTS.by;
        return $.Deferred().resolve(data);
    };

//
//    KeyValue.prototype.canDelete = function(by) {
//        // Inheriting classes can do something useful with this
//        return true;
//    };
//
//    KeyValue.prototype.canEdit = function(by) {
//        // Inheriting classes can do something useful with this
//        return true;
//    };
//
//    /**
//     Managing document KeyValues
//     */
//
//    /**
//     * _addKeyValue adds a KeyValue by its key and a value
//     * @param key
//     * @param value
//     * @param kind
//     * @returns {*}
//     * @private
//     */
//    KeyValue.prototype._addKeyValue = function(key, value, kind) {
//        if (this.existsInDb()) {
//            return $.Deferred().reject(new Error("_addKeyValue cannot add if it already exists in the database"));
//        }
//
//        var that = this;
//        this.isBusy(true);
//        return this.ds.call(this.pk, 'addKeyValue', {key: key, value: value, kind: kind, _fields: this.fields})
//            .then(function() {
//                that.reset();
//            })
//            .always(function() {
//                that.isBusy(false);
//            });
//    };
//
//    /**
//     * _updateKeyValue updates a KeyValue by its key and a new value
//     * @param key
//     * @param value
//     * @param kind
//     * @returns {*}
//     * @private
//     */
//    KeyValue.prototype._updateKeyValue = function(key, value, kind) {
//        if (!this.existsInDb()) {
//            return $.Deferred().reject(new Error("_updateKeyValue cannot update if it doesn't exist in the database"));
//        }
//
//        var that = this;
//        this.isBusy(true);
//        return this.ds.call(this.pk, 'updateKeyValue', {key: key, value: value, kind: kind, _fields: this.fields})
//            .then(function() {
//                that.reset();
//            })
//            .always(function() {
//                that.isBusy(false);
//            });
//    };
//
//    /**
//     * _removeKeyValue removes a KeyValue by its guid id
//     * @returns {*}
//     * @private
//     */
//    KeyValue.prototype._removeKeyValue = function() {
//        if (!this.existsInDb()) {
//            return $.Deferred().reject(new Error("_removeKeyValue cannot remove keyvalue if it doesn't exist in the database"));
//        }
//
//        if (!this.canDelete(this.by)) {
//            return $.Deferred().reject(new Error("_removeKeyValue cannot remove keyvalue"));
//        }
//
//        var that = this;
//        this.isBusy(true);
//        this.isDeleting(true);
//        return this.ds.call(this.pk, 'removeKeyValue', {id: this.id, _fields: this.fields})
//            .then(function() {
//                that.reset();
//            })
//            .always(function() {
//                that.isBusy(false);
//                that.isDeleting(false);
//            });
//    };

    return KeyValue;
});
/**
 * The Location module
 * Location class inherits from Base so it supports KeyValues (Attachment, Comment)
 * @module location
 * TODO: Our UI doesn't support KeyValues of this, so we should override and disable these methods
 */
define('Location',[
    'jquery',
    'base'], function ($, Base) {

    var DEFAULTS = {
        name: '',
        address: ''
    };

    // Allow overriding the ctor during inheritance
    // http://stackoverflow.com/questions/4152931/javascript-inheritance-call-super-constructor-or-use-prototype-chain
    var tmp = function() {};
    tmp.prototype = Base.prototype;

    /**
     * @class Location
     * @constructor
     * @extends Base
     */
    var Location = function(opt) {
        var spec = $.extend({
            fields: ['*']
        }, opt);
        Base.call(this, spec);

        this.name = spec.name || DEFAULTS.name;
        this.address = spec.address || DEFAULTS.address;
    };

    Location.prototype = new tmp();
    Location.prototype.constructor = Location;

    //
    // Document overrides
    //

    /**
     * Checks if the location is empty
     * @returns {boolean}
     */
    Location.prototype.isEmpty = function() {
        return (
            (Base.prototype.isEmpty.call(this)) &&
            (this.name==DEFAULTS.name) &&
            (this.address==DEFAULTS.address));
    };

    /**
     * Checks if the location is dirty and needs saving
     * @returns {boolean}
     */
    Location.prototype.isDirty = function() {
        var isDirty = Base.prototype.isDirty.call(this);
        if( (!isDirty) &&
            (this.raw)) {
            var name = this.raw.name || DEFAULTS.name;
            var address = this.raw.address || DEFAULTS.address;
            return (
                (this.name!=name) ||
                (this.address!=address));
        }
        return isDirty;
    };

    Location.prototype._getDefaults = function() {
        return DEFAULTS;
    };

    Location.prototype._toJson = function(options) {
        var data = Base.prototype._toJson.call(this, options);
        data.name = this.name || DEFAULTS.name;
        data.address = this.address || DEFAULTS.address;
        return data;
    };

    Location.prototype._fromJson = function(data, options) {
        var that = this;
        return Base.prototype._fromJson.call(this, data, options)
            .then(function() {
                that.name = data.name || DEFAULTS.name;
                that.address = data.address || DEFAULTS.address;
                $.publish('contact.fromJson', data);
                return data;
            });
    };

    return Location;
    
});
/**
 * The Transaction module
 * @module transaction
 * @implements Base
 * a base class for Reservations and Orders
 * Share similar manipulating of: status, dates, items, contacts, locations, comments, attachments
 */
define('transaction',[
    'jquery',
    'api',
    'base'], function ($, api, Base) {

    var DEFAULTS = {
        status: "creating",
        from: null,
        to: null,
        due: null,
        contact: "",
        location: "",
        items: []
    };

    // Allow overriding the ctor during inheritance
    // http://stackoverflow.com/questions/4152931/javascript-inheritance-call-super-constructor-or-use-prototype-chain
    var tmp = function(){};
    tmp.prototype = Base.prototype;

    /**
     * @class Transaction
     * @constructor
     * @extends Base
     */
    var Transaction = function(opt) {
        var spec = $.extend({}, opt);
        Base.call(this, spec);

        this.dsItems = spec.dsItems;                        // we'll also access the /items collection

        // should we automatically delete the transaction from the database?
        this.autoCleanup = (spec.autoCleanup!=null) ? spec.autoCleanup : false;
        this.helper = spec.helper;

        this.status = spec.status || DEFAULTS.status;        // the status of the order or reservation
        this.from = spec.from || DEFAULTS.from;              // a date in the future
        this.to = spec.to || DEFAULTS.to;                    // a date in the future
        this.due = spec.due || DEFAULTS.due;                 // a date even further in the future, we suggest some standard avg durations
        this.contact = spec.contact || DEFAULTS.contact;     // a contact id
        this.location = spec.location || DEFAULTS.location;  // a location id
        this.items = spec.items || DEFAULTS.items.slice();   // an array of item ids
    };

    Transaction.prototype = new tmp();
    Transaction.prototype.constructor = Location;

    //
    // Date helpers (possibly overwritten)
    //

    /**
     * Gets the lowest possible date to start this transaction
     * @returns {Moment} min date
     */
    Transaction.prototype.getMinDate = function() {
        var helper = this._getHelper();
        var now = helper.getNow();
        return now;
    };

    /**
     * Gets the latest possible date to end this transaction
     * @returns {Moment} max date
     */
    Transaction.prototype.getMaxDate = function() {
        var helper = this._getHelper();
        var now = helper.getNow();
        var next = helper.roundTimeTo(now);
        return next.add(365, "day"); // TODO: Is this a sensible date?
    };

    /**
     * suggestEndDate, makes a new moment() object with a suggested end date,
     * already rounded up according to the group.profile settings
     * @param {Moment} m a suggested end date for this transaction
     * @returns {*}
     */
    Transaction.prototype.suggestEndDate = function(m) {
        var helper = this._getHelper();
        var end = helper.addAverageDuration(m || helper.getNow());
        return helper.roundTimeTo(end);
    };

    //
    // Base overrides
    //
    /**
     * Checks if the transaction is empty
     * @returns {*|boolean|boolean|boolean|boolean|boolean|boolean|boolean}
     */
    Transaction.prototype.isEmpty = function() {
        return (
            (Base.prototype.isEmpty.call(this)) &&
            (this.status==DEFAULTS.status) &&
            (this.from==DEFAULTS.from) &&
            (this.to==DEFAULTS.to) &&
            (this.due==DEFAULTS.due) &&
            (this.contact==DEFAULTS.contact) &&
            (this.location==DEFAULTS.location) &&
            (this.items.length==0)  // not DEFAULTS.items? :)
        );
    };

    /**
     * Checks if the transaction is dirty and needs saving
     * @returns {*|boolean|boolean|boolean|boolean|boolean|boolean|boolean}
     */
    Transaction.prototype.isDirty = function() {
        return (
            Base.prototype.isDirty.call(this) || 
            this._isDirtyBasic() ||
            this._isDirtyDates() ||
            this._isDirtyLocation() ||
            this._isDirtyContact() ||
            this._isDirtyItems()
        );
    };

    Transaction.prototype._isDirtyBasic = function() {
        if (this.raw) {
            var status = this.raw.status || DEFAULTS.status;
            return (this.status!=status);
        } else {
            return false;
        }
    };

    Transaction.prototype._isDirtyDates = function() {
        if (this.raw) {
            var from = this.raw.from || DEFAULTS.from;
            var to = this.raw.to || DEFAULTS.to;
            var due = this.raw.due || DEFAULTS.due;
            return (
                (this.from!=from) ||
                (this.to!=to) || 
                (this.due!=due));
        } else {
            return false;
        }
    };

    Transaction.prototype._isDirtyLocation = function() {
        if (this.raw) {
            var location = DEFAULTS.location;
            if (this.raw.location) {
                location = (this.raw.location._id) ? this.raw.location._id : this.raw.location;
            }
            return (this.location!=location);
        } else {
            return false;
        }
    };

    Transaction.prototype._isDirtyContact = function() {
        if (this.raw) {
            var contact = DEFAULTS.contact;
            if (this.raw.customer) {
                contact = (this.raw.customer._id) ? this.raw.customer._id : this.raw.customer;
            }
            return (this.contact!=contact);
        } else {
            return false;
        }
    };

    Transaction.prototype._isDirtyItems = function() {
        if (this.raw) {
            var items = DEFAULTS.items.slice();
            if (this.raw.items) {
                // TODO!!
            }
            return false;
        } else {
            return false;
        }
    };

    Transaction.prototype._getDefaults = function() {
        return DEFAULTS;
    };

    /**
     * Writes out some shared fields for all transactions
     * Inheriting classes will probably add more to this
     * @param options
     * @returns {object}
     * @private
     */
    Transaction.prototype._toJson = function(options) {
        var data = Base.prototype._toJson.call(this, options);
        //data.started = this.from;  // VT: Will be set during checkout
        //data.finished = this.to;  // VT: Will be set during final checkin
        data.due = this.due;
        if (this.location) {
            data.location = this.location;
        }
        if (this.contact) {
            data.customer = this.contact;  // Vincent: It's still called the "customer" field!
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
    Transaction.prototype._fromJson = function(data, options) {
        var that = this;
        return Base.prototype._fromJson.call(this, data, options)
            .then(function() {
                that.status = data.status || DEFAULTS.status;
                that.location = data.location || DEFAULTS.location;
                that.contact = data.customer || DEFAULTS.contact;
                that.items = data.items || DEFAULTS.items.slice();
            });
    };

    Transaction.prototype._toLog = function(options) {
        var obj = this._toJson(options);
        obj.minDate = this.getMinDate().toJSONDate();
        obj.maxDate = this.getMaxDate().toJSONDate();
        console.log(obj);
    };

    // Setters
    // ----
    /*
    TransactionModel.prototype.setFromDate = function(date) {
        var roundDate = helper.roundFromTime(date, this.global.groupProfile);
        system.log('TransactionModel: setFromDate '+date.calendar() + ' -- rounded to ' + roundDate.calendar());
        this.from(roundDate);
        return this._handleTransaction();
    };
    */

    // From date setters

    /**
     * Clear the transaction from date
     * @param skipRead
     * @returns {promise}
     */
    Transaction.prototype.clearFromDate = function(skipRead) {
        this.from = DEFAULTS.from;
        return this._handleTransaction(skipRead);
    };

    /**
     * Sets the transaction from date
     * @param date
     * @param skipRead
     * @returns {promise}
     */
    Transaction.prototype.setFromDate = function(date, skipRead) {
        this.from = this.helper.roundTimeFrom(date);
        return this._handleTransaction(skipRead);
    };

    // To date setters

    /**
     * Clear the transaction to date
     * @param skipRead
     * @returns {promise}
     */
    Transaction.prototype.clearToDate = function(skipRead) {
        this.to = DEFAULTS.to;
        return this._handleTransaction(skipRead);
    };

    /**
     * Sets the transaction to date
     * @param date
     * @param skipRead
     * @returns {promise}
     */
    Transaction.prototype.setToDate = function(date, skipRead) {
        this.to = this.helper.roundTimeTo(date);
        return this._handleTransaction(skipRead);
    };

    // Due date setters

    /**
     * Clear the transaction due date
     * @param skipRead
     * @returns {promise}
     */
    Transaction.prototype.clearDueDate = function(skipRead) {
        this.due = DEFAULTS.due;
        return this._handleTransaction(skipRead);
    };

    /**
     * Set the transaction due date
     * @param date
     * @param skipRead
     * @returns {promise}
     */
    Transaction.prototype.setDueDate = function(date, skipRead) {
        this.due = this.helper.roundTimeTo(date);
        return this._handleTransaction(skipRead);
    };

    // Location setters
    /**
     * Sets the location for this transaction
     * @param locationId
     * @param skipRead skip parsing the returned json response into the transaction
     * @returns {promise}
     */
    Transaction.prototype.setLocation = function(locationId, skipRead) {
        this.location = locationId;
        if (this.existsInDb()) {
            return this._doApiCall({method: 'setLocation', params: {location: locationId}, skipRead: skipRead});
        } else {
            return this._createTransaction(skipRead);
        }
    };

    /**
     * Clears the location for this transaction
     * @param skipRead skip parsing the returned json response into the transaction
     * @returns {promise}
     */
    Transaction.prototype.clearLocation = function(skipRead) {
        var that = this;
        this.location = DEFAULTS.location;
        return this._doApiCall({method: 'clearLocation', skipRead: skipRead})
            .then(function() {
                return that._ensureTransactionDeleted();
            });
    };

    // Contact setters

    /**
     * Sets the contact for this transaction
     * @param contactId
     * @param skipRead skip parsing the returned json response into the transaction
     * @returns {promise}
     */
    Transaction.prototype.setContact = function(contactId, skipRead) {
        this.contact = contactId;
        if (this.existsInDb()) {
            return this._doApiCall({method: 'setCustomer', params: {customer: contactId}, skipRead: skipRead});
        } else {
            return this._createTransaction(skipRead);
        }
    };

    /**
     * Clears the contact for this transaction
     * @param skipRead skip parsing the returned json response into the transaction
     * @returns {promise}
     */
    Transaction.prototype.clearContact = function(skipRead) {
        var that = this;
        this.contact = DEFAULTS.contact;
        return this._doApiCall({method: 'clearCustomer', skipRead: skipRead})
            .then(function() {
                return that._ensureTransactionDeleted();
            });
    };

    // Business logic
    // ----

    // Inheriting classes will use the setter functions below to update the object in memory
    // the _handleTransaction will create, update or delete the actual document via the API

    /**
     * addItems; adds a bunch of Items to the transaction using a list of item ids
     * It creates the transaction if it doesn't exist yet
     * @method addItems
     * @param items
     * @param skipRead
     * @returns {promise}
     */
    Transaction.prototype.addItems = function(items, skipRead) {
        var that = this;
        return this._ensureTransactionExists(skipRead)
            .then(function() {
                return that._doApiCall({
                    method: 'addItems',
                    params: {items: items},
                    skipRead: skipRead
                });
            });
    };

    /**
     * removeItems; removes a bunch of Items from the transaction using a list of item ids
     * It deletes the transaction if it's empty afterwards and autoCleanup is true
     * @method removeItems
     * @param items
     * @param skipRead
     * @returns {promise}
     */
    Transaction.prototype.removeItems = function(items, skipRead) {
        if (!this.existsInDb()) {
            return $.Deferred().reject(new Error("Cannot removeItems from document without id"));
        }

        var that = this;
        return this._doApiCall({
            method: 'removeItems',
            params: {items: items},
            skipRead: skipRead
        })
            .then(function() {
                return that._ensureTransactionDeleted();
            });
    };

    /**
     * clearItems; removes all Items from the transaction
     * It deletes the transaction if it's empty afterwards and autoCleanup is true
     * @method clearItems
     * @param skipRead
     * @returns {promise}
     */
    Transaction.prototype.clearItems = function(skipRead) {
        if (!this.existsInDb()) {
            return $.Deferred().reject(new Error("Cannot clearItems from document without id"));
        }

        var that = this;
        return this._doApiCall({
            method: 'clearItems',
            skipRead: skipRead
        })
            .then(function() {
                return that._ensureTransactionDeleted();
            });
    };

    /**
     * swapItem; swaps one item for another in a transaction
     * @method swapItem
     * @param fromItem
     * @param toItem
     * @param skipRead
     * @returns {promise}
     */
    Transaction.prototype.swapItem = function(fromItem, toItem, skipRead) {
        if (!this.existsInDb()) {
            return $.Deferred().reject(new Error("Cannot clearItems from document without id"));
        }

        // swapItem cannot create or delete a transaction
        return this._doApiCall({
            method: 'swapItem',
            params: {fromItem: fromItem, toItem: toItem},
            skipRead: skipRead
        });
    };

    //
    // Implementation stuff
    //
    Transaction.prototype._getHelper = function() {
        return this.helper;
    };

    Transaction.prototype._getDateHelper = function() {
        return this._getHelper().dateHelper;
    };

    /**
     * Searches for Items that are available for this transaction
     * @param params: a dict with params, just like items/search
     * @param listName: restrict search to a certain list
     * @param useAvailabilies (uses items/searchAvailable instead of items/search)
     * @param onlyUnbooked (true by default, only used when useAvailabilies=true)
     * @param skipItems array of item ids that should be skipped
     * @returns {*}
     */
    Transaction.prototype._searchItems = function(params, listName, useAvailabilies, onlyUnbooked, skipItems) {
        if (this.dsItems==null) {
            return $.Deferred().reject(new api.ApiBadRequest(this.crtype+" has no DataSource for items"));
        }

        // Restrict the search to just the Items that are:
        // - at this location
        // - in the specified list (if any)
        params = params || {};
        params.location = this.location;

        if( (listName!=null) &&
            (listName.length>0)) {
            params.listName = listName
        }

        if (useAvailabilies==true) {
            // We'll use a more advanced API call /items/searchAvailable
            // It's a bit slower and the .count result is not usable

            // It requires some more parameters to be set
            params.onlyUnbooked = (onlyUnbooked!=null) ? onlyUnbooked : true;
            params.fromDate = this.from;
            params.toDate = this.to;
            params._limit = 20;  // TODO
            params._skip = 0;  // TODO
            if( (skipItems) &&
                (skipItems.length)) {
                params.skipItems = skipItems;
            }

            return this.dsItems.call(null, 'searchAvailable', params);
        } else {
            // We don't need to use availabilities,
            // we should better use the regular /search
            // it's faster and has better paging :)
            if( (skipItems) &&
                (skipItems.length)) {
                params.pk__nin = skipItems;
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
    Transaction.prototype._checkDateBetweenMinMax = function(date) {
        var minDate = this.getMinDate();
        var maxDate = this.getMaxDate();
        if( (date<minDate) || 
            (date>maxDate)) {
            var msg = "date is outside of min max range " + minDate.toJSONDate() +"->" + maxDate.toJSONDate();
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
    Transaction.prototype._handleTransaction = function(skipRead) {
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

    Transaction.prototype._deleteTransaction = function() {
        return this.delete();
    };

    Transaction.prototype._updateTransaction = function(skipRead) {
        return this.update(skipRead);
    };

    Transaction.prototype._createTransaction = function(skipRead) {
        return this.create(skipRead);
    };

    Transaction.prototype._ensureTransactionExists = function(skipRead) {
        return (!this.existsInDb()) ? this._createTransaction(skipRead) : $.Deferred().resolve();
    };

    Transaction.prototype._ensureTransactionDeleted = function() {
        return ((this.isEmpty()) && (this.autoCleanup)) ? this._deleteTransaction() : $.Deferred().resolve();
    };

    return Transaction;
});

define('Order',[
    "jquery",
    "api",
    "transaction"], function ($, api, Transaction) {

    // Allow overriding the ctor during inheritance
    // http://stackoverflow.com/questions/4152931/javascript-inheritance-call-super-constructor-or-use-prototype-chain
    var tmp = function() {};
    tmp.prototype = Transaction.prototype;

    /**
     * @class Order
     * @constructor
     * @extends Transaction
     */
    var Order = function(opt) {
        var spec = $.extend({
            crtype: "cheqroom.types.order",
            fields: ["*"]
        }, opt);
        Transaction.call(this, spec);
    };

    Order.prototype = new tmp();
    Order.prototype.constructor = Order;

    //
    // Date helpers; we"ll need these for sliding from / to dates during a long user session
    //

    /**
     * Overwrite only getMinDate, max date stays one year from now
     * @returns {*}
     */
    Order.prototype.getMinDate = function() {
        // Reservations can only start from the next timeslot at the earliest
        var profileHelper = this._getHelper();
        var now = profileHelper.getNow();
        var next = profileHelper.roundTimeFrom(now);
        return next;
    };

    //
    // Document overrides
    //
    Order.prototype._toJson = function(options) {
        var data = Transaction.prototype._toJson.call(this, options);
        data.fromDate = (this.fromDate!=null) ? this.fromDate.toJSONDate() : "null";
        data.toDate = (this.toDate!=null) ? this.toDate.toJSONDate() : "null";
        return data;
    };

    Order.prototype._fromJson = function(data, options) {
        var that = this;
        return Transaction.prototype._fromJson.call(this, data, options)
            .then(function() {
                that.from = ((data.started==null) || (data.started=="null")) ? null : data.started;
                that.to = ((data.finished==null) || (data.finished=="null")) ? null : data.finished;
                that.due = ((data.due==null) || (data.due=="null")) ? null: data.due;
                $.publish("order.fromJson", data);
                return data;
            });
    };

    //
    // Helpers
    //
    Order.prototype.getFriendlyDuration = function() {
        var duration = this.getDuration();
        return (duration!=null) ? this._getDateHelper().getFriendlyDuration(duration) : "";
    };

    Order.prototype.getDuration = function() {
        if (this.from!=null) {
            var to = (this.status=="closed") ? this.to : this.due;
            if (to) {
                return moment.duration(to - this.from);
            }
        }
        return null;
    };

    Order.prototype.canGenerateAgreement = function() {
        return (this.status=="open") || (this.status=="closed");
    };

    Order.prototype.canCheckin = function() {
        return (this.status=="open");
    };

    Order.prototype.canCheckout = function() {
        return (
            (this.status=="creating") &&
            (this.location) &&
            (this.contact) &&
            (this.due) &&
            (this.items) &&
            (this.items.length));
    };

    Order.prototype.canUndoCheckout = function() {
        return (this.status=="open");
    };

    //
    // Base overrides
    //

    //
    // Transaction overrides
    //

    /**
     * Sets the Order from and due date in a single call
     * @param from
     * @param due (optional) if null, we'll take the default average checkout duration as due date
     * @param skipRead
     * @returns {*}
     */
    Order.prototype.setFromDueDate = function(from, due, skipRead) {
        if (this.status!="creating") {
            return $.Deferred().reject(new api.ApiUnprocessableEntity("Cannot set order from / due date, status is "+this.status));
        }

        var that = this;
        var roundedFromDate = this._getHelper().roundTimeFrom(from);
        var roundedDueDate = (due) ?
            this._getHelper().roundTimeTo(due) :
            this._getHelper().addAverageDuration(roundedFromDate);


        return this._checkFromDueDate(roundedFromDate, roundedDueDate)
            .then(function() {
                that.from = roundedFromDate;
                that.due = roundedDueDate;
                return that._handleTransaction(skipRead);
            });
    };

    /**
     * Sets the Order from date
     * @param date
     * @param skipRead
     * @returns {*}
     */
    Order.prototype.setFromDate = function(date, skipRead) {
        if (this.status!="creating") {
            return $.Deferred().reject(new api.ApiUnprocessableEntity("Cannot set order from date, status is "+this.status));
        }

        var that = this;
        var roundedFromDate = this._getHelper().roundTimeFrom(date);

        return this._checkFromDueDate(roundedFromDate, this.due)
            .then(function() {
                that.from = roundedFromDate;
                return that._handleTransaction(skipRead);
            });
    };

    Order.prototype.clearFromDate = function(skipRead) {
        if (this.status!="creating") {
            return $.Deferred().reject(new api.ApiUnprocessableEntity("Cannot clear order from date, status is "+this.status));
        }

        this.from = null;

        return this._handleTransaction(skipRead);
    };

    Order.prototype.setDueDate = function(due, skipRead) {
        // Cannot change the to-date of a reservation that is not in status "creating"
        if( (this.status!="creating") &&
            (this.status!="open")){
            return $.Deferred().reject(new api.ApiUnprocessableEntity("Cannot set order due date, status is "+this.status));
        }

        // The to date must be:
        // 1) at least 30 minutes into the feature
        // 2) at least 15 minutes after the from date (if set)
        var that = this;
        var roundedDueDate = this._getHelper().roundTimeTo(due);

        return this._checkFromDueDate(this.from, roundedDueDate)
            .then(function() {
                that.due = roundedDueDate;
                return that._handleTransaction(skipRead);
            });
    };

    Order.prototype.clearDueDate = function(skipRead) {
        if (this.status!="creating") {
            return $.Deferred().reject(new api.ApiUnprocessableEntity("Cannot clear order due date, status is "+this.status));
        }

        this.due = null;

        return this._handleTransaction(skipRead);
    };

    Order.prototype.setToDate = function(date, skipRead) {
        throw "Order.setToDate not implemented, it is set during order close";
    };

    Order.prototype.clearToDate = function(date, skipRead) {
        throw "Order.clearToDate not implemented, it is set during order close";
    };

    //
    // Business logic calls
    //
    Order.prototype.searchItems = function(params, useAvailabilies, onlyUnbooked, skipItems) {
        return this._searchItems(params, "available", useAvailabilies, onlyUnbooked, skipItems || this.items);
    };

    Order.prototype.checkin = function(itemIds, skipRead) {
        return this._doApiCall({method: "checkin", items:itemIds, skipRead: skipRead});
    };

    Order.prototype.checkout = function(skipRead) {
        return this._doApiCall({method: "checkout", skipRead: skipRead});
    };

    Order.prototype.undoCheckout = function(skipRead) {
        return this._doApiCall({method: "undoCheckout", skipRead: skipRead});
    };

    Order.prototype.generateAgreement = function(skipRead) {
        return this._doApiCall({method: "generateAgreement", skipRead: skipRead});
    };

    //
    // Implementation
    //
    Order.prototype._checkFromDueDate = function(from, due) {
        var dateHelper = this._getDateHelper();
        var roundedFromDate = from; //(from) ? this._getHelper().roundTimeFrom(from) : null;
        var roundedDueDate = due; //(due) ? this._getHelper().roundTimeTo(due) : null;

        if (roundedFromDate && roundedDueDate) {
            return $.when(
                this._checkDateBetweenMinMax(roundedFromDate),
                this._checkDateBetweenMinMax(roundedDueDate)
            )
                .then(function(fromRes, dueRes) {
                    var interval = dateHelper.roundMinutes;
                    if (roundedDueDate.diff(roundedFromDate, "minutes") < interval) {
                        return $.Deferred().reject(new api.ApiUnprocessableEntity("Cannot set order from date, after (or too close to) to date "+roundedDueDate.toJSONDate()));
                    }
                    if (roundedFromDate.diff(roundedDueDate, "minutes") > interval) {
                        return $.Deferred().reject(new api.ApiUnprocessableEntity("Cannot set order due date, before (or too close to) from date "+roundedFromDate.toJSONDate()));
                    }
                });
        } else if (roundedFromDate) {
            return this._checkDateBetweenMinMax(roundedFromDate);
        } else if (roundedDueDate) {
            return this._checkDateBetweenMinMax(roundedDueDate);
        } else {
            return $.Deferred().reject(new api.ApiUnprocessableEntity("Cannot from/due date, both are null"));
        }
    };

    return Order;
    
});

/**
 * The Helper module
 * @module helper
 * a Helper class which allows you to call helpers based on the settings in group.profile and user.profile
 */
define('helper',["jquery", "moment", "dateHelper"], function ($, moment, DateHelper) {

    var Helper = function(spec) {
        this.dateHelper = new DateHelper({});
    };

    /**
     * Convenience method that calls the DateHelper.getNow
     * @returns {*}
     */
    Helper.prototype.getNow = function() {
        return this.dateHelper.getNow();
    };

    Helper.prototype.roundTimeFrom = function(m) {
        return this.dateHelper.roundTimeFrom(m);
    };

    Helper.prototype.roundTimeTo = function(m) {
        return this.dateHelper.roundTimeTo(m);
    };

    Helper.prototype.addAverageDuration = function(m) {
        // TODO: Read the average order duration from the group.profile
        // add it to the date that was passed
        return m.clone().add(1, 'day');
    };

    return Helper;

});
define('Reservation',[
    "jquery",
    "api",
    "transaction"], function ($, api, Transaction) {

    // Allow overriding the ctor during inheritance
    // http://stackoverflow.com/questions/4152931/javascript-inheritance-call-super-constructor-or-use-prototype-chain
    var tmp = function() {};
    tmp.prototype = Transaction.prototype;

    /**
     * @class Reservation
     * @constructor
     * @extends Transaction
     */
    var Reservation = function(opt) {
        var spec = $.extend({
            crtype: "cheqroom.types.reservation",
            fields: ["*"]
        }, opt);
        Transaction.call(this, spec);

        this.conflicts = [];
    };

    Reservation.prototype = new tmp();
    Reservation.prototype.constructor = Reservation;

    //
    // Date helpers; we'll need these for sliding from / to dates during a long user session
    //

    /**
     * Overwrite only the getMinDate, max date is one year from now
     * @returns {*}
     */
    Reservation.prototype.getMinDate = function() {
        // Reservations can only start from the next timeslot at the earliest
        var dateHelper = this._getDateHelper();
        var now = dateHelper.getNow();
        var next = dateHelper.roundTimeUp(now, dateHelper.roundMinutes);
        if (next==now) {
            next = next.add(dateHelper.roundMinutes, "minutes");
        }
        return next;
    };

    //
    // Helpers
    //
    Reservation.prototype.canReserve = function() {
        return (
            (this.status=="creating") &&
            (this.location) &&
            (this.contact) &&
            (this.from) &&
            (this.to) &&
            (this.items) &&
            (this.items.length));
    };

    Reservation.prototype.canCancel = function() {
        return (this.status=="open");
    };

    Reservation.prototype.canEdit = function() {
        return (this.status=="creating");
    };

    Reservation.prototype.canDelete = function() {
        return (this.status=="creating");
    };

    Reservation.prototype.canMakeOrder = function() {
        if (this.status=="open") {
            var unavailable = this._getUnavailableItems();
            var len = $.map(unavailable, function(n, i) { return i; }).length;
            return (len==0);
        } else {
            return false;
        }
    };

    //
    // Document overrides
    //
    Reservation.prototype._toJson = function(options) {
        var data = Transaction.prototype._toJson.call(this, options);
        data.fromDate = (this.from!=null) ? this.from.toJSONDate() : "null";
        data.toDate = (this.to!=null) ? this.to.toJSONDate() : "null";
        return data;
    };

    Reservation.prototype._fromJson = function(data, options) {
        var that = this;
        return Transaction.prototype._fromJson.call(this, data, options)
            .then(function() {
                return that._loadConflicts(data, options)
                    .then(function() {
                        that.from = ((data.fromDate==null) || (data.fromDate=="null")) ? null : data.fromDate;
                        that.to = ((data.toDate==null) || (data.toDate=="null")) ? null : data.toDate;
                        that.due = null;
                        $.publish("reservation.fromJson", data);
                    });
            });
    };

    //
    // Base overrides
    //

    //
    // Transaction overrides
    //

    /**
     * Sets the reservation from / to dates in a single call
     * @param from
     * @param to (optional) if null, we'll take the default average checkout duration as due date
     * @param skipRead
     * @returns {*}
     */
    Reservation.prototype.setFromToDate = function(from, to, skipRead) {
        if (this.status!="creating") {
            return $.Deferred().reject(new api.ApiUnprocessableEntity("Cannot set reservation from / to date, status is "+this.status));
        }

        var that = this;
        var roundedFromDate = this._getHelper().roundTimeFrom(from);
        var roundedToDate = (to) ?
            this._getHelper().roundTimeTo(to) :
            this._getHelper().addAverageDuration(roundedFromDate);

        return this._checkFromToDate(roundedFromDate, roundedToDate)
            .then(function() {
                that.from = roundedFromDate;
                that.to = roundedToDate;
                return that._handleTransaction(skipRead);
            });
    };

    /**
     * setFromDate
     * The from date must be:
     * - bigger than minDate
     * - smaller than maxDate
     * - at least one interval before .to date (if set)
     * @param date
     * @param skipRead
     * @returns {*}
     */
    Reservation.prototype.setFromDate = function(date, skipRead) {
        if (this.status!="creating") {
            return $.Deferred().reject(new api.ApiUnprocessableEntity("Cannot set reservation from date, status is "+this.status));
        }

        var that = this;
        var dateHelper = this._getDateHelper();
        var interval = dateHelper.roundMinutes;
        var roundedFromDate = this._getHelper().roundTimeFrom(date);

        return this._checkDateBetweenMinMax(roundedFromDate)
            .then(function() {
                // Must be at least 1 interval before to date, if it's already set
                if( (that.to) &&
                    (that.to.diff(roundedFromDate, "minutes") < interval)) {
                    return $.Deferred().reject(new api.ApiUnprocessableEntity("Cannot set reservation from date, after (or too close to) to date "+that.to.toJSONDate()));
                }

                that.from = roundedFromDate;

                return that._handleTransaction(skipRead);
            });
    };

    Reservation.prototype.clearFromDate = function(skipRead) {
        if (this.status!="creating") {
            return $.Deferred().reject(new api.ApiUnprocessableEntity("Cannot clear reservation from date, status is "+this.status));
        }

        this.from = null;

        return this._handleTransaction(skipRead);
    };

    /**
     * setToDate
     * The to date must be:
     * - bigger than minDate
     * - smaller than maxDate
     * - at least one interval after the .from date (if set)
     * @param date
     * @param skipRead
     * @returns {*}
     */
    Reservation.prototype.setToDate = function(date, skipRead) {
        // Cannot change the to-date of a reservation that is not in status "creating"
        if (this.status!="creating") {
            return $.Deferred().reject(new api.ApiUnprocessableEntity("Cannot set reservation to date, status is "+this.status));
        }

        // The to date must be:
        // 1) at least 30 minutes into the feature
        // 2) at least 15 minutes after the from date (if set)
        var that = this;
        var dateHelper = this._getDateHelper();
        var interval = dateHelper.roundMinutes;
        var roundedToDate = this._getHelper().roundTimeTo(date);

        return this._checkDateBetweenMinMax(roundedToDate)
            .then(function() {
                if( (that.from) &&
                    (that.from.diff(roundedToDate, "minutes") > interval)) {
                    return $.Deferred().reject(new api.ApiUnprocessableEntity("Cannot set reservation to date, before (or too close to) to date "+that.from.toJSONDate()));
                }

                that.to = roundedToDate;

                return that._handleTransaction(skipRead);
            });
    };

    Reservation.prototype.clearToDate = function(skipRead) {
        if (this.status!="creating") {
            return $.Deferred().reject(new api.ApiUnprocessableEntity("Cannot clear reservation to date, status is "+this.status));
        }

        this.to = null;

        return this._handleTransaction(skipRead);
    };

    // Reservation does not use due dates
    Reservation.prototype.clearDueDate = function(skipRead) {
        throw "Reservation.clearDueDate not implemented";
    };
    
    Reservation.prototype.setDueDate = function(date, skipRead) {
        throw "Reservation.setDueDate not implemented";
    };

    //
    // Business logic calls
    //

    /**
     * Searches for Items that are available for this reservation
     * @param params
     * @param useAvailabilies (should always be true, we only use this flag for Order objects)
     * @param onlyUnbooked
     * @returns {*}
     */
    Reservation.prototype.searchItems = function(params, useAvailabilies, onlyUnbooked, skipItems) {
        return this._searchItems(params, null, true, onlyUnbooked, skipItems || this.items);
    };

    /**
     * Books the reservation and sets the status to `open`
     * @param skipRead
     * @returns {*}
     */
    Reservation.prototype.reserve = function(skipRead) {
        return this._doApiCall({method: "reserve", skipRead: skipRead});
    };

    /**
     * Unbooks the reservation and sets the status to `creating` again
     * @param skipRead
     * @returns {*}
     */
    Reservation.prototype.undoReserve = function(skipRead) {
        return this._doApiCall({method: "undoReserve", skipRead: skipRead});
    };

    /**
     * Cancels the booked reservation and sets the status to `cancelled`
     * @param skipRead
     * @returns {*}
     */
    Reservation.prototype.cancel = function(skipRead) {
        return this._doApiCall({method: "cancel", skipRead: skipRead});
    };

    /**
     * Turns an open reservation into an order (which still needs to be checked out)
     * @returns {*}
     */
    Reservation.prototype.makeOrder = function() {
        return this._doApiCall({method: "makeOrder", skipRead: true});  // response is an Order object!!
    };

    //
    // Implementation
    //
    Reservation.prototype._checkFromToDate = function(from, to) {
        var dateHelper = this._getDateHelper();
        var roundedFromDate = from; //(from) ? this._getHelper().roundTimeFrom(from) : null;
        var roundedToDate = to; //(due) ? this._getHelper().roundTimeTo(due) : null;

        if (roundedFromDate && roundedToDate) {
            return $.when(
                this._checkDateBetweenMinMax(roundedFromDate),
                this._checkDateBetweenMinMax(roundedToDate)
            )
                .then(function(fromRes, toRes) {
                    var interval = dateHelper.roundMinutes;
                    if (roundedToDate.diff(roundedFromDate, "minutes") < interval) {
                        return $.Deferred().reject(new api.ApiUnprocessableEntity("Cannot set order from date, after (or too close to) to date "+roundedToDate.toJSONDate()));
                    }
                    if (roundedFromDate.diff(roundedToDate, "minutes") > interval) {
                        return $.Deferred().reject(new api.ApiUnprocessableEntity("Cannot set order due date, before (or too close to) from date "+roundedFromDate.toJSONDate()));
                    }
                });
        } else if (roundedFromDate) {
            return this._checkDateBetweenMinMax(roundedFromDate);
        } else if (roundedToDate) {
            return this._checkDateBetweenMinMax(roundedToDate);
        } else {
            return $.Deferred().reject(new api.ApiUnprocessableEntity("Cannot from/due date, both are null"));
        }
    };

    Reservation.prototype._getUnavailableItems = function() {
        var unavailable = {};

        if( (this.status=="open") &&
            (this.location) &&
            (this.items!=null) &&
            (this.items.length>0)) {
            $.each(this.items, function(i, item) {
                if (item.status!="available") {
                    unavailable["status"] = unavailable["status"] || [];
                    unavailable["status"].push(item._id);
                } else if (item.location!=location._id) {
                    unavailable["location"] = unavailable["location"] || [];
                    unavailable["location"].push(item._id);
                }
            });
        }

        return unavailable;
    };

    Reservation.prototype._loadConflicts = function(data, options) {
        // Only load conflicts when it"s possible to have conflicts
        // location, at least 1 date and at least 1 item
        var that = this;
        var hasLocation = (this.location!=null);
        var hasAnyDate = (this.from!=null) || (this.to!=null);
        var hasAnyItem = (this.items!=null) && (this.items.length>0);
        var hasNonConflictStatus = (this.status!="creating") && (this.status!="open");

        if( (hasNonConflictStatus) || 
            (!hasLocation && !hasAnyDate && !hasAnyItem)) {

            // We cannot have conflicts, so make the conflicts array empty
            this.conflicts = [];
            return $.Deferred().resolve(data);

        } else if (this.status == "creating") {

            // We can have conflicts,
            // so we better check the server if there are any
            return this.ds.call(this.id, "getConflicts")
                .then(function(conflicts) {
                    that.conflicts = conflicts || [];
                });

        } else if (this.status == "open") {

            // The reservation is already open,
            // so the only conflicts we can have is for making an order
            $.each(this.raw.items, function(i, item) {
               if (item.status!="available") {
                   // TODO
                   console.log("open reservation has conflict, unavailable item ", item._id);
               } else if(item.location!=that.location) {
                   // TODO
                   console.log("open reservation has conflict, item at wrong location ", item._id);
               }
            });
            this.conflicts = [];  // TODO!!
            return $.Deferred().resolve(data);

        } else {

            // We should never get here :)
            this.conflicts = [];
            return $.Deferred().resolve(data);

        }
    };

    return Reservation;
    
});
/**
 * The Transaction module
 * @module transaction
 * @implements Base
 * a base class for Reservations and Orders
 * Share similar manipulating of: status, dates, items, contacts, locations, comments, attachments
 */
define('Transaction',[
    'jquery',
    'api',
    'base'], function ($, api, Base) {

    var DEFAULTS = {
        status: "creating",
        from: null,
        to: null,
        due: null,
        contact: "",
        location: "",
        items: []
    };

    // Allow overriding the ctor during inheritance
    // http://stackoverflow.com/questions/4152931/javascript-inheritance-call-super-constructor-or-use-prototype-chain
    var tmp = function(){};
    tmp.prototype = Base.prototype;

    /**
     * @class Transaction
     * @constructor
     * @extends Base
     */
    var Transaction = function(opt) {
        var spec = $.extend({}, opt);
        Base.call(this, spec);

        this.dsItems = spec.dsItems;                        // we'll also access the /items collection

        // should we automatically delete the transaction from the database?
        this.autoCleanup = (spec.autoCleanup!=null) ? spec.autoCleanup : false;
        this.helper = spec.helper;

        this.status = spec.status || DEFAULTS.status;        // the status of the order or reservation
        this.from = spec.from || DEFAULTS.from;              // a date in the future
        this.to = spec.to || DEFAULTS.to;                    // a date in the future
        this.due = spec.due || DEFAULTS.due;                 // a date even further in the future, we suggest some standard avg durations
        this.contact = spec.contact || DEFAULTS.contact;     // a contact id
        this.location = spec.location || DEFAULTS.location;  // a location id
        this.items = spec.items || DEFAULTS.items.slice();   // an array of item ids
    };

    Transaction.prototype = new tmp();
    Transaction.prototype.constructor = Location;

    //
    // Date helpers (possibly overwritten)
    //

    /**
     * Gets the lowest possible date to start this transaction
     * @returns {Moment} min date
     */
    Transaction.prototype.getMinDate = function() {
        var helper = this._getHelper();
        var now = helper.getNow();
        return now;
    };

    /**
     * Gets the latest possible date to end this transaction
     * @returns {Moment} max date
     */
    Transaction.prototype.getMaxDate = function() {
        var helper = this._getHelper();
        var now = helper.getNow();
        var next = helper.roundTimeTo(now);
        return next.add(365, "day"); // TODO: Is this a sensible date?
    };

    /**
     * suggestEndDate, makes a new moment() object with a suggested end date,
     * already rounded up according to the group.profile settings
     * @param {Moment} m a suggested end date for this transaction
     * @returns {*}
     */
    Transaction.prototype.suggestEndDate = function(m) {
        var helper = this._getHelper();
        var end = helper.addAverageDuration(m || helper.getNow());
        return helper.roundTimeTo(end);
    };

    //
    // Base overrides
    //
    /**
     * Checks if the transaction is empty
     * @returns {*|boolean|boolean|boolean|boolean|boolean|boolean|boolean}
     */
    Transaction.prototype.isEmpty = function() {
        return (
            (Base.prototype.isEmpty.call(this)) &&
            (this.status==DEFAULTS.status) &&
            (this.from==DEFAULTS.from) &&
            (this.to==DEFAULTS.to) &&
            (this.due==DEFAULTS.due) &&
            (this.contact==DEFAULTS.contact) &&
            (this.location==DEFAULTS.location) &&
            (this.items.length==0)  // not DEFAULTS.items? :)
        );
    };

    /**
     * Checks if the transaction is dirty and needs saving
     * @returns {*|boolean|boolean|boolean|boolean|boolean|boolean|boolean}
     */
    Transaction.prototype.isDirty = function() {
        return (
            Base.prototype.isDirty.call(this) || 
            this._isDirtyBasic() ||
            this._isDirtyDates() ||
            this._isDirtyLocation() ||
            this._isDirtyContact() ||
            this._isDirtyItems()
        );
    };

    Transaction.prototype._isDirtyBasic = function() {
        if (this.raw) {
            var status = this.raw.status || DEFAULTS.status;
            return (this.status!=status);
        } else {
            return false;
        }
    };

    Transaction.prototype._isDirtyDates = function() {
        if (this.raw) {
            var from = this.raw.from || DEFAULTS.from;
            var to = this.raw.to || DEFAULTS.to;
            var due = this.raw.due || DEFAULTS.due;
            return (
                (this.from!=from) ||
                (this.to!=to) || 
                (this.due!=due));
        } else {
            return false;
        }
    };

    Transaction.prototype._isDirtyLocation = function() {
        if (this.raw) {
            var location = DEFAULTS.location;
            if (this.raw.location) {
                location = (this.raw.location._id) ? this.raw.location._id : this.raw.location;
            }
            return (this.location!=location);
        } else {
            return false;
        }
    };

    Transaction.prototype._isDirtyContact = function() {
        if (this.raw) {
            var contact = DEFAULTS.contact;
            if (this.raw.customer) {
                contact = (this.raw.customer._id) ? this.raw.customer._id : this.raw.customer;
            }
            return (this.contact!=contact);
        } else {
            return false;
        }
    };

    Transaction.prototype._isDirtyItems = function() {
        if (this.raw) {
            var items = DEFAULTS.items.slice();
            if (this.raw.items) {
                // TODO!!
            }
            return false;
        } else {
            return false;
        }
    };

    Transaction.prototype._getDefaults = function() {
        return DEFAULTS;
    };

    /**
     * Writes out some shared fields for all transactions
     * Inheriting classes will probably add more to this
     * @param options
     * @returns {object}
     * @private
     */
    Transaction.prototype._toJson = function(options) {
        var data = Base.prototype._toJson.call(this, options);
        //data.started = this.from;  // VT: Will be set during checkout
        //data.finished = this.to;  // VT: Will be set during final checkin
        data.due = this.due;
        if (this.location) {
            data.location = this.location;
        }
        if (this.contact) {
            data.customer = this.contact;  // Vincent: It's still called the "customer" field!
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
    Transaction.prototype._fromJson = function(data, options) {
        var that = this;
        return Base.prototype._fromJson.call(this, data, options)
            .then(function() {
                that.status = data.status || DEFAULTS.status;
                that.location = data.location || DEFAULTS.location;
                that.contact = data.customer || DEFAULTS.contact;
                that.items = data.items || DEFAULTS.items.slice();
            });
    };

    Transaction.prototype._toLog = function(options) {
        var obj = this._toJson(options);
        obj.minDate = this.getMinDate().toJSONDate();
        obj.maxDate = this.getMaxDate().toJSONDate();
        console.log(obj);
    };

    // Setters
    // ----
    /*
    TransactionModel.prototype.setFromDate = function(date) {
        var roundDate = helper.roundFromTime(date, this.global.groupProfile);
        system.log('TransactionModel: setFromDate '+date.calendar() + ' -- rounded to ' + roundDate.calendar());
        this.from(roundDate);
        return this._handleTransaction();
    };
    */

    // From date setters

    /**
     * Clear the transaction from date
     * @param skipRead
     * @returns {promise}
     */
    Transaction.prototype.clearFromDate = function(skipRead) {
        this.from = DEFAULTS.from;
        return this._handleTransaction(skipRead);
    };

    /**
     * Sets the transaction from date
     * @param date
     * @param skipRead
     * @returns {promise}
     */
    Transaction.prototype.setFromDate = function(date, skipRead) {
        this.from = this.helper.roundTimeFrom(date);
        return this._handleTransaction(skipRead);
    };

    // To date setters

    /**
     * Clear the transaction to date
     * @param skipRead
     * @returns {promise}
     */
    Transaction.prototype.clearToDate = function(skipRead) {
        this.to = DEFAULTS.to;
        return this._handleTransaction(skipRead);
    };

    /**
     * Sets the transaction to date
     * @param date
     * @param skipRead
     * @returns {promise}
     */
    Transaction.prototype.setToDate = function(date, skipRead) {
        this.to = this.helper.roundTimeTo(date);
        return this._handleTransaction(skipRead);
    };

    // Due date setters

    /**
     * Clear the transaction due date
     * @param skipRead
     * @returns {promise}
     */
    Transaction.prototype.clearDueDate = function(skipRead) {
        this.due = DEFAULTS.due;
        return this._handleTransaction(skipRead);
    };

    /**
     * Set the transaction due date
     * @param date
     * @param skipRead
     * @returns {promise}
     */
    Transaction.prototype.setDueDate = function(date, skipRead) {
        this.due = this.helper.roundTimeTo(date);
        return this._handleTransaction(skipRead);
    };

    // Location setters
    /**
     * Sets the location for this transaction
     * @param locationId
     * @param skipRead skip parsing the returned json response into the transaction
     * @returns {promise}
     */
    Transaction.prototype.setLocation = function(locationId, skipRead) {
        this.location = locationId;
        if (this.existsInDb()) {
            return this._doApiCall({method: 'setLocation', params: {location: locationId}, skipRead: skipRead});
        } else {
            return this._createTransaction(skipRead);
        }
    };

    /**
     * Clears the location for this transaction
     * @param skipRead skip parsing the returned json response into the transaction
     * @returns {promise}
     */
    Transaction.prototype.clearLocation = function(skipRead) {
        var that = this;
        this.location = DEFAULTS.location;
        return this._doApiCall({method: 'clearLocation', skipRead: skipRead})
            .then(function() {
                return that._ensureTransactionDeleted();
            });
    };

    // Contact setters

    /**
     * Sets the contact for this transaction
     * @param contactId
     * @param skipRead skip parsing the returned json response into the transaction
     * @returns {promise}
     */
    Transaction.prototype.setContact = function(contactId, skipRead) {
        this.contact = contactId;
        if (this.existsInDb()) {
            return this._doApiCall({method: 'setCustomer', params: {customer: contactId}, skipRead: skipRead});
        } else {
            return this._createTransaction(skipRead);
        }
    };

    /**
     * Clears the contact for this transaction
     * @param skipRead skip parsing the returned json response into the transaction
     * @returns {promise}
     */
    Transaction.prototype.clearContact = function(skipRead) {
        var that = this;
        this.contact = DEFAULTS.contact;
        return this._doApiCall({method: 'clearCustomer', skipRead: skipRead})
            .then(function() {
                return that._ensureTransactionDeleted();
            });
    };

    // Business logic
    // ----

    // Inheriting classes will use the setter functions below to update the object in memory
    // the _handleTransaction will create, update or delete the actual document via the API

    /**
     * addItems; adds a bunch of Items to the transaction using a list of item ids
     * It creates the transaction if it doesn't exist yet
     * @method addItems
     * @param items
     * @param skipRead
     * @returns {promise}
     */
    Transaction.prototype.addItems = function(items, skipRead) {
        var that = this;
        return this._ensureTransactionExists(skipRead)
            .then(function() {
                return that._doApiCall({
                    method: 'addItems',
                    params: {items: items},
                    skipRead: skipRead
                });
            });
    };

    /**
     * removeItems; removes a bunch of Items from the transaction using a list of item ids
     * It deletes the transaction if it's empty afterwards and autoCleanup is true
     * @method removeItems
     * @param items
     * @param skipRead
     * @returns {promise}
     */
    Transaction.prototype.removeItems = function(items, skipRead) {
        if (!this.existsInDb()) {
            return $.Deferred().reject(new Error("Cannot removeItems from document without id"));
        }

        var that = this;
        return this._doApiCall({
            method: 'removeItems',
            params: {items: items},
            skipRead: skipRead
        })
            .then(function() {
                return that._ensureTransactionDeleted();
            });
    };

    /**
     * clearItems; removes all Items from the transaction
     * It deletes the transaction if it's empty afterwards and autoCleanup is true
     * @method clearItems
     * @param skipRead
     * @returns {promise}
     */
    Transaction.prototype.clearItems = function(skipRead) {
        if (!this.existsInDb()) {
            return $.Deferred().reject(new Error("Cannot clearItems from document without id"));
        }

        var that = this;
        return this._doApiCall({
            method: 'clearItems',
            skipRead: skipRead
        })
            .then(function() {
                return that._ensureTransactionDeleted();
            });
    };

    /**
     * swapItem; swaps one item for another in a transaction
     * @method swapItem
     * @param fromItem
     * @param toItem
     * @param skipRead
     * @returns {promise}
     */
    Transaction.prototype.swapItem = function(fromItem, toItem, skipRead) {
        if (!this.existsInDb()) {
            return $.Deferred().reject(new Error("Cannot clearItems from document without id"));
        }

        // swapItem cannot create or delete a transaction
        return this._doApiCall({
            method: 'swapItem',
            params: {fromItem: fromItem, toItem: toItem},
            skipRead: skipRead
        });
    };

    //
    // Implementation stuff
    //
    Transaction.prototype._getHelper = function() {
        return this.helper;
    };

    Transaction.prototype._getDateHelper = function() {
        return this._getHelper().dateHelper;
    };

    /**
     * Searches for Items that are available for this transaction
     * @param params: a dict with params, just like items/search
     * @param listName: restrict search to a certain list
     * @param useAvailabilies (uses items/searchAvailable instead of items/search)
     * @param onlyUnbooked (true by default, only used when useAvailabilies=true)
     * @param skipItems array of item ids that should be skipped
     * @returns {*}
     */
    Transaction.prototype._searchItems = function(params, listName, useAvailabilies, onlyUnbooked, skipItems) {
        if (this.dsItems==null) {
            return $.Deferred().reject(new api.ApiBadRequest(this.crtype+" has no DataSource for items"));
        }

        // Restrict the search to just the Items that are:
        // - at this location
        // - in the specified list (if any)
        params = params || {};
        params.location = this.location;

        if( (listName!=null) &&
            (listName.length>0)) {
            params.listName = listName
        }

        if (useAvailabilies==true) {
            // We'll use a more advanced API call /items/searchAvailable
            // It's a bit slower and the .count result is not usable

            // It requires some more parameters to be set
            params.onlyUnbooked = (onlyUnbooked!=null) ? onlyUnbooked : true;
            params.fromDate = this.from;
            params.toDate = this.to;
            params._limit = 20;  // TODO
            params._skip = 0;  // TODO
            if( (skipItems) &&
                (skipItems.length)) {
                params.skipItems = skipItems;
            }

            return this.dsItems.call(null, 'searchAvailable', params);
        } else {
            // We don't need to use availabilities,
            // we should better use the regular /search
            // it's faster and has better paging :)
            if( (skipItems) &&
                (skipItems.length)) {
                params.pk__nin = skipItems;
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
    Transaction.prototype._checkDateBetweenMinMax = function(date) {
        var minDate = this.getMinDate();
        var maxDate = this.getMaxDate();
        if( (date<minDate) || 
            (date>maxDate)) {
            var msg = "date is outside of min max range " + minDate.toJSONDate() +"->" + maxDate.toJSONDate();
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
    Transaction.prototype._handleTransaction = function(skipRead) {
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

    Transaction.prototype._deleteTransaction = function() {
        return this.delete();
    };

    Transaction.prototype._updateTransaction = function(skipRead) {
        return this.update(skipRead);
    };

    Transaction.prototype._createTransaction = function(skipRead) {
        return this.create(skipRead);
    };

    Transaction.prototype._ensureTransactionExists = function(skipRead) {
        return (!this.existsInDb()) ? this._createTransaction(skipRead) : $.Deferred().resolve();
    };

    Transaction.prototype._ensureTransactionDeleted = function() {
        return ((this.isEmpty()) && (this.autoCleanup)) ? this._deleteTransaction() : $.Deferred().resolve();
    };

    return Transaction;
});

define('../main',[
    'api',
    'Attachment',
    'Base',
    'Comment',
    'common',
    'Contact',
    'DateHelper',
    'Document',
    'Item',
    'KeyValue',
    'Location',
    'Order',
    'helper',
    'Reservation',
    'Transaction'], function(api, Attachment, Base, Comment, common, Contact, DateHelper, Document, Item, KeyValue, Location, Order, Helper, Reservation, Transaction) {

    // TODO:
    // The module combines all core files together in a single dependency
    // When we use this module in another project we'll do:
    // `new api.ApiDataSource({...});`
    // It will be good to minify and provide a single access point into the CR Core API from JS?
    // This is also that file that will be minified by Grunt?
    var core = {};

    // namespaces
    core.api = api;

    // Constructors
    core.Attachment = Attachment;
    core.Base = Base;
    core.Comment = Comment;
    core.Contact = Contact;
    core.DateHelper = DateHelper;
    core.Document = Document;
    core.Helper = Helper;
    core.Item = Item;
    core.KeyValue = KeyValue;
    core.Location = Location;
    core.Order = Order;
    core.Reservation = Reservation;
    core.Transaction = Transaction;

    return core;
});
  // Register in the values from the outer closure for common dependencies
  // as local almond modules
  define('jquery', function() {
    return $;
  });
  define('jquery-jsonp', function() {
    return jsonp;
  });
  define('jquery-pubsub', function() {
    return pubsub;
  });
  define('moment', function() {
    return moment;
  });
 
  // Use almond's special top level synchronous require to trigger factory
  // functions, get the final module, and export it as the public api.
  return require('../main');
}));