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
    'common',
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
    'User'], function(api, Availability, Attachment, Base, Comment, common, Conflict, Contact, DateHelper, Document, Item, KeyValue, Location, Order, Helper, Reservation, Transaction, User) {

    var core = {};

    // namespaces
    core.api = api;

    // Constructors
    core.Availability = Availability;
    core.Attachment = Attachment;
    core.Base = Base;
    core.Comment = Comment;
    core.Conflict = Conflict;
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
    core.User = User;

    return core;
});