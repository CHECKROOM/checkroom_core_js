/**
 * @copyright CHECKROOM NV 2015
 */
"use strict";
define(['settings', 'helper', 'cheqroom-core'], function(settings, helper, cr) {

        var run = function() {

            var collection = "customers";
            var getContact = function(ds) {
                return new cr.Contact({
                    ds: ds,
                    name: 'Nose',
                    company: 'Nose',
                    phone: '+32 475 1111 2222',
                    email: 'nose@nose.com'
                });
            };

            // Get a user with token
            helper.getApiDataSource(collection)
                .done(function(ds) {

                    /**
                     * Testing API /list calls
                     */

                        // Test getting a list of customers
                    asyncTest("list contacts", function() {
                        ds.list()
                            .done(function(contacts) {
                                ok(contacts!=null);
                                ok(contacts.length>0);
                            })
                            .always(function(){
                                start();
                            });
                    });


                    /**
                     * Testing Contact view model
                     */

                    asyncTest("create, canDelete, delete Contact object", function() {
                        var contact = getContact(ds);
                        ok(!contact.isEmpty());
                        ok(!contact.existsInDb());

                        // Create a simple Contact
                        contact.create()
                            .done(function() {
                                ok(!contact.isEmpty());
                                ok(contact.existsInDb());

                                // We should be able to delete it right away
                                contact.canDelete()
                                    .done(function(canDelete) {
                                        ok(canDelete);
                                        ok(!contact.isEmpty());

                                        // Delete the contact again
                                        contact.delete()
                                            .done(function() {
                                                ok(contact.isEmpty());
                                            }).always(function(){
                                                start();
                                            });
                                    });
                            });
                    });

                    asyncTest("create, update, delete Contact object", function() {
                        var contact = getContact(ds);
                        ok(!contact.isEmpty());
                        ok(!contact.existsInDb());

                        // Create a simple Contact
                        contact.create()
                            .done(function() {
                                ok(!contact.isEmpty());
                                ok(contact.existsInDb());

                                contact.name = "Nosey";
                                contact.update()
                                    .done(function() {
                                        ok(contact.name=="Nosey");
                                        ok(!contact.isEmpty());

                                        // Delete the contact again
                                        contact.delete()
                                            .done(function() {
                                                ok(contact.isEmpty());
                                            }).always(function(){
                                                start();
                                            });
                                    });
                            });
                    });

                    asyncTest("load, reset, isEmpty on Contact object", function() {
                        var contact = new cr.Contact({
                            ds: ds
                        });

                        // Starting empty
                        ok(contact.isEmpty());
                        ok(!contact.existsInDb());

                        // After reset() should also be empty
                        contact.reset()
                            .done(function() {
                                ok(contact.isEmpty());
                                ok(!contact.existsInDb());

                                // Get any contact
                                helper.apiGet(null, collection)
                                    .done(function(data) {
                                        contact._fromJson(data);

                                        // Should no longer be empty and exist in db
                                        var id = contact.id;
                                        var name = contact.name;

                                        ok(!contact.isEmpty());
                                        ok(contact.existsInDb());

                                        // Change the name
                                        contact.name = '';
                                        ok(!contact.isEmpty());
                                        ok(contact.existsInDb());

                                        // Reload the document from db, data should be the old data
                                        contact.reload()
                                            .then(function() {
                                                ok(!contact.isEmpty());
                                                ok(contact.existsInDb());
                                                ok(contact.id==id);
                                                ok(contact.name==name);
                                            })
                                            .always(function(){
                                                start();
                                            });
                                    });
                            });

                    });

                    asyncTest("contact isDirty", function() {
                        var contact = new cr.Contact({
                            ds: ds
                        });

                        helper.apiGet(null, collection)
                            .done(function(data) {
                                contact._fromJson(data)
                                    .then(function() {
                                        ok(contact.isDirty()==false);

                                        contact.name = "xx";
                                        ok(contact.isDirty()==true);
                                        contact.discardChanges();
                                        ok(contact.isDirty()==false);

                                        contact.company = "xx";
                                        ok(contact.isDirty()==true);
                                        contact.discardChanges();
                                        ok(contact.isDirty()==false);

                                        contact.phone = "xx";
                                        ok(contact.isDirty()==true);
                                        contact.discardChanges();
                                        ok(contact.isDirty()==false);

                                        contact.email = "xx";
                                        ok(contact.isDirty()==true);
                                        contact.discardChanges();
                                        ok(contact.isDirty()==false);
                                    }).always(function(){
                                        start();
                                    });
                            });
                    });

                    asyncTest("contact isValidEmail", function() {
                        var contact = new cr.Contact({
                            ds: ds
                        });

                        contact.email = "test@test.com";
                        ok(contact.isValidEmail());

                        contact.email = "test";
                        ok(!contact.isValidEmail());

                        contact.email = "example@made.for.digital";
                        ok(contact.isValidEmail());

                        start();
                    });


                });

        };

        return {run: run}
    }
);