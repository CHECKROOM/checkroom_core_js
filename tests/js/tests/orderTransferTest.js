/**
 * @copyright CHECKROOM NV 2015
 */
"use strict";
define(['settings', 'helper', 'cheqroom-core'], function(settings, helper, cr) {

        var run = function() {

            var collection = "ordertransfers";


            function _create(orderTransfer){
                return orderTransfer.create();
            }
            function _addItems(orderTransfer){
                return _create(orderTransfer).then(function(){
                    return orderTransfer.addItems([
                        "5ov4FdvftWCKLJvc3rXC9g", 
                        "iZVLPgPj9VZ7QfZfnWdYrM", 
                        "QBqUsc2tF2Kby4gNUqjhKV"
                    ]);
                });
            }
            function _start(orderTransfer){
                return _addItems(orderTransfer).then(function(){
                    return orderTransfer.start();
                });
            }
            function _undoStart(orderTransfer){
                return _start(orderTransfer).then(function(){
                    return orderTransfer.undoStart();
                });
            }

            function _accept(orderTransfer, contactId){
                return _start(orderTransfer).then(function(){
                    return orderTransfer.accept(contactId);
                })
            }


            helper.getApiDataSources([collection])
                .done(function(dss) {
                    var ds = dss[collection];

                    asyncTest("addItems OrderTransfer", function() {
                        var orderTransfer = new cr.OrderTransfer({
                            ds: ds
                        });
                        
                        _addItems(orderTransfer).then(function(resp){
                            ok(resp != undefined);
                            ok(orderTransfer.items.length == 3);      
                        }).always(function(){
                            start();
                        });
                        
                    });

                    asyncTest("start OrderTransfer", function() {
                        var orderTransfer = new cr.OrderTransfer({
                            ds: ds
                        });

                        _start(orderTransfer).then(function(resp){
                            ok(orderTransfer.status == "open");      
                        }).always(function(){
                            start();
                        });
                    });


                    asyncTest("undoStart OrderTransfer", function() {
                        var orderTransfer = new cr.OrderTransfer({
                            ds: ds
                        });

                        _undoStart(orderTransfer).then(function(resp){
                           ok(orderTransfer.status == "creating");        
                        }).always(function(){
                            start();
                        });
                    });

                    asyncTest("accept OrderTransfer", function() {
                        var orderTransfer = new cr.OrderTransfer({
                            ds: ds
                        });

                        _accept(orderTransfer, "RKZdoqLUQTSZToqiJ4ZqdJ").then(function(resp){
                           ok(orderTransfer.status == "closed");        
                        }).always(function(){
                            start();
                        });
                    });
                });
        };

        return {run: run}
    }
);