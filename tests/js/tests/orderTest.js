/**
 * @copyright CHECKROOM NV 2015
 */
"use strict";
define(['settings', 'helper', 'cheqroom-core'], function(settings, helper, cr) {

        var run = function() {

            var collection = "orders";

            // Get a user with token
            helper.getApiDataSources([collection, "items"])
                .done(function(dss) {
                    var ds = dss[collection];
                    var dsItems = dss["items"];

                    /**
                     * Testing API /list calls
                     */

                    // Test getting a list of orders
                    asyncTest("list orders", function() {
                        ds.list()
                            .done(function(orders) {
                                ok(orders!=null);
                                ok(orders.length>0);
                            })
                            .always(function(){
                                start();
                            });
                    });

                    asyncTest("list orders -- incomplete", function() {
                        ds.list("creating_orders")
                            .done(function(orders) {
                                ok(orders!=null);
                                ok(orders.length>0);
                            })
                            .always(function(){
                                start();
                            });
                    });

                    asyncTest("list orders -- open", function() {
                        ds.list("open_orders")
                            .done(function(orders) {
                                ok(orders!=null);
                                ok(orders.length>0);
                            })
                            .always(function(){
                                start();
                            });
                    });

                    asyncTest("list orders -- closed", function() {
                        ds.list("closed_orders")
                            .done(function(orders) {
                                ok(orders!=null);
                                ok(orders.length>0);
                            })
                            .always(function(){
                                start();
                            });
                    });

                    /**
                     * Testing Order viewmodel calls
                     */
                    $.when(
                        helper.getAnyContact(),
                        helper.getAnyLocation()
                    )
                        .done(function(contact, location) {

                            asyncTest("create Order object -- with location and contact objects set", function() {
                                var order = new cr.Order({
                                    ds: ds,
                                    autoCleanup: true,
                                    location: location,
                                    contact: contact
                                });

                                order.create()
                                    .done(function() {
                                        ok(order.location!=null);
                                        ok(order.contact!=null);
                                    })
                                    .always(function() {
                                        start();
                                    });
                            });

                            asyncTest("create Order object -- with location and contact object ids set", function() {
                                var order = new cr.Order({
                                    ds: ds,
                                    autoCleanup: true,
                                    location: location._id,
                                    contact: contact._id
                                });

                                order.create()
                                    .done(function() {
                                        ok(order.location!=null);
                                        ok(order.contact!=null);
                                    })
                                    .always(function() {
                                        start();
                                    });
                            });

                            /*
                            asyncTest("create Order object -- due date bug", function() {
                                var order = new cr.Order({
                                    ds: ds,
                                    autoCleanup: true,
                                    location: location._id
                                });

                                order.create()
                                    .done(function() {
                                        ok(order.due==null);
                                        ok(order.existsInDb());
                                        ok(order.status=="creating");

                                        helper.getAnyAvailableItem()
                                            .done(function(item) {

                                                order.addItems([item._id])
                                                    .done(function() {
                                                        ok(order.due==null);
                                                        ok(order.existsInDb());
                                                        ok(order.status=="creating");
                                                        ok(order.items.length==1);
                                                    })
                                                    .always(function(){
                                                        start();
                                                    });
                                            });
                                    });
                            });

                            asyncTest("create Order object with contact, autoclean on delete", function() {
                                var order = new cr.Order({
                                    ds: ds,
                                    autoCleanup: true
                                });

                                order.setContact(contact._id)
                                    .done(function() {
                                        ok(order.id.length>0);
                                        ok(order.contact.length>0);
                                        ok(order.existsInDb());

                                        var id = order.id;
                                        order.clearContact()
                                            .done(function() {
                                                ok(!order.existsInDb());
                                                ok(order.isEmpty());
                                            }).always(function(){
                                                start();
                                            });
                                    });
                            });

                            asyncTest("create Order object with location, autoclean on delete", function() {
                                var order = new cr.Order({
                                    ds: ds,
                                    autoCleanup: true
                                });

                                order.setLocation(location._id)
                                    .done(function() {
                                        ok(order.id.length>0);
                                        ok(order.location.length>0);
                                        ok(order.existsInDb());

                                        var id = order.id;
                                        order.clearLocation()
                                            .done(function() {
                                                ok(!order.existsInDb());
                                                ok(order.isEmpty());
                                            }).always(function(){
                                                start();
                                            });
                                    });
                            });
                            */

                            asyncTest("BUG: Set due date on open order", function() {
                                helper.getAnyOpenOrder()
                                    .done(function(data) {
                                        var order = new cr.Order({
                                            ds: ds,
                                            dsItems: dsItems
                                        });

                                        order._fromJson(data)
                                            .done(function() {
                                                var due = moment().add(3, 'days');
                                                order.setDueDate(due)
                                                    .done(function() {
                                                        console.log(due);
                                                        console.log(order.due);
                                                        ok(order.due.diff(due, 'minutes')==0);
                                                    }).always(function() {
                                                        start();
                                                    });
                                            });
                                    });
                            });

                            asyncTest("create Order object via constructor, searchItems", function() {
                                var order = new cr.Order({
                                    ds: ds,
                                    dsItems: dsItems,
                                    autoCleanup: true,
                                    location: location._id,
                                    contact: contact._id
                                });

                                var deleteOrder = function() {
                                    order.delete();
                                };

                                order.create()
                                    .done(function() {
                                        ok(order.id.length>0);
                                        ok(order.location.length>0);
                                        ok(order.contact.length>0);
                                        ok(order.existsInDb());
                                        ok(order.status=="creating");

                                        order.searchItems()
                                            .done(function(searchResp) {
                                                var items = searchResp.docs;
                                                ok(items!=null);
                                                ok(items.length>0);

                                                var item = items[0];
                                                order.addItems([item._id])
                                                    .then(function() {
                                                        ok(order.items.length==1);
                                                        ok(order.status=="creating");

                                                        order.setFromDueDate(moment(), null)
                                                            .then(function() {
                                                                ok(order.from==null);
                                                                ok(order.due!=null);
                                                                ok(order.status=="creating");

                                                                order.checkout()
                                                                    .then(function() {
                                                                        ok(order.from!=null);
                                                                        ok(order.due!=null);
                                                                        ok(order.status=="open");
                                                                        var oldDue = order.due;

                                                                        order._toLog();
                                                                        order.setDueDate(moment().add(5, 'days'))
                                                                            .then(function() {
                                                                                var newDue = order.due;
                                                                                ok(order.from!=null);
                                                                                ok(order.due!=null);
                                                                                ok(order.status=="open");
                                                                                ok(oldDue.isBefore(newDue));

                                                                                order.undoCheckout()
                                                                                    .then(function() {
                                                                                        ok(order.status=="creating");
                                                                                    })
                                                                                    .always(function() {
                                                                                        start();
                                                                                    });
                                                                            }, deleteOrder);
                                                                    });
                                                            });
                                                    });
                                            });
                                    });
                            });

                        });
                });

        };

        return {run: run}
    }
);