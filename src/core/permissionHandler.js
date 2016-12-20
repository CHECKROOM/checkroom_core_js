define([], function () {

    /**
     * PermissionHandler
     * @name PermissionHandler
     * @class PermissionHandler
     * @param user - a user dict
     * @param profile - a group profile dict
     * @param limits - a group limits dict
     * @constructor
     */
    var PermissionHandler = function (user, profile, limits) {
        this.user = user;
        this.profile = profile;
        this.limits = limits;

        // Helper booleans that mix a bunch of role stuff and profile / limits stuff
        this._isOwner =               (user.isOwner);
        this._isRootOrAdmin =         (user.role == "root") || (user.role == "admin");
        this._isRootOrAdminOrUser =   (user.role == "root") || (user.role == "admin") || (user.role == "user");
        this._isSelfService =         (user.role == "selfservice");
        this._useWebHooks =           (limits.allowWebHooks);
        this._useOrders =             (limits.allowOrders) &&           (profile.useOrders);
        this._useReservations =       (limits.allowReservations) &&     (profile.useReservations);
        this._useOrderAgreements =    (limits.allowGeneratePdf) &&      (profile.useOrderAgreements);
        this._useKits =               (limits.allowKits) &&             (profile.useKits);
        this._useCustody =            (limits.allowCustody) &&          (profile.useCustody);
        this._useGeo =                                                  (profile.useGeo);
        this._useSelfService =        (limits.allowSelfService) &&      (profile.useSelfService);
        this._useCheckinLocation =    (this._useOrders) &&              (profile.orderCheckinLocation);
        this._usePublicSelfService =  (limits.allowSelfService) &&      (profile.usePublicSelfService);
        this._useOrderTransfers =     (limits.allowOrderTransfers) &&   (profile.useOrderTransfers);
        this._useSendMessage =        (limits.allowSendMessage) &&      (profile.useSendMessage);
        this._useFlags =              (profile.useCustom);
        this._useGeo =                (profile.useGeo);

        if (this._isSelfService) {
            // Override some permissions for selfservice users
            this._useOrders = this._useOrders && this._useSelfService && profile.selfServiceCanOrder;
            this._useReservations = this._useReservations && this._useSelfService && profile.selfServiceCanReserve;
            this._useCustody = this._useCustody && this._useSelfService && profile.selfServiceCanCustody;
        }
    };

    PermissionHandler.prototype.hasAnyAdminPermission = function() {
        return  this.hasPermission("create", "locations") ||
                this.hasPermission("create", "categories") ||
                this.hasPermission("create", "webhooks") ||
                this.hasPermission("create", "users");
    };

    PermissionHandler.prototype.hasDashboardPermission = function(action, data, location) {
        // Root, admin, user can see the dashboard tab
        return this._isRootOrAdminOrUser;
    };


    PermissionHandler.prototype.hasCalendarPermission = function(action, data, location) {
        // Everyone can see the calendar tab
        return true;
    };

    
    PermissionHandler.prototype.hasItemPermission = function(action, data, location) {
        return this.hasPermission(action, "items", data, location);
    };

    PermissionHandler.prototype.hasItemCustodyPermission = function() {
        return this._useCustody;
    };

    PermissionHandler.prototype.hasItemFlagPermission = function() {
        return this._useFlags;
    };

    PermissionHandler.prototype.hasItemGeoPermission = function() {
        return this._useGeo;
    };

    PermissionHandler.prototype.hasItemGeoPermission = function(){
        return this._useGeo;
    };

    
    PermissionHandler.prototype.hasKitPermission = function(action, data, location) {
        return this.hasPermission(action || "read", "kits", data, location);
    };

    
    PermissionHandler.prototype.hasContactPermission = function(action, data, location) {
        return this.hasPermission(action, "contacts", data, location);
    };

    PermissionHandler.prototype.hasContactReadOtherPermission = function(action, data, location) {
        return (!this._isSelfService);
    };

    
    PermissionHandler.prototype.hasCheckoutPermission = function(action, data, location) {
        return this.hasPermission(action || "read", "orders", data, location);
    };
    

    PermissionHandler.prototype.hasReservationPermission = function(action, data, location) {
        return this.hasPermission(action || "read", "reservations", data, location);
    };

    
    PermissionHandler.prototype.hasCategoriesPermission = function(action, data, location) {
        return this.hasPermission(action, "categories", data, location);
    };

    
    PermissionHandler.prototype.hasWebhooksPermission = function(action, data, location) {
        return this.hasPermission(action, "webhooks", data, location);
    };

    
    PermissionHandler.prototype.hasUserPermission = function(action, data, location) {
        return this.hasPermission(action, "users", data, location);
    };

    
    PermissionHandler.prototype.hasLocationPermission = function(action, data, location) {
        return this.hasPermission(action, "locations", data, location);
    };

    
    PermissionHandler.prototype.hasWebhookPermission = function(action, data, location) {
        return this.hasPermission(action, "webhooks", data, location);
    };

    
    PermissionHandler.prototype.hasAccountPermission = function(action, data, location) {
        return this.hasPermission(action, "account", data, location);
    };

    PermissionHandler.prototype.hasAccountInvoicesPermission = function(action, data, location) {
        return this.hasPermission(action, "invoices", data, location);
    };

    PermissionHandler.prototype.hasAccountSubscriptionPermission = function(action, data, location) {
        return this.hasPermission(action, "subscription", data, location);
    };

    PermissionHandler.prototype.hasAccountBillingPermission = function(action, data, location) {
        return this.hasPermission(action, "billing", data, location);
    };

    PermissionHandler.prototype.hasAccountTemplatePermission = function(action, data, location) {
        return this.hasPermission(action, "template", data, location);
    };
    

    PermissionHandler.prototype.hasAssetTagsPermission = function(action, data, location) {
        //return this.hasPermission(action, "asset-tags", data, location);
        return this.hasAnyAdminPermission();
    };

    
    PermissionHandler.prototype.hasPermission = function(action, collection, data, location) {
        if( (this._isSelfService) && 
            (!this._useSelfService)) {
            return false;
        }

        switch (collection) {
            default:
                return false;
            case "items":
                switch (action) {
                    default:
                        return false;
                    case "read":
                        return true;
                    case "create":
                    case "duplicate":
                    case "update":
                    case "delete":
                    case "expire":
                    case "undoExpire":
                    case "setFlag":
                    case "clearFlag":
                    case "setField":
                    case "clearField":
                    case "addAttachment":
                    case "addComment":
                    case "updateComment":
                    case "removeComment":
                    case "import":
                    case "export":
                    case "updateGeo":
                        return this._isRootOrAdmin;
                    // Modules
                    case "reserve":
                        return this._useReservations;
                    case "checkout":
                        return this._useOrders;
                    case "takeCustody":
                    case "releaseCustody":
                        return this._useCustody;
                    case "transferCustody":
                        return this._useCustody && this._isRootOrAdmin;
                }
                break;
            case "kits":
                switch (action) {
                    default:
                        return false;
                    case "read":
                        return this._useKits;
                    case "create":
                    case "duplicate":
                    case "update":
                    case "delete":
                    case "setField":
                    case "clearField":
                    case "setFlag":
                    case "clearFlag":
                    case "addAttachment":
                    case "addComment":
                    case "updateComment":
                    case "removeComment":
                    case "addItems":
                    case "removeItems":
                    case "moveItem":
                    case "export":
                        return this._useKits && this._isRootOrAdmin;
                    case "takeApart":
                        return this.profile.canTakeApartKits;
                }
                break;
            case "orders":
            case "checkouts":
                switch (action) {
                    default:
                        return false;

                    // TODO: Checkin at location
                    // TODO: Add items to open check-out

                    // CRUD
                    case "create":
                    case "read":
                    case "update":
                    case "delete":
                    // Order specific actions
                    case "setCustomer":
                    case "clearCustomer":
                    case "setLocation":
                    case "clearLocation":
                    case "addItems":
                    case "removeItems":
                    case "swapItems":
                    case "undoCheckout":
                    case "checkin":
                    case "checkout":
                    // Generic actions
                    case "setField":
                    case "clearField":
                    case "setFlag":
                    case "clearFlag":
                    case "addAttachment":
                    case "addComment":
                    case "updateComment":
                    case "removeComment":
                    case "export":
                        return this._useOrders;
                    case "generateDocument":
                        return this._useOrderAgreements;
                    case "checkinAt":
                        return this._useCheckinLocation;
                    case "forceConflictResolving":
                        return this.profile.forceConflictResolving;
                }
                break;
            case "reservations":
                switch (action) {
                    default:
                        return false;
                    
                    // TODO: Add items to open reservation

                    // CRUD
                    case "create":
                    case "read":
                    case "update":
                    case "delete":
                    // Reservation specific actions
                    case "setFromToDate":
                    case "setCustomer":
                    case "clearCustomer":
                    case "setLocation":
                    case "clearLocation":
                    case "addItems":
                    case "removeItems":
                    case "swapItems":
                    case "reserve":
                    case "undoReserve":
                    case "cancel":
                    case "undoCancel":
                    case "switchToOrder":
                    case "makeOrder":
                    case "reserveAgain":
                    case "reserveRepeat":
                    // Generic actions
                    case "setField":
                    case "clearField":
                    case "setFlag":
                    case "clearFlag":
                    case "addAttachment":
                    case "addComment":
                    case "updateComment":
                    case "removeComment":
                    case "export":
                        return this._useReservations;
                    case "generateDocument":
                        return this._useOrderAgreements;
                }
                break;
            case "customers":
            case "contacts":
                switch (action) {
                    default:
                        return false;
                    case "read":
                        return true;
                    case "create":
                    case "update":
                    case "delete":
                    case "archive":
                    case "undoArchive":
                    case "setField":
                    case "clearField":
                    case "setFlag":
                    case "clearFlag":
                    case "addAttachment":
                    case "addComment":
                    case "updateComment":
                    case "removeComment":
                    case "import":
                    case "export":
                        return this._isRootOrAdminOrUser;
                    case "generateDocument":
                        return this._useOrderAgreements;
                }
                break;
            case "users":
                switch (action) {
                    default:
                        return false;
                    case "read":
                        return true;
                    case "create":
                    case "update":
                    case "delete":
                    case "linkNewCustomer":
                    case "linkCustomer":
                    case "unLinkCustomer":
                    case "inviteUser":
                    case "archive":
                    case "undoArchive":
                    case "activate":
                    case "deactivate":
                        return this._isRootOrAdmin;
                    case "changeAccountOwner":
                        return this._isOwner;
                }
                break;
            case "categories":
            case "locations":
                switch (action) {
                    default:
                        return false;
                    case "read":
                        return true;
                    case "create":
                    case "update":
                    case "delete":
                        return this._isRootOrAdmin;
                }
                break;
            case "webhooks":
                switch (action) {
                    default:
                        return false;
                    case "read":
                    case "create":
                    case "update":
                    case "delete":
                        return this._useWebHooks && this._isRootOrAdmin;
                }
                break;
            case "account":
            case "subscription":
            case "invoices":
            case "billing":
            case "template":
                switch (action) {
                    default:
                        return false;
                    case "read":
                        return true;
                    case "create":
                    case "update":
                    case "delete":
                    case "archive":
                    case "unarchive":
                    case "activate":
                    case "deactivate":
                    case "clone":
                        return this._isRootOrAdmin;
                }
                break;
            case "asset-tags":
                switch (action) {
                    default:
                        return this._isRootOrAdmin;
                }
                break;
        }
    };

    return PermissionHandler;

});
