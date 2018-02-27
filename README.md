# CHECKROOM CORE JS

A JavaScript wrapper around the CHEQROOM REST API

## Docs
http://checkroom.github.io/checkroom_core_js/

## Install

```
npm install cheqroom-core
```

## Usage

```javascript
var cr = require('cheqroom-core');

//
// Authenticating via username and password
//
var baseUrl = 'https://api.cheqroom.com/api/v2_5';
var userName = "";
var password = "";

var ajax = new cr.api.ApiAjax();
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

// Creating a new User (send invite email and create a corresponding Customer document)
var dsUsers = new cr.api.ApiDataSource({collection: 'users', ajax: ajax, user: authUser, urlApi: baseUrl});
dsUsers.create({name: 'New User', email: 'newuser@gmail.com', role: 'selfservice', invite: true, createCustomer: true})
    .done(function(resp) {
        console.log(resp);
    });

//
// Using models
//
// Getting an Item by its primary key
var item = new cr.Item({ds: dsItems, id: 'ANY-ITEM-ID');

item.get()
    .done(function() {
        console.log(item.name, item.status);
    });

// Getting a Contact by its primary key and updating its company name
var contact = new cr.Contact({ds: dsContacts, id: 'ANY-CONTACT-ID');

contact.get()
    .done(function() {
        contact.company = "New Company Name";
        contact.update()
            .done(function() {
                console.log(contact.name, contact.company);
            });
    });


//
// Query operators
//
Operators other than equality may also be used in queries — just attach the operator name to a key with a double-underscore:

ne – not equal to
lt – less than
lte – less than or equal to
gt – greater than
gte – greater than or equal to
not – negate a standard check, may be used before other operators (e.g. Q(age__not__mod=5))
in – value is in list (a list of values should be provided)
nin – value is not in list (a list of values should be provided)
mod – value % x == y, where x and y are two provided values
all – every item in list of values provided is in array
size – the size of the array is
exists – value for field exists

//
// String search syntax
//
The following operators are available as shortcuts to querying with regular expressions:

exact – string field exactly matches value
iexact – string field exactly matches value (case insensitive)
contains – string field contains value
icontains – string field contains value (case insensitive)
startswith – string field starts with value
istartswith – string field starts with value (case insensitive)
endswith – string field ends with value
iendswith – string field ends with value (case insensitive)
match – performs an $elemMatch so you can match an entire document within an array

```

## Build instructions

Call `grunt` to build and run the tests

Call `grunt docs` to rebuild the documentation

Call `grunt gh-pages` to publish the documentation

- - -

Copyright CHECKROOM NV 2017