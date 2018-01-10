/*! Tiny Pub/Sub - v0.7.0
* https://github.com/cowboy/jquery-tiny-pubsub
*/
define(['jquery'], function($){
    var o = $({});
    $.subscribe = function() {
      o.on.apply(o, arguments);
    };

    $.unsubscribe = function() {
      o.off.apply(o, arguments);
    };

    $.publish = function() {
      o.trigger.apply(o, arguments);
    };
})