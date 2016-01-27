/**
 * @copyright CHECKROOM NV 2015
 */
"use strict";
define(['settings', 'helper', 'cheqroom-core'], function(settings, helper, cr) {

        var run = function() {

            var crHelper = cr.Helper;
         
            test('ensureId', function(){
                equal(crHelper.ensureId("abc123"), "abc123");
                equal(crHelper.ensureId({_id:"abc123", name:"test"}), "abc123");
            })

            asyncTest("getAccessRights", function(){
                helper.getApiDataSources(["groups", "users"]).then(function(dss){
                    dss["users"].get(dss["users"].user.userId).done(function(user){
                        dss["groups"].get(user.group).then(function(group){
                            var role = user.role,
                            profile = group.profile,
                            limits = group.limits;

                            var userRights = crHelper.getAccessRights(role, profile, limits);

                            ok(true);
                        }).fail(function(){
                            ok(false);
                        }).always(function(){
                            start();
                        });
                    });                     
                });
            });
        };

        return {run: run}
    }
);