/**
 * The Main module
 * bundles all core js code together
 * @copyright CHECKROOM NV 2015
 */
define([
    'api',
    'Availability',
    'Attachment',
    'Base',
    'Comment',
    'Conflict',
    'Contact',
    'DateHelper',
    'Document',
    'Item',
    'KeyValue',
    'Location',
    'Order',
    'helper',
    'Reservation',
    'Transaction',
    'User',
    'common'], function(api, Availability, Attachment, Base, Comment, Conflict, Contact, DateHelper, Document, Item, KeyValue, Location, Order, helper, Reservation, Transaction, User, common) {

    var core = {};

    // namespaces
    core.api = api;
    core.common = common;
    core.helper = helper;

    // Constructors
    core.Availability = Availability;
    core.Attachment = Attachment;
    core.Base = Base;
    core.Comment = Comment;
    core.Conflict = Conflict;
    core.Contact = Contact;
    core.DateHelper = DateHelper;
    core.Document = Document;   
    core.Item = Item;
    core.KeyValue = KeyValue;
    core.Location = Location;
    core.Order = Order;
    core.Reservation = Reservation;
    core.Transaction = Transaction;
    core.User = User;

    return core;
});