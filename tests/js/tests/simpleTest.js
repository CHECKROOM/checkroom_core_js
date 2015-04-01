/**
 * @copyright CHECKROOM NV 2015
 */
"use strict";
define(['settings', 'helper', 'cheqroom-core'], function(settings, helper, cr) {
        var run = function() {
            asyncTest("ping cheqroom api", function(){
                 helper.getApiAnonymous().call('ping', {})
                    .done(function(resp) {
                        ok(true);
                    }).fail(function(err) {
                        ok(false);
                    }).always(function(){
                        start();
                    });
            });
            asyncTest("valid login", function(){
                helper.getApiUser()
                    .done(function(){
                        ok(true);
                    })
                    .fail(function(){
                        ok(false);
                    }).always(function(){
                        start();
                    });
            });
            asyncTest("invalid login", function(){
                helper.getApiUser("dummy", "dummy")
                    .done(function(){
                        ok(false);
                    })
                    .fail(function(){
                        ok(true);
                    }).always(function(){
                        start();
                    });
            });
        };

        return {run: run}
    }
);