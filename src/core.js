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
    'Kit',
    'Location',
    'Order',
    'helper',
    'Reservation',
    'Transaction',
    'User',
    'common',
    'OrderTransfer'], function(api, Availability, Attachment, Base, Comment, Conflict, Contact, DateHelper, Document, Item, KeyValue, Kit, Location, Order, helper, Reservation, Transaction, User, common, OrderTransfer) {

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
    core.Kit = Kit;
    core.Location = Location;
    core.Order = Order;
    core.Reservation = Reservation;
    core.Transaction = Transaction;
    core.User = User;
    core.OrderTransfer = OrderTransfer;

    return core;
});