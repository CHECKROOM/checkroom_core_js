# CHECKROOM CORE JS

A JavaScript wrapper around the CHEQROOM REST API

## Repo

https://github.com/CHECKROOM/checkroom_core_js

## Installation

Install `sudo npm install` required npm packages

## Build instructions

Call `grunt` to build and run the tests

Call `grunt docs` to rebuild the documentation

## Sample code

```javascript

//
// Authenticating via username and password
//
var baseUrl = 'https://app.cheqroom.com/api/v2_0';
var userName = "";
var password = "";

var ajax = new cr.api.ApiAjax({useJsonp: true});
var auth = new cr.api.ApiAuthV2({ajax: ajax, urlAuth: baseUrl + '/authenticate'});
var authUser = null;

auth.authenticate(userName, password)
    .done(function(data) {
        authUser = new cr.api.ApiUser({userId: data.userId, userToken: data.token});
    });

...

//
// Using datasources
//

// Listing open orders
var dsOrders = new cr.api.ApiDataSource({collection: 'orders', ajax: ajax, user: authUser, urlApi: baseUrl});
dsOrders.list("open_orders")
    .done(function(data) {
        console.log(data);
    });

// Finding a contact by name
var dsContacts = new cr.api.ApiDataSource({collection: 'customers' /* !! */, ajax: ajax, user: authUser, urlApi: baseUrl});
dsContacts.search({query: "john"})
    .done(function(data) {
        console.log(data);
    });

// Finding an item by id
var dsItems = new cr.api.ApiDataSource({collection: 'items', ajax: ajax, user: authUser, urlApi: baseUrl});
dsItems.get("ANY-ITEM-ID")
    .done(function(data) {
        console.log(data);
    });

// Finding an availability of an item
var dsItems = new cr.api.ApiDataSource({collection: 'items', ajax: ajax, user: authUser, urlApi: baseUrl});
dsItems.call("ANY-ITEM-ID", "getAvailability", {fromDate: moment().add(2, 'days'), toDate: moment().add(3, 'days')})
    .done(function(data) {
        console.log(data);
    });

var dsAvailabilities = new cr.api.ApiDataSource({collection: 'availabilities', ajax: ajax, user: authUser, urlApi: baseUrl});
dsAvailabilities.search({item: 'ITEM-ID'})
    .done(function(resp) {
        console.log(resp);
    });

//
// Using models
//
var item = new cr.api.Item({ds: dsItems, id: 'ANY-ITEM-ID');
item.get()
    .done(function() {
        console.log(item.name, item.status);
    });

var contact = new cr.api.Contact({ds: dsContacts, id: 'ANY-CONTACT-ID');
contact.get()
    .done(function() {
        contact.company = "New Company Name";
        contact.update()
            .done(function() {
                console.log(contact.name, contact.company);
            });
    });

```

- - -

Copyright CHECKROOM NV 2015