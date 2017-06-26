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

            test('testGroupId', function(){
                var s = new Signup({}, settings);
                
                s.company = "Spaces become underscore";
                equal(s.getGroupId(), "spaces_become_underscore");

                s.company = "CAPITALS TO LOWER";
                equal(s.getGroupId(), "capitals_to_lower");

                s.company = "dots.are.replaced";
                equal(s.getGroupId(), "dots_are_replaced");

                s.company = "dashes-are-replaced";
                equal(s.getGroupId(), "dashes_are_replaced");

                s.company = "Non-ascii is stripped#&$%";
                equal(s.getGroupId(), "non_ascii_is_stripped");

                s.company = "latinize çéà";
                equal(s.getGroupId(), "latinize_cea");

                s.company = "Grove Broadcasting Co. Ltd.";
                equal(s.getGroupId(), "grove_broadcasting_co__ltd_");
            })

        };

        return {run: run}
    }
);