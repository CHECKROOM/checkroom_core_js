/**
 * @copyright CHECKROOM NV 2015
 */
"use strict";
define(['settings', 'helper', 'cheqroom-core', 'moment'], function(settings, helper, cr, moment) {

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
                            dsItems: dsItems
                        }, params);
                        return new cr.Reservation(kwargs);
                    };

                    asyncTest("Reservation - businessHours", function() {
                        var r = getNewReservation();

                        //dayOfweek (1 == Mon, 0 == Sun)
                        var getDateForDay = function(dayOfWeek, time){
                            return moment(time, "HH:mm").day(dayOfWeek);
                        }

                        r.dateHelper.businessHours = [
                            {"dayOfWeek":1,"openTime":540,"closeTime":1020}, // Mon 9-17
                            {"dayOfWeek":2,"openTime":540,"closeTime":1020}, // Thu 9-17
                            {"dayOfWeek":3,"openTime":540,"closeTime":1020}, // Wed 9-17
                            {"dayOfWeek":4,"openTime":540,"closeTime":1020}, // Thr 9-17
                            {"dayOfWeek":5,"openTime":660,"closeTime":1140}  // Fri 11-19
                        ]

                        
                        // Fri 19:00 --> Mon 9:00
                        equal(r.getNextTimeSlot(getDateForDay(5, "19:00")).format(), getDateForDay(1, "9:00").add(7, 'days').format());

                        // Mon 9:00 --> Mon 9:15
                        equal(r.getNextTimeSlot(getDateForDay(1, "9:00")).format(), getDateForDay(1, "9:15").format());
                            
                        // Mon 17:00 --> Thu 9:00
                        equal(r.getNextTimeSlot(getDateForDay(1, "17:00")).format(), getDateForDay(2, "9:00").format());
                        
                        start();
                    });

                });

        };

        return {run: run}
    }
);