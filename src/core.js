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
    'Category',
    'Comment',
    'Conflict',
    'Contact',
    'DateHelper',
    'Document',
    'Group',
    'Item',
    'Kit',
    'Location',
    'Order',
    'helper',
    'PermissionHandler',
    'Reservation',
    'Template',
    'Transaction',
    'User',
    'WebHook',
    'common',
    'OrderTransfer'], function(api, Availability, Attachment, Base, Category, Comment, Conflict, Contact, DateHelper, Document, Group, Item, Kit, Location, Order, Helper, PermissionHandler, Reservation, Template, Transaction, User, WebHook, common, OrderTransfer) {

    var core = {};

    // namespaces
    core.api = api;
    core.common = common;

    // Constructors
    core.Availability = Availability;
    core.Attachment = Attachment;
    core.Base = Base;
    core.Category = Category;
    core.Comment = Comment;
    core.Conflict = Conflict;
    core.Contact = Contact;
    core.DateHelper = DateHelper;
    core.Document = Document;
    core.Group = Group;
    core.Item = Item;
    core.Kit = Kit;
    core.Location = Location;
    core.Order = Order;
    core.PermissionHandler = PermissionHandler;
    core.Reservation = Reservation;
    core.Template = Template;
    core.Transaction = Transaction;
    core.User = User;
    core.WebHook = WebHook;
    core.OrderTransfer = OrderTransfer;
    core.Helper = Helper;

    return core;
});