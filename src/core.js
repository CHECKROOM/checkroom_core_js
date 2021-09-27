/**
 * The Main module
 * bundles all core js code together
 * @copyright CHECKROOM NV 2015
 */
define([
    'api',
    'availability',
    'attachment',
    'base',
    'category',
    'comment',
    'conflict',
    'contact',
    'dateHelper',
    'document',
    'group',
    'item',
    'kit',
    'location',
    'order',
    'helper',
    'permissionHandler',
    'reservation',
    'template',
    'transaction',
    'user',
    'usersync',
    'webhook',
    'common',
    'orderTransfer',
    'colorLabel',
    'field',
    'spotcheck'], function(api, Availability, Attachment, Base, Category, Comment, Conflict, Contact, DateHelper, Document, Group, Item, Kit, Location, Order, Helper, PermissionHandler, Reservation, Template, Transaction, User, UserSync, WebHook, common, OrderTransfer, ColorLabel, Field, Spotcheck) {

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
    core.UserSync = UserSync;
    core.WebHook = WebHook;
    core.OrderTransfer = OrderTransfer;
    core.Helper = Helper;
    core.ColorLabel = ColorLabel;
    core.Field = Field;
    core.Spotcheck = Spotcheck;

    return core;
});