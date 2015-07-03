/**
 * @copyright CHECKROOM NV 2015
 */
"use strict";
define(['settings', 'helper', 'cheqroom-core'], function(settings, helper, cr) {

        var run = function() {

            var collection = "reservations";

            // Get a user with token
            $.when(
                    helper.getApiDataSource(collection),
                    helper.getApiDataSource("items")
                )
                .done(function(ds, dsItems) {

                    var getNewReservation = function(params) {
                        var kwargs = $.extend({
                            ds: ds,
                            dsItems: dsItems,
                            helper: new cr.Helper()
                        }, params);
                        return new cr.Reservation(kwargs);
                    };

                    /**
                     * Testing API /list calls
                     */

                        // Test getting a list of reservations
                    asyncTest("list reservations", function() {
                        ds.list()
                            .done(function(reservations) {
                                ok(reservations!=null);
                                ok(reservations.length>0);
                            })
                            .always(function(){
                                start();
                            });
                    });

                    asyncTest("list reservations -- incomplete", function() {
                        ds.list("creating_reservations")
                            .done(function(reservations) {
                                ok(reservations!=null);
                                ok(reservations.length>0);
                            })
                            .always(function(){
                                start();
                            });
                    });

                    asyncTest("list reservations -- open", function() {
                        ds.list("open_reservations")
                            .done(function(reservations) {
                                ok(reservations!=null);
                                ok(reservations.length>0);
                            })
                            .always(function(){
                                start();
                            });
                    });

                    asyncTest("list reservations -- closed", function() {
                        ds.list("closed_reservations")
                            .done(function(reservations) {
                                ok(reservations!=null);
                                ok(reservations.length>0);
                            })
                            .always(function(){
                                start();
                            });
                    });

                    asyncTest("list reservations -- upcoming_day_reservations", function() {
                        ds.list("upcoming_day_reservations")
                            .done(function(reservations) {
                                ok(reservations!=null);
                                //ok(reservations.length>0);
                            })
                            .always(function(){
                                start();
                            });
                    });

                    asyncTest("list reservations -- upcoming_week_reservations", function() {
                        ds.list("upcoming_week_reservations")
                            .done(function(reservations) {
                                ok(reservations!=null);
                                //ok(reservations.length>0);
                            })
                            .always(function(){
                                start();
                            });
                    });

                    asyncTest("list reservations -- upcoming_month_reservations", function() {
                        ds.list("upcoming_month_reservations")
                            .done(function(reservations) {
                                ok(reservations!=null);
                                //ok(reservations.length>0);
                            })
                            .always(function(){
                                start();
                            });
                    });

                    asyncTest("list reservations -- overdue_reservations", function() {
                        ds.list("overdue_reservations")
                            .done(function(reservations) {
                                ok(reservations!=null);
                                //ok(reservations.length>0);
                            })
                            .always(function(){
                                start();
                            });
                    });

                    asyncTest("list reservations -- cancelled_reservations", function() {
                        ds.list("cancelled_reservations")
                            .done(function(reservations) {
                                ok(reservations!=null);
                                //ok(reservations.length>0);
                            })
                            .always(function(){
                                start();
                            });
                    });

                    /**
                     * Testing the Reservation model
                     */
                    asyncTest("Reservation constructor", function() {
                        $.when(
                                helper.getAnyContact(),
                                helper.getAnyLocation()
                            )
                            .then(function(contact, location) {
                                var r = getNewReservation({location: location._id});
                                ok(r.status=="creating");
                                ok(r.from==null);
                                ok(r.to==null);
                                ok(r.due==null);
                                r._toLog();
                            })
                            .always(function(){
                                start();
                            });
                    });

                    asyncTest("Reservation - errors when in wrong status", function() {
                        var r = new cr.Reservation({"status": "closed"});

                        r.setFromDate(moment())
                            .fail(function(err) {
                                ok(err.message.length>0);
                                start();
                            });
                    });

                    asyncTest("Reservation - set from date (now fails)", function() {
                        var r = getNewReservation();
                        r.setFromDate(moment())
                            .fail(function(err) {
                                ok(err.message.length>0);
                            })
                            .always(function() {
                                start();
                            });
                    });

                    asyncTest("Reservation - set from date (past fails)", function() {
                        var r = getNewReservation();
                        r.setFromDate(moment().subtract(1, 'day'))
                            .fail(function(err) {
                                ok(err.message.length>0);
                            })
                            .always(function() {
                                start();
                            });
                    });

                    asyncTest("Reservation - set from date (tomorrow ok)", function() {
                        var r = getNewReservation();
                        r.setFromDate(moment().add(1, 'day'))
                            .done(function() {
                                ok(true);
                            })
                            .always(function() {
                                start();
                            });
                    });

                    // to dates
                    // ----
                    asyncTest("Reservation - set TO date (tomorrow ok)", function() {
                        var r = getNewReservation();
                        r.setFromDate(moment().add(1, 'day'))
                            .done(function() {
                                r.setToDate(moment().add(2, 'day'))
                                    .then(function() {
                                        ok(true);
                                    })
                                    .always(function() {
                                        start();
                                    });
                            });

                    });

                    // swap item
                    $.when(
                        helper.getAnyContact(),
                        helper.getAnyLocation(),
                        helper.getAnyAvailableItem(),
                        helper.getAnyCheckedOutItem()
                    )
                        .then(function(contact, location, available, checkedout) {

                            asyncTest("Reservation - from date round down", function() {
                                var r = getNewReservation();

                                // Hack: overwrite the getNow function to always return the same date
                                r.helper.dateHelper.getNow = function() {
                                    var d1 = new Date(2013, 11, 13, 11, 32, 30, 0);
                                    return moment(d1)
                                };

                                r.from = r.getMinDateFrom();
                                var t = "2013-12-13T11:45:00.000Z";
                                equal(r.from.toJSONDate(), t);

                                r._checkFromDateBetweenMinMax()
                                    .done(function() {
                                        ok(true);
                                    }).always(function() {
                                        start();
                                    });
                            });

                            asyncTest("Reservation - from date round up", function() {
                                var r = getNewReservation();

                                // Hack: overwrite the getNow function to always return the same date
                                r.helper.dateHelper.getNow = function() {
                                    var d1 = new Date(2013, 11, 13, 11, 44, 30, 0);
                                    return moment(d1)
                                };

                                r.from = r.getMinDateFrom();
                                var t = "2013-12-13T12:00:00.000Z";
                                equal(r.from.toJSONDate(), t);

                                r._checkFromDateBetweenMinMax()
                                    .done(function() {
                                        ok(true);
                                    }).always(function() {
                                        start();
                                    });
                            });

                            asyncTest("Reservation - swapItem", function() {
                                var r = getNewReservation();
                                r.contact = contact._id;
                                r.location = location._id;

                                var oldItem = checkedout._id;
                                var newItem = available._id;
                                r.addItems([oldItem])
                                    .done(function() {
                                        r.swapItem(oldItem, newItem)
                                            .done(function() {
                                                ok(r.items[0]!=oldItem);
                                                ok(r.items[0]==newItem);
                                            })
                                            .always(function() {
                                                start();
                                                r.delete();
                                            });
                                    });

                            });
                        });

                    // make reservation
                    // ----
                    $.when(helper.getAnyContact(), helper.getAnyLocation())
                        .then(function(contact, location) {

                            asyncTest("Reservation - reserve, undoReserve, cancel", function() {
                                var r = getNewReservation();
                                r.setFromToDate(moment().add(1, 'day'))
                                    .done(function() {
                                        ok(r.from!=null);
                                        ok(r.to!=null);
                                        ok(!r.canReserve());
                                        ok(r.canDelete());

                                        r.setLocation(location._id)
                                            .done(function() {
                                                ok(r.location!=null);
                                                ok(r.location.length>0);
                                                ok(!r.canReserve());
                                                ok(r.canDelete());

                                                r.setContact(contact._id)
                                                    .done(function() {
                                                        ok(r.contact!=null);
                                                        ok(r.contact.length>0);
                                                        ok(!r.canReserve());
                                                        ok(r.canDelete());

                                                        r.searchItems({}, true, true)
                                                            .then(function(resp) {
                                                                ok(resp!=null);
                                                                ok(resp.count>0);
                                                                ok(resp.docs.length>0);

                                                                r.addItems([resp.docs[0]._id])
                                                                    .then(function() {
                                                                        ok(r.canReserve());

                                                                        r.reserve()
                                                                            .then(function() {
                                                                                ok(r.status=="open");
                                                                                ok(!r.canReserve());
                                                                                ok(r.canEdit());
                                                                                ok(r.canCancel());
                                                                                ok(r.canMakeOrder());
                                                                                ok(!r.canDelete());
                                                                            })
                                                                            .always(function() {
                                                                                start();
                                                                                r.delete();
                                                                            });

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