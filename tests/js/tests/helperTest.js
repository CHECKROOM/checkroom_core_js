/**
 * @copyright CHECKROOM NV 2015
 */
"use strict";
define(['settings', 'cheqroom-core'], function(settings, cr) {

        var run = function() {

            test('checkEmail', function() {
                var helper = new cr.Helper();
                equal(helper.isValidEmail("jeroenjul1000@cheqroom.com"), true);
                equal(helper.isValidEmail("jeroen+jul1000@cheqroom.com"), true);
                equal(helper.isValidEmail("jeroen.verhoest+jul1000@cheqroom.com"), true);
                equal(helper.isValidEmail("jeroen.verhoest+jul1000@cheqroom"), false);
            });

        };

        return {run: run}
    }
);