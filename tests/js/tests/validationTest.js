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
                ok(common.isValidPhone("054-5237745"));
                ok(common.isValidPhone("054-5237745‬4")) //contains non ascii value 
            });

            test('isValidEmail', function(){
                  ok(common.isValidEmail("test@test.com"));
                  ok(!common.isValidEmail("test"));
                  ok(common.isValidEmail("example@made.for.digital"));
                  ok(common.isValidEmail("Clayton.O'Brien@ampcontrolgroup.com"));
                  ok(!common.isValidEmail("josé.mourinho@noclub.com"))
            })
        };

        return {run: run}
    }
);