/**
 * @copyright CHECKROOM NV 2015
 */
"use strict";
define(['jquery', 'settings', 'cheqroom-core'], function($, settings, cr) {

    var helper = {};

    helper.getApiAjax = function() {
        return new cr.api.ApiAjax({useJsonp: settings.useJsonp});
    };

    helper.getApiAuth = function() {
        return new cr.api.ApiAuthV2({ajax: helper.getApiAjax(), urlAuth: settings.baseUrl + '/authenticate'});
    };

    helper.getApiAnonymous = function(){
        return new cr.api.ApiAnonymous({ajax: helper.getApiAjax(), urlApi: settings.baseUrl.replace('/v2_0', '')});
    };

    helper.getApiUser = function(userName, password) {
        return helper.getApiAuth().authenticate(
                userName || settings.userName,
                password || settings.password
            )
            .then(function(data) {
                var user = new cr.api.ApiUser({
                    userId: data.userId,
                    userToken: data.token
                });
                return user;
            });
    };

    helper.getApiDataSource = function(collection, userName, password) {
        return helper.getApiUser(userName, password)
            .then(function(user) {
                var ds = new cr.api.ApiDataSource({
                    collection: collection,
                    ajax: helper.getApiAjax(),
                    user: user,
                    urlApi: settings.baseUrl
                });
                return ds;
            });
    };

    helper.getApiDataSources = function(collections, userName, password) {
        return helper.getApiUser(userName, password)
            .then(function(user) {
                var ajax = helper.getApiAjax();
                var dss = {};
                $.each(collections, function(i, coll) {
                    dss[coll] = new cr.api.ApiDataSource({
                        collection: coll,
                        ajax: ajax,
                        user: user,
                        urlApi: settings.baseUrl
                    });
                });
                return dss;
            });
    };

    // API call wrappers for convenience during testing

    helper.apiGet = function(pk, collection, userName, password) {
        return helper.getApiDataSource(collection, userName, password)
            .then(function(ds) {
                if (pk==null) {
                    return ds.list()
                        .then(function(docs) {
                            return (docs!=null) && (docs.length>0) ? docs[0] : null;
                        });
                } else {
                    return ds.get(pk);
                }
            });
    };

    helper.apiList = function(name, collection, userName, password) {
        return helper.getApiDataSource(collection, userName, password)
            .then(function(ds) {
                return ds.list(name);
            });
    };

    helper.apiSearch = function(params, collection, fields, userName, password) {
        return helper.getApiDataSource(collection, userName, password)
            .then(function(ds) {
                return ds.search(params, fields);
            });
    };

    // Helpers

    helper.getAnyContact = function() {
        return helper.apiGet(null, "customers");
    };

    helper.getAnyLocation = function() {
        return helper.apiGet(null, "locations");
    };

    return helper;
});