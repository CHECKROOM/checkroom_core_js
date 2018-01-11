/**
 * @copyright CHECKROOM NV 2015
 */
"use strict";
define(['settings', 'helper', 'moment', 'cheqroom-core'], function(settings, helper, moment, cr) {

        var run = function() {

            var collection = "orders";

            // Get a user with token
            helper.getApiDataSources([collection, "items", "reservations"])
                .done(function(dss) {
                    var ds = dss[collection];
                    var dsItems = dss["items"];
                    var dsReservations = dss["reservations"];

                    /**
                     * Testing API /list calls
                     */

                    // Test searching orders
                    asyncTest("search orders", function() {
                        ds.search({ _limit:1, _skip: 0 })
                            .done(function(orders) {
                                ok(orders!=null);
                                ok(orders.docs.length>0);
                            })
                            .always(function(){
                                start();
                            });
                    });

                    asyncTest("search orders -- incomplete", function() {
                        ds.search({listName:"creating_orders", _limit: 1, _skip: 0})
                            .done(function(orders) {
                                ok(orders!=null);
                                ok(orders.docs.length>0);
                            })
                            .always(function(){
                                start();
                            });
                    });

                    asyncTest("search orders -- open", function() {
                        ds.search({listName:"open_orders", _limit:1, _skip: 0})
                            .done(function(orders) {
                                ok(orders!=null);
                                ok(orders.docs.length>0);
                            })
                            .always(function(){
                                start();
                            });
                    });

                    asyncTest("search orders -- closed", function() {
                        ds.search({listName:"closed_orders", _limit: 1, _skip: 0})
                            .done(function(orders) {
                                ok(orders!=null);
                                ok(orders.docs.length>0);
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
                        helper.getAnyLocation(),
                        helper.getAnyCategory()
                    )
                        .done(function(contact, location, category) {

                            asyncTest("Order - 422 handling checkin", function(){
                                helper.getNewItem(dsItems, category, location, "qunit item").done(function(item){
                                    var due = moment().add(5, "days");

                                    helper.getNewOpenOrder(ds, dsItems, due, location, contact, [item.id]).done(function(order){

                                        order.checkin().then(function(){
                                            ok(true);

                                            order.checkin().then(function(){
                                                ok(true);

                                                order.checkin([item.id], location._id, false, true).then(function(){
                                                    ok(false);
                                                }, function(){
                                                    ok(true);
                                                }).always(function(){
                                                    start();
                                                })
                                            }, function(){
                                                ok(false);
                                            })

                                        }, function(){
                                            ok(false);
                                        });                                                                              
                                    })
                                });                               
                            });

                            asyncTest("Order - 422 handling checkout", function(){
                                helper.getNewItem(dsItems, category, location, "qunit item").done(function(item){
                                    var due = moment().add(5, "days");

                                    helper.getNewCreatingOrder(ds, dsItems, due, location, contact, [item.id]).done(function(order){

                                        order.checkout().then(function(){
                                            ok(true);

                                            order.checkout().then(function(){
                                                ok(true);

                                                order.checkout(false, true).then(function(){
                                                    ok(false);
                                                }, function(){
                                                    ok(true);
                                                }).always(function(){
                                                    start();
                                                })
                                            }, function(){
                                                ok(false);
                                            })

                                        }, function(){
                                            ok(false);
                                        });                                                                              
                                    })
                                });                               
                            });

                            asyncTest("Order - 422 handling undoCheckout", function(){
                                helper.getNewItem(dsItems, category, location, "qunit item").done(function(item){
                                    var due = moment().add(5, "days");

                                    helper.getNewOpenOrder(ds, dsItems, due, location, contact, [item.id]).done(function(order){

                                        order.undoCheckout().then(function(){
                                            ok(true);

                                            order.undoCheckout().then(function(){
                                                ok(true);

                                                order.undoCheckout(false, true).then(function(){
                                                    ok(false);
                                                }, function(){
                                                    ok(true);
                                                }).always(function(){
                                                    start();
                                                })
                                            }, function(){
                                                ok(false);
                                            })

                                        }, function(){
                                            ok(false);
                                        });                                                                              
                                    })
                                });                               
                            });

                            /*asyncTest("create Order object -- with location and contact objects set", function() {
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
                            });*/

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

                          /* asyncTest("BUG: Set due date on open order", function() {
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
                            });*/
                                
                            asyncTest("create Order object with due, setDueDate", function() {
                                var order = new cr.Order({
                                    ds: ds,
                                    dsItems: dsItems,
                                    autoCleanup: true,
                                    location: location._id,
                                    contact: contact._id
                                });

                                ok(!order.existsInDb());

                                var due = moment().add(5, 'days');

                                order.setDueDate(due)
                                    .done(function() {
                                        ok(order.existsInDb());
                                        ok(order.due.isSameOrAfter(due));                                       
                                    }).always(function(){
                                        start();
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


                                                                                order.addComment("test")
                                                                                    .then(function(){
                                                                                        ok(order.comments.length == 1);

                                                                                        order.generateAgreement()
                                                                                            .then(function(){
                                                                                                ok(order.attachments.length==1);

                                                                                                var attachment = order.attachments[0];
                                                                                                order.detach(attachment.id)
                                                                                                    .then(function(){
                                                                                                        ok(order.attachments.length == 0);

                                                                                                        order.undoCheckout()
                                                                                                            .then(function() {
                                                                                                                ok(order.status=="creating");
                                                                                                                

                                                                                                            })
                                                                                                            .always(function() {
                                                                                                                start();
                                                                                                            });
                                                                                                    });
                                                                                            });
                                                                                    })
                                                                               
                                                                            }, deleteOrder);
                                                                    });
                                                            });
                                                    });
                                            });
                                    });
                            });

                            asyncTest("extend due date of Order, setDueDate", function(){
                                helper.getNewItem(dsItems, category, location, "qunit item").done(function(item){
                                    var due = moment().add(5, "days");

                                    helper.getNewOpenOrder(ds, dsItems, due, location, contact, [item.id]).done(function(order){
                                        ok(order.status == "open");

                                        var extendDue = due.add(5, "days");
                                        order.setDueDate(extendDue)
                                            .done(function(){
                                                ok(order.due.isSameOrAfter(extendDue));
                                            })
                                            .fail(function(){
                                                ok(false);
                                            })
                                            .always(function(){
                                                start();
                                            });                                        
                                    })
                                });                               
                            });

                            asyncTest("extend due date of Order with conflicts, setDueDate", function(){
                                helper.getNewItem(dsItems, category, location, "qunit item").done(function(item){
                                    var due = moment().add(5, "days");

                                    helper.getNewOpenOrder(ds, dsItems, due, location, contact, [item.id]).done(function(order){
                                        var from = due.clone().add(1, "days");
                                        var to = due.clone().add(7, "days");

                                        helper.getNewOpenReservation(dsReservations, dsItems, from, to, location, contact, [item.id])
                                            .done(function(reservation){
                                                var invalidExtendDue = due.clone().add(3, "days");

                                                // Wait 10s, so planner has run
                                                // http://api.qunitjs.com/async/
                                                setTimeout(function(){
                                                    order.setDueDate(invalidExtendDue)
                                                        .done(function(){
                                                            ok(false)
                                                        })
                                                        .fail(function(){
                                                            ok(true);
                                                        })
                                                        .always(function(){
                                                            start();
                                                        });    
                                                }, 20000)
                                            });                                                                              
                                    })
                                });                               
                            });

                        });
                });

        };

        return {run: run}
    }
);