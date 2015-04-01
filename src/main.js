/**
 * The Main module
 * bundles all core js code together
 * @copyright CHECKROOM NV 2015
 */
define([
    'api',
    'Attachment',
    'Base',
    'Comment',
    'common',
    'Contact',
    'DateHelper',
    'Document',
    'Item',
    'KeyValue',
    'Location',
    'Order',
    'helper',
    'Reservation',
    'Transaction'], function(api, Attachment, Base, Comment, common, Contact, DateHelper, Document, Item, KeyValue, Location, Order, Helper, Reservation, Transaction) {

    var core = {};

    // namespaces
    core.api = api;

    // Constructors
    core.Attachment = Attachment;
    core.Base = Base;
    core.Comment = Comment;
    core.Contact = Contact;
    core.DateHelper = DateHelper;
    core.Document = Document;
    core.Helper = Helper;
    core.Item = Item;
    core.KeyValue = KeyValue;
    core.Location = Location;
    core.Order = Order;
    core.Reservation = Reservation;
    core.Transaction = Transaction;

    return core;
});