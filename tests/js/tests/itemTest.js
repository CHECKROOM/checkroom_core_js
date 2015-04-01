/**
 * @copyright CHECKROOM NV 2015
 */
"use strict";
define(["settings", "helper", "cheqroom-core"], function(settings, helper, cr) {

        var run = function() {

            var collection = "items";
            var categories = [
                "cheqroom.types.item.heavy_equipment.compressors",
                "cheqroom.types.item.heavy_equipment.concrete_equipment"
            ];
            var flags = [
                "At Repair Shop",
                "Working Condition"
            ];
            var ROOT = 'cheqroom.types.item';

            // Get a user with token
            helper.getApiDataSource(collection)
                .done(function(ds) {

                    var getAnyAvailableItem = function() {
                        return helper.apiSearch({listName: "available"}, collection, "*,location,category")
                            .then(function(resp) {
                                return (resp!=null) && (resp.docs!=null) && (resp.docs.length>0) ? resp.docs[0] : null;
                            });
                    };

                    var getAllLocations = function() {
                        return helper.apiList(null, "locations");
                    };

                     var getAllCategoryTypes = function() {
                        return helper.apiSearch({pk__startswith:ROOT+'.', _sort:'pk'}, "categories");
                    };

                    /**
                     * Testing API getIgnore404
                     *
                     */
                    asyncTest("getIgnore404 item", function() {
                        ds.getIgnore404('notfound')
                            .done(function(data) {
                                ok(data==null);
                            })
                            .always(function(){
                                start();
                            });
                    });

                    /**
                     * Testing API /search calls
                     */
                    asyncTest("search items (empty)", function() {
                        ds.search()
                            .done(function(data) {
                                ok(data.docs!=null);
                                ok(data.docs.length>0);
                                ok(data.count > 0);
                            })
                            .always(function(){
                                start();
                            });
                    });

                    /**
                     * Testing API /list calls
                     */

                    // Test getting a list of items
                    asyncTest("list items", function() {
                        ds.list()
                            .done(function(items) {
                                ok(items!=null);
                                ok(items.length>0);
                            })
                            .always(function(){
                                start();
                            });
                    });

                    // Test getting a list of active items
                    asyncTest("list active items", function() {
                        ds.list("active")
                            .done(function(items) {
                                ok(items!=null);
                                ok(items.length>0);
                            })
                            .always(function(){
                                start();
                            });
                    });

                    // Test getting a list of expired items
                    asyncTest("list expired items", function() {
                        ds.list("expired")
                            .done(function(items) {
                                ok(items!=null);
                                ok(items.length>0);
                            })
                            .always(function(){
                                start();
                            });
                    });

                    // Test create a new item
                    asyncTest("create a new Item object", function() {
                        $.when(
                            getAllCategoryTypes(),
                            getAllLocations()
                        ).done(function(categories, locations) {
                            var item = new cr.Item({
                                ds: ds,
                                name: "qunit item", 
                                category: categories.docs[0]._id,
                                location: locations[0]._id
                            });

                            // Create a simple Item
                            item.create()
                                .done(function(resp) {
                                    ok(resp != undefined)
                                    ok(item.existsInDb());                                    
                                })
                                .always(function(){
                                    start();
                                });
                        });
                    });


                    /**
                     * Testing Item viewmodel calls
                     */

                    asyncTest("get any Item object -- via get", function() {
                        var item = new cr.Item({
                            ds: ds
                        });

                        // Get any item
                        helper.apiGet(null, collection)
                            .done(function(data) {
                                item.id = data._id;
                                item.get("*,location,category")
                                    .done(function() {
                                        ok(!item.isEmpty());
                                        ok(item.existsInDb());
                                        ok(item.flag.length>0);
                                        ok(item.keyValues.length>0);
                                        ok(item.category.length>0);
                                        ok($.type(item.category) === "string");
                                        ok(item.location.length>0);
                                        ok($.type(item.location) === "string");
                                    }).always(function(){
                                        start();
                                    });
                            });
                    });

                    asyncTest("get any Item object -- via get, expand category & location", function() {
                        var item = new cr.Item({
                            ds: ds
                        });

                        // Get any item
                        helper.apiGet(null, collection)
                            .done(function(data) {
                                item.id = data._id;
                                item.get("*,location.*,category.*")
                                    .done(function() {
                                        ok(!item.isEmpty());
                                        ok(item.existsInDb());
                                        ok(item.cover.length>0);
                                        ok(item.flag.length>0);
                                        ok(item.keyValues.length>0);
                                        ok(item.category.length>0);
                                        ok($.type(item.category) === "string");
                                        ok(item.location.length>0);
                                        ok($.type(item.location) === "string");
                                    }).always(function(){
                                        start();
                                    });
                            });
                    });

                    asyncTest("get any Item object -- via response", function() {
                        var item = new cr.Item({
                            ds: ds
                        });

                        // Get any item
                        helper.apiGet(null, collection)
                            .done(function(data) {
                                item._fromJson(data)
                                    .done(function() {
                                        ok(!item.isEmpty());
                                        ok(item.existsInDb());
                                        ok(item.flag.length>0);
                                        ok(item.keyValues.length>0);
                                    }).always(function(){
                                        start();
                                    });
                            });
                    });

                    asyncTest("update name Item object", function() {
                        var item = new cr.Item({
                            ds: ds
                        });

                        // Get any item
                        helper.apiGet(null, collection)
                            .done(function(data) {
                                item._fromJson(data)
                                    .done(function() {
                                        var original = data.name;
                                        var name = "Nose";
                                        item.updateName(name)
                                            .done(function() {
                                                ok(item.name==name);

                                                item.updateName(original)
                                                    .done(function() {
                                                        ok(item.name==original);
                                                    }).always(function() {
                                                        start();
                                                    });
                                            });
                                    });
                            });
                    });

                    asyncTest("expire, unexpire Item object", function() {
                        var item = new cr.Item({
                            ds: ds
                        });

                        // Get any item
                        getAnyAvailableItem()
                            .done(function(data) {
                                item._fromJson(data)
                                    .done(function() {
                                        item.expire()
                                            .done(function() {
                                                ok(item.status=="expired");

                                                item.undoExpire()
                                                    .done(function() {
                                                        ok(item.status=="available");
                                                    }).always(function(){
                                                        start();
                                                    });
                                            });
                                    });
                            });
                    });

                    asyncTest("duplicate Item object", function() {
                        var item = new cr.Item({
                            ds: ds
                        });

                        // Get any item
                        getAnyAvailableItem()
                            .done(function(data) {
                                item._fromJson(data)
                                    .done(function() {
                                        item.duplicate(1)
                                            .done(function() {
                                                // TODO: More tests here!
                                                ok(item.status=="available");
                                            })
                                            .always(function(){
                                                start();
                                            });
                                    });
                            });
                    });

                    asyncTest("change geo Item object", function() {
                        var item = new cr.Item({
                            ds: ds
                        });

                        // Get any item
                        getAnyAvailableItem()
                            .done(function(data) {
                                item._fromJson(data)
                                    .done(function() {
                                        // London baby!
                                        item.updateGeo(51.5033630, -0.1276250)
                                            .done(function() {
                                                ok(item.geo[0]!=0.0);
                                                ok(item.geo[1]!=0.0);
                                                ok(item.address.length);
                                            })
                                            .always(function(){
                                                start();
                                            });
                                    });
                            });
                    });

                    asyncTest("change location Item object", function() {
                        var item = new cr.Item({
                            ds: ds
                        });

                        $.when(
                            getAnyAvailableItem(),
                            getAllLocations()
                            ).done(function(data, locations) {
                                item._fromJson(data)
                                    .done(function() {
                                        // Get any other location
                                        var otherLocation = "";
                                        $.each(locations, function(i, location) {
                                            if (location._id != item.location) {
                                                otherLocation = location._id;
                                                return false;
                                            }
                                        });

                                        // Update the location of the item
                                        item.changeLocation(otherLocation)
                                            .done(function() {
                                                // TODO: More tests here!
                                                ok(item.location==otherLocation);
                                            })
                                            .always(function(){
                                                start();
                                            });
                                    });
                            });
                    });

                    asyncTest("isDirty Item object", function() {
                        var item = new cr.Item({
                            ds: ds
                        });

                        // Get any item
                        getAnyAvailableItem()
                            .done(function(data) {
                                item._fromJson(data)
                                    .done(function() {
                                        // Use some fake values just to see if isDirty() and discardChanges works well
                                        ok(item.isDirty() == false);

                                        item.name = "bla";
                                        ok(item.isDirty() == true);
                                        item.discardChanges();
                                        ok(item.isDirty() == false);

                                        item.location = "bla";
                                        ok(item.isDirty() == true);
                                        item.discardChanges();
                                        ok(item.isDirty() == false);

                                        item.category = "bla";
                                        ok(item.isDirty() == true);
                                        item.discardChanges();
                                        ok(item.isDirty() == false);

                                        item.flag = "bla";
                                        ok(item.isDirty() == true);
                                        item.discardChanges();
                                        ok(item.isDirty() == false);
                                    }).always(function(){
                                        start();
                                    });

                            });
                    });

                    asyncTest("reload Item object", function() {
                        var item = new cr.Item({
                            ds: ds
                        });

                        // Get any item
                        getAnyAvailableItem()
                            .done(function(data) {
                                item._fromJson(data)
                                    .done(function() {
                                        var oldName = item.name;
                                        item.name = "bla";
                                        ok(item.isDirty() == true);

                                        item.reload()
                                            .done(function() {
                                                ok(item.name==oldName);
                                                ok(item.isDirty() == false);
                                            }).always(function(){
                                                start();
                                            });
                                    });
                            });
                    });

                    asyncTest("setFlag on Item object", function() {
                        var item = new cr.Item({
                            ds: ds
                        });

                        // Get any item
                        getAnyAvailableItem()
                            .done(function(data) {
                                item._fromJson(data)
                                    .done(function() {
                                        var oldFlag = item.flag;
                                        var newFlag = (oldFlag==flags[0]) ? flags[1] : flags[0];

                                        item.setFlag(newFlag)
                                            .done(function() {
                                                ok(item.flag==newFlag);
                                                ok(item.isDirty() == false);

                                                item.setFlag(oldFlag)
                                                    .done(function() {
                                                        ok(item.flag==oldFlag);
                                                    }).always(function(){
                                                        start();
                                                    });
                                            });

                                    });
                            });
                    });

                    asyncTest("canChangeCategory, changeCategory Item object", function() {
                        var item = new cr.Item({
                            ds: ds
                        });

                        // Get any item
                        getAnyAvailableItem()
                            .done(function(data) {
                                item._fromJson(data)
                                    .done(function() {

                                        var otherCat = (item.category==categories[0]) ? categories[1] : categories[0];
                                        item.canChangeCategory(otherCat)
                                            .done(function(resp) {
                                                ok(resp.result==true);

                                                item.changeCategory(otherCat)
                                                    .done(function() {
                                                        ok(item.category==otherCat);
                                                    }).always(function(){
                                                        start();
                                                    });

                                            });
                                    });
                            });
                    });


                    /**
                     * Testing comments on Items
                     */

                    asyncTest("comments on Item object", function() {
                        var item = new cr.Item({
                            ds: ds
                        });

                        // Get any item
                        getAnyAvailableItem()
                            .done(function(doc) {
                                item._fromJson(doc)
                                    .done(function() {
                                        var numComments = item.comments.length;
                                        var newComment = 'Test add comment from QUnit';
                                        var updateComment = 'Test update comment from QUnit';

                                        item.addComment(newComment)
                                            .done(function() {
                                                // Adding a comment should increase the num comments with 1
                                                // The text should be equal as the one we've passed
                                                ok(item.comments.length==numComments+1);
                                                ok(item.comments[item.comments.length-1].value == newComment);

                                                var commentId = item.comments[item.comments.length - 1].id;
                                                item.updateComment(commentId, updateComment)
                                                    .done(function() {
                                                        // Updating a comment should not increase the num comments
                                                        // The text should be equal as the one we've passed
                                                        ok(item.comments.length==numComments+1);
                                                        ok(item.comments[item.comments.length-1].value == updateComment);

                                                        item.deleteComment(commentId)
                                                            .done(function() {
                                                                // Deleting a comment should decrease the num comments
                                                                ok(item.comments.length==numComments);
                                                            })
                                                            .always(function() {
                                                                start();
                                                            });
                                                    });
                                            })
                                    })
                            });
                    });

                    /**
                     * Testing pubsub
                     */

                    asyncTest("pubsub Item object", function() {
                        var item = new cr.Item({
                            ds: ds
                        });

                        $.subscribe('item.fromJson', function(_, data) {
                            ok(data!=null);
                        });

                        // Get any item
                        getAnyAvailableItem()
                            .done(function(doc) {
                                item.id = doc._id;
                                item.get()
                                    .always(function() {
                                        setTimeout(function() {
                                            start();
                                        }, 1000);
                                    });
                            });
                    });

                });

        };

        return {run: run}
    }
);