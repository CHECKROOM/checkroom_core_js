/**
 * @copyright CHECKROOM NV 2015
 */
"use strict";
define(['settings', 'helper', 'cheqroom-core'], function(settings, helper, cr) {
        var run = function() {
            var common = cr.common;

            test('checkEmail', function() {
                equal(common.isValidEmail("jeroenjul1000@cheqroom.com"), true);
                equal(common.isValidEmail("jeroen+jul1000@cheqroom.com"), true);
                equal(common.isValidEmail("jeroen.verhoest+jul1000@cheqroom.com"), true);
                equal(common.isValidEmail("jeroen.verhoest+jul1000@cheqroom"), false);
            });

            test("Slimdown", function(assert){
              var sd = new Slimdown();
              equal(sd.render("* One\n* Two\n* Three"), "<ul>\n\t<li>One</li>\n\n\t<li>Two</li>\n\n\t<li>Three</li>\n</ul>");
              equal(sd.render("**bold**"), "<p><strong>bold</strong></p>");
            });

            test("getCategorySummary", function(assert){
                equal(common.getCategoryNameFromKey('cheqroom.types.item.heavy_equipment.drills.vertical_drills'), 'vertical drills', 'getCategoryNameFromKey');
                equal(common.getCategorySummary([]), "No items", "getCategorySummary");
                equal(common.getCategorySummary([{
                      "category": "cheqroom.types.item.heavy_equipment.furniture",
                      "_id": "EbMEpfqZZtThY29PYbwN5L"
                    },
                    {
                      "category": "cheqroom.types.item.heavy_equipment.furniture",
                      "_id": "FwM2ZWctFnFbCPXufZBwn5"
                    }]), "2 furniture", "getCategorySummary");
                equal(common.getCategorySummary([{
                      "category": "cheqroom.types.item.av_equipment",
                      "_id": "7a5tb7evauLH8BKYUaQgQM"
                    },
                    {
                      "category": "cheqroom.types.item.av_equipment.dj_gear",
                      "_id": "Yh7xDLWDMJ6u3XwnWTEY6G"
                    }]), "1 av equipment + 1 other", "getCategorySummary");
                equal(common.getCategorySummary([{
                      "category": "cheqroom.types.item.av_equipment",
                      "_id": "h2ehvhU3sh8yTJEsNBnjKZ"
                    },
                    {
                      "category": "cheqroom.types.item.heavy_equipment.furniture",
                      "_id": "vSZEHKU3zMJDJaHY8AeNYT"
                    },
                    {
                      "category": "cheqroom.types.item.av_equipment",
                      "_id": "rbfs57z8zDN9JZpTB4YCs9"
                    },
                    {
                      "category": "cheqroom.types.item.av_equipment",
                      "_id": "wfyofrJJMRtpBvaZfs4BMK"
                    },
                    {
                      "category": "cheqroom.types.item.heavy_equipment.drills.vertical_drills",
                      "_id": "hMyyb9tcxAxLSqYt3uvSYU"
                    },
                    {
                      "category": "cheqroom.types.item.heavy_equipment.furniture",
                      "_id": "CyzjMd4qGwhLigUW8qoWeZ"
                    },
                    {
                      "category": "cheqroom.types.item.it_equipment",
                      "_id": "F7ZMmhjMHhXc2y7CthZt6L"
                    }
                  ]), "3 av equipment + 4 other", "getCategorySummary");
            });

            test("isValidCode", function(assert){
               ok(common.isCodeValid("01f15ac4"), "valid code");
               ok(common.isCodeValid(" 01f15ac4 "), "valid code with spaces");               
               ok(!common.isCodeValid("test"), "invalid code");
            });

            test("getLoginName", function(assert){
                equal(common.getLoginName("Fabiàn ", "Ramos"), "fabian.ramos");
            })
        };

        return {run: run}
    }
);