/**
 * @copyright CHECKROOM NV 2015
 */
"use strict";
define(['settings', 'helper', 'cheqroom-signup'], function(settings, helper, Signup) {
        var run = function() {

            test('testEmail', function() {
                var s = new Signup({email:"notvalid"});
                ok(!s.emailIsValid());

                var s = new Signup({email:"valid@valid.com"});
                ok(s.emailIsValid());
            });

        };

        return {run: run}
    }
);