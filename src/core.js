import api from './core/api';
import Availability from './core/availability';
import Attachment from './core/attachment';
import Base from './core/base';
import Category from './core/category';
import Comment from './core/comment';
import Conflict from './core/conflict';
import Contact from './core/contact';
import DateHelper from './core/dateHelper';
import Document from './core/document';
import Group from './core/group';
import Item from './core/item';
import Kit from './core/kit';
import Location from './core/location';
import Order from './core/order';
import Helper from './core/helper';
import PermissionHandler from './core/permissionHandler';
import Reservation from './core/reservation';
import Template from './core/template';
import Transaction from './core/transaction';
import User from './core/user';
import UserSync from './core/usersync';
import Webhook from './core/webhook';
import common from './core/common';
import ColorLabel from './core/colorLabel';
import Field from './core/field';
import Spotcheck from './core/spotcheck';

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
core.WebHook = Webhook;
core.Helper = Helper;
core.ColorLabel = ColorLabel;
core.Field = Field;
core.Spotcheck = Spotcheck;

export default core;
