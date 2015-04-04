/**
 * @copyright CHECKROOM NV 2015
 */
"use strict";
define(["settings", "helper", "cheqroom-core"], function(settings, helper, cr) {

        var run = function() {

            $.when(
                helper.getApiDataSource("availabilities"),
                helper.getApiDataSource("items")
            )
                .then(function(ds, dsItems) {

                    var getAnyCheckedOutItem = function() {
                        return helper.apiSearch({listName: "checkedout"}, "items", "*,location,category")
                            .then(function(resp) {
                                return (resp!=null) && (resp.docs!=null) && (resp.docs.length>0) ? resp.docs[0] : null;
                            });
                    };

                    //
                    // Testing datasource
                    //

                    asyncTest("list unavailabilities", function() {
                        ds.list()
                            .done(function(data) {
                                ok(data!=null);
                                ok(data.length>0);
                            })
                            .always(function(){
                                start();
                            });
                    });

                    asyncTest("get any unavailabilities", function() {
                        ds.list()
                            .done(function(data) {
                                var doc = data[0];
                                ds.get(doc._id)
                                    .then(function(av) {
                                        ok(av!=null);
                                    })
                                    .always(function(){
                                        start();
                                    });
                            })

                    });

                    //
                    // Testing availabilities model
                    //
                    asyncTest("get Availability", function() {
                        ds.list()
                            .done(function(data) {
                                var av = new cr.Availability({ds: ds, id: data[0]._id});
                                av.get()
                                    .then(function() {
                                        ok(av!=null);
                                        ok(av.id==data[0]._id);
                                    })
                                    .always(function(){
                                        start();
                                    });
                            })

                    });

                });

        };

        return {run: run}
    }
);