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
                    return ds.list(null, null, 1)
                        .then(function(docs) {
                            return (docs!=null) && (docs.length>0) ? docs[0] : null;
                        });
                } else {
                    return ds.get(pk);
                }
            });
    };

    helper.apiList = function(name, collection, fields, limit, userName, password) {
        return helper.getApiDataSource(collection, userName, password)
            .then(function(ds) {
                return ds.list(name, fields, limit);
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

    helper.getAnyAttachment = function() {
        return helper.apiGet(null, "attachments");
    };

    helper.getAnyLocation = function() {
        return helper.apiGet(null, "locations");
    };

    helper.getAnyOpenOrder = function() {
        return helper.apiSearch({listName: "open"}, "orders", "*")
            .then(function(resp) {
                return (resp!=null) && (resp.docs!=null) && (resp.docs.length>0) ? resp.docs[0] : null;
            });
    };

    helper.getAnyCheckedOutItem = function() {
        return helper.apiSearch({listName: "checkedout"}, "items", "*,location,category")
            .then(function(resp) {
                return (resp!=null) && (resp.docs!=null) && (resp.docs.length>0) ? resp.docs[0] : null;
            });
    };

    helper.getAnyAvailableItem = function() {
        return helper.apiSearch({listName: "available"}, "items", "*,location,category")
            .then(function(resp) {
                return (resp!=null) && (resp.docs!=null) && (resp.docs.length>0) ? resp.docs[0] : null;
            });
    };

    helper.getAnyCategory = function(){
         return helper.apiSearch({pk__startswith:'cheqroom.types.item.', _sort:'pk'}, "categories").then(function(resp){
            return (resp!=null)  && (resp.docs!=null) && (resp.docs.length > 0)? resp.docs[0] : null;
         });
    };

    helper.getNewItem = function(ds, category, location, name){
       var item = new cr.Item({
            ds: ds,
            name: name, 
            category: category._id,
            location: location._id
        });
        var dfd = $.Deferred();

        item.create().done(function(){
            dfd.resolve(item);
        });

        return dfd;
    };

    helper.getNewOpenOrder = function(ds, dsItems, due, location, contact, items){
        var order = new cr.Order({
            ds: ds,
            dsItems: dsItems,
            autoCleanup: true,
            location: location._id,
            contact: contact._id,
            due: due
        });
        var dfd = $.Deferred();

        order.addItems(items).then(function(){
            order.checkout().done(function(){
                dfd.resolve(order);
            });
        });     

        return dfd; 
    }

    helper.getNewOpenReservation = function(ds, dsItems, from, to, location, contact, items){
        var reservation = new cr.Reservation({
            ds: ds,
            dsItems: dsItems,
            location: location._id,
            contact: contact._id,
            from: from,
            to: to
        });
        var dfd = $.Deferred();

        reservation.addItems(items).then(function(){
            reservation.reserve().done(function(){
                dfd.resolve(reservation);
            })
        })

        return dfd;
    }

    return helper;
});