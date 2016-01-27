/**
 * @copyright CHECKROOM NV 2015
 */
"use strict";
define(["settings", "helper", "cheqroom-core"], function(settings, helper, cr) {

        var run = function() {

            var collection = "kits";
            var collectionAttachments = "attachments";
            var ROOT = 'cheqroom.types.kit';

            // Get a user with token
            $.when(
                helper.getApiDataSource(collection),
                helper.getApiDataSource(collectionAttachments)
            )
                .done(function(ds, dsAttachments) {

                    var getAnyKit = function () {
                        return helper.apiGet(null, collection);
                    };

                    /**
                     * Testing Kit viewmodel calls
                     */
                    asyncTest("get any Kit object -- via get", function() {
                        var kit = new cr.Kit({
                            ds: ds
                        });

                        // Get any item
                        helper.apiGet(null, collection)
                            .done(function(data) {
                                kit.id = data._id;
                                kit.get()
                                    .done(function() {
                                        ok(kit.crtype == ROOT);
                                        ok(kit.isValidName());
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