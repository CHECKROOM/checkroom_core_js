/**
 * @copyright CHECKROOM NV 2015
 */
"use strict";
define(['settings', 'helper', 'cheqroom-core'], function(settings, helper, cr) {

        var run = function() {

            var collection = "webhooks";

            // Get a user with token
            helper.getApiDataSource(collection)
                .done(function(ds) {

                    var getWebHook = function() {
                        return new cr.WebHook({
                            ds: ds,
                            name: 'Webhook',
                            address: 'http://none.com/',
                            enabled: false
                        });
                    };

                    var getAnyWebHook = function() {
                        return ds.list()
                            .then(function(webhooks) {
                                var hook = cr.WebHook({ds: ds});
                                return hook._fromJson(webhooks[0]);
                            });
                    };

                    /**
                     * Testing API /list calls
                     */

                        // Test getting a list of locations
                    asyncTest("list webhooks", function() {
                        ds.list()
                            .done(function(hooks) {
                                ok(hooks!=null);
                                ok(hooks.length>0);

                                var hook = getWebHook();
                                hook.id = hooks[0]._id;
                                hook.get()
                                    .done(function() {
                                        ok(hook.name.length>0);
                                        ok(hook.address.length>0);
                                        ok(hook.topic.length>0);
                                    })
                                    .always(function(){
                                        start();
                                    });
                            });
                    });

                    // Test create new, update, delete
                    asyncTest("create, update, delete webhook", function() {
                        var hook = new cr.WebHook({ds: ds});
                        ok(hook.isEmpty());

                        hook.name = "CoreJS Unit test";
                        hook.address = "http://www.none.com/do";
                        hook.topic = "item.setflag";
                        ok(hook.isValid());

                        hook.create()
                            .done(function() {
                                ok(hook.existsInDb());
                                ok(hook.enabled);

                                var hookId = hook.id;
                                hook.get()
                                    .done(function() {
                                        ok(hook.id == hookId);

                                        hook.topic = "item.clearflag";
                                        ok(hook.isDirty());

                                        hook.update()
                                            .done(function() {
                                                ok(hook.topic == "item.clearflag");

                                                hook.delete()
                                                    .always(function() {
                                                        start();
                                                    })
                                            });
                                    });
                            });
                    });
                });

        };

        return {run: run}
    }
);