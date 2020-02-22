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
    var PermissionHandler = function (user, profile, limits, permissions) {
        this.user = user;
        this.profile = profile;
        this.limits = limits;
        this.permissions = permissions;

        this._isOwner = user.isOwner;

        // Helper booleans that mix a bunch of role stuff and profile / limits stuff
        this._isBlockedContact =      (user.customer && user.customer.status == "blocked");        
        this._useWebhooks =           (limits.allowWebhooks) &&             (profile.useWebhooks);
        this._useOrders =             (limits.allowOrders) &&               (profile.useOrders);
        this._useReservations =       (limits.allowReservations) &&         (profile.useReservations);
        this._usePdf =                (limits.allowGeneratePdf);
        this._useKits =               (limits.allowKits) &&                 (profile.useKits);
        this._useCustody =            (limits.allowCustody) &&              (profile.useCustody);
        this._useGeo =                                                      (profile.useGeo);
        this._useSelfService =        (limits.allowSelfService) &&          (profile.useSelfService);
        this._useCheckinLocation =    (this._useOrders) &&                  (profile.orderCheckinLocation);
        this._usePublicSelfService =  (limits.allowSelfService) &&          (profile.usePublicSelfService);
        this._useOrderTransfers =     (limits.allowOrderTransfers) &&       (profile.useOrderTransfers);
        this._useSendMessage =        (limits.allowSendMessage) &&          (profile.useSendMessage);
        this._useUserSync =           (limits.allowUserSync) &&             (profile.useUserSync);
        this._useFlags =              (profile.useFlags);
        this._useGeo =                (profile.useGeo);
        this._useRestrictLocations =  (limits.allowRestrictLocations) &&    (profile.useRestrictLocations);
        this._useReporting =          (limits.allowReporting) &&            (profile.useReporting);
        this._useDepreciations =      (limits.allowDepreciations) &&        (profile.useDepreciations);
        this._useNotifications =      (limits.allowNotifications) &&        (profile.useNotifications);
        this._useBlockContacts =      (limits.allowBlockContacts) &&        (profile.useBlockContacts);
        this._useReservationsClose =  (this._useReservations) &&            (profile.useReservationsClose);
        this._useSlack =              (limits.allowIntegrationSlack) &&     (profile.useIntegrationSlack);
        this._useApi =                (limits.allowAPI);
        this._useReleaseAtLocation =    (this._useCustody) &&                  (profile.custodyCanChangeLocation !== undefined?profile.custodyCanChangeLocation:true); // TODO change this update fallback (mobile)
        this._useSpotcheck =           (limits.allowSpotcheck) &&           (profile.useSpotcheck);
    };

    // 
    // Module helpers
    // 
    PermissionHandler.prototype.canUseItemCustody = function(){
        return this.limits.allowCustody;    
    };
    PermissionHandler.prototype.canUseItemDepreciation = function(){
        return this.limits.allowDepreciations;
    };
    PermissionHandler.prototype.canUseReporting = function(){
        return this.limits.allowReporting;
    };
    PermissionHandler.prototype.canUseWebhooks = function(){
        return this.limits.allowWebhooks;
    };
    PermissionHandler.prototype.canUseUserSync = function(){
        return this.limits.allowUserSync;
    };
    PermissionHandler.prototype.canUseRestrictLocations = function(){
        return this.limits.allowRestrictLocations;
    };
    PermissionHandler.prototype.canUseBlockContacts = function(){
        return this.limits.allowBlockContacts;
    };
    PermissionHandler.prototype.canUseBusinessHours = function(){
        return this.limits.allowBusinessHours;
    };
    PermissionHandler.prototype.canUseSlack = function(){
        return this.limits.allowIntegrationSlack;
    };
    PermissionHandler.prototype.canUseSpotcheck = function(){
        return this.limits.allowSpotcheck;
    }

    //
    // Permission helpers
    //

    // Specific web app permission method to check if we need to show module
    // even if user has no permission (upgrade page)
    PermissionHandler.prototype.hasUpgradePermission = function(){
        return this.hasAccountPermission("upgrade");
    }

    PermissionHandler.prototype.hasAnyAdminPermission = function() {
        return  this.hasPermission("create", "locations") ||
                this.hasPermission("create", "categories") ||
                this.hasPermission("create", "webhooks") ||
                this.hasPermission("create", "users") ||
                this.hasPermission("create", "templates") ||
                this.hasPermission("create", "syncs") ||
                this.hasPermission("changePlan", "account") ||
                this.hasPermission("create", "notifications") ||
                this.hasPermission("update", "settings");                 
    };



    PermissionHandler.prototype.hasDashboardPermission = function(action, data, location) {
        return this.hasReservationPermission("read") || this.hasCheckoutPermission("read");
    };


    PermissionHandler.prototype.hasCalendarPermission = function(action, data, location) {
        // Calendar permission depends on reservation or checkout permission
        return this.hasReservationPermission("read") || this.hasCheckoutPermission("read");
    };

    
    PermissionHandler.prototype.hasItemPermission = function(action, data, location) {
        return this.hasPermission(action || "read", "items", data, location);
    };

    PermissionHandler.prototype.hasItemCustodyPermission = function() {
        return this._useCustody;
    };

    PermissionHandler.prototype.hasReleaseCustodyAtLocationPermission = function(){
        return this._useCustody && this._useReleaseAtLocation;
    }

    PermissionHandler.prototype.hasItemFlagPermission = function() {
        return this._useFlags;
    };

    PermissionHandler.prototype.hasItemGeoPermission = function() {
        return this._useGeo;
    };

    PermissionHandler.prototype.hasItemDepreciationPermission = function() {
        return this._useDepreciations && this.hasItemPermission("getDepreciation");
    };

    PermissionHandler.prototype.hasUserSyncPermission = function(){
        return this.hasAccountUserSyncPermission("read");
    };

    PermissionHandler.prototype.hasSelfservicePermission = function(){
        return this._useSelfService;
    };
    
    PermissionHandler.prototype.hasReportingPermission = function() {
        return this._useReporting && this.permissions.indexOf("ACCOUNT_REPORTER") != -1;
    };

    PermissionHandler.prototype.hasLabelPermission = function() {
        return this.hasCheckoutPermission("setLabel");
    };

    PermissionHandler.prototype.hasSlackPermission = function(){
        return this._useSlack;
    };

    PermissionHandler.prototype.hasApiPermission = function(){
        return this._useApi;
    };

    PermissionHandler.prototype.hasSpotcheckPermission = function(){
        return this._useSpotcheck;
    }

    PermissionHandler.prototype.hasKitPermission = function(action, data, location) {
        return this.hasPermission(action || "read", "kits", data, location);
    };
    
    PermissionHandler.prototype.hasContactPermission = function(action, data, location) {
        return this.hasPermission(action || "read", "contacts", data, location);
    };

    PermissionHandler.prototype.hasContactReadOtherPermission = function(action, data, location) {
        return this.permissions.indexOf("CUSTOMERS_READER") != -1;
    };

    PermissionHandler.prototype.hasBlockContactsPermission = function(action, data, location) {
        return this._useBlockContacts;
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

    PermissionHandler.prototype.hasNotificationPermission = function(action, data, location){
         return this.hasPermission(action, "notifications", data, location);
    };
    
    PermissionHandler.prototype.hasUserPermission = function(action, data, location) {
        return this.hasPermission(action, "users", data, location);
    };

    
    PermissionHandler.prototype.hasLocationPermission = function(action, data, location) {
        return this.hasPermission(action, "locations", data, location);
    };

    PermissionHandler.prototype.hasRestrictLocationPermission = function(){
        return this._useRestrictLocations; 
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
        return this.hasPermission(action, "templates", data, location);
    };
    
    PermissionHandler.prototype.hasAccountUserSyncPermission = function(action, data, location) {
        return this.hasPermission(action, "syncs", data, location);
    };

    PermissionHandler.prototype.hasAssetTagsPermission = function(action, data, location) {
        //return this.hasPermission(action, "asset-tags", data, location);
        return this.hasAnyAdminPermission();
    };

    PermissionHandler.prototype.hasPermission = function(action, collection, data, location) {
        data = data || {};

        /*if( (this._isSelfService) && 
            (!this._useSelfService)) {
            return false;
        }*/

        var permissions = this.permissions;
        var can = function(arr){
            return permissions.some(function(perm){ return arr.includes(perm) });
        }

        switch (collection) {
            default:
                return false;
            case "items":
                switch (action) {
                    default:
                        return false;
                    // Read actions
                    case "read":
                    case "get":
                    case "getAvailabilities":
                    case "getAvailability":
                    case "getByCode":
                    case "getChangeLog":
                    case "getConflicts":
                    case "getImage":
                    case "getLastItemNumber":
                    case "getMultiple":
                    case "getSummary":
                    case "getTransactions":
                    case "list":
                    case "scannedCodeOn":
                    case "search":
                    case "searchAvailable":
                        return can(["ITEMS_READER", "ITEMS_READER_RESTRICTED"]);
                    case "create":
                    case "createMultiple":
                    case "duplicate":
                    case "update":
                    // Delete actions
                    case "delete":
                    case "deleteMultiple":
                    case "canDelete":                    
                    // Change category actions
                    case "changeCategory":
                    case "canChangeCategory":
                    // Other update/delete actions
                    case "getDepreciation":
                    case "changeLocation":
                    case "updatePermissions":
                    case "addBarcode":
                    case "removeBarcode":
                    case "addCodes":
                    case "removeCodes":
                    case "clearCatalog":
                    case "clearCover":
                    case "expire":
                    case "undoExpire":
                    case "setFields":
                    case "setField":
                    case "clearField":
                    case "setAllowedActions":
                    case "setCatalog":
                    case "setCover":
                        return can(["ITEMS_ADMIN", "ITEMS_ADMIN_RESTRICTED"]);
                    case "updateGeo":
                        return can(["ITEMS_GEO_ADMIN", "ITEMS_GEO_ADMIN_RESTRICTED"]);
                    case "attach":
                    case "addAttachment":
                        return can(["ITEMS_ATTACHMENTS_OWN_WRITER"]);
                    case "detach":
                    case "removeAttachment":
                        return can(["ITEMS_ATTACHMENTS_DELETER"]) || (data.own && can(["ITEMS_ATTACHMENTS_OWN_DELETER"]));
                    // Import actions
                    case "import":
                    case "importAnalyze":
                    case "importSample":
                    case "importSpreadsheet":
                    case "importValidate":
                        return can(["ITEMS_IMPORTER", "ITEMS_IMPORTER_RESTRICTED"]);
                    case "export":
                        return can(["ITEMS_EXPORTER", "ITEMS_EXPORTER_RESTRICTED"]);
                    case "addComment":
                        return can(["ITEMS_COMMENTS_OWN_WRITER"]);
                    case "updateComment":
                        return (data.own && can(["ITEMS_COMMENTS_OWN_WRITER"]));
                    case "removeComment":
                        return can(["ITEMS_COMMENTS_DELETER"]) || (data.own && can(["ITEMS_COMMENTS_OWN_DELETER"]));
                    // Permissings for asset labels
                    case "printLabel":
                        return can(["ITEMS_LABEL_PRINTER", "ITEMS_LABEL_PRINTER_RESTRICTED"]);
                    // Permissions for flags
                    case "setFlag":
                        return this._useFlags && can(["ITEMS_FLAGGER", "ITEMS_FLAGGER_RESTRICTED"]);
                    case "clearFlag":
                        return this._useFlags && can(["ITEMS_UNFLAGGER", "ITEMS_UNFLAGGER_RESTRICTED"]);
                    // Reservation
                    case "reserve":
                        return this.hasReservationPermission("create");
                    // Check-out
                    case "checkout":
                        return this.hasCheckoutPermission("create");
                    // Custody
                    case "seeOwnCustody":
                        return this._useCustody && can(["ITEMS_CUSTODY_OWN_READER"]);
                    case "takeCustody":
                        return this._useCustody && (can(["ITEMS_CUSTODY_TAKER"]) || (data.restrict === false?false:can(["ITEMS_CUSTODY_TAKER_RESTRICTED"])));
                    case "releaseCustody":
                        return this._useCustody && (can(["ITEMS_CUSTODY_RELEASER", "ITEMS_CUSTODY_RELEASER_RESTRICTED"]) || (data.own && can(["ITEMS_CUSTODY_OWN_RELEASER"])));
                    case "transferCustody":
                        return this._useCustody && (can(["ITEMS_CUSTODY_TRANSFERER"]) || (data.restrict === false?false:can(["ITEMS_CUSTODY_TRANSFERER_RESTRICTED"])) || (data.own && can(["ITEMS_CUSTODY_OWN_TRANSFERER"])));
                    case "giveCustody":
                        return this.hasContactReadOtherPermission() && this.hasItemPermission("takeCustody", data) && this.hasItemPermission("transferCustody", data);
                    case "releaseCustodyAt":
                        return this.hasItemPermission("releaseCustody", data) && this._useReleaseAtLocation;
                    case "getReport":
                        return can(["ITEMS_REPORTER", "ITEMS_REPORTER_RESTRICTED"]);
                }
                break;
            case "kits":
                if(!this._useKits) return false;

                switch (action) {
                    default:
                        return false;
                    case "read":
                        return can(["KITS_READER", "KITS_READER_RESTRICTED"]);
                    case "create":
                    case "duplicate":
                    case "update":
                    case "delete":
                    case "setFields":
                    case "setField":
                    case "clearField":
                    case "addItems":
                    case "removeItems":
                    case "moveItem":
                    case "setCover":
                        return can(["KITS_ADMIN", "KITS_ADMIN_RESTRICTED"]);
                    case "attach":
                    case "addAttachment":
                        return can(["KITS_ATTACHMENTS_OWN_WRITER"]);
                    case "detach":
                    case "removeAttachment":
                        return can(["KITS_ATTACHMENTS_DELETER"]) || (data.own && can(["KITS_ATTACHMENTS_OWN_DELETER"]));
                    case "addComment":
                        return can(["KITS_COMMENTS_OWN_WRITER"]);
                    case "updateComment":
                        return (data.own && can(["KITS_COMMENTS_OWN_WRITER"]));
                    case "removeComment":
                        return can(["KITS_COMMENTS_DELETER"]) || (data.own && can(["KITS_COMMENTS_OWN_DELETER"]));
                    case "updatePermissions":
                        return can(["KITS_ADMIN", "KITS_ADMIN_RESTRICTED"]);
                    case "import":
                        return can(["KITS_IMPORTER", "KITS_IMPORTER_RESTRICTED"]);
                    case "export":
                        return can(["KITS_EXPORTER", "KITS_EXPORTER_RESTRICTED"]);
                    // Permissings for asset labels
                    case "printLabel":
                        return can(["KITS_LABEL_PRINTER", "KITS_LABEL_PRINTER_RESTRICTED"]);
                    case "takeApart":
                        return this.hasReservationPermission("create") || this.hasCheckoutPermission("create");
                    // Reservation
                    case "reserve":
                        return this.hasReservationPermission("create");
                    // Checkout
                    case "checkout":
                        return this.hasCheckoutPermission("create");
                    // Custody
                    case "seeOwnCustody":
                        return this.hasItemPermission("seeOwnCustody", data);
                    case "takeCustody":
                        return this.hasItemPermission("takeCustody", data);
                    case "releaseCustody":
                        return this.hasItemPermission("releaseCustody", data);
                    case "transferCustody":
                        return this.hasItemPermission("transferCustody", data);
                    case "giveCustody":
                        return this.hasItemPermission("giveCustody", data)
                    case "releaseCustodyAt":
                        return this.hasItemPermission("releaseCustody", data);
                    case "getReport":
                        return this.hasItemPermission("getReport");
                }
                break;
            case "orders":
            case "checkouts":
                if(!this._useOrders) return false;

                switch (action) {
                    default:
                        return false;
                    // CRUD
                    case "create":
                        return this.hasCheckoutPermission("update", { own: true });

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
                    case "checkout":
                    case "checkin":
                    case "setFields":
                    case "setField":
                    case "clearField":
                    case "checkoutAgain":
                        return can(["ORDERS_WRITER", "ORDERS_WRITER_RESTRICTED"]) || (data.own && can(["ORDERS_OWN_WRITER"]));
                    case "extend":
                        return can(["ORDERS_EXTENDER_RESTRICTED"]) || (data.own && can(["ORDERS_OWN_EXTENDER"]));
                    case "read":
                        return this.hasCheckoutPermission("readAll") || can(["ORDERS_OWN_READER"])                  
                    case "readAll":
                        return can(["ORDERS_READER", "ORDERS_READER_RESTRICTED"]);

                    // Generic actions
                    case "attach":
                    case "addAttachment":
                        return can(["ORDERS_ATTACHMENTS_OWN_WRITER", "ORDERS_OWN_ATTACHMENTS_OWN_WRITER"]);
                    case "detach":
                    case "removeAttachment":
                        return can(["ORDERS_ATTACHMENTS_DELETER"]) || (data.own && can(["ORDERS_ATTACHMENTS_OWN_DELETER", "ORDERS_OWN_ATTACHMENTS_OWN_DELETER"]));
                    case "addComment":
                        return can(["ORDERS_COMMENTS_OWN_WRITER"]) || (data.own && can(["ORDERS_OWN_COMMENTS_OWN_WRITER"]));
                    case "updateComment":
                        return (data.own && can(["ORDERS_COMMENTS_OWN_WRITER", "ORDERS_OWN_COMMENTS_OWN_WRITER"]));
                    case "removeComment":
                        return can(["ORDERS_COMMENTS_DELETER"]) || (data.own && can(["ORDERS_COMMENTS_OWN_DELETER", "ORDERS_OWN_COMMENTS_OWN_DELETER"]));
                    case "setLabel":
                    case "clearLabel":
                        return can(["ORDERS_LABELER", "ORDERS_LABELER_RESTRICTED"]) || (data.own && can(["ORDERS_OWN_LABELER"]));
                    case "export":
                        return can(["ORDERS_EXPORTER", "ORDERS_EXPORTER_RESTRICTED"]);
                    case "archive":
                    case "undoArchive":
                        return can(["ORDERS_ARCHIVER", "ORDERS_ARCHIVER_RESTRICTED"]) || (data.own && can(["ORDERS_OWN_ARCHIVER"]));
                    // Other
                    case "generateDocument":
                        return can(["ORDERS_DOCUMENT_GENERATOR", "ORDERS_DOCUMENT_GENERATOR_RESTRICTED"]) || (data.own && can(["ORDERS_OWN_DOCUMENT_GENERATOR"]));
                    case "checkinAt":
                        return this._useCheckinLocation && this.hasCheckoutPermission("checkin");
                    case "forceCheckListCheckin":
                        return this.profile.forceCheckListCheckin && this.hasCheckoutPermission("checkin");
                    case "ignoreConflicts":
                        return can(["ORDERS_CONFLICT_CREATOR"]);
                    case "getReport":
                        return can(["ORDERS_REPORTER", "ORDERS_REPORTER_RESTRICTED", "ORDERS_OWN_REPORTER"]);
                }
                break;
            case "reservations":
                if(!this._useReservations) return false;

                switch (action) {
                    default:
                        return false;
                    
                    // CRUD
                    case "create":
                        return this.hasReservationPermission("update", { own: true });

                    case "update":
                    case "delete":
                        return can(["RESERVATIONS_WRITER", "RESERVATIONS_WRITER_RESTRICTED"]) || (data.own && can(["RESERVATIONS_OWN_WRITER"]))

                    case "search":
                    case "list":
                    case "read":
                        return this.hasReservationPermission("readAll") || can(["RESERVATIONS_OWN_READER"]);
                    case "readAll":
                        return can(["RESERVATIONS_READER", "RESERVATIONS_READER_RESTRICTED"]);

                    // Reservation specific actions
                    case "setCustomer":
                    case "clearCustomer":
                    case "setFromToDate":
                    case "setLocation":
                    case "clearLocation":
                    case "addItems":
                    case "removeItems":
                    case "swapItems":
                    case "reserve":
                    case "undoReserve":
                    case "reserveAgain":
                    case "reserveRepeat":

                    // Generic actions
                    case "setFields":
                    case "setField":
                    case "clearField":
                        return this.hasReservationPermission("update", data);
                    case "attach":
                    case "addAttachment":
                        return can(["RESERVATIONS_ATTACHMENTS_OWN_WRITER"]) || (data.own && can(["RESERVATIONS_OWN_ATTACHMENTS_OWN_WRITER"]));
                    case "detach":
                    case "removeAttachment":
                        return can(["RESERVATIONS_ATTACHMENTS_DELETER"]) || (data.own && can(["RESERVATIONS_ATTACHMENTS_OWN_DELETER", "RESERVATIONS_OWN_ATTACHMENTS_OWN_DELETER"]));
                    case "addComment":
                        return can(["RESERVATIONS_COMMENTS_OWN_WRITER"]) || (data.own && can(["RESERVATIONS_OWN_COMMENTS_OWN_WRITER"]));
                    case "updateComment":
                        return (data.own && can(["RESERVATIONS_COMMENTS_OWN_WRITER", "RESERVATIONS_OWN_COMMENTS_OWN_WRITER"]));
                    case "removeComment":
                        return can(["RESERVATIONS_COMMENTS_DELETER"]) || (data.own && can(["RESERVATIONS_COMMENTS_OWN_DELETER", "RESERVATIONS_OWN_COMMENTS_OWN_DELETER"]));
                    case "export":
                        return can(["RESERVATIONS_EXPORTER", "RESERVATIONS_EXPORTER_RESTRICTED"]);
                    case "switchToOrder":
                    case "makeOrder":
                        return this.hasCheckoutPermission("create", data);
                    case "cancel":
                    case "undoCancel":
                        return can(["RESERVATIONS_CANCELER", "RESERVATIONS_CANCELER_RESTRICTED"]) || (data.own && can(["RESERVATIONS_OWN_CANCELER"]));
                    case "archive":
                    case "undoArchive":
                        return can([ "RESERVATIONS_ARCHIVER", "RESERVATIONS_ARCHIVER_RESTRICTED"]) || (data.own && can(["RESERVATIONS_OWN_ARCHIVER"]));
                    // Other
                    case "generateDocument":
                        return can(["RESERVATIONS_DOCUMENT_GENERATOR", "RESERVATIONS_DOCUMENT_GENERATOR_RESTRICTED", "RESERVATIONS_OWN_DOCUMENT_GENERATOR"]);
                    case "ignoreConflicts":
                        return can(["RESERVATIONS_CONFLICT_CREATOR"]);
                    case "close":
                    case "undoClose":
                        return this._useReservationsClose && (can(["RESERVATIONS_CLOSER", "RESERVATIONS_CLOSER_RESTRICTED"]) || (data.own && can(["RESERVATIONS_OWN_CLOSER"])));
                    case "getReport":
                        return can(["RESERVATIONS_REPORTER", "RESERVATIONS_REPORTER_RESTRICTED", "RESERVATIONS_OWN_REPORTER"]);
                    case "setLabel":
                    case "clearLabel":
                        return can(["RESERVATIONS_LABELER", "RESERVATIONS_LABELER_RESTRICTED"]) || (data.own && can(["RESERVATIONS_OWN_LABELER"]));
                }
                break;
            case "customers":
            case "contacts":
                switch (action) {
                    default:
                        return false;
                    case "read":
                    case "get":
                    case "list":
                    case "search":
                        return can(["CUSTOMERS_READER"]);
                    case "create":
                    case "update":
                    case "delete":
                    case "archive":
                    case "undoArchive":
                    case "setFields":
                    case "setField":
                    case "clearField":                                  
                        return can(["CUSTOMERS_ADMIN"]);

                    case "attach":
                    case "addAttachment":
                        return can(["CUSTOMERS_ATTACHMENTS_OWN_WRITER", "CUSTOMERS_ATTACHMENTS_WRITER"]);
                    case "detach":
                    case "removeAttachment":
                        return can(["CUSTOMERS_ATTACHMENTS_DELETER"]) || (data.own && can(["CUSTOMERS_OWN_ATTACHMENTS_OWN_DELETER"]));
                    case "printLabel":
                        return can(["CUSTOMERS_LABEL_PRINTER", "CUSTOMERS_LABEL_PRINTER_RESTRICTED"]);
                    case "addComment":
                        return (can(["CUSTOMERS_COMMENTS_OWN_WRITER"]));
                    case "updateComment":
                        return (data.own && can(["CUSTOMERS_COMMENTS_OWN_WRITER"]));
                    case "removeComment":
                        return can(["CUSTOMERS_COMMENTS_DELETER"]) || (data.own && can(["CUSTOMERS_OWN_COMMENTS_OWN_DELETER"]));
                    case "import":
                    case "importAnalyze":
                    case "importSpreadsheet":
                    case "importSample":
                    case "importValidate":
                        return can(["CUSTOMERS_IMPORTER"]);
                    case "export":
                        return can(["CUSTOMERS_EXPORTER"])
                    // Other
                    case "generateDocument":
                        return can(["CUSTOMERS_DOCUMENT_GENERATOR", "CUSTOMERS_OWN_DOCUMENT_GENERATOR"]);
                    case "block":
                    case "undoBlock":
                        return this._useBlockContacts && can(["CUSTOMERS_BLOCK_ADMIN"]);
                    case "getReport":
                        return can(["CUSTOMERS_REPORTER"]);
                    case "changeKind":
                        return can(["CUSTOMERS_MAINTENANCE_ADMIN"]);
                }
                break;
            case "users":
                switch (action) {
                    default:
                        return false;
                    case "read":
                        return can(["USERS_READER"]);
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
                    case "clearSync":
                    case "restrictLocations":
                    case "addRole":
                    case "deleteRole":
                    case "editRole":
                    case "referFriend":
                        return can(["USERS_ADMIN"]);
                    case "changeAccountOwner":
                        return this._isOwner;
                    case "getReport":
                        return can(["USERS_REPORTER", "USERS_OWN_REPORTER"]);
                }
                break;
            case "categories":
                switch(action){
                    default:
                        return false;
                    case "read":
                        return can(["CATEGORIES_READER"]);
                    case "create":
                    case "update":
                    case "delete":
                        return can(["CATEGORIES_ADMIN"]);
                }

            case "locations":
                switch (action) {
                    default:
                        return false;
                    case "read":
                        return can(["LOCATIONS_READER", "LOCATIONS_READER_RESTRICTED"]);
                    case "create":
                    case "update":
                    case "delete":
                    case "archive":
                        return can(["LOCATIONS_ADMIN"]);
                }
                break;
            case "syncs":
                if(!this._useUserSync) return false;

                switch (action) {
                    default:
                        return false;
                    case "read":
                        return can(["USER_SYNCS_READER"]);
                    case "create":
                    case "update":
                    case "delete":
                    case "clone":
                    case "testConnection":
                    case "syncUsers":
                        return can(["USER_SYNCS_ADMIN"]);
                }
                break;
            case "notifications":
                if(!this._useNotifications) return false;

                switch (action) {
                    default:
                        return false;
                    case "read":
                        return can(["NOTIFICATIONS_READER"]);
                    case "create":
                    case "update":
                    case "delete":
                        return can(["NOTIFICATIONS_ADMIN"]);
                }
                break;
            case "webhooks":
                if(!this._useWebhooks) return false;

                switch (action) {
                    default:
                        return can(["WEBHOOKS_READER"]);
                    case "read":
                    case "create":
                    case "update":
                    case "delete":
                        return can(["WEBHOOKS_ADMIN"]);
                }
                break;
            case "account":
            case "subscription":
            case "invoices":
            case "billing":
                switch (action) {
                    default:
                        return can(["ACCOUNT_SUBSCRIPTIONS_READER", "ACCOUNT_BILLING_READER"]);
                    case "reset":
                    case "changePlan":
                    case "upgrade":
                        return can(["ACCOUNT_SUBSCRIPTIONS_ADMIN", "ACCOUNT_BILLING_ADMIN"]);
                    case "cancelPlan":
                        return this._isOwner;
                }
                break;
            case "templates":
                switch (action) {
                    default:
                        return false;
                    case "read":
                        return can(["TEMPLATES_READER"]);
                    case "create":
                    case "update":
                    case "delete":
                    case "archive":
                    case "undoArchive":
                    case "activate":
                    case "deactivate":
                    case "clone":
                        return can(["TEMPLATES_ADMIN"]);
                }
                break;
            case "settings":
                switch(action){
                    default:
                        return false;
                    case "read":
                        return can(["ACCOUNT_SETTINGS_READER"]);
                    case "update":
                        return can(["ACCOUNT_SETTINGS_ADMIN"]);
                }
        }
    };

    return PermissionHandler;

});
