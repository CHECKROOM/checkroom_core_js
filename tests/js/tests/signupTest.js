/**
 * @copyright CHECKROOM NV 2015
 */
"use strict";
define(['settings', 'helper', 'cheqroom-signup'], function(settings, helper, Signup) {
        var run = function() {

            test('testEmail', function() {
                var s = new Signup({email:"notvalid"}, settings);
                ok(!s.emailIsValid());

                var s = new Signup({email:"valid@valid.com"}, settings);
                ok(s.emailIsValid());
                ok(s.emailIsValid(true));

                var s = new Signup({email:"valid@gmail.com"}, settings);
                ok(s.emailIsValid(true) == false);

                var s = new Signup({email:"valid@hotmail.com"}, settings);
                ok(s.emailIsValid(true) == false);
            });

            test('testCompany', function() {
                var s = new Signup({}, settings);

                s.company = "X";
                equal(s.companyIsValid(), false);

                s.company = "XX";
                equal(s.companyIsValid(), false);

                s.company = "XXX";
                equal(s.companyIsValid(), true);

                s.company = "XX  ";
                equal(s.companyIsValid(), false);
            });

            test('testFullName', function() {
                var s = new Signup({}, settings);

                s.setFullName("John ");
                equal(s.firstName, "John");
                equal(s.lastName, "");

                s.setFullName("John Doe");
                equal(s.firstName, "John");
                equal(s.lastName, "Doe");

                s.setFullName("John Doe Sr.");
                equal(s.firstName, "John");
                equal(s.lastName, "Doe Sr.");

                s.setFullName("  ");
                equal(s.firstName, "");
                equal(s.lastName, "");
            });

        };

        return {run: run}
    }
);