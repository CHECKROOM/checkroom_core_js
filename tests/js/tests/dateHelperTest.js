/**
 * @copyright CHECKROOM NV 2015
 */
"use strict";
define(['settings', 'cheqroom-core'], function(settings, cr) {

        var run = function() {

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

            test('fixDates', function() {
                var helper = new cr.DateHelper();
                var jsn = "2015-02-28T16:00:00.000Z";

                var t1 = helper.fixDates(t);
                equal(t1.toJSONDate(), jsn);

                var t2 = helper.fixDates([t]);
                equal(t2[0].toJSONDate(), jsn);

                var t3 = helper.fixDates({key:t});
                equal(t3["key"].toJSONDate(), jsn);

                var t4 = helper.fixDates({key:[t]});
                equal(t4["key"][0].toJSONDate(), jsn);

                var resp = '{"count":1,"docs":[{"status":"open","customer":{"company":"CHECKROOM","_id":"pNBYAHMGGA8NpfKrPQcfFU","name":"Vincent  Theeten"},"reserved":"2015-02-23T10:52:54.866000+00:00","toDate":"2015-02-28T16:00:00+00:00","items":[{"category":"cheqroom.types.item.heavy_equipment.forklifts","_id":"82cxdZkXPteuifTqQ9MtuV","name":"Bobcat V723"},{"category":"cheqroom.types.item.heavy_equipment.hammering","_id":"xsLgpQwSkT5Pyp5Ri6HoPT","name":"Bosch 35lb Breaker Hammer"}],"created":"2015-02-23T10:34:34.407000+00:00","modified":"2015-02-23T10:52:55.165000+00:00","keyValues":[],"fromDate":"2015-02-23T12:00:00+00:00","location":{"_id":"HsSmZ5p4uHqaccDtm3qnsD","name":"10th Street"},"_id":"7PSVYHXx5FMBTs4MfJkuCX"}]}';
                var data = JSON.parse(resp);
                var t5 = helper.fixDates(data);
                equal(t5["docs"][0]["toDate"].toJSONDate(), jsn);
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

            // roundTimeDown
            // ----
            test('roundTimeDown', function() {
                var m1 = new cr.DateHelper().roundTimeDown(d1);
                equal(m1.format('LLL'), d1Down);
            });
            test('roundTimeDownTwice', function() {
                var m1 = new cr.DateHelper().roundTimeDown(d1);
                m1 = new cr.DateHelper().roundTimeDown(m1);
                equal(m1.format('LLL'), d1Down);
            });

            // roundTimeUp
            // ----
            test('roundTimeUp', function() {
                var helper = new cr.DateHelper();
                var t = "2015-02-28T16:00:00+00:00";
                var jsn = "2015-02-28T16:00:00.000Z";
                var t1 = helper.fixDates(t);
                var t2 = t1.roundTo('minute', 15);
                var t3 = t2.roundTo('minute', 15);
                equal(t3.toJSONDate(), jsn);
                equal(t2.toJSONDate(), jsn);
                equal(t1.toJSONDate(), t2.toJSONDate());
            });

            // getFriendlyFromTo
            // ----
            /*test('getFriendlyFromTo', function() {
                var helper = new cr.DateHelper();
                var nowstr = "2015-06-24T16:15:00+00:00";
                var now = helper.fixDates(nowstr);
                var res = "";

                $.each([1,2,3,4,7,8,14,21,31,100], function(i, val) {
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
                });

            });*/

        };

        return {run: run}
    }
);