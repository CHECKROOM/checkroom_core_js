/**
 * @copyright CHECKROOM NV 2015
 */
"use strict";
define(['settings', 'helper', 'cheqroom-core'], function(settings, helper, cr) {
        var run = function() {
            var common = cr.common;

            test('isValidPhone', function() {
                ok(common.isValidPhone("+14155552671"));
                ok(common.isValidPhone("14155552671"));
                ok(common.isValidPhone("+442071838750"));
                ok(common.isValidPhone("+551155256325"));
                ok(common.isValidPhone("470883893")); //no country code
            });
        };

        return {run: run}
    }
);