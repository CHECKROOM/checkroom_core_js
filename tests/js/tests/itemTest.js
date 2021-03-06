/**
 * @copyright CHECKROOM NV 2015
 */
"use strict";
define(["settings", "helper", "cheqroom-core", "moment"], function(settings, helper, cr, moment) {

        var run = function() {

            var collection = "items";
            var collectionAttachments = "attachments";
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
            $.when(
                helper.getApiDataSource(collection),
                helper.getApiDataSource(collectionAttachments)
            )
                .done(function(ds, dsAttachments) {

                    var getAnyCheckedOutItem = function() {
                        return helper.apiSearch({listName: "checkedout"}, collection, "*,location,category")
                            .then(function(resp) {
                                return (resp!=null) && (resp.docs!=null) && (resp.docs.length>0) ? resp.docs[0] : null;
                            });
                    };

                    var getAnyAvailableItem = function() {
                        return helper.apiSearch({listName: "available"}, collection, "*,location,category")
                            .then(function(resp) {
                                return (resp!=null) && (resp.docs!=null) && (resp.docs.length>0) ? resp.docs[0] : null;
                            });
                    };

                    var getAnyAttachment = function() {
                        return helper.apiGet(null, collectionAttachments);
                    };

                    var getAllLocations = function() {
                        return helper.apiList(null, "locations");
                    };

                    var getAllCategoryTypes = function() {
                        return helper.apiSearch({pk__startswith:ROOT+'.', _sort:'pk'}, "categories");
                    };

                    //
                    // Testing update
                    //
                    asyncTest("updating an Item fields", function() {
                        var item = new cr.Item({
                            ds: ds
                        });

                        // Get any item
                        helper.apiGet(null, collection)
                            .done(function(data) {
                                item.id = data._id;
                                item.get("*,location,category")
                                    .done(function() {
                                        var purchased = moment();

                                        item.name = "qunit";
                                        item.brand = "qunit";
                                        item.fields["Owner"] = "qunit";
                                        item.purchaseDate = purchased;

                                        item.update()
                                            .done(function() {
                                                ok(item.name == "qunit");
                                                ok(item.brand == "qunit");
                                                ok(item.fields["Owner"] == "qunit", "Owner should be qunit");
                                                //ok(item.purchaseDate == purchased, "Purchase date should be updated");
                                            })
                                            .always(function(){
                                                start();
                                            });
                                    });
                            });
                    });

                    //
                    ///**
                    // * Testing API getIgnore404
                    // *
                    // */
                    //asyncTest("getIgnore404 item", function() {
                    //    ds.getIgnore404('notfound')
                    //        .done(function(data) {
                    //            ok(data==null);
                    //        })
                    //        .always(function(){
                    //            start();
                    //        });
                    //});
                    //
                    ///**
                    // * Testing API /search calls
                    // */
                    //asyncTest("search items (empty)", function() {
                    //    ds.search()
                    //        .done(function(data) {
                    //            ok(data.docs!=null);
                    //            ok(data.docs.length>0);
                    //            ok(data.count > 0);
                    //        })
                    //        .always(function(){
                    //            start();
                    //        });
                    //});
                    //
                    ///**
                    // * Testing API /list calls
                    // */
                    //
                    //// Test getting a list of items
                    //asyncTest("list items", function() {
                    //    ds.list()
                    //        .done(function(items) {
                    //            ok(items!=null);
                    //            ok(items.length>0);
                    //        })
                    //        .always(function(){
                    //            start();
                    //        });
                    //});
                    //
                    //// Test getting a list of active items
                    //asyncTest("list active items", function() {
                    //    ds.list("active")
                    //        .done(function(items) {
                    //            ok(items!=null);
                    //            ok(items.length>0);
                    //        })
                    //        .always(function(){
                    //            start();
                    //        });
                    //});
                    //
                    //// Test getting a list of expired items
                    //asyncTest("list expired items", function() {
                    //    ds.list("expired")
                    //        .done(function(items) {
                    //            ok(items!=null);
                    //            ok(items.length>0);
                    //        })
                    //        .always(function(){
                    //            start();
                    //        });
                    //});
                    //
                    // Test create a new item
                    asyncTest("create a new Item object", function() {
                        $.when(
                            getAllCategoryTypes(),
                            getAllLocations()
                        ).done(function(categories, locations) {
                                var item = new cr.Item({
                                    ds: ds,
                                    name: "qunit item",
                                    brand: "Apple",
                                    model: "iPhone",
                                    category: categories.docs[0]._id,
                                    location: locations[0]._id,
                                    fields: {"Owner": "qunit"}
                                });

                                // Create a simple Item
                                item.create()
                                    .done(function(resp) {
                                        ok(resp != undefined);
                                        ok(item.existsInDb());
                                        ok(item.name == "qunit item");
                                        ok(item.brand == "Apple");
                                        ok(item.model == "iPhone");
                                        ok(item.fields["Owner"] == "qunit");
                                    })
                                    .always(function(){
                                        start();
                                    });
                            });
                    });

                    //// Test create a new item
                    //asyncTest("create a new Item object with invalid name", function() {
                    //    $.when(
                    //        getAllCategoryTypes(),
                    //        getAllLocations()
                    //    ).done(function(categories, locations) {
                    //            var item = new cr.Item({
                    //                ds: ds,
                    //                name: "a   ",
                    //                category: categories.docs[0]._id,
                    //                location: locations[0]._id
                    //            });
                    //
                    //
                    //            ok(!item.isValidName());
                    //
                    //            // Create a simple Item
                    //            item.create()
                    //                .done(function(){
                    //                    ok(false);
                    //                })
                    //                .fail(function(resp) {
                    //                    ok(true);
                    //                })
                    //                .always(function(){
                    //                    start();
                    //                });
                    //        });
                    //});
                    //
                    //
                    ///**
                    // * Testing Item viewmodel calls
                    // */
                    //asyncTest("get any Item object -- via get", function() {
                    //    var item = new cr.Item({
                    //        ds: ds
                    //    });
                    //
                    //    // Get any item
                    //    helper.apiGet(null, collection)
                    //        .done(function(data) {
                    //            item.id = data._id;
                    //            item.get("*,location,category")
                    //                .done(function() {
                    //                    ok(!item.isEmpty());
                    //                    ok(item.existsInDb());
                    //                    ok(item.flag.length>0);
                    //                    ok(item.keyValues.length>0);
                    //                    ok(item.category.length>0);
                    //                    ok($.type(item.category) === "string");
                    //                    ok(item.location.length>0);
                    //                    ok($.type(item.location) === "string");
                    //                }).always(function(){
                    //                    start();
                    //                });
                    //        });
                    //});
                    //
                    //asyncTest("get any Item object -- via get, expand category & location", function() {
                    //    var item = new cr.Item({
                    //        ds: ds
                    //    });
                    //
                    //    // Get any item
                    //    helper.apiGet(null, collection)
                    //        .done(function(data) {
                    //            item.id = data._id;
                    //            item.get("*,location.*,category.*")
                    //                .done(function() {
                    //                    ok(!item.isEmpty());
                    //                    ok(item.existsInDb());
                    //                    ok(item.cover.length>0);
                    //                    ok(item.flag.length>0);
                    //                    ok(item.keyValues.length>0);
                    //                    ok(item.category.length>0);
                    //                    ok($.type(item.category) === "string");
                    //                    ok(item.location.length>0);
                    //                    ok($.type(item.location) === "string");
                    //                }).always(function(){
                    //                    start();
                    //                });
                    //        });
                    //});
                    //
                    //asyncTest("get any Item object -- via response", function() {
                    //    var item = new cr.Item({
                    //        ds: ds
                    //    });
                    //
                    //    // Get any item
                    //    helper.apiGet(null, collection)
                    //        .done(function(data) {
                    //            item._fromJson(data)
                    //                .done(function() {
                    //                    ok(!item.isEmpty());
                    //                    ok(item.existsInDb());
                    //                    ok(item.flag.length>0);
                    //                    ok(item.keyValues.length>0);
                    //                }).always(function(){
                    //                    start();
                    //                });
                    //        });
                    //});
                    //
                    //asyncTest("update name Item object", function() {
                    //    var item = new cr.Item({
                    //        ds: ds
                    //    });
                    //
                    //    // Get any item
                    //    helper.apiGet(null, collection)
                    //        .done(function(data) {
                    //            item._fromJson(data)
                    //                .done(function() {
                    //                    var original = data.name;
                    //                    var name = "Nose";
                    //                    item.updateName(name)
                    //                        .done(function() {
                    //                            ok(item.name==name);
                    //
                    //                            item.updateName(original)
                    //                                .done(function() {
                    //                                    ok(item.name==original);
                    //                                }).always(function() {
                    //                                    start();
                    //                                });
                    //                        });
                    //                });
                    //        });
                    //});
                    //
                    //asyncTest("expire, unexpire Item object", function() {
                    //    var item = new cr.Item({
                    //        ds: ds
                    //    });
                    //
                    //    // Get any item
                    //    getAnyAvailableItem()
                    //        .done(function(data) {
                    //            item._fromJson(data)
                    //                .done(function() {
                    //                    ok(item.order==null);
                    //                    item.expire()
                    //                        .done(function() {
                    //                            ok(item.status=="expired");
                    //
                    //                            item.undoExpire()
                    //                                .done(function() {
                    //                                    ok(item.status=="available");
                    //                                }).always(function(){
                    //                                    start();
                    //                                });
                    //                        });
                    //                });
                    //        });
                    //});
                    //
                    //asyncTest("duplicate Item object", function() {
                    //    var item = new cr.Item({
                    //        ds: ds
                    //    });
                    //
                    //    // Get any item
                    //    getAnyAvailableItem()
                    //        .done(function(data) {
                    //            item._fromJson(data)
                    //                .done(function() {
                    //                    item.duplicate(1)
                    //                        .done(function() {
                    //                            // TODO: More tests here!
                    //                            ok(item.status=="available");
                    //                        })
                    //                        .always(function(){
                    //                            start();
                    //                        });
                    //                });
                    //        });
                    //});
                    //
                    //asyncTest("attach, detach on Item object", function() {
                    //    var item = new cr.Item({
                    //        ds: ds
                    //    });
                    //
                    //    $.when(
                    //        getAnyAvailableItem(),
                    //        getAnyAttachment()
                    //    )
                    //        .done(function(itemData, attData) {
                    //            item._fromJson(itemData)
                    //                .done(function() {
                    //                    item.duplicate(1)
                    //                        .done(function(items) {
                    //                            var newItem = new cr.Item({
                    //                                ds: ds
                    //                            });
                    //
                    //                            newItem._fromJson(items[0])
                    //                                .done(function() {
                    //                                    // Attach the file
                    //                                    newItem.attach(attData)
                    //                                        .done(function() {
                    //                                            newItem.cover = "";
                    //                                            // Set it as cover
                    //                                            newItem.setCover(attData)
                    //                                                .done(function() {
                    //                                                    ok(newItem.cover!="");
                    //
                    //                                                    // Detach the file, cover should be different
                    //                                                    var oldCover = newItem.cover;
                    //                                                    newItem.detach(oldCover)
                    //                                                        .done(function() {
                    //                                                            ok(newItem.cover!=oldCover);
                    //                                                        })
                    //                                                        .always(function(){
                    //                                                            start();
                    //                                                        });
                    //                                                });
                    //                                        });
                    //                                });
                    //                        });
                    //                });
                    //        });
                    //});
                    //
                    //asyncTest("change geo Item object", function() {
                    //    var item = new cr.Item({
                    //        ds: ds
                    //    });
                    //
                    //    // Get any item
                    //    getAnyAvailableItem()
                    //        .done(function(data) {
                    //            item._fromJson(data)
                    //                .done(function() {
                    //                    // London baby!
                    //                    item.updateGeo(51.5033630, -0.1276250)
                    //                        .done(function() {
                    //                            ok(item.geo[0]!=0.0);
                    //                            ok(item.geo[1]!=0.0);
                    //                            ok(item.address.length);
                    //                        })
                    //                        .always(function(){
                    //                            start();
                    //                        });
                    //                });
                    //        });
                    //});
                    //
                    //asyncTest("isValid Item object", function() {
                    //    var item = new cr.Item({
                    //        ds: ds
                    //    });
                    //
                    //    ok(item.isValid()==false, "Item without name should not be valid");
                    //    ok(item.isValidName()==false, "Item name should not be valid");
                    //    ok(item.isValidCategory()==false, "Item category should not be valid");
                    //    ok(item.isValidLocation()==false, "Item location should not be valid");
                    //
                    //    item.name = "Testing";
                    //    ok(item.isValid()==false, "Item without name should not be valid");
                    //    ok(item.isValidName()==true, "Item name should be valid");
                    //    ok(item.isValidCategory()==false, "Item category should not be valid");
                    //    ok(item.isValidLocation()==false, "Item location should not be valid");
                    //
                    //    item.category = "FakeCategoryId";
                    //    ok(item.isValid()==false, "Item without location should not be valid");
                    //    ok(item.isValidName()==true, "Item name should be valid");
                    //    ok(item.isValidCategory()==true, "Item category should be valid");
                    //    ok(item.isValidLocation()==false, "Item location should not be valid");
                    //
                    //    item.location = "FakeLocationId";
                    //    ok(item.isValid()==true, "Item should be valid");
                    //    ok(item.isValidName()==true, "Item name should be valid");
                    //    ok(item.isValidCategory()==true, "Item category should be valid");
                    //    ok(item.isValidLocation()==true, "Item location should be valid");
                    //
                    //    item.reset()
                    //        .then(function() {
                    //            ok(item.isValid()==false, "Item should not be valid after reset");
                    //            ok(item.isValidName()==false, "Item name should not be valid after reset");
                    //            ok(item.isValidCategory()==false, "Item category should not be valid after reset");
                    //            ok(item.isValidLocation()==false, "Item location should not be vaild after reset");
                    //        }).always(function(){
                    //            start();
                    //        });
                    //});
                    //
                    //asyncTest("change location Item object", function() {
                    //    var item = new cr.Item({
                    //        ds: ds
                    //    });
                    //
                    //    $.when(
                    //        getAnyAvailableItem(),
                    //        getAllLocations()
                    //    ).done(function(data, locations) {
                    //            item._fromJson(data)
                    //                .done(function() {
                    //                    // Get any other location
                    //                    var otherLocation = "";
                    //                    $.each(locations, function(i, location) {
                    //                        if (location._id != item.location) {
                    //                            otherLocation = location._id;
                    //                            return false;
                    //                        }
                    //                    });
                    //
                    //                    // Update the location of the item
                    //                    item.changeLocation(otherLocation)
                    //                        .done(function() {
                    //                            // TODO: More tests here!
                    //                            ok(item.location==otherLocation);
                    //                        })
                    //                        .always(function(){
                    //                            start();
                    //                        });
                    //                });
                    //        });
                    //});
                    //
                    //asyncTest("isDirty Item object", function() {
                    //    var item = new cr.Item({
                    //        ds: ds
                    //    });
                    //
                    //    // Get any item
                    //    getAnyAvailableItem()
                    //        .done(function(data) {
                    //            item._fromJson(data)
                    //                .done(function() {
                    //                    // Use some fake values just to see if isDirty() and discardChanges works well
                    //                    ok(item.isDirty() == false);
                    //
                    //                    item.name = "bla";
                    //                    ok(item.isDirty() == true);
                    //                    item.discardChanges()
                    //                        .then(function() {
                    //                            ok(item.isDirty() == false);
                    //
                    //                            item.location = "bla";
                    //                            ok(item.isDirty() == true);
                    //
                    //                            item.discardChanges()
                    //                                .then(function() {
                    //                                    ok(item.isDirty() == false);
                    //
                    //                                    item.category = "bla";
                    //                                    ok(item.isDirty() == true);
                    //
                    //                                    item.discardChanges()
                    //                                        .then(function() {
                    //                                            ok(item.isDirty() == false);
                    //
                    //                                            item.flag = "bla";
                    //                                            ok(item.isDirty() == true);
                    //
                    //                                            item.discardChanges()
                    //                                                .then(function() {
                    //                                                    ok(item.isDirty() == false);
                    //
                    //                                                    item.fields["bla"] = "No";
                    //                                                    ok(item.isDirty() == true);
                    //
                    //                                                    item.discardChanges()
                    //                                                        .then(function() {
                    //                                                            ok(item.isDirty() == false);
                    //                                                        })
                    //                                                        .always(function(){
                    //                                                            start();
                    //                                                        });
                    //                                                });
                    //                                        });
                    //                                });
                    //                        });
                    //                });
                    //        });
                    //});
                    //
                    //asyncTest("reload Item object", function() {
                    //    var item = new cr.Item({
                    //        ds: ds
                    //    });
                    //
                    //    // Get any item
                    //    getAnyAvailableItem()
                    //        .done(function(data) {
                    //            item._fromJson(data)
                    //                .done(function() {
                    //                    var oldName = item.name;
                    //                    item.name = "bla";
                    //                    ok(item.isDirty() == true);
                    //
                    //                    item.reload()
                    //                        .done(function() {
                    //                            ok(item.name==oldName);
                    //                            ok(item.isDirty() == false);
                    //                        }).always(function(){
                    //                            start();
                    //                        });
                    //                });
                    //        });
                    //});
                    //
                    //asyncTest("setFlag on Item object", function() {
                    //    var item = new cr.Item({
                    //        ds: ds
                    //    });
                    //
                    //    // Get any item
                    //    getAnyAvailableItem()
                    //        .done(function(data) {
                    //            item._fromJson(data)
                    //                .done(function() {
                    //                    var oldFlag = item.flag;
                    //                    var newFlag = (oldFlag==flags[0]) ? flags[1] : flags[0];
                    //
                    //                    item.setFlag(newFlag)
                    //                        .done(function() {
                    //                            ok(item.flag==newFlag);
                    //                            ok(item.isDirty() == false);
                    //
                    //                            item.setFlag(oldFlag)
                    //                                .done(function() {
                    //                                    ok(item.flag==oldFlag);
                    //                                }).always(function(){
                    //                                    start();
                    //                                });
                    //                        });
                    //
                    //                });
                    //        });
                    //});
                    //
                    /////* asyncTest("canChangeCategory, changeCategory Item object", function() {
                    ////     var item = new cr.Item({
                    ////         ds: ds
                    ////     });
                    ////
                    ////     // Get any item
                    ////     getAnyAvailableItem()
                    ////         .done(function(data) {
                    ////             item._fromJson(data)
                    ////                 .done(function() {
                    ////
                    ////                     var otherCat = (item.category==categories[0]) ? categories[1] : categories[0];
                    ////                     item.canChangeCategory(otherCat)
                    ////                         .done(function(resp) {
                    ////                             ok(resp.result==true);
                    ////
                    ////                             item.changeCategory(otherCat)
                    ////                                 .done(function() {
                    ////                                     ok(item.category==otherCat);
                    ////                                 }).always(function(){
                    ////                                     start();
                    ////                                 });
                    ////
                    ////                         });
                    ////                 });
                    ////         });
                    //// });*/
                    ////
                    //// /**
                    ////  * Availabilities
                    ////  */
                    //// asyncTest("Item getAvailabilities", function() {
                    ////     var item = new cr.Item({
                    ////         ds: ds
                    ////     });
                    ////
                    ////     // Get any item
                    ////     getAnyCheckedOutItem()
                    ////         .done(function(data) {
                    ////             ok(data._id);
                    ////             ok(data.order);
                    ////             item.id = data._id;
                    ////
                    ////             item.getAvailabilities(null, null)
                    ////                 .done(function(avs) {
                    ////                     ok(avs.length>0);
                    ////                 }).always(function(){
                    ////                     start();
                    ////                 });
                    ////         });
                    //// });
                    ////
                    //
                    ///**
                    // * Testing comments on Items
                    // */
                    //
                    //asyncTest("comments on Item object", function() {
                    //    var item = new cr.Item({
                    //        ds: ds
                    //    });
                    //
                    //    // Get any item
                    //    getAnyAvailableItem()
                    //        .done(function(doc) {
                    //            item._fromJson(doc)
                    //                .done(function() {
                    //                    var numComments = item.comments.length;
                    //                    var newComment = 'Test add comment from QUnit';
                    //                    var updateComment = 'Test update comment from QUnit';
                    //
                    //                    item.addComment(newComment)
                    //                        .done(function() {
                    //                            // Adding a comment should increase the num comments with 1
                    //                            // The text should be equal as the one we've passed
                    //                            ok(item.comments.length==numComments+1);
                    //                            ok(item.comments[item.comments.length-1].value == newComment);
                    //
                    //                            var commentId = item.comments[item.comments.length - 1].id;
                    //                            item.updateComment(commentId, updateComment)
                    //                                .done(function() {
                    //                                    // Updating a comment should not increase the num comments
                    //                                    // The text should be equal as the one we've passed
                    //                                    ok(item.comments.length==numComments+1);
                    //                                    ok(item.comments[item.comments.length-1].value == updateComment);
                    //
                    //                                    item.deleteComment(commentId)
                    //                                        .done(function() {
                    //                                            // Deleting a comment should decrease the num comments
                    //                                            ok(item.comments.length==numComments);
                    //                                        })
                    //                                        .always(function() {
                    //                                            start();
                    //                                        });
                    //                                });
                    //                        })
                    //                })
                    //        });
                    //});
                    //
                    ///**
                    // * Testing pubsub
                    // */
                    //
                    //asyncTest("pubsub Item object", function() {
                    //    var item = new cr.Item({
                    //        ds: ds
                    //    });
                    //
                    //    $.subscribe('item.fromJson', function(_, data) {
                    //        ok(data!=null);
                    //    });
                    //
                    //    // Get any item
                    //    getAnyAvailableItem()
                    //        .done(function(doc) {
                    //            item.id = doc._id;
                    //            item.get()
                    //                .always(function() {
                    //                    setTimeout(function() {
                    //                        start();
                    //                    }, 1000);
                    //                });
                    //        });
                    //});

                });

        };

        return {run: run}
    }
);