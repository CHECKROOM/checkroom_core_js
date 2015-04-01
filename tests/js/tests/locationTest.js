/**
 * @copyright CHECKROOM NV 2015
 */
"use strict";
define(['settings', 'helper', 'cheqroom-core'], function(settings, helper, cr) {

        var run = function() {

            var collection = "locations";
            var getLocation = function(ds) {
                return new cr.Location({
                    ds: ds,
                    name: 'HQ',
                    address: 'Voskenslaan 197D, 9000 Ghent'
                });
            };

            // Get a user with token
            helper.getApiDataSource(collection)
                .done(function(ds) {

                    /**
                     * Testing API /list calls
                     */

                    // Test getting a list of locations
                    asyncTest("list locations", function() {
                        ds.list()
                            .done(function(locations) {
                                ok(locations!=null);
                                ok(locations.length>0);
                            })
                            .always(function(){
                                start();
                            });
                    });


                    /**
                     * Testing Location view model
                     */

                    asyncTest("create, canDelete, delete Location object", function() {
                        var location = getLocation(ds);
                        ok(!location.isEmpty());
                        ok(!location.existsInDb());

                        // Create a simple Location
                        location.create()
                            .done(function() {
                                ok(!location.isEmpty());
                                ok(location.existsInDb());

                                // We should be able to delete it right away
                                location.canDelete()
                                    .done(function(canDelete) {
                                        ok(canDelete);
                                        ok(!location.isEmpty());

                                        // Delete the location again
                                        location.delete()
                                            .done(function() {
                                                ok(location.isEmpty());
                                            }).always(function(){
                                                start();
                                            });
                                    });
                            });
                    });

                    asyncTest("create, update, delete Location object", function() {
                        var location = getLocation(ds);
                        ok(!location.isEmpty());
                        ok(!location.existsInDb());

                        // Create a simple Location
                        location.create()
                            .done(function() {
                                ok(!location.isEmpty());
                                ok(location.existsInDb());

                                location.name = "Nosey";
                                location.update()
                                    .done(function() {
                                        ok(location.name=="Nosey");
                                        ok(!location.isEmpty());

                                        // Delete the location again
                                        location.delete()
                                            .done(function() {
                                                ok(location.isEmpty());
                                            }).always(function(){
                                                start();
                                            });
                                    });
                            });
                    });

                    asyncTest("load, reset, isEmpty on Location object", function() {
                        var location = new cr.Location({
                            ds: ds
                        });

                        // Starting empty
                        ok(location.isEmpty());
                        ok(!location.existsInDb());

                        // After reset() should also be empty
                        location.reset()
                            .done(function() {
                                ok(location.isEmpty());
                                ok(!location.existsInDb());

                                // Get any location
                                helper.apiGet(null, collection)
                                    .done(function(data) {
                                        location._fromJson(data);

                                        // Should no longer be empty and exist in db
                                        var id = location.id;
                                        var name = location.name;

                                        ok(!location.isEmpty());
                                        ok(location.existsInDb());

                                        // Change the name
                                        location.name = '';
                                        ok(!location.isEmpty());
                                        ok(location.existsInDb());

                                        // Reload the document from db, data should be the old data
                                        location.reload()
                                            .then(function() {
                                                ok(!location.isEmpty());
                                                ok(location.existsInDb());
                                                ok(location.id==id);
                                                ok(location.name==name);
                                            })
                                            .always(function(){
                                                start();
                                            });
                                    });
                            });

                    });

                    asyncTest("location isDirty", function() {
                        var location = new cr.Location({
                            ds: ds
                        });

                        helper.apiGet(null, collection)
                            .done(function(data) {
                                location._fromJson(data)
                                    .then(function() {
                                        ok(location.isDirty()==false);

                                        location.name = "xx";
                                        ok(location.isDirty()==true);
                                        location.discardChanges();
                                        ok(location.isDirty()==false);

                                        location.address = "xx";
                                        ok(location.isDirty()==true);
                                        location.discardChanges();
                                        ok(location.isDirty()==false);
                                    }).always(function(){
                                        start();
                                    });
                            });
                    });

                });

        };

        return {run: run}
    }
);