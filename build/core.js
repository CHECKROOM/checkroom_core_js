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
 * @copyright CHECKROOM NV 2015
 */
define('common',[], /** Common */ function () {

    // latinize; replaces all accented characters in a string
    // http://stackoverflow.com/questions/286921/efficiently-replace-all-accented-characters-in-a-string
    // ----
    var Latinise={};Latinise.latin_map = {"Á":"A","Ă":"A","Ắ":"A","Ặ":"A","Ằ":"A","Ẳ":"A","Ẵ":"A","Ǎ":"A","Â":"A","Ấ":"A","Ậ":"A","Ầ":"A","Ẩ":"A","Ẫ":"A","Ä":"A","Ǟ":"A","Ȧ":"A","Ǡ":"A","Ạ":"A","Ȁ":"A","À":"A","Ả":"A","Ȃ":"A","Ā":"A","Ą":"A","Å":"A","Ǻ":"A","Ḁ":"A","Ⱥ":"A","Ã":"A","Ꜳ":"AA","Æ":"AE","Ǽ":"AE","Ǣ":"AE","Ꜵ":"AO","Ꜷ":"AU","Ꜹ":"AV","Ꜻ":"AV","Ꜽ":"AY","Ḃ":"B","Ḅ":"B","Ɓ":"B","Ḇ":"B","Ƀ":"B","Ƃ":"B","Ć":"C","Č":"C","Ç":"C","Ḉ":"C","Ĉ":"C","Ċ":"C","Ƈ":"C","Ȼ":"C","Ď":"D","Ḑ":"D","Ḓ":"D","Ḋ":"D","Ḍ":"D","Ɗ":"D","Ḏ":"D","ǲ":"D","ǅ":"D","Đ":"D","Ƌ":"D","Ǳ":"DZ","Ǆ":"DZ","É":"E","Ĕ":"E","Ě":"E","Ȩ":"E","Ḝ":"E","Ê":"E","Ế":"E","Ệ":"E","Ề":"E","Ể":"E","Ễ":"E","Ḙ":"E","Ë":"E","Ė":"E","Ẹ":"E","Ȅ":"E","È":"E","Ẻ":"E","Ȇ":"E","Ē":"E","Ḗ":"E","Ḕ":"E","Ę":"E","Ɇ":"E","Ẽ":"E","Ḛ":"E","Ꝫ":"ET","Ḟ":"F","Ƒ":"F","Ǵ":"G","Ğ":"G","Ǧ":"G","Ģ":"G","Ĝ":"G","Ġ":"G","Ɠ":"G","Ḡ":"G","Ǥ":"G","Ḫ":"H","Ȟ":"H","Ḩ":"H","Ĥ":"H","Ⱨ":"H","Ḧ":"H","Ḣ":"H","Ḥ":"H","Ħ":"H","Í":"I","Ĭ":"I","Ǐ":"I","Î":"I","Ï":"I","Ḯ":"I","İ":"I","Ị":"I","Ȉ":"I","Ì":"I","Ỉ":"I","Ȋ":"I","Ī":"I","Į":"I","Ɨ":"I","Ĩ":"I","Ḭ":"I","Ꝺ":"D","Ꝼ":"F","Ᵹ":"G","Ꞃ":"R","Ꞅ":"S","Ꞇ":"T","Ꝭ":"IS","Ĵ":"J","Ɉ":"J","Ḱ":"K","Ǩ":"K","Ķ":"K","Ⱪ":"K","Ꝃ":"K","Ḳ":"K","Ƙ":"K","Ḵ":"K","Ꝁ":"K","Ꝅ":"K","Ĺ":"L","Ƚ":"L","Ľ":"L","Ļ":"L","Ḽ":"L","Ḷ":"L","Ḹ":"L","Ⱡ":"L","Ꝉ":"L","Ḻ":"L","Ŀ":"L","Ɫ":"L","ǈ":"L","Ł":"L","Ǉ":"LJ","Ḿ":"M","Ṁ":"M","Ṃ":"M","Ɱ":"M","Ń":"N","Ň":"N","Ņ":"N","Ṋ":"N","Ṅ":"N","Ṇ":"N","Ǹ":"N","Ɲ":"N","Ṉ":"N","Ƞ":"N","ǋ":"N","Ñ":"N","Ǌ":"NJ","Ó":"O","Ŏ":"O","Ǒ":"O","Ô":"O","Ố":"O","Ộ":"O","Ồ":"O","Ổ":"O","Ỗ":"O","Ö":"O","Ȫ":"O","Ȯ":"O","Ȱ":"O","Ọ":"O","Ő":"O","Ȍ":"O","Ò":"O","Ỏ":"O","Ơ":"O","Ớ":"O","Ợ":"O","Ờ":"O","Ở":"O","Ỡ":"O","Ȏ":"O","Ꝋ":"O","Ꝍ":"O","Ō":"O","Ṓ":"O","Ṑ":"O","Ɵ":"O","Ǫ":"O","Ǭ":"O","Ø":"O","Ǿ":"O","Õ":"O","Ṍ":"O","Ṏ":"O","Ȭ":"O","Ƣ":"OI","Ꝏ":"OO","Ɛ":"E","Ɔ":"O","Ȣ":"OU","Ṕ":"P","Ṗ":"P","Ꝓ":"P","Ƥ":"P","Ꝕ":"P","Ᵽ":"P","Ꝑ":"P","Ꝙ":"Q","Ꝗ":"Q","Ŕ":"R","Ř":"R","Ŗ":"R","Ṙ":"R","Ṛ":"R","Ṝ":"R","Ȑ":"R","Ȓ":"R","Ṟ":"R","Ɍ":"R","Ɽ":"R","Ꜿ":"C","Ǝ":"E","Ś":"S","Ṥ":"S","Š":"S","Ṧ":"S","Ş":"S","Ŝ":"S","Ș":"S","Ṡ":"S","Ṣ":"S","Ṩ":"S","Ť":"T","Ţ":"T","Ṱ":"T","Ț":"T","Ⱦ":"T","Ṫ":"T","Ṭ":"T","Ƭ":"T","Ṯ":"T","Ʈ":"T","Ŧ":"T","Ɐ":"A","Ꞁ":"L","Ɯ":"M","Ʌ":"V","Ꜩ":"TZ","Ú":"U","Ŭ":"U","Ǔ":"U","Û":"U","Ṷ":"U","Ü":"U","Ǘ":"U","Ǚ":"U","Ǜ":"U","Ǖ":"U","Ṳ":"U","Ụ":"U","Ű":"U","Ȕ":"U","Ù":"U","Ủ":"U","Ư":"U","Ứ":"U","Ự":"U","Ừ":"U","Ử":"U","Ữ":"U","Ȗ":"U","Ū":"U","Ṻ":"U","Ų":"U","Ů":"U","Ũ":"U","Ṹ":"U","Ṵ":"U","Ꝟ":"V","Ṿ":"V","Ʋ":"V","Ṽ":"V","Ꝡ":"VY","Ẃ":"W","Ŵ":"W","Ẅ":"W","Ẇ":"W","Ẉ":"W","Ẁ":"W","Ⱳ":"W","Ẍ":"X","Ẋ":"X","Ý":"Y","Ŷ":"Y","Ÿ":"Y","Ẏ":"Y","Ỵ":"Y","Ỳ":"Y","Ƴ":"Y","Ỷ":"Y","Ỿ":"Y","Ȳ":"Y","Ɏ":"Y","Ỹ":"Y","Ź":"Z","Ž":"Z","Ẑ":"Z","Ⱬ":"Z","Ż":"Z","Ẓ":"Z","Ȥ":"Z","Ẕ":"Z","Ƶ":"Z","Ĳ":"IJ","Œ":"OE","ᴀ":"A","ᴁ":"AE","ʙ":"B","ᴃ":"B","ᴄ":"C","ᴅ":"D","ᴇ":"E","ꜰ":"F","ɢ":"G","ʛ":"G","ʜ":"H","ɪ":"I","ʁ":"R","ᴊ":"J","ᴋ":"K","ʟ":"L","ᴌ":"L","ᴍ":"M","ɴ":"N","ᴏ":"O","ɶ":"OE","ᴐ":"O","ᴕ":"OU","ᴘ":"P","ʀ":"R","ᴎ":"N","ᴙ":"R","ꜱ":"S","ᴛ":"T","ⱻ":"E","ᴚ":"R","ᴜ":"U","ᴠ":"V","ᴡ":"W","ʏ":"Y","ᴢ":"Z","á":"a","ă":"a","ắ":"a","ặ":"a","ằ":"a","ẳ":"a","ẵ":"a","ǎ":"a","â":"a","ấ":"a","ậ":"a","ầ":"a","ẩ":"a","ẫ":"a","ä":"a","ǟ":"a","ȧ":"a","ǡ":"a","ạ":"a","ȁ":"a","à":"a","ả":"a","ȃ":"a","ā":"a","ą":"a","ᶏ":"a","ẚ":"a","å":"a","ǻ":"a","ḁ":"a","ⱥ":"a","ã":"a","ꜳ":"aa","æ":"ae","ǽ":"ae","ǣ":"ae","ꜵ":"ao","ꜷ":"au","ꜹ":"av","ꜻ":"av","ꜽ":"ay","ḃ":"b","ḅ":"b","ɓ":"b","ḇ":"b","ᵬ":"b","ᶀ":"b","ƀ":"b","ƃ":"b","ɵ":"o","ć":"c","č":"c","ç":"c","ḉ":"c","ĉ":"c","ɕ":"c","ċ":"c","ƈ":"c","ȼ":"c","ď":"d","ḑ":"d","ḓ":"d","ȡ":"d","ḋ":"d","ḍ":"d","ɗ":"d","ᶑ":"d","ḏ":"d","ᵭ":"d","ᶁ":"d","đ":"d","ɖ":"d","ƌ":"d","ı":"i","ȷ":"j","ɟ":"j","ʄ":"j","ǳ":"dz","ǆ":"dz","é":"e","ĕ":"e","ě":"e","ȩ":"e","ḝ":"e","ê":"e","ế":"e","ệ":"e","ề":"e","ể":"e","ễ":"e","ḙ":"e","ë":"e","ė":"e","ẹ":"e","ȅ":"e","è":"e","ẻ":"e","ȇ":"e","ē":"e","ḗ":"e","ḕ":"e","ⱸ":"e","ę":"e","ᶒ":"e","ɇ":"e","ẽ":"e","ḛ":"e","ꝫ":"et","ḟ":"f","ƒ":"f","ᵮ":"f","ᶂ":"f","ǵ":"g","ğ":"g","ǧ":"g","ģ":"g","ĝ":"g","ġ":"g","ɠ":"g","ḡ":"g","ᶃ":"g","ǥ":"g","ḫ":"h","ȟ":"h","ḩ":"h","ĥ":"h","ⱨ":"h","ḧ":"h","ḣ":"h","ḥ":"h","ɦ":"h","ẖ":"h","ħ":"h","ƕ":"hv","í":"i","ĭ":"i","ǐ":"i","î":"i","ï":"i","ḯ":"i","ị":"i","ȉ":"i","ì":"i","ỉ":"i","ȋ":"i","ī":"i","į":"i","ᶖ":"i","ɨ":"i","ĩ":"i","ḭ":"i","ꝺ":"d","ꝼ":"f","ᵹ":"g","ꞃ":"r","ꞅ":"s","ꞇ":"t","ꝭ":"is","ǰ":"j","ĵ":"j","ʝ":"j","ɉ":"j","ḱ":"k","ǩ":"k","ķ":"k","ⱪ":"k","ꝃ":"k","ḳ":"k","ƙ":"k","ḵ":"k","ᶄ":"k","ꝁ":"k","ꝅ":"k","ĺ":"l","ƚ":"l","ɬ":"l","ľ":"l","ļ":"l","ḽ":"l","ȴ":"l","ḷ":"l","ḹ":"l","ⱡ":"l","ꝉ":"l","ḻ":"l","ŀ":"l","ɫ":"l","ᶅ":"l","ɭ":"l","ł":"l","ǉ":"lj","ſ":"s","ẜ":"s","ẛ":"s","ẝ":"s","ḿ":"m","ṁ":"m","ṃ":"m","ɱ":"m","ᵯ":"m","ᶆ":"m","ń":"n","ň":"n","ņ":"n","ṋ":"n","ȵ":"n","ṅ":"n","ṇ":"n","ǹ":"n","ɲ":"n","ṉ":"n","ƞ":"n","ᵰ":"n","ᶇ":"n","ɳ":"n","ñ":"n","ǌ":"nj","ó":"o","ŏ":"o","ǒ":"o","ô":"o","ố":"o","ộ":"o","ồ":"o","ổ":"o","ỗ":"o","ö":"o","ȫ":"o","ȯ":"o","ȱ":"o","ọ":"o","ő":"o","ȍ":"o","ò":"o","ỏ":"o","ơ":"o","ớ":"o","ợ":"o","ờ":"o","ở":"o","ỡ":"o","ȏ":"o","ꝋ":"o","ꝍ":"o","ⱺ":"o","ō":"o","ṓ":"o","ṑ":"o","ǫ":"o","ǭ":"o","ø":"o","ǿ":"o","õ":"o","ṍ":"o","ṏ":"o","ȭ":"o","ƣ":"oi","ꝏ":"oo","ɛ":"e","ᶓ":"e","ɔ":"o","ᶗ":"o","ȣ":"ou","ṕ":"p","ṗ":"p","ꝓ":"p","ƥ":"p","ᵱ":"p","ᶈ":"p","ꝕ":"p","ᵽ":"p","ꝑ":"p","ꝙ":"q","ʠ":"q","ɋ":"q","ꝗ":"q","ŕ":"r","ř":"r","ŗ":"r","ṙ":"r","ṛ":"r","ṝ":"r","ȑ":"r","ɾ":"r","ᵳ":"r","ȓ":"r","ṟ":"r","ɼ":"r","ᵲ":"r","ᶉ":"r","ɍ":"r","ɽ":"r","ↄ":"c","ꜿ":"c","ɘ":"e","ɿ":"r","ś":"s","ṥ":"s","š":"s","ṧ":"s","ş":"s","ŝ":"s","ș":"s","ṡ":"s","ṣ":"s","ṩ":"s","ʂ":"s","ᵴ":"s","ᶊ":"s","ȿ":"s","ɡ":"g","ᴑ":"o","ᴓ":"o","ᴝ":"u","ť":"t","ţ":"t","ṱ":"t","ț":"t","ȶ":"t","ẗ":"t","ⱦ":"t","ṫ":"t","ṭ":"t","ƭ":"t","ṯ":"t","ᵵ":"t","ƫ":"t","ʈ":"t","ŧ":"t","ᵺ":"th","ɐ":"a","ᴂ":"ae","ǝ":"e","ᵷ":"g","ɥ":"h","ʮ":"h","ʯ":"h","ᴉ":"i","ʞ":"k","ꞁ":"l","ɯ":"m","ɰ":"m","ᴔ":"oe","ɹ":"r","ɻ":"r","ɺ":"r","ⱹ":"r","ʇ":"t","ʌ":"v","ʍ":"w","ʎ":"y","ꜩ":"tz","ú":"u","ŭ":"u","ǔ":"u","û":"u","ṷ":"u","ü":"u","ǘ":"u","ǚ":"u","ǜ":"u","ǖ":"u","ṳ":"u","ụ":"u","ű":"u","ȕ":"u","ù":"u","ủ":"u","ư":"u","ứ":"u","ự":"u","ừ":"u","ử":"u","ữ":"u","ȗ":"u","ū":"u","ṻ":"u","ų":"u","ᶙ":"u","ů":"u","ũ":"u","ṹ":"u","ṵ":"u","ᵫ":"ue","ꝸ":"um","ⱴ":"v","ꝟ":"v","ṿ":"v","ʋ":"v","ᶌ":"v","ⱱ":"v","ṽ":"v","ꝡ":"vy","ẃ":"w","ŵ":"w","ẅ":"w","ẇ":"w","ẉ":"w","ẁ":"w","ⱳ":"w","ẘ":"w","ẍ":"x","ẋ":"x","ᶍ":"x","ý":"y","ŷ":"y","ÿ":"y","ẏ":"y","ỵ":"y","ỳ":"y","ƴ":"y","ỷ":"y","ỿ":"y","ȳ":"y","ẙ":"y","ɏ":"y","ỹ":"y","ź":"z","ž":"z","ẑ":"z","ʑ":"z","ⱬ":"z","ż":"z","ẓ":"z","ȥ":"z","ẕ":"z","ᵶ":"z","ᶎ":"z","ʐ":"z","ƶ":"z","ɀ":"z","ﬀ":"ff","ﬃ":"ffi","ﬄ":"ffl","ﬁ":"fi","ﬂ":"fl","ĳ":"ij","œ":"oe","ﬆ":"st","ₐ":"a","ₑ":"e","ᵢ":"i","ⱼ":"j","ₒ":"o","ᵣ":"r","ᵤ":"u","ᵥ":"v","ₓ":"x"};
    String.prototype.latinise = function(){
        return this.replace(/[^A-Za-z0-9\[\] ]/g,function(a){return Latinise.latin_map[a]||a})
    };

    String.prototype.latinize = String.prototype.latinise;

    String.prototype.isLatin = function(){return this==this.latinise()};


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

    String.prototype.OnlyAlphaNumSpaceAndUnderscore = function (){
        // \s Matches a single white space character, including space, tab, form feed, line feed and other Unicode spaces.
        // \W Matches any character that is not a word character from the basic Latin alphabet. Equivalent to [^A-Za-z0-9_]
        // Preceding or trailing whitespaces are removed, and words are also latinised
        return $.trim(this).toLowerCase().replace(/[\s-]+/g, '_').latinise().replace(/[\W]/g, '');
    };

    String.prototype.OnlyAlphaNumSpaceUnderscoreAndDot = function (){
        // \s Matches a single white space character, including space, tab, form feed, line feed and other Unicode spaces.
        // \W Matches any character that is not a word character from the basic Latin alphabet. Equivalent to [^A-Za-z0-9_]
        // Preceding or trailing whitespaces are removed, and words are also latinised
        return $.trim(this).toLowerCase().replace(/[\s-]+/g, '_').latinise().replace(/[^a-z0-9_\.]/g, '');
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
 * a DateHelper class
 * @module dateHelper
 * @copyright CHECKROOM NV 2015
 */
define('dateHelper',["jquery", "moment"], /** @lends DateHelper */ function ($, moment) {

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

    /**
     * @name  DateHelper
     * @class
     * @constructor
     */
    var DateHelper = function(spec) {
        spec = spec || {};
        this.roundType = spec.roundType || "nearest";
        this.roundMinutes = spec.roundMinutes || INCREMENT;
    };

    /**
     * @name  DateHelper#getNow
     * @method
     * @return {moment}
     */
    DateHelper.prototype.getNow = function() {
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
    DateHelper.prototype.getFriendlyDuration = function(duration) {
        return duration.humanize();
    };

    /**
     * @name DateHelper#getFriendlyDateParts
     * @param date
     * @param now (optional)
     * @param format (optional)
     * @returns [date string,time string]
     */
    DateHelper.prototype.getFriendlyDateParts = function(date, now, format) {
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
        now = now || this.getNow();
        format = format || "MMM D [at] h:mm a";
        var diff = now.diff(date, 'days');
        var str = (Math.abs(diff) < 7) ? date.calendar() : date.format(format);
        return str
                .replace("AM", "am")
                .replace("PM", "pm")
                .split(" at ");
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
    DateHelper.prototype.getFriendlyFromTo = function(from, to, useHours, now, separator, format) {
        now = now || this.getNow();

        var sep = separator || " - ",
            fromParts = this.getFriendlyDateParts(from, now, format),
            toParts = this.getFriendlyDateParts(to, now, format),
            result = {
                dayDiff: from.diff(to, 'days'),
                fromDate: fromParts[0],
                fromTime: (useHours) ? fromParts[1] : "",
                toDate: toParts[0],
                toTime: (useHours) ? toParts[1] : ""
            };

        result.fromText = result.fromDate;
        result.toText = result.toDate;
        if (useHours) {
            result.fromText += " " + result.fromTime;
            result.toText += " " + result.toTime;
        }


        // Build a text based on the dates and times we have
        if (result.dayDiff==0) {
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
     * Turns all strings that look like datetimes into moment objects recursively
     * @name  DateHelper#fixDates
     * @method
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
     * @name  DateHelper#roundTimeFrom
     * @method
     * @param m
     */
    DateHelper.prototype.roundTimeFrom = function(m) {
        return (this.roundMinutes<=1) ? m : this.roundTime(m, this.roundMinutes, this._typeToDirection(this.roundType, "from"));
    };

    /**
     * roundTimeTo uses the time rounding rules to round an end datetime
     * @name  DateHelper#roundTimeTo
     * @method
     * @param m
     */
    DateHelper.prototype.roundTimeTo = function(m) {
        return (this.roundMinutes<=1) ? m : this.roundTime(m, this.roundMinutes, this._typeToDirection(this.roundType, "to"));
    };

    /**
     * @name  DateHelper#roundTime
     * @method
     * @param  m
     * @param  inc
     * @param  direction
     */
    DateHelper.prototype.roundTime = function(m, inc, direction) {
        var mom = (moment.isMoment(m)) ? m : moment(m);
        mom.seconds(0).milliseconds(0);
        return mom.roundTo("minute", inc || INCREMENT, direction);
    };

    /**
     * @name  DateHelper#roundTimeUp
     * @method
     * @param  m
     * @param  inc
     */
    DateHelper.prototype.roundTimeUp = function(m, inc) {
        var mom = (moment.isMoment(m)) ? m : moment(m);
        mom.seconds(0).milliseconds(0);
        return mom.roundTo("minute", inc || INCREMENT, "up");
    };

    /**
     * @name DateHelper#roundTimeDown
     * @method
     * @param  m
     * @param  inc
     */
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
 * @namespace api
 * @copyright CHECKROOM NV 2015
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
    api.ApiPaymentRequired = function (msg, opt) {        this.code = 402; this.message = msg || "Your subscription has expired"; this.opt = opt; };
    api.ApiPaymentRequired.prototype = new Error();

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
    api.ApiAjax.prototype._handleAjaxSuccess = function(dfd, data, opt) {
        if (this.responseInTz) {
            data = this._fixDates(data);
        }
        return dfd.resolve(data);
    };

    api.ApiAjax.prototype._handleAjaxError = function(dfd, x, t, m, opt) {
        var msg = null;
        if (m==="timeout") {
            dfd.reject(new api.ApiNetworkTimeout(msg, opt));
        } else {
            switch(x.status) {
                case 400: dfd.reject(new api.ApiBadRequest(msg, opt)); break;
                case 401: dfd.reject(new api.ApiUnauthorized(msg, opt)); break;
                case 402: dfd.reject(new api.ApiPaymentRequired(msg, opt)); break;
                case 403: dfd.reject(new api.ApiForbidden(msg, opt)); break;
                case 404: dfd.reject(new api.ApiNotFound(msg, opt)); break;
                case 408: dfd.reject(new api.NetworkTimeout(msg, opt)); break;
                case 422: dfd.reject(new api.ApiUnprocessableEntity(msg, opt)); break;
                case 500:
                default: dfd.reject(new api.ApiError(msg, opt)); break;
            }
        }
    };

    api.ApiAjax.prototype._postAjax = function(url, data, timeOut, opt) {
        var dfd = $.Deferred();
        var that = this;

        $.ajax({
            type: "POST",
            url: url,
            data: JSON.stringify(this._prepareDict(data)),
            contentType: "application/json; charset=utf-8",
            timeout: timeOut || this.timeOut,
            success: function(data) {return that._handleAjaxSuccess(dfd, data, opt);},
            error: function(x, t, m) {return that._handleAjaxError(dfd, x, t, m, opt);}
        });

        return dfd.promise();
    };

    api.ApiAjax.prototype._getAjax = function(url, timeOut,  opt) {
        var dfd = $.Deferred();
        var that = this;

        $.ajax({
            url: url,
            timeout: timeOut || this.timeOut,
            success: function(data) {return that._handleAjaxSuccess(dfd, data, opt);},
            error: function(x, t, m) {return that._handleAjaxError(dfd, x, t, m, opt);}
        });

        return dfd.promise();
    };

    api.ApiAjax.prototype._getJsonp = function(url, timeOut, opt) {
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
                dfd.reject(new api.ApiError(null, opt));
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

    api.ApiAnonymous.prototype.call = function(method, params, timeOut, opt) {
        system.log('ApiAnonymous: call ' + method);
        var url =
            this.urlApi +
            '/' +
            method +
            '?' +
            $.param(this.ajax._prepareDict(params));
        return this.ajax.get(url, timeOut, opt);
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
        this.version = spec.version;

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
        var cmd = "update";
        var url = this.getBaseUrl() + pk + '/update';
        var p = $.extend({}, params);
        if( (fields!=null) &&
            (fields.length>0)) {
            p['_fields'] = $.isArray(fields) ? fields.join(',') : fields;
        }
        url += '?' + this.getParams(p);
        return this._ajaxGet(cmd, url);
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
        var cmd = "create";
        var url = this.getBaseUrl() + 'create';
        var p = $.extend({}, params);
        if( (fields!=null) &&
            (fields.length>0)) {
            p['_fields'] = $.isArray(fields) ? fields.join(',') : fields;
        }

        url += '?' + this.getParams(p);
        return this._ajaxGet(cmd, url);
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

        if (usePost) {
            return this._ajaxPost(cmd, url, p, timeOut);
        } else {
            url += '?' + this.getParams(p);
            return this._ajaxGet(cmd, url, timeOut);
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
        if (fields) {   p['_fields'] = $.isArray(fields) ? fields.join(',') : fields.replace(/\s/g, ""); }
        if (limit) {    p['_limit'] = limit; }
        if (skip) {     p['_skip'] = skip; }
        if (sort) {     p['_sort'] = sort; }
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
/**
 * The Document module
 * a base class for all documents from the CHECKROOM API
 * @module document
 * @copyright CHECKROOM NV 2015
 */
define('document',[
    'jquery',
    'common',
    'api'], /** @lends Document */function ($, common, api) {

    // Some constant values
    var DEFAULTS = {
        id: ""
    };

    /**
     * @name Document
     * @class
     * @constructor
     * @property {string}  id               - The documents primary key
     * @property {string}  raw              - The raw, unprocessed json response
     */
    var Document = function(spec) {
        this.ds = spec.ds;                                              // ApiDataSource object
        this.fields = spec.fields;                                      // e.g. [*]

        this.raw = null;                                                // raw json object
        this.id = spec.id || DEFAULTS.id;                               // doc _id
    };

    /**
     * Resets the object
     * @name  Document#reset
     * @method
     * @returns {promise}
     */
    Document.prototype.reset = function() {
        // By default, reset just reads from the DEFAULTS dict again
        return this._fromJson(this._getDefaults(), null);
    };

    /**
     * Checks if the document exists in the database
     * @name  Document#existsInDb
     * @method
     * @returns {boolean}
     */
    Document.prototype.existsInDb = function() {
        // Check if we have a primary key
        return (this.id!=null) && (this.id.length>0);
    };

    /**
     * Checks if the object is empty
     * @name  Document#isEmpty
     * @method
     * @returns {boolean}
     */
    Document.prototype.isEmpty = function() {
        return true;
    };

    /**
     * Checks if the object needs to be saved
     * We don't check any of the keyvalues (or comments, attachments) here
     * @name  Document#isDirty
     * @method
     * @returns {boolean}
     */
    Document.prototype.isDirty = function() {
        return false;
    };

    /**
     * Checks if the object is valid
     * @name  Document#isValid
     * @method
     * @returns {boolean}
     */
    Document.prototype.isValid = function() {
        return true;
    };

    /**
     * Discards any changes made to the object from the previously loaded raw response
     * or resets it when no old raw response was found
     * @name  Document#discardChanges
     * @method
     * @returns {promise}
     */
    Document.prototype.discardChanges = function() {
        return (this.raw) ? this._fromJson(this.raw, null) : this.reset();
    };

    /**
     * Reloads the object from db
     * @name  Document#reload
     * @method
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
     * @name  Document#get
     * @method
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
     * @name  Document#create
     * @method
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
     * @name  Document#update
     * @method
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
     * @name  Document#delete
     * @method
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
            return $.Deferred().reject(new Error("Document does not exist"));
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
     * @method
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
     * @method
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
     * Gets the id of a document
     * @param obj
     * @param prop
     * @returns {string}
     * @private
     */
    Document.prototype._getId = function(obj, prop) {
        return (typeof obj === 'string') ? obj : obj[prop || "_id"];
    };

    /**
     * Wrapping the this.ds.call method
     * {pk: '', method: '', params: {}, fields: '', timeOut: null, usePost: null, skipRead: null}
     * @method
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
 * The Availability module
 * @copyright CHECKROOM NV 2015
 * @module availability
 */
define('Availability',[
    'jquery',
    'common',
    'api',
    'document'],  /** @lends Document */ function ($, common, api, Document) {

    // Some constant values
    var DEFAULTS = {
            id: "",
            planning: "",
            item: "",
            from: null,
            to: null,
            order: "",
            reservation: ""
        };

    // Allow overriding the ctor during inheritance
    // http://stackoverflow.com/questions/4152931/javascript-inheritance-call-super-constructor-or-use-prototype-chain
    var tmp = function(){};
    tmp.prototype = Document.prototype;

    /**
     * Availability represent the **un**availability of an Item between two dates
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
    var Availability = function(opt) {
        var spec = $.extend({}, opt);
        Document.call(this, spec);

        this.planning = spec.planning || DEFAULTS.planning;
        this.item = spec.item || DEFAULTS.item;
        this.from = spec.from || DEFAULTS.from;
        this.to = spec.to || DEFAULTS.to;
        this.order = spec.order || DEFAULTS.order;
        this.reservation = spec.reservation || DEFAULTS.reservation;
    };

    Availability.prototype = new tmp();
    Availability.prototype.constructor = Availability;

    //
    // Document overrides
    //
    Availability.prototype._getDefaults = function() {
        return DEFAULTS;
    };

    /**
     * Checks if the object is empty, it never is
     * @name  Availability#isEmpty
     * @method
     * @returns {boolean}
     * @override
     */
    Availability.prototype.isEmpty = function() {
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
    Availability.prototype.canDelete = function() {
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
    Availability.prototype._toJson = function(options) {
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
    Availability.prototype._fromJson = function(data, options) {
        var that = this;
        return Document.prototype._fromJson.call(this, data, options)
            .then(function() {
                that.planning = data.planning || DEFAULTS.planning;
                that.item = data.item || DEFAULTS.item;
                that.from = data.fromDate || DEFAULTS.from;
                that.to = data.toDate || DEFAULTS.to;
                that.order = data.order || DEFAULTS.order;
                that.reservation = data.reservation || DEFAULTS.reservation;
                return data;
            });
    };

    return Availability;

});

/**
 * The KeyValue module
 * a helper class that can read KeyValues
 * @module KeyValue
 * @copyright CHECKROOM NV 2015
 */
define('keyvalue',['jquery'], /** @lends KeyValue */ function ($) {

    var DEFAULTS = {
        id: '',
        pk: '',
        key: '',
        kind: 'string',
        value: null,
        modified: null,
        by: null
    };

    /**
     * KeyValue class
     * @name  KeyValue
     * @class    
     * @constructor
     * 
     * @param spec
     */
    var KeyValue = function(spec) {
        this.ds = spec.ds;
        this.fields = spec.fields;

        this.raw = null; // the raw json object
        this.id = spec.id || DEFAULTS.id;
        this.pk = spec.pk || DEFAULTS.pk;
        this.key = spec.key || DEFAULTS.key;
        this.kind = spec.kind || DEFAULTS.kind;  // string, int, float, bool, date, attachment
        this.value = spec.value || DEFAULTS.value;
        this.modified = spec.modified || DEFAULTS.modified;
        this.by = spec.by || DEFAULTS.by;
    };

    /**
     * Checks if the document exists in the database
     * @name  KeyValue#existsInDb
     * @method
     * @returns {boolean}
     */
    KeyValue.prototype.existsInDb = function() {
        return (this.id!=null) && (this.id.length>0);
    };

    /**
     * Gets the name for this keyValue
     * @name  KeyValue#getName
     * @method
     * @returns {string}
     */
    KeyValue.prototype.getName = function() {
        // cheqroom.prop.Warranty+date
        // cheqroom.prop.Buy+price;EUR
        var keyParts = this.key.split(";");
        var noUnit = keyParts[0]
        return noUnit.split('.').pop().split('+').join(' ');
    };

    /**
     * Gets the unit for this keyValue, if no unit returns ""
     * @name  KeyValue#getUnit
     * @method
     * @returns {string}
     */
    KeyValue.prototype.getUnit = function() {
        var keyParts = this.key.split(";");
        return (keyParts.length==2) ? keyParts[1] : "";
    };

    /**
     * Checks if the object is empty
     * after calling reset() isEmpty() should return true
     * @name  KeyValue#isEmpty
     * @method
     * @returns {boolean}
     */
    KeyValue.prototype.isEmpty = function() {
        return (
            (this.id == DEFAULTS.id) &&
            (this.pk == DEFAULTS.pk) &&
            (this.key == DEFAULTS.key) &&
            (this.kind == DEFAULTS.kind) &&
            (this.value == DEFAULTS.value) &&
            (this.modified == DEFAULTS.modified) &&
            (this.by == DEFAULTS.by));
    };

    /**
     * Checks if the object has changed
     * @name KeyValue#isDirty
     * @method
     * @returns {boolean}
     */
    KeyValue.prototype.isDirty = function() {
        return false;
    };

    /**
     * Checks if the object is valid
     * @name  KeyValue#isValid
     * @method
     * @returns {boolean}
     */
    KeyValue.prototype.isValid = function() {
        return true;
    };

    /**
     * Resets the object
     * @name  KeyValue#reset
     * @method
     * @returns promise
     */
    KeyValue.prototype.reset = function() {
        return this._fromJson(DEFAULTS, null);
    };

    /**
     * _toJson, makes a dict of the object
     * @method
     * @param options
     * @returns {object}
     * @private
     */
    KeyValue.prototype._toJson = function(options) {
        return {
            id: this.id,
            pk: this.pk,
            key: this.key,
            kind: this.kind,
            value: this.value,
            modified: this.modified,
            by: this.by
        };
    };

    /**
     * _fromJson: in this implementation we'll only read
     * the data.keyValues into: comments, attachments, keyValues
     * @method
     * @param {object} data the json response
     * @param {object} options dict
     * @returns promise
     * @private
     */
    KeyValue.prototype._fromJson = function(data, options) {
        this.raw = data;
        this.id = data.id || DEFAULTS.id;
        this.pk = data.pk || DEFAULTS.pk;
        this.key = data.key || DEFAULTS.key;
        this.kind = data.kind || DEFAULTS.kind;
        this.value = data.value || DEFAULTS.value;
        this.modified = data.modified || DEFAULTS.modified;
        this.by = data.by || DEFAULTS.by;
        return $.Deferred().resolve(data);
    };

    return KeyValue;

});
/**
 * The Attachment module
 * an Attachment class inheriting from KeyValue
 * @module attachment
 * @copyright CHECKROOM NV 2015
 */
define('Attachment',[
    'jquery',
    'keyvalue'], /** @lends Attachment */ function ($, KeyValue) {

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
     * @name  Attachment
     * @class
     * @property {bool} isCover        is this the cover image of a document
     * @property {bool} canBeCover     can this attachment be the cover of a document?
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
     * @name  Attachment#getExt
     * @method
     * @param name
     * @returns {string}
     */
    Attachment.prototype.getExt = function(name) {
        name = name || this.getName();
        return EXT.exec(name)[1] || "";
    };

    /**
     * Checks if the attachment is an image
     * @name  Attachment#isImage
     * @method
     * @returns {boolean}
     */
    Attachment.prototype.isImage = function() {
        var name = this.getName();
        var ext = this.getExt(name);
        return ($.inArray(ext, IMAGES) >= 0);
    };

    /**
     * Checks if the attachment has a preview
     * @name  Attachment#hasPreview
     * @method
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
 * The Comment module
 * a helper class that can read a Comment KeyValue
 * Comment inherits from KeyValue and adds some specifics to it
 * @module comment
 * @copyright CHECKROOM NV 2015
 */
define('comment',[
    'jquery',
    'keyvalue'],/** Comment */ function ($, KeyValue) {

    var KEY = "cheqroom.Comment";
    var DEFAULTS = {
    };

    // Allow overriding the ctor during inheritance
    // http://stackoverflow.com/questions/4152931/javascript-inheritance-call-super-constructor-or-use-prototype-chain
    var tmp = function() {};
    tmp.prototype = KeyValue.prototype;

    /**
     * @name  Comment
     * @class
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
 * an Attachment class inheriting from KeyValue
 * @module attachment
 * @copyright CHECKROOM NV 2015
 */
define('attachment',[
    'jquery',
    'keyvalue'], /** @lends Attachment */ function ($, KeyValue) {

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
     * @name  Attachment
     * @class
     * @property {bool} isCover        is this the cover image of a document
     * @property {bool} canBeCover     can this attachment be the cover of a document?
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
     * @name  Attachment#getExt
     * @method
     * @param name
     * @returns {string}
     */
    Attachment.prototype.getExt = function(name) {
        name = name || this.getName();
        return EXT.exec(name)[1] || "";
    };

    /**
     * Checks if the attachment is an image
     * @name  Attachment#isImage
     * @method
     * @returns {boolean}
     */
    Attachment.prototype.isImage = function() {
        var name = this.getName();
        var ext = this.getExt(name);
        return ($.inArray(ext, IMAGES) >= 0);
    };

    /**
     * Checks if the attachment has a preview
     * @name  Attachment#hasPreview
     * @method
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
 * a base class for all documents that have: comments, attachments, other keyvalues
 * it inherits from Document to support some basic actions
 * @copyright CHECKROOM NV 2015
 * @module base
 */
define('Base',[
    'jquery',
    'common',
    'api',
    'document',
    'comment',
    'attachment',
    'keyvalue'],  /** @lends Base */ function ($, common, api, Document, Comment, Attachment, KeyValue) {

    // Some constant values
    var COMMENT = "cheqroom.Comment",
        ATTACHMENT = "cheqroom.Attachment",
        IMAGE = "cheqroom.prop.Image",
        IMAGE_OTHER = "cheqroom.attachment.Image",
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
     * @name  Base
     * @class
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
     * @name  Base#isEmpty
     * @method
     * @returns {boolean}
     * @override
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
     * @name  Base#canDelete
     * @method
     * @returns {promise}
     * @override
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
    /**
     * Adds a comment by string
     * @name  Base#addComment
     * @method
     * @param comment
     * @param skipRead
     * @returns {promise}
     */
    Base.prototype.addComment = function(comment, skipRead) {
        return this.addKeyValue(COMMENT, comment, "string", skipRead);
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
    Base.prototype.updateComment = function(id, comment, skipRead) {
        return this.updateKeyValue(id, COMMENT, comment, "string", skipRead);
    };

    /**
     * Deletes a Comment by id
     * @name  Base#deleteComment
     * @method
     * @param id
     * @param skipRead
     * @returns {promise}
     */
    Base.prototype.deleteComment = function(id, skipRead) {
        return this.removeKeyValue(id, skipRead);
    };

    // KeyValue stuff
    // ----
    /**
     * Adds a key value
     * @name  Base#addKeyValue
     * @method
     * @param key
     * @param value
     * @param kind
     * @param skipRead
     * @returns {promise}
     */
    Base.prototype.addKeyValue = function(key, value, kind, skipRead) {
        return this._doApiCall({
            method: 'addKeyValue',
            params: {key: key, value: value, kind: kind},
            skipRead: skipRead
        });
    };

    /**
     * Updates a keyvalue by id
     * @name  Base#updateKeyValue
     * @method
     * @param id
     * @param key
     * @param value
     * @param kind
     * @param skipRead
     * @returns {promise}
     */
    Base.prototype.updateKeyValue = function(id, key, value, kind, skipRead) {
        return this._doApiCall({
            method: 'updateKeyValue',
            params: {id: id, key: key, value: value, kind: kind},
            skipRead: skipRead
        });
    };

    /**
     * Removes a keyvalue by id
     * @name  Base#removeKeyValue
     * @method
     * @param id
     * @param skipRead
     * @returns {promise}
     */
    Base.prototype.removeKeyValue = function(id, skipRead) {
        return this._doApiCall({
            method: 'removeKeyValue',
            params: {id: id},
            skipRead: skipRead
        });
    };

    /**
     * Sets a keyvalue by id
     * @name  Base#setKeyValue
     * @method
     * @param id
     * @param key
     * @param value
     * @param kind
     * @param skipRead
     * @returns {promise}
     */
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
    Base.prototype.getImageUrl = function(size, groupId, att, bustCache) {
        var attachment = att || this.cover;
        return (
            (attachment!=null) &&
            (attachment.length>0)) ?
            this.helper.getImageCDNUrl(groupId, attachment, size) :
            this.helper.getImageUrl(this.ds, this.id, size, bustCache);
    };

    /**
     * changes the cover image to another Attachment
     * @name  Base#setCover
     * @method
     * @param att
     * @param skipRead
     * @returns {promise}
     */
    Base.prototype.setCover = function(att, skipRead) {
        return this._doApiCall({
            method: 'setCover',
            params: {kvId: att._id},
            skipRead: skipRead
        });
    };

    /**
     * attaches an image Attachment file, shortcut to attach
     * @name  Base#attachImage
     * @method
     * @param att
     * @param skipRead
     * @returns {promise}
     */
    Base.prototype.attachImage = function(att, skipRead) {
        return this.attach(att, IMAGE, skipRead);
    };

    /**
     * attaches an Attachment file, shortcut to attach
     * @name  Base#attachFile
     * @method
     * @param att
     * @param skipRead
     * @returns {promise}
     */
    Base.prototype.attachFile = function(att, skipRead) {
        return this.attach(att, ATTACHMENT, skipRead);
    };

    /**
     * attaches an Attachment object
     * @name  Base#attach
     * @method
     * @param att
     * @param key
     * @param skipRead
     * @returns {promise}
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
     * detaches an Attachment by kvId (guid)
     * @name  Base#detach
     * @method
     * @param keyId (usually the attachment._id)
     * @param skipRead
     * @returns {promise}
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
     * @method
     * @param {object} data the json response
     * @param {object} options dict
     * @private
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
     * @method
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
                    case IMAGE_OTHER:
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
 * a helper class that can read a Comment KeyValue
 * Comment inherits from KeyValue and adds some specifics to it
 * @module comment
 * @copyright CHECKROOM NV 2015
 */
define('Comment',[
    'jquery',
    'keyvalue'],/** Comment */ function ($, KeyValue) {

    var KEY = "cheqroom.Comment";
    var DEFAULTS = {
    };

    // Allow overriding the ctor during inheritance
    // http://stackoverflow.com/questions/4152931/javascript-inheritance-call-super-constructor-or-use-prototype-chain
    var tmp = function() {};
    tmp.prototype = KeyValue.prototype;

    /**
     * @name  Comment
     * @class
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
 * The Conflict module
 * a helper class that can read Conflicts
 * @module Conflict
 * @copyright CHECKROOM NV 2015
 */
define('Conflict',['jquery'], /** @lends Conflict */ function ($) {

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
    var Conflict = function(spec) {
        this.ds = spec.ds;
        this.fields = spec.fields;

        this.raw = null; // the raw json object
        this.kind = spec.kind || DEFAULTS.kind;
        this.doc = spec.doc || DEFAULTS.doc;
        this.item = spec.item || DEFAULTS.item;
        this.itemName = spec.itemName || DEFAULTS.itemName;
        this.locationCurrent = spec.locationCurrent || DEFAULTS.locationCurrent;
        this.locationDesired = spec.locationDesired || DEFAULTS.locationDesired;
        this.fromDate = spec.fromDate || DEFAULTS.fromDate;
        this.toDate = spec.toDate || DEFAULTS.toDate;
    };

    /**
     * _toJson, makes a dict of the object
     * @method
     * @param {object} opt dict
     * @returns {object}
     * @private
     */
    Conflict.prototype._toJson = function(opt) {
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
    Conflict.prototype._fromJson = function(data, opt) {
        this.raw = data;
        this.kind = data.kind || DEFAULTS.kind;
        this.item = data.item || DEFAULTS.item;
        this.itemName = data.itemName || DEFAULTS.itemName;
        this.fromDate = data.fromDate || DEFAULTS.fromDate;
        this.toDate = data.toDate || DEFAULTS.toDate;
        return $.Deferred().resolve(data);
    };

    return Conflict;

});
/**
 * The Base module
 * a base class for all documents that have: comments, attachments, other keyvalues
 * it inherits from Document to support some basic actions
 * @copyright CHECKROOM NV 2015
 * @module base
 */
define('base',[
    'jquery',
    'common',
    'api',
    'document',
    'comment',
    'attachment',
    'keyvalue'],  /** @lends Base */ function ($, common, api, Document, Comment, Attachment, KeyValue) {

    // Some constant values
    var COMMENT = "cheqroom.Comment",
        ATTACHMENT = "cheqroom.Attachment",
        IMAGE = "cheqroom.prop.Image",
        IMAGE_OTHER = "cheqroom.attachment.Image",
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
     * @name  Base
     * @class
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
     * @name  Base#isEmpty
     * @method
     * @returns {boolean}
     * @override
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
     * @name  Base#canDelete
     * @method
     * @returns {promise}
     * @override
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
    /**
     * Adds a comment by string
     * @name  Base#addComment
     * @method
     * @param comment
     * @param skipRead
     * @returns {promise}
     */
    Base.prototype.addComment = function(comment, skipRead) {
        return this.addKeyValue(COMMENT, comment, "string", skipRead);
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
    Base.prototype.updateComment = function(id, comment, skipRead) {
        return this.updateKeyValue(id, COMMENT, comment, "string", skipRead);
    };

    /**
     * Deletes a Comment by id
     * @name  Base#deleteComment
     * @method
     * @param id
     * @param skipRead
     * @returns {promise}
     */
    Base.prototype.deleteComment = function(id, skipRead) {
        return this.removeKeyValue(id, skipRead);
    };

    // KeyValue stuff
    // ----
    /**
     * Adds a key value
     * @name  Base#addKeyValue
     * @method
     * @param key
     * @param value
     * @param kind
     * @param skipRead
     * @returns {promise}
     */
    Base.prototype.addKeyValue = function(key, value, kind, skipRead) {
        return this._doApiCall({
            method: 'addKeyValue',
            params: {key: key, value: value, kind: kind},
            skipRead: skipRead
        });
    };

    /**
     * Updates a keyvalue by id
     * @name  Base#updateKeyValue
     * @method
     * @param id
     * @param key
     * @param value
     * @param kind
     * @param skipRead
     * @returns {promise}
     */
    Base.prototype.updateKeyValue = function(id, key, value, kind, skipRead) {
        return this._doApiCall({
            method: 'updateKeyValue',
            params: {id: id, key: key, value: value, kind: kind},
            skipRead: skipRead
        });
    };

    /**
     * Removes a keyvalue by id
     * @name  Base#removeKeyValue
     * @method
     * @param id
     * @param skipRead
     * @returns {promise}
     */
    Base.prototype.removeKeyValue = function(id, skipRead) {
        return this._doApiCall({
            method: 'removeKeyValue',
            params: {id: id},
            skipRead: skipRead
        });
    };

    /**
     * Sets a keyvalue by id
     * @name  Base#setKeyValue
     * @method
     * @param id
     * @param key
     * @param value
     * @param kind
     * @param skipRead
     * @returns {promise}
     */
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
    Base.prototype.getImageUrl = function(size, groupId, att, bustCache) {
        var attachment = att || this.cover;
        return (
            (attachment!=null) &&
            (attachment.length>0)) ?
            this.helper.getImageCDNUrl(groupId, attachment, size) :
            this.helper.getImageUrl(this.ds, this.id, size, bustCache);
    };

    /**
     * changes the cover image to another Attachment
     * @name  Base#setCover
     * @method
     * @param att
     * @param skipRead
     * @returns {promise}
     */
    Base.prototype.setCover = function(att, skipRead) {
        return this._doApiCall({
            method: 'setCover',
            params: {kvId: att._id},
            skipRead: skipRead
        });
    };

    /**
     * attaches an image Attachment file, shortcut to attach
     * @name  Base#attachImage
     * @method
     * @param att
     * @param skipRead
     * @returns {promise}
     */
    Base.prototype.attachImage = function(att, skipRead) {
        return this.attach(att, IMAGE, skipRead);
    };

    /**
     * attaches an Attachment file, shortcut to attach
     * @name  Base#attachFile
     * @method
     * @param att
     * @param skipRead
     * @returns {promise}
     */
    Base.prototype.attachFile = function(att, skipRead) {
        return this.attach(att, ATTACHMENT, skipRead);
    };

    /**
     * attaches an Attachment object
     * @name  Base#attach
     * @method
     * @param att
     * @param key
     * @param skipRead
     * @returns {promise}
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
     * detaches an Attachment by kvId (guid)
     * @name  Base#detach
     * @method
     * @param keyId (usually the attachment._id)
     * @param skipRead
     * @returns {promise}
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
     * @method
     * @param {object} data the json response
     * @param {object} options dict
     * @private
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
     * @method
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
                    case IMAGE_OTHER:
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
 * @copyright CHECKROOM NV 2015
 */
define('Contact',[
    'jquery',
    'base'], /** @lends Contact */ function ($, Base) {

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
     * Contact class
     * @name  Contact
     * @class
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
    /**
     * Checks if name is valid
     * @name Contact#isValidName
     * @method
     * @return {Boolean} [description]
     */
    Contact.prototype.isValidName = function() {
        this.name = $.trim(this.name);
        return (this.name.length>=3);
    };

    /**
     * Checks if company is valid
     * @name  Contact#isValidCompany
     * @method
     * @return {Boolean} [description]
     */
    Contact.prototype.isValidCompany = function() {
        this.company = $.trim(this.company);
        return (this.company.length>=3);
    };

    /**
     * Checks if phone is valid
     * @name  Contact#isValidPhone
     * @method
     * @return {Boolean} [description]
     */
    Contact.prototype.isValidPhone = function() {
        this.phone = $.trim(this.phone);
        var isnum = /^\d{9,}$/.test(this.phone);
        if (isnum) {
            return true;
        }

        var m = this.phone.match(/^[\s()+-]*([0-9][\s()+-]*){10,20}(( x| ext)\d{1,5}){0,1}$/);
        return ((m!=null) && (m.length>0));
    };

    /**
     * Check is email is valid
     * @name  Contact#isValidEmail
     * @method
     * @return {Boolean} [description]
     */
    Contact.prototype.isValidEmail = function() {
        var re = /^([\w-]+(?:\.[\w-]+)*)@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$/i;
        this.email = $.trim(this.email);
        return re.test(this.email);
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
    Contact.prototype.isValid = function() {
        return this.isValidName() &&
            this.isValidCompany() &&
            this.isValidPhone() &&
            this.isValidEmail();
    };

    /**
     * Checks if the contact is empty
     * @returns {boolean}
     * @override
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
     * @override
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
 * a DateHelper class
 * @module dateHelper
 * @copyright CHECKROOM NV 2015
 */
define('DateHelper',["jquery", "moment"], /** @lends DateHelper */ function ($, moment) {

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

    /**
     * @name  DateHelper
     * @class
     * @constructor
     */
    var DateHelper = function(spec) {
        spec = spec || {};
        this.roundType = spec.roundType || "nearest";
        this.roundMinutes = spec.roundMinutes || INCREMENT;
    };

    /**
     * @name  DateHelper#getNow
     * @method
     * @return {moment}
     */
    DateHelper.prototype.getNow = function() {
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
    DateHelper.prototype.getFriendlyDuration = function(duration) {
        return duration.humanize();
    };

    /**
     * @name DateHelper#getFriendlyDateParts
     * @param date
     * @param now (optional)
     * @param format (optional)
     * @returns [date string,time string]
     */
    DateHelper.prototype.getFriendlyDateParts = function(date, now, format) {
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
        now = now || this.getNow();
        format = format || "MMM D [at] h:mm a";
        var diff = now.diff(date, 'days');
        var str = (Math.abs(diff) < 7) ? date.calendar() : date.format(format);
        return str
                .replace("AM", "am")
                .replace("PM", "pm")
                .split(" at ");
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
    DateHelper.prototype.getFriendlyFromTo = function(from, to, useHours, now, separator, format) {
        now = now || this.getNow();

        var sep = separator || " - ",
            fromParts = this.getFriendlyDateParts(from, now, format),
            toParts = this.getFriendlyDateParts(to, now, format),
            result = {
                dayDiff: from.diff(to, 'days'),
                fromDate: fromParts[0],
                fromTime: (useHours) ? fromParts[1] : "",
                toDate: toParts[0],
                toTime: (useHours) ? toParts[1] : ""
            };

        result.fromText = result.fromDate;
        result.toText = result.toDate;
        if (useHours) {
            result.fromText += " " + result.fromTime;
            result.toText += " " + result.toTime;
        }


        // Build a text based on the dates and times we have
        if (result.dayDiff==0) {
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
     * Turns all strings that look like datetimes into moment objects recursively
     * @name  DateHelper#fixDates
     * @method
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
     * @name  DateHelper#roundTimeFrom
     * @method
     * @param m
     */
    DateHelper.prototype.roundTimeFrom = function(m) {
        return (this.roundMinutes<=1) ? m : this.roundTime(m, this.roundMinutes, this._typeToDirection(this.roundType, "from"));
    };

    /**
     * roundTimeTo uses the time rounding rules to round an end datetime
     * @name  DateHelper#roundTimeTo
     * @method
     * @param m
     */
    DateHelper.prototype.roundTimeTo = function(m) {
        return (this.roundMinutes<=1) ? m : this.roundTime(m, this.roundMinutes, this._typeToDirection(this.roundType, "to"));
    };

    /**
     * @name  DateHelper#roundTime
     * @method
     * @param  m
     * @param  inc
     * @param  direction
     */
    DateHelper.prototype.roundTime = function(m, inc, direction) {
        var mom = (moment.isMoment(m)) ? m : moment(m);
        mom.seconds(0).milliseconds(0);
        return mom.roundTo("minute", inc || INCREMENT, direction);
    };

    /**
     * @name  DateHelper#roundTimeUp
     * @method
     * @param  m
     * @param  inc
     */
    DateHelper.prototype.roundTimeUp = function(m, inc) {
        var mom = (moment.isMoment(m)) ? m : moment(m);
        mom.seconds(0).milliseconds(0);
        return mom.roundTo("minute", inc || INCREMENT, "up");
    };

    /**
     * @name DateHelper#roundTimeDown
     * @method
     * @param  m
     * @param  inc
     */
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
 * a base class for all documents from the CHECKROOM API
 * @module document
 * @copyright CHECKROOM NV 2015
 */
define('Document',[
    'jquery',
    'common',
    'api'], /** @lends Document */function ($, common, api) {

    // Some constant values
    var DEFAULTS = {
        id: ""
    };

    /**
     * @name Document
     * @class
     * @constructor
     * @property {string}  id               - The documents primary key
     * @property {string}  raw              - The raw, unprocessed json response
     */
    var Document = function(spec) {
        this.ds = spec.ds;                                              // ApiDataSource object
        this.fields = spec.fields;                                      // e.g. [*]

        this.raw = null;                                                // raw json object
        this.id = spec.id || DEFAULTS.id;                               // doc _id
    };

    /**
     * Resets the object
     * @name  Document#reset
     * @method
     * @returns {promise}
     */
    Document.prototype.reset = function() {
        // By default, reset just reads from the DEFAULTS dict again
        return this._fromJson(this._getDefaults(), null);
    };

    /**
     * Checks if the document exists in the database
     * @name  Document#existsInDb
     * @method
     * @returns {boolean}
     */
    Document.prototype.existsInDb = function() {
        // Check if we have a primary key
        return (this.id!=null) && (this.id.length>0);
    };

    /**
     * Checks if the object is empty
     * @name  Document#isEmpty
     * @method
     * @returns {boolean}
     */
    Document.prototype.isEmpty = function() {
        return true;
    };

    /**
     * Checks if the object needs to be saved
     * We don't check any of the keyvalues (or comments, attachments) here
     * @name  Document#isDirty
     * @method
     * @returns {boolean}
     */
    Document.prototype.isDirty = function() {
        return false;
    };

    /**
     * Checks if the object is valid
     * @name  Document#isValid
     * @method
     * @returns {boolean}
     */
    Document.prototype.isValid = function() {
        return true;
    };

    /**
     * Discards any changes made to the object from the previously loaded raw response
     * or resets it when no old raw response was found
     * @name  Document#discardChanges
     * @method
     * @returns {promise}
     */
    Document.prototype.discardChanges = function() {
        return (this.raw) ? this._fromJson(this.raw, null) : this.reset();
    };

    /**
     * Reloads the object from db
     * @name  Document#reload
     * @method
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
     * @name  Document#get
     * @method
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
     * @name  Document#create
     * @method
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
     * @name  Document#update
     * @method
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
     * @name  Document#delete
     * @method
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
            return $.Deferred().reject(new Error("Document does not exist"));
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
     * @method
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
     * @method
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
     * Gets the id of a document
     * @param obj
     * @param prop
     * @returns {string}
     * @private
     */
    Document.prototype._getId = function(obj, prop) {
        return (typeof obj === 'string') ? obj : obj[prop || "_id"];
    };

    /**
     * Wrapping the this.ds.call method
     * {pk: '', method: '', params: {}, fields: '', timeOut: null, usePost: null, skipRead: null}
     * @method
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
 * @copyright CHECKROOM NV 2015
 */
define('Item',[
    'jquery',
    'base'], /** @lends Base */ function ($, Base) {

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
        address: "",
        order: null
    };
    
    // Allow overriding the ctor during inheritance
    // http://stackoverflow.com/questions/4152931/javascript-inheritance-call-super-constructor-or-use-prototype-chain
    var tmp = function() {};
    tmp.prototype = Base.prototype;

    /**
     * Item represents a single piece of equipment
     * @name Item
     * @class Item
     * @constructor
     * @property {string} name         the name of the item
     * @property {status} status       the status of the item in an order, or expired
     * @property {string} flag         the item flag
     * @property {string} location     the item location primary key
     * @property {string} category     the item category primary key
     * @propery {Array} geo            the item geo position in lat lng array
     * @propery {string} address       the item geo position address
     * @propery {string} order         the order pk, if the item is currently in an order
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
        this.order = spec.order || DEFAULTS.order;
    };

    Item.prototype = new tmp();
    Item.prototype.constructor = Item;

    //
    // Base overrides
    //
    Item.prototype.isValidName = function() {
        this.name = $.trim(this.name);
        return (this.name.length>=3);
    };

    Item.prototype.isValidCategory = function() {
        return ($.trim(this.category).length>0);
    };

    Item.prototype.isValidLocation = function() {
        return ($.trim(this.location).length>0);
    };

    Item.prototype.isValid = function() {
        return (
            this.isValidName() &&
            this.isValidCategory() &&
            this.isValidLocation());
    };

    /**
     * Checks if the item is empty
     * @name Item#isEmpty
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
     * @name Item#isDirty
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

                var orderId = DEFAULTS.order;
                if (data.order) {
                    orderId = (data.order._id) ? data.order._id : data.order;
                }
                that.order = orderId;

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
    /**
     * Checks if the Item is unavailable between from / to dates (optional)
     * @name Item#getAvailabilities
     * @param {Moment} from       the from date (optional)
     * @param {Moment} to         the to date (optional)
     * @returns {promise}
     */
    Item.prototype.getAvailabilities = function(from, to) {
        return this.ds.call(this.id, 'getAvailability', {fromDate: from, toDate: to});
    };

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
    //

    /**
     * Duplicates an item a number of times
     * @name Item#duplicate
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
     * @name Item#expire
     * @param skipRead
     * @returns {promise}
     */
    Item.prototype.expire = function(skipRead) {
        return this._doApiCall({method: 'expire', skipRead: skipRead});
    };

    /**
     * Un-expires an item, puts it in the *available* status again
     * @name Item#undoExpire
     * @param skipRead
     * @returns {promise}
     */
    Item.prototype.undoExpire = function(skipRead) {
        return this._doApiCall({method: 'undoExpire', skipRead: skipRead});
    };

    /**
     * Change the location of an item
     * @name Item#changeLocation
     * @param skipRead
     * @returns {promise}
     */
    Item.prototype.changeLocation = function(locationId, skipRead) {
        return this._doApiCall({method: 'changeLocation', params: {location: locationId}, skipRead: skipRead});
    };

    /**
     * Adds a QR code to the item
     * @name Item#addCode
     * @param code
     * @param skipRead
     * @returns {promise}
     */
    Item.prototype.addCode = function(code, skipRead) {
        return this._doApiCall({method: 'addCodes', params: {codes: [code]}, skipRead: skipRead});
    };

    /**
     * Removes a QR code from the item
     * @name Item#removeCode
     * @param code
     * @param skipRead
     * @returns {promise}
     */
    Item.prototype.removeCode = function(code, skipRead) {
        return this._doApiCall({method: 'removeCodes', params: {codes: [code]}, skipRead: skipRead});
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
    Item.prototype.updateGeo = function(lat, lng, address, skipRead) {
        return this._doApiCall({method: 'updateGeo', params: {lat: lat, lng: lng, address: address}, skipRead: skipRead});
    };

    /**
     * Updates the name of an item
     * @name Item#updateName
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
     * @name Item#canChangeCategory
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
     * @name Item#changeCategory
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
     * @name Item#setFlag
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
 * a helper class that can read KeyValues
 * @module KeyValue
 * @copyright CHECKROOM NV 2015
 */
define('KeyValue',['jquery'], /** @lends KeyValue */ function ($) {

    var DEFAULTS = {
        id: '',
        pk: '',
        key: '',
        kind: 'string',
        value: null,
        modified: null,
        by: null
    };

    /**
     * KeyValue class
     * @name  KeyValue
     * @class    
     * @constructor
     * 
     * @param spec
     */
    var KeyValue = function(spec) {
        this.ds = spec.ds;
        this.fields = spec.fields;

        this.raw = null; // the raw json object
        this.id = spec.id || DEFAULTS.id;
        this.pk = spec.pk || DEFAULTS.pk;
        this.key = spec.key || DEFAULTS.key;
        this.kind = spec.kind || DEFAULTS.kind;  // string, int, float, bool, date, attachment
        this.value = spec.value || DEFAULTS.value;
        this.modified = spec.modified || DEFAULTS.modified;
        this.by = spec.by || DEFAULTS.by;
    };

    /**
     * Checks if the document exists in the database
     * @name  KeyValue#existsInDb
     * @method
     * @returns {boolean}
     */
    KeyValue.prototype.existsInDb = function() {
        return (this.id!=null) && (this.id.length>0);
    };

    /**
     * Gets the name for this keyValue
     * @name  KeyValue#getName
     * @method
     * @returns {string}
     */
    KeyValue.prototype.getName = function() {
        // cheqroom.prop.Warranty+date
        // cheqroom.prop.Buy+price;EUR
        var keyParts = this.key.split(";");
        var noUnit = keyParts[0]
        return noUnit.split('.').pop().split('+').join(' ');
    };

    /**
     * Gets the unit for this keyValue, if no unit returns ""
     * @name  KeyValue#getUnit
     * @method
     * @returns {string}
     */
    KeyValue.prototype.getUnit = function() {
        var keyParts = this.key.split(";");
        return (keyParts.length==2) ? keyParts[1] : "";
    };

    /**
     * Checks if the object is empty
     * after calling reset() isEmpty() should return true
     * @name  KeyValue#isEmpty
     * @method
     * @returns {boolean}
     */
    KeyValue.prototype.isEmpty = function() {
        return (
            (this.id == DEFAULTS.id) &&
            (this.pk == DEFAULTS.pk) &&
            (this.key == DEFAULTS.key) &&
            (this.kind == DEFAULTS.kind) &&
            (this.value == DEFAULTS.value) &&
            (this.modified == DEFAULTS.modified) &&
            (this.by == DEFAULTS.by));
    };

    /**
     * Checks if the object has changed
     * @name KeyValue#isDirty
     * @method
     * @returns {boolean}
     */
    KeyValue.prototype.isDirty = function() {
        return false;
    };

    /**
     * Checks if the object is valid
     * @name  KeyValue#isValid
     * @method
     * @returns {boolean}
     */
    KeyValue.prototype.isValid = function() {
        return true;
    };

    /**
     * Resets the object
     * @name  KeyValue#reset
     * @method
     * @returns promise
     */
    KeyValue.prototype.reset = function() {
        return this._fromJson(DEFAULTS, null);
    };

    /**
     * _toJson, makes a dict of the object
     * @method
     * @param options
     * @returns {object}
     * @private
     */
    KeyValue.prototype._toJson = function(options) {
        return {
            id: this.id,
            pk: this.pk,
            key: this.key,
            kind: this.kind,
            value: this.value,
            modified: this.modified,
            by: this.by
        };
    };

    /**
     * _fromJson: in this implementation we'll only read
     * the data.keyValues into: comments, attachments, keyValues
     * @method
     * @param {object} data the json response
     * @param {object} options dict
     * @returns promise
     * @private
     */
    KeyValue.prototype._fromJson = function(data, options) {
        this.raw = data;
        this.id = data.id || DEFAULTS.id;
        this.pk = data.pk || DEFAULTS.pk;
        this.key = data.key || DEFAULTS.key;
        this.kind = data.kind || DEFAULTS.kind;
        this.value = data.value || DEFAULTS.value;
        this.modified = data.modified || DEFAULTS.modified;
        this.by = data.by || DEFAULTS.by;
        return $.Deferred().resolve(data);
    };

    return KeyValue;

});
/**
 * The Location module
 * Location class inherits from Base so it supports KeyValues (Attachment, Comment)
 * @module location
 * @copyright CHECKROOM NV 2015
 */
define('Location',[
    'jquery',
    'base'], /** @lends Base */ function ($, Base) {

    var DEFAULTS = {
        name: '',
        address: ''
    };

    // Allow overriding the ctor during inheritance
    // http://stackoverflow.com/questions/4152931/javascript-inheritance-call-super-constructor-or-use-prototype-chain
    var tmp = function() {};
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
     * @method
     * @name Location#isEmpty
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
     * @method
     * @name Location#isDirty
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
                $.publish('location.fromJson', data);
                return data;
            });
    };

    return Location;
    
});
/**
 * The Location module
 * Location class inherits from Base so it supports KeyValues (Attachment, Comment)
 * @module location
 * @copyright CHECKROOM NV 2015
 */
define('location',[
    'jquery',
    'base'], /** @lends Base */ function ($, Base) {

    var DEFAULTS = {
        name: '',
        address: ''
    };

    // Allow overriding the ctor during inheritance
    // http://stackoverflow.com/questions/4152931/javascript-inheritance-call-super-constructor-or-use-prototype-chain
    var tmp = function() {};
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
     * @method
     * @name Location#isEmpty
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
     * @method
     * @name Location#isDirty
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
                $.publish('location.fromJson', data);
                return data;
            });
    };

    return Location;
    
});
/**
 * The Transaction module
 * a base class for Reservations and Orders
 * Share similar manipulating of: status, dates, items, contacts, locations, comments, attachments
 * @module transaction
 * @implements Base
 * @copyright CHECKROOM NV 2015
 */
define('transaction',[
    "jquery",
    "api",
    "base",
    "location"], /** @lends Base */ function ($, api, Base, Location) {

    var DEFAULTS = {
        status: "creating",
        from: null,
        to: null,
        due: null,
        contact: "",
        location: "",
        items: [],
        conflicts: []
    };

    // Allow overriding the ctor during inheritance
    // http://stackoverflow.com/questions/4152931/javascript-inheritance-call-super-constructor-or-use-prototype-chain
    var tmp = function(){};
    tmp.prototype = Base.prototype;

    /**
     * @name Transaction
     * @class Transaction
     * @constructor
     * @extends Base
     * @property {boolean}  autoCleanup               - Automatically cleanup the transaction if it becomes empty?
     * @property {Helper}  helper                     - A Helper object ref
     * @property {string}  status                     - The transaction status
     * @property {moment}  from                       - The transaction from date
     * @property {moment}  to                         - The transaction to date
     * @property {moment}  due                        - The transaction due date
     * @property {string}  contact                    - The Contact.id for this transaction
     * @property {string}  location                   - The Location.id for this transaction
     * @property {Array}  items                       - A list of Item.id strings
     * @property {Array}  conflicts                   - A list of conflict hashes
     */
    var Transaction = function(opt) {
        var spec = $.extend({}, opt);
        Base.call(this, spec);

        this.dsItems = spec.dsItems;                        // we'll also access the /items collection

        // should we automatically delete the transaction from the database?
        this.autoCleanup = (spec.autoCleanup!=null) ? spec.autoCleanup : false;
        this.helper = spec.helper;

        this.status = spec.status || DEFAULTS.status;                     // the status of the order or reservation
        this.from = spec.from || DEFAULTS.from;                           // a date in the future
        this.to = spec.to || DEFAULTS.to;                                 // a date in the future
        this.due = spec.due || DEFAULTS.due;                              // a date even further in the future, we suggest some standard avg durations
        this.contact = spec.contact || DEFAULTS.contact;                  // a contact id
        this.location = spec.location || DEFAULTS.location;               // a location id
        this.items = spec.items || DEFAULTS.items.slice();                // an array of item ids
        this.conflicts = spec.conflicts || DEFAULTS.conflicts.slice();    // an array of Conflict objects
    };

    Transaction.prototype = new tmp();
    Transaction.prototype.constructor = Location;

    //
    // Date helpers (possibly overwritten)
    //

    /**
     * Gets the lowest possible date to start this transaction
     * @method
     * @name Transaction#getMinDate
     * @returns {Moment} min date
     */
    Transaction.prototype.getMinDate = function() {
        var helper = this._getHelper();
        var now = helper.getNow();
        return now;
    };

    /**
     * Gets the latest possible date to end this transaction
     * @method
     * @name Transaction#getMaxDate
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
     * @method suggestEndDate
     * @name Transaction#suggestEndDate
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
     * @method isEmpty
     * @name Transaction#isEmpty
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
     * @method
     * @name Transaction#isDirty
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
    Transaction.prototype._fromJson = function(data, options) {
        var that = this;
        return Base.prototype._fromJson.call(this, data, options)
            .then(function() {
                that.status = data.status || DEFAULTS.status;
                that.location = data.location || DEFAULTS.location;
                that.contact = data.customer || DEFAULTS.contact;
                that.items = data.items || DEFAULTS.items.slice();
                return that._getConflicts()
                    .then(function(conflicts) {
                        that.conflicts = conflicts;
                    });
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
    
    // From date setters

    /**
     * Clear the transaction from date
     * @method
     * @name Transaction#clearFromDate
     * @param skipRead
     * @returns {promise}
     */
    Transaction.prototype.clearFromDate = function(skipRead) {
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
    Transaction.prototype.setFromDate = function(date, skipRead) {
        this.from = this.helper.roundTimeFrom(date);
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
    Transaction.prototype.clearToDate = function(skipRead) {
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
    Transaction.prototype.setToDate = function(date, skipRead) {
        this.to = this.helper.roundTimeTo(date);
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
    Transaction.prototype.clearDueDate = function(skipRead) {
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
    Transaction.prototype.setDueDate = function(date, skipRead) {
        this.due = this.helper.roundTimeTo(date);
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
     * @method
     * @name Transaction#clearLocation
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
     * @method
     * @name Transaction#setContact
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
     * @method
     * @name Transaction#clearContact
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
     * @name Transaction#addItems
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
     * @name Transaction#removeItems
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
     * @name Transaction#clearItems
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
     * @name Transaction#swapItem
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
    /**
     * Gets a list of Conflict objects for this transaction
     * Will be overriden by inheriting classes
     * @returns {promise}
     * @private
     */
    Transaction.prototype._getConflicts = function() {
        return $.Deferred().resolve([]);
    };

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
     * @param useAvailabilities (uses items/searchAvailable instead of items/search)
     * @param onlyUnbooked (true by default, only used when useAvailabilities=true)
     * @param skipItems array of item ids that should be skipped
     * @private
     * @returns {*}
     */
    Transaction.prototype._searchItems = function(params, listName, useAvailabilities, onlyUnbooked, skipItems) {
        if (this.dsItems==null) {
            return $.Deferred().reject(new api.ApiBadRequest(this.crtype+" has no DataSource for items"));
        }

        // Restrict the search to just the Items that are:
        // - at this location
        // - in the specified list (if any)
        params = params || {};
        params.location = this._getId(this.location);

        if( (listName!=null) &&
            (listName.length>0)) {
            params.listName = listName
        }

        // Make sure we only pass the item ids,
        // and not the entire items
        var that = this;
        var skipList = null;
        if( (skipItems) &&
            (skipItems.length)) {
            skipList = skipItems.slice(0);
            $.each(skipList, function(i, item) {
                skipList[i] = that._getId(item);
            });
        }

        if (useAvailabilities==true) {
            // We'll use a more advanced API call /items/searchAvailable
            // It's a bit slower and the .count result is not usable

            // It requires some more parameters to be set
            params.onlyUnbooked = (onlyUnbooked!=null) ? onlyUnbooked : true;
            params.fromDate = this.from;
            params.toDate = this.to;
            params._limit = params._limit || 20;
            params._skip = params._skip || 0;
            if( (skipList) &&
                (skipList.length)) {
                params.skipItems = skipList;
            }

            return this.dsItems.call(null, 'searchAvailable', params);
        } else {
            // We don't need to use availabilities,
            // we should better use the regular /search
            // it's faster and has better paging :)
            if( (skipList) &&
                (skipList.length)) {
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
    Transaction.prototype._checkDateBetweenMinMax = function(date, minDate, maxDate) {
        minDate = minDate || this.getMinDate();
        maxDate = maxDate || this.getMaxDate();
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

/**
 * The Conflict module
 * a helper class that can read Conflicts
 * @module Conflict
 * @copyright CHECKROOM NV 2015
 */
define('conflict',['jquery'], /** @lends Conflict */ function ($) {

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
    var Conflict = function(spec) {
        this.ds = spec.ds;
        this.fields = spec.fields;

        this.raw = null; // the raw json object
        this.kind = spec.kind || DEFAULTS.kind;
        this.doc = spec.doc || DEFAULTS.doc;
        this.item = spec.item || DEFAULTS.item;
        this.itemName = spec.itemName || DEFAULTS.itemName;
        this.locationCurrent = spec.locationCurrent || DEFAULTS.locationCurrent;
        this.locationDesired = spec.locationDesired || DEFAULTS.locationDesired;
        this.fromDate = spec.fromDate || DEFAULTS.fromDate;
        this.toDate = spec.toDate || DEFAULTS.toDate;
    };

    /**
     * _toJson, makes a dict of the object
     * @method
     * @param {object} opt dict
     * @returns {object}
     * @private
     */
    Conflict.prototype._toJson = function(opt) {
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
    Conflict.prototype._fromJson = function(data, opt) {
        this.raw = data;
        this.kind = data.kind || DEFAULTS.kind;
        this.item = data.item || DEFAULTS.item;
        this.itemName = data.itemName || DEFAULTS.itemName;
        this.fromDate = data.fromDate || DEFAULTS.fromDate;
        this.toDate = data.toDate || DEFAULTS.toDate;
        return $.Deferred().resolve(data);
    };

    return Conflict;

});
/**
 * The Order module
 * @module module
 * @copyright CHECKROOM NV 2015
 */
define('Order',[
    "jquery",
    "api",
    "transaction",
    "conflict"], /** @lends Transaction */  function ($, api, Transaction, Conflict) {

    // Allow overriding the ctor during inheritance
    // http://stackoverflow.com/questions/4152931/javascript-inheritance-call-super-constructor-or-use-prototype-chain
    var tmp = function() {};
    tmp.prototype = Transaction.prototype;

    /**
     * @name Order
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
    // Date helpers; we'll need these for sliding from / to dates during a long user session
    //

    /**
     * Overwrite only getMinDate, max date stays one year from now
     * @method
     * @name Order#getMindDate
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
        data.due = (this.due!=null) ? this.due.toJSONDate() : "null";
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
    /**
     * Gets a friendly order duration or empty string
     * @method
     * @name Order#getFriendlyDuration
     * @returns {string}
     */
    Order.prototype.getFriendlyDuration = function() {
        var duration = this.getDuration();
        return (duration!=null) ? this._getDateHelper().getFriendlyDuration(duration) : "";
    };

    /**
     * Gets a moment duration object
     * @method
     * @name Order#getDuration
     * @returns {*}
     */
    Order.prototype.getDuration = function() {
        if (this.from!=null) {
            var to = (this.status=="closed") ? this.to : this.due;
            if (to) {
                return moment.duration(to - this.from);
            }
        }
        return null;
    };

    /**
     * Checks if a PDF document can be generated
     * @method
     * @name Order#canGenerateAgreement
     * @returns {boolean}
     */
    Order.prototype.canGenerateAgreement = function() {
        return (this.status=="open") || (this.status=="closed");
    };

    /**
     * Checks if order can be checked in
     * @method
     * @name Order#canCheckin
     * @returns {boolean}
     */
    Order.prototype.canCheckin = function() {
        return (this.status=="open");
    };

    /**
     * Checks if order can be checked out
     * @method
     * @name Order#canCheckout
     * @returns {boolean}
     */
    Order.prototype.canCheckout = function() {
        return (
            (this.status=="creating") &&
            (this.location) &&
            (this.contact) &&
            (this.due) &&
            (this.items) &&
            (this.items.length));
    };

    /**
     * Checks if order can undo checkout
     * @method
     * @name Order#canUndoCheckout
     * @returns {boolean}
     */
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
     * Gets a list of Conflict objects
     * used during Transaction._fromJson
     * @returns {promise}
     * @private
     */
    Order.prototype._getConflicts = function() {
        var conflicts = [];

        // Only orders which are incomplete,
        // but have items and / or due date can have conflicts
        if( (this.status=="creating") &&
            (this.items.length>0)) {

            // Check if all the items are:
            // - at the right location
            // - not expired
            var locId = this._getId(this.location);

            $.each(this.items, function(i, item) {
                if (item.status == "expired") {
                    conflicts.push(new Conflict({
                        kind: "expired",
                        item: item._id,
                        itemName: item.name,
                        locationCurrent: item.location,
                        locationDesired: locId
                    }));
                } else if (item.location != locId) {
                    conflicts.push(new Conflict({
                        kind: "location",
                        item: item._id,
                        itemName: item.name,
                        locationCurrent: item.location,
                        locationDesired: locId
                    }));
                }
            });

            // If we have a due date,
            // check if it conflicts with any reservations
            if (this.due) {
                var that = this;
                var kind = "";
                var transItem = null;

                // Get the availabilities for these items
                return this.dsItems.call(null, "getAvailabilities", {
                    items: $.map(this.items, function(item) { return item._id; }),
                    fromDate: this.from,
                    toDate: this.due})
                    .then(function(data) {

                        // Run over unavailabilties for these items
                        $.each(data, function(i, av) {
                            // Lookup the more complete item object via transaction.items
                            // It has useful info like item.name we can use in the conflict message
                            transItem = $.grep(that.items, function(item) { return item._id == av.item});

                            if( (transItem!=null) &&
                                (transItem.status!="expired")) {

                                // Order cannot conflict with itself
                                if( (av.order != null) &&
                                    (av.order != that.id)) {
                                    kind = "";
                                    kind = kind || (av.order) ? "order" : "";
                                    kind = kind || (av.reservation) ? "reservation" : "";

                                    conflicts.push(new Conflict({
                                        kind: kind,
                                        item: transItem._id,
                                        itemName: transItem.name,
                                        fromDate: av.fromDate,
                                        toDate: av.toDate,
                                        doc: av.order || av.reservation
                                    }));
                                }
                            }
                        });

                        return conflicts;
                    });
            }
        }

        return $.Deferred().resolve(conflicts);
    };

    /**
     * Sets the Order from and due date in a single call
     * @method
     * @name Order#setFromDueDate
     * @param from
     * @param due (optional) if null, we'll take the default average checkout duration as due date
     * @param skipRead
     * @returns {promise}
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
     * @method
     * @name Order#setFromDate
     * @param date
     * @param skipRead
     * @returns {promise}
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

    /**
     * Clears the order from date
     * @method
     * @name Order#clearFromDate
     * @param skipRead
     * @returns {promise}
     */
    Order.prototype.clearFromDate = function(skipRead) {
        if (this.status!="creating") {
            return $.Deferred().reject(new api.ApiUnprocessableEntity("Cannot clear order from date, status is "+this.status));
        }

        this.from = null;

        return this._handleTransaction(skipRead);
    };

    /**
     * Sets the order due date
     * @method
     * @name Order#setDueDate
     * @param due
     * @param skipRead
     * @returns {promise}
     */
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

        // Don't use _checkFromDueDate,
        // Use _checkDateBetweenMinMax directly, so it works extending order.due on "open" orders
        var min = this.getMinDate();
        var max = this.getMaxDate();
        return this._checkDateBetweenMinMax(roundedDueDate, min, max)
            .then(function() {
                that.due = roundedDueDate;
                return that._handleTransaction(skipRead);
            });
    };

    /**
     * Clears the order due date
     * @method
     * @name Order#clearDueDate
     * @param skipRead
     * @returns {*}
     */
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
    /**
     * Searches for items that could match this order
     * @method
     * @name Order#searchItems
     * @param params
     * @param useAvailabilies
     * @param onlyUnbooked
     * @param skipItems
     * @returns {*}
     */
    Order.prototype.searchItems = function(params, useAvailabilies, onlyUnbooked, skipItems) {
        return this._searchItems(params, "available", useAvailabilies, onlyUnbooked, skipItems || this.items);
    };

    /**
     * Checks in the order
     * @method
     * @name Order#checkin
     * @param itemIds
     * @param skipRead
     * @returns {promise}
     */
    Order.prototype.checkin = function(itemIds, skipRead) {
        return this._doApiCall({method: "checkin", params: {items: itemIds}, skipRead: skipRead});
    };

    /**
     * Checks out the order
     * @method
     * @name Order#checkout
     * @param skipRead
     * @returns {*}
     */
    Order.prototype.checkout = function(skipRead) {
        return this._doApiCall({method: "checkout", skipRead: skipRead});
    };

    /**
     * Undoes the order checkout
     * @method
     * @name Order#undoCheckout
     * @param skipRead
     * @returns {*}
     */
    Order.prototype.undoCheckout = function(skipRead) {
        return this._doApiCall({method: "undoCheckout", skipRead: skipRead});
    };

    /**
     * Generates a PDF agreement for the order
     * @method
     * @name Order#generateAgreement
     * @param skipRead
     * @returns {*}
     */
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

define('settings',[], function () {

    return {
        cdn: "https://cheqroom-cdn.s3.amazonaws.com",
        amazonBucket: "app"
    };

});

/**
 * The Helper module
 * a Helper class which allows you to call helpers based on the settings in group.profile and user.profile
 * @module helper
 * @copyright CHECKROOM NV 2015
 */
define('helper',["jquery", "moment", "dateHelper", "settings"], function ($, moment, DateHelper, settings) {

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

    /**
     * getImageCDNUrl gets an image by using the path to a CDN location
     * @param groupId
     * @param attachmentId
     * @param size
     * @returns {string}
     */
    Helper.prototype.getImageCDNUrl = function(groupId, attachmentId, size) {
        // https://cheqroom-cdn.s3.amazonaws.com/app-staging/groups/nose/b00f1ae1-941c-11e3-9fc5-1040f389c0d4-M.jpg
        var url = settings.cdn + "/" + settings.amazonBucket + "/groups/" + groupId + "/" + attachmentId;
        if( (size) &&
            (size.length>0)) {
            var parts = url.split('.');
            var ext = parts.pop();  // pop off the extension, we'll change it
            url = parts.join('.') + "-" + size + ".jpg";  // resized images are always jpg
        }
        return url;
    };

    /**
     * getImageUrl gets an image by using the datasource /get style and a mimeType
     * 'XS': (64, 64),
     * 'S': (128, 128),
     * 'M': (256, 256),
     * 'L': (512, 512)
     * @param ds
     * @param pk
     * @param size
     * @param bustCache
     * @returns {string}
     */
    Helper.prototype.getImageUrl = function(ds, pk, size, bustCache) {
        var url = ds.getBaseUrl() + pk + '?mimeType=image/jpeg';
        if (size) {
            url += '&size=' + size;
        }
        if (bustCache) {
            url += '&_bust=' + new Date().getTime();
        }
        return url;
    };

    return Helper;

});
/**
 * The Reservation module
 * @module reservation
 * @copyright CHECKROOM NV 2015
 */
define('Reservation',[
    "jquery",
    "api",
    "transaction",
    "conflict"],  /** @lends Transaction */ function ($, api, Transaction, Conflict) {

    // Allow overriding the ctor during inheritance
    // http://stackoverflow.com/questions/4152931/javascript-inheritance-call-super-constructor-or-use-prototype-chain
    var tmp = function() {};
    tmp.prototype = Transaction.prototype;

    /**
     * @name Reservation
     * @class Reservation
     * @constructor
     * @extends Transaction
     * @propery {Array}  conflicts               - The reservation conflicts
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
     * @method
     * @name Reservation#getMinDate
     * @returns {moment}
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
    /**
     * Checks if the reservation can be booked
     * @method
     * @name Reservation#canReserve
     * @returns {boolean}
     */
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

    /**
     * Checks if the reservation can be cancelled
     * @method
     * @name Reservation#canCancel
     * @returns {boolean}
     */
    Reservation.prototype.canCancel = function() {
        return (this.status=="open");
    };

    /**
     * Checks if the reservation can be edited
     * @method
     * @name Reservation#canEdit
     * @returns {boolean}
     */
    Reservation.prototype.canEdit = function() {
        return (this.status=="creating");
    };

    /**
     * Checks if the reservation can be deleted
     * @method
     * @name Reservation#canDelete
     * @returns {boolean}
     */
    Reservation.prototype.canDelete = function() {
        return (this.status=="creating");
    };

    /**
     * Checks if the reservation can be turned into an order
     * @method
     * @name Reservation#canMakeOrder
     * @returns {boolean}
     */
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
                if (that.existsInDb()) {
                    return that._loadConflicts(data, options)
                        .then(function() {
                            that.from = ((data.fromDate==null) || (data.fromDate=="null")) ? null : data.fromDate;
                            that.to = ((data.toDate==null) || (data.toDate=="null")) ? null : data.toDate;
                            that.due = null;
                            $.publish("reservation.fromJson", data);
                        });
                } else {
                    that.from = ((data.fromDate==null) || (data.fromDate=="null")) ? null : data.fromDate;
                    that.to = ((data.toDate==null) || (data.toDate=="null")) ? null : data.toDate;
                    that.due = null;
                    $.publish("reservation.fromJson", data);
                }
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
    Reservation.prototype._getConflicts = function() {
        var conflicts = [];
        var conflict = null;

        // Reservations can only have conflicts
        // when we have a (location OR (from AND to)) AND at least 1 item
        if( (this.items) &&
            (this.items.length) &&
            ((this.location) || (this.from && this.to))) {

            if (this.status == "open") {
                // Reservations in "open" status,
                // can use the Items' current status and location
                // to see if there are any conflicts for fullfilling into an Order
                var locId = this._getId(this.location);

                $.each(this.items, function(i, item) {
                    if (item.status!="available") {
                        conflicts.push(new Conflict({
                            kind: "status",
                            item: item._id,
                            itemName: item.name,
                            doc: item.order
                        }));
                    } else if (item.location!=locId) {
                        conflicts.push(new Conflict({
                            kind: "location",
                            item: item._id,
                            itemName: item.name,
                            locationCurrent: item.location,
                            locationDesired: locId,
                            doc: item.order
                        }));
                    }
                });

            } else if (this.status == "creating") {
                var that = this;

                // Reservations in "creating" status,
                // use a server side check
                return this.ds.call(this.id, "getConflicts")
                    .then(function(cnflcts) {
                        if( (cnflcts) &&
                            (cnflcts.length)) {

                            // Now we have the conflicts for this reservation
                            // run over the items again and find the conflict for each item
                            $.each(that.items, function(i, item) {
                                conflict = $.grep(cnflcts, function(c) { return c.item==item._id});
                                if (conflict) {
                                    var kind = "";
                                    kind = kind || (conflict.order) ? "order" : "";
                                    kind = kind || (conflict.reservation) ? "reservation" : "";

                                    conflicts.push(new Conflict({
                                        kind: kind,
                                        item: item._id,
                                        itemName: item.name,
                                        doc: conflict.conflictsWith
                                    }));
                                }
                            });
                        }
                    });
            }
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
     * @method
     * @name Reservation#setFromDate
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

    /**
     * Clear the reservation from date
     * @method
     * @name Reservation#clearFromDate
     * @param skipRead
     * @returns {*}
     */
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
     * @method
     * @name Reservation#setToDate
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

    /**
     * Clears the reservation to date
     * @method
     * @name Reservation#clearToDate
     * @param skipRead
     * @returns {*}
     */
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
     * @method
     * @name Reservation#searchItems
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
     * @method
     * @name Reservation#reserve
     * @param skipRead
     * @returns {*}
     */
    Reservation.prototype.reserve = function(skipRead) {
        return this._doApiCall({method: "reserve", skipRead: skipRead});
    };

    /**
     * Unbooks the reservation and sets the status to `creating` again
     * @method
     * @name Reservation#undoReserve
     * @param skipRead
     * @returns {*}
     */
    Reservation.prototype.undoReserve = function(skipRead) {
        return this._doApiCall({method: "undoReserve", skipRead: skipRead});
    };

    /**
     * Cancels the booked reservation and sets the status to `cancelled`
     * @method
     * @name Reservation#cancel
     * @param skipRead
     * @returns {*}
     */
    Reservation.prototype.cancel = function(skipRead) {
        return this._doApiCall({method: "cancel", skipRead: skipRead});
    };

    /**
     * Turns an open reservation into an order (which still needs to be checked out)
     * @method
     * @name Reservation#makeOrder
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
            var that = this;
            var locId = that._getId(that.location);
            $.each(this.items, function(i, item) {
                if (item.status!="available") {
                    unavailable["status"] = unavailable["status"] || [];
                    unavailable["status"].push(item._id);
                } else if (item.location!=locId) {
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
        var locId = this._getId(this.location);
        var hasLocation = (locId!=null) && (locId.length>0);
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

            this.conflicts = [];

            // The reservation is already open,
            // so the only conflicts we can have
            // are for turning it into an order
            $.each(this.raw.items, function(i, item) {
                if (item.status=="expired") {
                    that.conflicts.push(new Conflict({
                        item: that._getId(item),
                        kind: "expired"
                    }));
                } else if (item.status!="available") {
                    that.conflicts.push(new Conflict({
                        item: that._getId(item),
                        kind: "status"
                    }));
                } else if(item.location!=locId) {
                    that.conflicts.push(new Conflict({
                        item: that._getId(item),
                        kind: "location"
                    }));
                }
            });

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
 * a base class for Reservations and Orders
 * Share similar manipulating of: status, dates, items, contacts, locations, comments, attachments
 * @module transaction
 * @implements Base
 * @copyright CHECKROOM NV 2015
 */
define('Transaction',[
    "jquery",
    "api",
    "base",
    "location"], /** @lends Base */ function ($, api, Base, Location) {

    var DEFAULTS = {
        status: "creating",
        from: null,
        to: null,
        due: null,
        contact: "",
        location: "",
        items: [],
        conflicts: []
    };

    // Allow overriding the ctor during inheritance
    // http://stackoverflow.com/questions/4152931/javascript-inheritance-call-super-constructor-or-use-prototype-chain
    var tmp = function(){};
    tmp.prototype = Base.prototype;

    /**
     * @name Transaction
     * @class Transaction
     * @constructor
     * @extends Base
     * @property {boolean}  autoCleanup               - Automatically cleanup the transaction if it becomes empty?
     * @property {Helper}  helper                     - A Helper object ref
     * @property {string}  status                     - The transaction status
     * @property {moment}  from                       - The transaction from date
     * @property {moment}  to                         - The transaction to date
     * @property {moment}  due                        - The transaction due date
     * @property {string}  contact                    - The Contact.id for this transaction
     * @property {string}  location                   - The Location.id for this transaction
     * @property {Array}  items                       - A list of Item.id strings
     * @property {Array}  conflicts                   - A list of conflict hashes
     */
    var Transaction = function(opt) {
        var spec = $.extend({}, opt);
        Base.call(this, spec);

        this.dsItems = spec.dsItems;                        // we'll also access the /items collection

        // should we automatically delete the transaction from the database?
        this.autoCleanup = (spec.autoCleanup!=null) ? spec.autoCleanup : false;
        this.helper = spec.helper;

        this.status = spec.status || DEFAULTS.status;                     // the status of the order or reservation
        this.from = spec.from || DEFAULTS.from;                           // a date in the future
        this.to = spec.to || DEFAULTS.to;                                 // a date in the future
        this.due = spec.due || DEFAULTS.due;                              // a date even further in the future, we suggest some standard avg durations
        this.contact = spec.contact || DEFAULTS.contact;                  // a contact id
        this.location = spec.location || DEFAULTS.location;               // a location id
        this.items = spec.items || DEFAULTS.items.slice();                // an array of item ids
        this.conflicts = spec.conflicts || DEFAULTS.conflicts.slice();    // an array of Conflict objects
    };

    Transaction.prototype = new tmp();
    Transaction.prototype.constructor = Location;

    //
    // Date helpers (possibly overwritten)
    //

    /**
     * Gets the lowest possible date to start this transaction
     * @method
     * @name Transaction#getMinDate
     * @returns {Moment} min date
     */
    Transaction.prototype.getMinDate = function() {
        var helper = this._getHelper();
        var now = helper.getNow();
        return now;
    };

    /**
     * Gets the latest possible date to end this transaction
     * @method
     * @name Transaction#getMaxDate
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
     * @method suggestEndDate
     * @name Transaction#suggestEndDate
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
     * @method isEmpty
     * @name Transaction#isEmpty
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
     * @method
     * @name Transaction#isDirty
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
    Transaction.prototype._fromJson = function(data, options) {
        var that = this;
        return Base.prototype._fromJson.call(this, data, options)
            .then(function() {
                that.status = data.status || DEFAULTS.status;
                that.location = data.location || DEFAULTS.location;
                that.contact = data.customer || DEFAULTS.contact;
                that.items = data.items || DEFAULTS.items.slice();
                return that._getConflicts()
                    .then(function(conflicts) {
                        that.conflicts = conflicts;
                    });
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
    
    // From date setters

    /**
     * Clear the transaction from date
     * @method
     * @name Transaction#clearFromDate
     * @param skipRead
     * @returns {promise}
     */
    Transaction.prototype.clearFromDate = function(skipRead) {
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
    Transaction.prototype.setFromDate = function(date, skipRead) {
        this.from = this.helper.roundTimeFrom(date);
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
    Transaction.prototype.clearToDate = function(skipRead) {
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
    Transaction.prototype.setToDate = function(date, skipRead) {
        this.to = this.helper.roundTimeTo(date);
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
    Transaction.prototype.clearDueDate = function(skipRead) {
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
    Transaction.prototype.setDueDate = function(date, skipRead) {
        this.due = this.helper.roundTimeTo(date);
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
     * @method
     * @name Transaction#clearLocation
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
     * @method
     * @name Transaction#setContact
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
     * @method
     * @name Transaction#clearContact
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
     * @name Transaction#addItems
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
     * @name Transaction#removeItems
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
     * @name Transaction#clearItems
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
     * @name Transaction#swapItem
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
    /**
     * Gets a list of Conflict objects for this transaction
     * Will be overriden by inheriting classes
     * @returns {promise}
     * @private
     */
    Transaction.prototype._getConflicts = function() {
        return $.Deferred().resolve([]);
    };

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
     * @param useAvailabilities (uses items/searchAvailable instead of items/search)
     * @param onlyUnbooked (true by default, only used when useAvailabilities=true)
     * @param skipItems array of item ids that should be skipped
     * @private
     * @returns {*}
     */
    Transaction.prototype._searchItems = function(params, listName, useAvailabilities, onlyUnbooked, skipItems) {
        if (this.dsItems==null) {
            return $.Deferred().reject(new api.ApiBadRequest(this.crtype+" has no DataSource for items"));
        }

        // Restrict the search to just the Items that are:
        // - at this location
        // - in the specified list (if any)
        params = params || {};
        params.location = this._getId(this.location);

        if( (listName!=null) &&
            (listName.length>0)) {
            params.listName = listName
        }

        // Make sure we only pass the item ids,
        // and not the entire items
        var that = this;
        var skipList = null;
        if( (skipItems) &&
            (skipItems.length)) {
            skipList = skipItems.slice(0);
            $.each(skipList, function(i, item) {
                skipList[i] = that._getId(item);
            });
        }

        if (useAvailabilities==true) {
            // We'll use a more advanced API call /items/searchAvailable
            // It's a bit slower and the .count result is not usable

            // It requires some more parameters to be set
            params.onlyUnbooked = (onlyUnbooked!=null) ? onlyUnbooked : true;
            params.fromDate = this.from;
            params.toDate = this.to;
            params._limit = params._limit || 20;
            params._skip = params._skip || 0;
            if( (skipList) &&
                (skipList.length)) {
                params.skipItems = skipList;
            }

            return this.dsItems.call(null, 'searchAvailable', params);
        } else {
            // We don't need to use availabilities,
            // we should better use the regular /search
            // it's faster and has better paging :)
            if( (skipList) &&
                (skipList.length)) {
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
    Transaction.prototype._checkDateBetweenMinMax = function(date, minDate, maxDate) {
        minDate = minDate || this.getMinDate();
        maxDate = maxDate || this.getMaxDate();
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

/**
 * The User module
 * @module user
 * @copyright CHECKROOM NV 2015
 */
define('User',[
    'jquery',
    'base'],  /** @lends User */ function ($, Base) {

    var DEFAULTS = {
        name: '',
        email: '',
        group: '',  // groupid
        picture: '',
        role: 'user',  // user, admin
        active: true
    };

    // Allow overriding the ctor during inheritance
    // http://stackoverflow.com/questions/4152931/javascript-inheritance-call-super-constructor-or-use-prototype-chain
    var tmp = function() {};
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
    var User = function(opt) {
        var spec = $.extend({
            fields: ['*', 'group', 'picture']
        }, opt);
        Base.call(this, spec);

        this.helper = spec.helper;

        /*
        from API:

        login = StringField(primary_key=True, min_length=4)
        role = StringField(required=True, choices=USER_ROLE)
        group = ReferenceField(Group)
        password = StringField(min_length=4)
        name = StringField(min_length=4)
        email = EmailField(required=True, unique=True)
        lastLogin = DateTimeField()
        profile = EmbeddedDocumentField(UserProfile)
        active = BooleanField(default=True)
        picture = ReferenceField(Attachment)
        timezone = StringField(default="Etc/GMT")  # stored as
        */

        this.name = spec.name || DEFAULTS.name;
        this.picture = spec.picture || DEFAULTS.picture;
        this.email = spec.email || DEFAULTS.email;
        this.role = spec.role || DEFAULTS.role;
        this.active = (spec.active!=null) ? spec.active : DEFAULTS.active;
    };

    User.prototype = new tmp();
    User.prototype.constructor = User;

    //
    // Document overrides
    //
    User.prototype.isValidName = function() {
        this.name = $.trim(this.name);
        return (this.name.length>=4);
    };

    User.prototype.isValidEmail = function() {
        var re = /^([\w-]+(?:\.[\w-]+)*)@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$/i;
        this.email = $.trim(this.email);
        return re.test(this.email);
    };

    User.prototype.isValidRole = function() {
        switch(this.role) {
            case "user":
            case "admin":
            case "root":
                return true;
            default:
                return false;
        }
    };

    User.prototype.isValidPassword = function() {
        this.password = $.trim(this.password);
        var length = this.password.length;
        var hasDigit = this.password.match(/[0-9]/);
        return (length>=4) && (hasDigit);
    };

    /**
     * Checks if the user is valid
     * @returns {boolean}
     */
    User.prototype.isValid = function() {
        return (
            this.isValidName() &&
            this.isValidEmail() &&
            this.isValidRole());
    };

    /**
     * Checks if the user is empty
     * @method
     * @name User#isEmpty
     * @returns {boolean}
     */
    User.prototype.isEmpty = function() {
        // We check: name, role
        return (
            (Base.prototype.isEmpty.call(this)) &&
            (this.name==DEFAULTS.name) &&
            (this.email==DEFAULTS.email) &&
            (this.role==DEFAULTS.role));
    };

    /**
     * Checks if the user is dirty and needs saving
     * @method
     * @name User#isDirty
     * @returns {boolean}
     */
    User.prototype.isDirty = function() {
        var isDirty = Base.prototype.isDirty.call(this);
        if( (!isDirty) &&
            (this.raw)) {
            var name = this.raw.name || DEFAULTS.name;
            var role = this.raw.role || DEFAULTS.role;
            var email = this.raw.email || DEFAULTS.email;
            var active = (this.raw.active!=null) ? this.raw.active : DEFAULTS.active;
            return (
                (this.name!=name) ||
                (this.email!=email) ||
                (this.role!=role) ||
                (this.active!=active)
            );
        }
        return isDirty;
    };

    /**
     * Gets an url for a user avatar
     * 'XS': (64, 64),
     * 'S': (128, 128),
     * 'M': (256, 256),
     * 'L': (512, 512)
     * @param size {string} default null is original size
     * @param bustCache {boolean}
     * @returns {string}
     */
    User.prototype.getImageUrl = function(size, bustCache) {
        return (
            (this.picture!=null) &&
            (this.picture.length>0)) ?
            this.helper.getImageCDNUrl(this.group, this.picture, size, bustCache) :
            this.helper.getImageUrl(this.ds, this.id, size, bustCache);
    };

    User.prototype._getDefaults = function() {
        return DEFAULTS;
    };

    // OVERRIDE BASE: addKeyValue not implemented
    User.prototype.addKeyValue = function(key, value, kind, skipRead) {
        return $.Deferred().reject("Not implemented for User, use setPicture instead?");
    };

    // OVERRIDE BASE: addKeyValue not implemented
    User.prototype.addKeyValue = function(id, key, value, kind, skipRead) {
        return $.Deferred().reject("Not implemented for User, use setPicture instead?");
    };

    // OVERRIDE BASE: removeKeyValue not implemented
    User.prototype.removeKeyValue = function(id, skipRead) {
        return $.Deferred().reject("Not implemented for User, use clearPicture instead?");
    };

    User.prototype.setPicture = function(attachmentId, skipRead) {
        if (!this.existsInDb()) {
            return $.Deferred().reject("User does not exist in database");
        }
        this.picture = attachmentId;
        return this._doApiCall({
            method: 'setPicture',
            params: {attachment: attachmentId},
            skipRead: skipRead
        });
    };

    User.prototype.clearPicture = function(skipRead) {
        if (!this.existsInDb()) {
            return $.Deferred().reject("User does not exist in database");
        }
        return this._doApiCall({
            method: 'clearPicture',
            skipRead: skipRead
        });
    };

    /**
     * Writes the user to a json object
     * @param options
     * @returns {object}
     * @private
     */
    User.prototype._toJson = function(options) {
        var data = Base.prototype._toJson.call(this, options);
        data.name = this.name || DEFAULTS.name;
        data.email = this.email || DEFAULTS.email;
        data.group = this.group || DEFAULTS.group;
        data.role = this.role || DEFAULTS.role;
        data.active = this.active || DEFAULTS.active;
        return data;
    };

    /**
     * Reads the user from the json object
     * @param data
     * @param options
     * @returns {promise}
     * @private
     */
    User.prototype._fromJson = function(data, options) {
        var that = this;
        return Base.prototype._fromJson.call(this, data, options)
            .then(function() {
                // Read the group id from group or group._id
                // depending on the fields
                that.group = ((data.group) && (data.group._id!=null)) ? data.group._id : (data.group || DEFAULTS.group);
                that.name = data.name || DEFAULTS.name;
                that.picture = data.picture || DEFAULTS.picture;
                that.email = data.email || DEFAULTS.email;
                that.role = data.role || DEFAULTS.role;
                that.active = (data.active!=null) ? data.active : DEFAULTS.active;
                $.publish('user.fromJson', data);
                return data;
            });
    };

    return User;
    
});
/**
 * The Main module
 * bundles all core js code together
 * @copyright CHECKROOM NV 2015
 */
define('../main',[
    'api',
    'Availability',
    'Attachment',
    'Base',
    'Comment',
    'common',
    'Conflict',
    'Contact',
    'DateHelper',
    'Document',
    'Item',
    'KeyValue',
    'Location',
    'Order',
    'helper',
    'Reservation',
    'Transaction',
    'User'], function(api, Availability, Attachment, Base, Comment, common, Conflict, Contact, DateHelper, Document, Item, KeyValue, Location, Order, Helper, Reservation, Transaction, User) {

    var core = {};

    // namespaces
    core.api = api;

    // Constructors
    core.Availability = Availability;
    core.Attachment = Attachment;
    core.Base = Base;
    core.Comment = Comment;
    core.Conflict = Conflict;
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
    core.User = User;

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