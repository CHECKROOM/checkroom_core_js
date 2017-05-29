/**
 * @copyright CHECKROOM NV 2015
 */
"use strict";
define(["settings", "helper", "cheqroom-core"], function(settings, helper, cr) {

        var run = function() {

            var collection = "items";
            var collectionKits = "kits";

            // Get a user with token
            $.when(
                helper.getApiDataSource(collection),
                helper.getApiDataSource(collectionKits)
            )
                .done(function(dsItems, dsKits) {

                    var getAnyKit = function() {
                        return helper.apiGet(null, "kits");
                    };

                    var getAnyItem = function() {
                        return helper.apiGet(null, "items");
                    };

                    var getSomeUnkittedItems = function() {
                        return helper.apiList("not_in_kit", "items", null, 2);
                    };

                    /**
                     * Testing API getIgnore404
                     *
                     */
                    asyncTest("get item and kit", function() {
                        $.when(
                            getAnyItem(),
                            getSomeUnkittedItems(),
                            getAnyKit()
                        )
                            .then(function(item, someItems, kit) {
                                console.log(item);
                                console.log(kit);
                                ok(item!=null);
                                ok(kit!=null);

                                // Once we got the kit,
                                // get its items as well
                                var itemIds = kit.items.slice(0);
                                $.each(someItems, function(i, it) {
                                    itemIds.push(it._id);
                                });
                                //itemIds.push(item._id);

                                dsItems.getMultiple(itemIds, "*,category.name,kit.name")
                                    .then(function(allItems) {

                                        var empty = cr.common.getCategorySummary([]);
                                        ok(empty == "No items");

                                        var summary = cr.common.getCategorySummary(allItems);
                                        console.log(summary);

                                        summary = cr.common.getItemSummary(allItems);
                                        console.log(summary);

                                        summary = cr.common.getItemSummary(allItems);
                                        console.log(summary);

                                        console.log(allItems);
                                    })
                                    .always(function(){
                                        start();
                                    });

                            });

                    });


                });

        };

        return {run: run}
    }
);