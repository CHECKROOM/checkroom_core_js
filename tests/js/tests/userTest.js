/**
 * @copyright CHECKROOM NV 2015
 */
"use strict";
define(['settings', 'helper', 'cheqroom-core'], function(settings, helper, cr) {

        var run = function() {

            var collection = "users";

            // Get a user with token
            helper.getApiDataSource(collection)
                .done(function(ds) {

                    var getUser = function() {
                        return new cr.User({
                            ds: ds,
                            name: 'Vincent Theeten',
                            role: 'admin',
                            active: false,
                            helper: new cr.Helper()
                        });
                    };

                    var getAnyUser = function() {
                        return ds.list()
                            .then(function(users) {
                                var user = getUser();
                                user.id = users[0]._id;
                                return user.get()
                                    .then(function() {
                                        return user;
                                    });
                            });
                    };

                    /**
                     * Testing API /list calls
                     */

                    // Test getting a list of locations
                    asyncTest("list users", function() {
                        ds.list()
                            .done(function(users) {
                                ok(users!=null);
                                ok(users.length>0);

                                var user = getUser();
                                user.id = users[0]._id;
                                user.get()
                                    .done(function() {
                                        ok(user.group.length>0);
                                    })
                                    .always(function(){
                                        start();
                                    });
                            });
                    });

                    // Test getting a image urls
                    asyncTest("list users", function() {
                        getAnyUser()
                            .then(function(user) {
                                ok(user.getImageUrl());
                            })
                            .always(function(){
                                start();
                            });
                    });

                });

        };

        return {run: run}
    }
);