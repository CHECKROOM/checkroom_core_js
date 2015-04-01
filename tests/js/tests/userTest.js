/**
 * @copyright CHECKROOM NV 2015
 */
"use strict";
define(['settings', 'helper', 'cheqroom-core'], function(settings, helper, cr) {

        var run = function() {

            var collection = "users";
            var getUser = function(ds) {
                return new cr.User({
                    ds: ds,
                    name: 'Vincent Theeten',
                    role: 'admin',
                    active: false
                });
            };

            // Get a user with token
            helper.getApiDataSource(collection)
                .done(function(ds) {

                    /**
                     * Testing API /list calls
                     */

                    // Test getting a list of locations
                    asyncTest("list users", function() {
                        ds.list()
                            .done(function(users) {
                                ok(users!=null);
                                ok(users.length>0);
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