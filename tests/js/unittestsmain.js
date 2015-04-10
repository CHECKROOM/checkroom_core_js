"use strict";

requirejs.config({
    baseUrl: "js/tests",
    paths: {
        'text': '../lib/requirejs-text/text',
        'jquery': '../lib/jquery/dist/jquery.min',
        'jquery-jsonp': '../lib/jquery-jsonp/src/jquery.jsonp',
        'jquery-pubsub': '../../lib/jquery-tiny-pubsub/src/tiny-pubsub',
        'moment': '../lib/moment/moment',
        'cheqroom-core': '../../../build/core'
    },
    shim: {
        'jquery-jsonp': ['jquery'],
        'jquery-pubsub': ['jquery']
    }
});


// require the unit tests.
require([
    'simpleTest',
    'dateHelperTest',
    'contactTest',
    'itemTest',
    'locationTest',
    'orderTest',
    'reservationTest',
    'userTest',
    'availabilityTest'
    ], function(
        simpleTest,
        dateHelperTest,
        contactTest,
        itemTest,
        locationTest,
        orderTest,
        reservationTest,
        userTest,
        availabilityTest) {

        /*simpleTest.run();
        dateHelperTest.run();
        contactTest.run();
        locationTest.run();
        */

        //itemTest.run();
        //orderTest.run();
        //reservationTest.run();
        userTest.run();
        //availabilityTest.run();

        // start QUnit.
        QUnit.start();
    }
);