"use strict";

requirejs.config({
    baseUrl: "js/tests",
    paths: {
        'text': '../lib/requirejs-text/text',
        'jquery': '../lib/jquery/dist/jquery.min',
        'jquery-jsonp': '../lib/jquery-jsonp/src/jquery.jsonp',
        'jquery-pubsub': '../lib/jquery-tiny-pubsub/src/tiny-pubsub',
        'moment': '../lib/moment/moment',
        'jstz': '../lib/jstz/jstz.min',
        'cheqroom-core': '../../../build/core',
        'cheqroom-signup': '../../../build/signup'
    },
    shim: {
        'jquery-jsonp': ['jquery'],
        'jquery-pubsub': ['jquery'],
        'jstz': {exports: 'jstz'}
    }
});


// require the unit tests.
require([
    'orderTransferTest',
    'commonTest',
    'helperTest',
    'simpleTest',
    'dateHelperTest',
    'contactTest',
    'itemTest',
    'keyvalueTest',
    'kitTest',
    'locationTest',
    'orderTest',
    'reservationTest',
    'userTest',
    'availabilityTest',
    'webHookTest',
    'signupTest'
    ], function(
        orderTransferTest,
        commonTest,
        helperTest,
        simpleTest,
        dateHelperTest,
        contactTest,
        itemTest,
        keyValueTest,
        kitTest,
        locationTest,
        orderTest,
        reservationTest,
        userTest,
        availabilityTest,
        webHookTest,
        signupTest) {

        //commonTest.run();

        //orderTransferTest.run();
        //helperTest.run();
        //simpleTest.run();
        dateHelperTest.run();
        //contactTest.run();
        //locationTest.run();
        //kitTest.run();
        //itemTest.run();
        //keyValueTest.run();
        //orderTest.run();
        //reservationTest.run();
        //userTest.run();
        //availabilityTest.run();
        //webHookTest.run();
        //signupTest.run();


        // start QUnit.
        QUnit.start();
    }
);