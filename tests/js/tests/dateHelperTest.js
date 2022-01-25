/**
 * @copyright CHECKROOM NV 2015
 */
"use strict";
define(['settings', 'cheqroom-core', 'moment'], function(settings, cr, moment) {

        var run = function() {

            test('getDateRanges hours avg', function() {
                // Fri Dec 13 2013 11:55:30 GMT+0100 (CET)
                var d1 = new Date(2013, 11, 13, 15, 55, 30, 111);

                var helper24 = new cr.DateHelper({timeFormat24: true});
                var parts24 = helper24.getFriendlyDateParts(d1);

                var helper12 = new cr.DateHelper({timeFormat24: false});
                var parts12 = helper12.getFriendlyDateParts(d1);

                equal(parts24[0], "Dec 13");
                equal(parts12[0], "Dec 13");
                equal(parts24[1], "15:55");
                equal(parts12[1], "3:55 pm");
            });

            test('getDateRanges day avg', function() {
                // Fri Dec 13 2013 11:55:30 GMT+0100 (CET)
                var d1 = new Date(2013, 11, 13, 11, 55, 30, 111);
                var helper = new cr.DateHelper();
                var ranges = helper.getDateRanges(24, 3, d1);

                equal(ranges.length, 3);
                equal(ranges[0].counter, 1);
                equal(ranges[1].counter, 2);
                equal(ranges[2].counter, 3);

                equal(ranges[0].title, "1 Day");
                equal(ranges[1].title, "2 Days");
                equal(ranges[2].title, "3 Days");

                equal(ranges[0].option, "days");
                console.log(ranges);
            });

            test('getDateRanges hours avg', function() {
                // Fri Dec 13 2013 11:55:30 GMT+0100 (CET)
                var d1 = new Date(2013, 11, 13, 11, 55, 30, 111);
                var helper = new cr.DateHelper();
                var ranges = helper.getDateRanges(8, 3, d1);

                equal(ranges.length, 3);
                equal(ranges[0].counter, 8);
                equal(ranges[1].counter, 16);
                equal(ranges[2].counter, 24);

                equal(ranges[0].title, "8 Hours");
                equal(ranges[1].title, "16 Hours");
                equal(ranges[2].title, "24 Hours");

                equal(ranges[0].option, "days");
            });

            // new Date(year, month (0-based!), day, hour, minute, second, millisecond);
            // moment().format('LLL')   // July 2 2014 12:45 PM

            // Fri Dec 13 2013 11:55:30 GMT+0100 (CET)
            var d1 = new Date(2013, 11, 13, 11, 55, 30, 111);
            var d1Up = "December 13, 2013 12:00 PM";
            var d1Down = "December 13, 2013 11:45 AM";

            // roundTimeUp
            // ----
            test('roundTimeUp', function() {
                var m1 = new cr.DateHelper().roundTimeUp(d1);
                equal(m1.format('LLL'), d1Up);
            });
            test('roundTimeUpTwice', function() {
                var m1 = new cr.DateHelper().roundTimeUp(d1);
                m1 = new cr.DateHelper().roundTimeUp(m1);
                equal(m1.format('LLL'), d1Up);
            });

            // getFriendlyFromTo
            // ----
            test('getFriendlyFromTo', function() {
                var helper = new cr.DateHelper();
                //var nowstr = "2015-06-24T16:15:00+00:00";
                //var now = helper.fixDates(nowstr);
                var res = "";

                /*$.each([1,2,3,4,7,8,14,21,31,100], function(i, val) {
                    console.log(val);
                    var from = moment(now).add(-1*val, "days");
                    var to = moment(now).add(1, "days").add(4, "hours");
                    res = helper.getFriendlyFromTo(from, to, true, now);
                    console.log(res.text);
                    console.log("");
                });

                $.each([1,2,3,4,7,8,14,21,31,100], function(i, val) {
                    console.log(val);
                    var from = moment(now).add(1, "days");
                    var to = moment(now).add(val, "days").add(4, "hours");
                    res = helper.getFriendlyFromTo(from, to, true, now);
                    console.log(res.text);
                    console.log("");
                });*/
                
                var now = moment();

                var getFriendlyDate = function(date, useHours){
                    var parts = date.calendar().split(" at ");
                    return parts[0] + (useHours?" " + parts[1].toLowerCase() : "");
                }

                equal(helper.getFriendlyFromTo(null, null, true, moment()).text, "No from date set - No to date set");
                 equal(helper.getFriendlyFromTo(moment(), null, true, moment()).text, getFriendlyDate(moment(), true) + " - No to date set");
                equal(helper.getFriendlyFromTo(moment(), moment().add(5, "days"), true, moment()).text, getFriendlyDate(moment(), true) + " - " + getFriendlyDate(moment().add(5, "days"), true));
                equal(helper.getFriendlyFromTo(moment(), moment().add(5, "days"), false, moment()).text, getFriendlyDate(moment(), false) + " - " + getFriendlyDate(moment().add(5, "days"), false));
            });

            // Business hours
            // ----
            test('isValidBusinessDate', function() {
                var helper = new cr.DateHelper({
                    businessHours: [
                        {"dayOfWeek":0,"openTime":540,"closeTime":1020}, // Mon 9-17
                        {"dayOfWeek":1,"openTime":540,"closeTime":1020}, // Thu 9-17
                        {"dayOfWeek":2,"openTime":540,"closeTime":1020}, // Wed 9-17
                        {"dayOfWeek":3,"openTime":540,"closeTime":1020}, // Thr 9-17
                        {"dayOfWeek":4,"openTime":660,"closeTime":1140}  // Fri 11-19
                    ]
                });

                //dayOfweek (1 == Mon, 0 == Sun)
                var getDateForDay = function(dayOfWeek, time, timeFormat){
                    return moment(time, timeFormat || "HH:mm").day(dayOfWeek);
                }

                // Monday
                equal(helper.isValidBusinessDate(getDateForDay(1, "17:00")), true); 
                equal(helper.isValidBusinessDate(getDateForDay(1, "17:15")), false); 
                equal(helper.isValidBusinessDate(getDateForDay(1, "5:00 pm", "hh:mm a")), true);
                equal(helper.isValidBusinessDate(getDateForDay(1, "5:15 pm", "hh:mm a")), false);

                // Sunday
                equal(helper.isValidBusinessDate(getDateForDay(0, "17:15")), false);
                equal(helper.isValidBusinessDate(getDateForDay(0, "5:15 am", "hh:mm a")), false);

                // Saturday
                equal(helper.isValidBusinessDate(getDateForDay(6, "17:15")), false); 
                equal(helper.isValidBusinessDate(getDateForDay(6, "5:15 am", "hh:mm a")), false); 

                // Friday
                equal(helper.isValidBusinessDate(getDateForDay(5, "7:15")), false); 
                equal(helper.isValidBusinessDate(getDateForDay(5, "17:15")), true); 
                equal(helper.isValidBusinessDate(getDateForDay(5, "20:15")), false); 
                equal(helper.isValidBusinessDate(getDateForDay(5, "7:15 am", "hh:mm a")), false); 
                equal(helper.isValidBusinessDate(getDateForDay(5, "5:15 pm", "hh:mm a")), true); 
                equal(helper.isValidBusinessDate(getDateForDay(5, "8:15 pm", "hh:mm a")), false); 

            });

        };

        return {run: run}
    }
);