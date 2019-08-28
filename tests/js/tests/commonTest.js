/**
 * @copyright CHECKROOM NV 2015
 */
"use strict";
define(['settings', 'helper', 'cheqroom-core'], function(settings, helper, cr) {
        var run = function() {
            var common = cr.common;

            test('isFreeEmail', function() {
                ok(common.isFreeEmail("vincent@gmail.com"));
                ok(common.isFreeEmail("vincent@hotmail.com"));
                ok(common.isFreeEmail("vincent@yahoo.com"));
                ok(!common.isFreeEmail("vincent@cheqroom.com"));
                ok(!common.isFreeEmail("vincent+nospam@cheqroom.com"));
            });

            test('joinOther', function() {
                equal(["single"].joinOther(), "single");
                equal([].joinOther(), "");

                var list = ["Vincent", "Jeroen", "Paul"];
                equal(list.joinOther(), "Vincent +2 other");
                equal(list.joinOther(15), "Vincent, Jeroen +1 other");
                equal(list.joinOther(21), "Vincent, Jeroen, Paul");
                equal(list.joinOther(22), "Vincent, Jeroen, Paul");
            });

            test('checkEmail', function() {
                equal(common.isValidEmail("jeroenjul1000@cheqroom.com"), true);
                equal(common.isValidEmail("jeroen+jul1000@cheqroom.com"), true);
                equal(common.isValidEmail("jeroen.verhoest+jul1000@cheqroom.com"), true);
                equal(common.isValidEmail("jeroen.verhoest+jul1000@cheqroom"), false);
            });

            test('checkBarcode', function() {
                equal(common.isValidBarcode(""), false);
                equal(common.isValidBarcode("     "), false);
                equal(common.isValidBarcode("12345$"), false); // VT: Technically, a $ is a valid symbol in a code39 barcode
                equal(common.isValidBarcode("NOT8NOT8"), false); // Not 8 long, although it is actually a valid barcode, it would clash with our qrcode
                equal(common.isValidBarcode("12345678901234567890123"), false);  // 23 chars too long (max 22 chars)

                equal(common.isValidBarcode("1234-ABCD"), true);
                equal(common.isValidBarcode("ABC123"), true);
                equal(common.isValidBarcode("EN0017"), true);
                equal(common.isValidBarcode("0001234000057"), true);
            });

            test("Slimdown", function(assert){
              var sd = new Slimdown();
              equal(sd.render("* One\n* Two\n* Three"), "<ul>\n\t<li>One</li>\n\n\t<li>Two</li>\n\n\t<li>Three</li>\n</ul>");
              equal(sd.render("**bold**"), "<p><strong>bold</strong></p>");
              equal(sd.render("1.8ghz\n1.5gb"), "<p>1.8ghz<br />1.5gb</p>");
              equal(sd.render("1.8ghz\n1.5gb\n\ntest\ntest"), "<p>1.8ghz<br />1.5gb</p>\n<p>test<br />test</p>");
              equal(sd.render("4GB RAM\n250 GB SSD\n1.8ghz i5\n1.5gb Video card"), "<p>4GB RAM<br />250 GB SSD<br />1.8ghz i5<br />1.5gb Video card</p>");
              equal(sd.render("Included with PS 4 Pro #7\nhttps://app.cheqroom.com/#items/iaQf4tJdU2EztGxzcEqdmc\n# test\n# h1\n## h2"), "<p>Included with PS 4 Pro #7<br /><a href='https://app.cheqroom.com/#items/iaQf4tJdU2EztGxzcEqdmc'>https://app.cheqroom.com/#items/iaQf4tJdU2EztGxzcEqdmc</a><br /><h1>test</h1><br /><h1>h1</h1><br /><h2>h2</h2></p>")
              equal(sd.render("[my custom link](http://www.google.com)"), "<p><a href='http://www.google.com'>my custom link</a></p>");
              equal(sd.render("* ABC 123\n* ABC 456\n* ABC 789"), "<ul>\n\t<li>ABC 123</li>\n\n\t<li>ABC 456</li>\n\n\t<li>ABC 789</li>\n</ul>");
              equal(sd.render("abc\n* ABC 123\n* ABC 456\n* ABC 789"), "<p>abc</p><ul>\n\t<li>ABC 123</li>\n\n\t<li>ABC 456</li>\n\n\t<li>ABC 789</li>\n</ul>");
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
                    }]), "1 av equipment +1 other", "getCategorySummary");
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
                  ]), "3 av equipment +4 other", "getCategorySummary");
            });

            test("getItemSummary", function(assert){
                // Empty
                equal(common.getItemSummary([]), "No items", "getItemSummary");
                
                // One kit, but no name
                equal(common.getItemSummary([{
                      "category": "cheqroom.types.item.heavy_equipment.furniture",
                      "_id": "EbMEpfqZZtThY29PYbwN5L",
                      "kit": {
                          "_id": "KIT-001"
                      }
                    },
                    {
                      "category": "cheqroom.types.item.heavy_equipment.furniture",
                      "_id": "FwM2ZWctFnFbCPXufZBwn5",
                      "kit": {
                          "_id": "KIT-001"
                      }
                    }]), "2 furniture", "getItemSummary");

                // One kit, no unkitted
                equal(common.getItemSummary([{
                      "category": "cheqroom.types.item.heavy_equipment.furniture",
                      "_id": "EbMEpfqZZtThY29PYbwN5L",
                      "kit": {
                          "name": "KIT-001"
                      }
                    },
                    {
                      "category": "cheqroom.types.item.heavy_equipment.furniture",
                      "_id": "FwM2ZWctFnFbCPXufZBwn5",
                      "kit": {
                          "name": "KIT-001"
                      }
                    }]), "KIT-001", "getItemSummary");

                // Two kits, no unkitted
                equal(common.getItemSummary([{
                      "category": "cheqroom.types.item.heavy_equipment.furniture",
                      "_id": "EbMEpfqZZtThY29PYbwN5L",
                      "kit": {
                          "name": "KIT-001"
                      }
                    },{
                      "category": "cheqroom.types.item.heavy_equipment.furniture",
                      "_id": "FwM2ZWctFnFbCPXufZBwn5",
                      "kit": {
                          "name": "KIT-002"
                      }
                    }]), "KIT-001, KIT-002", "getItemSummary");

                // Two kits, no unkitted
                // Cannot comma separate the list because the first is too long
                equal(common.getItemSummary([{
                      "category": "cheqroom.types.item.heavy_equipment.furniture",
                      "_id": "EbMEpfqZZtThY29PYbwN5L",
                      "kit": {
                          "name": "VERY-LONG-KIT-NAME-CHAR30-001"
                      }
                    },{
                      "category": "cheqroom.types.item.heavy_equipment.furniture",
                      "_id": "EbMEpfqZZtThY29PYbwN5L",
                      "kit": {
                          "name": "VERY-LONG-KIT-NAME-CHAR30-001"
                      }
                    },{
                      "category": "cheqroom.types.item.heavy_equipment.furniture",
                      "_id": "FwM2ZWctFnFbCPXufZBwn5",
                      "kit": {
                          "name": "KIT-002"
                      }
                    }]), "VERY-LONG-KIT-NAME-CHAR30-001 +1 other kits", "getItemSummary");

                // One kit, one item
                equal(common.getItemSummary([{
                      "category": "cheqroom.types.item.heavy_equipment.furniture",
                      "_id": "EbMEpfqZZtThY29PYbwN5L",
                      "kit": {
                          "name": "KIT-001"
                      }
                    },{
                      "category": "cheqroom.types.item.heavy_equipment.furniture",
                      "_id": "FwM2ZWctFnFbCPXufZBwn5",
                      "kit": {
                          "_id": "KIT-002"
                      }
                    }]), "KIT-001, 1 furniture", "getItemSummary");

                // One kit, one item, one other
                equal(common.getItemSummary([{
                      "category": "cheqroom.types.item.heavy_equipment.furniture",
                      "_id": "EbMEpfqZZtThY29PYbwN5L",
                      "kit": {
                          "name": "KIT-001"
                      }
                    },{
                      "category": "cheqroom.types.item.heavy_equipment.furniture",
                      "_id": "FwM2ZWctFnFbCPXufZBwn5",
                      "kit": {
                          "_id": "KIT-002"
                      }
                    },{
                      "category": "cheqroom.types.item.heavy_equipment.dj_gear",
                      "_id": "FwM2ZWctFnFbCPXufZBwn5",
                      "kit": {
                          "_id": "KIT-002"
                      }
                    }]), "KIT-001, 1 furniture +1 other", "getItemSummary");
            });

            test("isValidCode", function(assert){
               ok(common.isCodeValid("01f15ac4"), "valid code");
               ok(common.isCodeValid(" 01f15ac4 "), "valid code with spaces");               
               ok(!common.isCodeValid("test"), "invalid code");
            });

            test("isCodeFromScanner", function(){
              ok(common.isCodeFromScanner("http://cheqroom.com/qr/bd1b7301"), "valid code");
              ok(!common.isCodeFromScanner(""), "invalid code");
            })

            test("getLoginName", function(assert){
                equal(common.getLoginName("Fabiàn ", "Ramos"), "fabian.ramos");
            })

            test("getParsedLines", function(assert){
              equal(JSON.stringify(common.getParsedLines("1,2,3,1,1")), "[\"1\",\"2\",\"3\"]");
            })

            test("number padding", function(){
              equal("5".addLeadingZero(3), "005");
              equal("100".addLeadingZero(3), "100");
            });
        };

        return {run: run}
    }
);