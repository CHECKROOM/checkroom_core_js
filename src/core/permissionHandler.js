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

        // TODO: remove this
        // Temporary role to granular permissions transition code
        this.ensureRolePermissions();

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

    PermissionHandler.prototype.ensureRolePermissions = function(){
        var user = this.user,
            profile = this.profile,
            permissions = this.permissions;

        switch(user.role){
            case "selfservice":
                if(profile.selfServiceCanSetFlag){
                    permissions.push("ITEMS_FLAGGER");
                }else{
                    permissions = permissions.filter(function(p){ return p != "ITEMS_FLAGGER"; });
                }
                if(profile.selfServiceCanClearFlag){
                    permissions.push("ITEMS_UNFLAGGER");
                }else{
                    permissions = permissions.filter(function(p){ return p != "ITEMS_UNFLAGGER"; });
                }
                if(profile.selfServiceCanSetLabel){
                    permissions.push("ORDERS_LABELER");
                    permissions.push("RESERVATIONS_LABELER");
                }else{
                    permissions = permissions.filter(function(p){ return ["ORDERS_LABELER", "RESERVATIONS_LABELER"].indexOf(p) == -1; });
                }
                if(profile.selfServiceCanSeeOwnOrders){
                    permissions.push("ORDERS_OWN_READER");
                }else{
                    permissions = permissions.filter(function(p){ return p != "ORDERS_OWN_READER"; });
                }
                if(profile.selfServiceCanOrder && !this._isBlockedContact){
                    permissions.push("ORDERS_OWN_WRITER");
                }else{
                    permissions = permissions.filter(function(p){ return p != "ORDERS_OWN_WRITER"; });
                }
                if(profile.selfServiceCanOrderConflict){
                    permissions.push("ORDERS_CONFLICT_CREATOR");
                }else{
                    permissions = permissions.filter(function(p){ return p != "ORDERS_CONFLICT_CREATOR"; });
                }
                if(profile.selfServiceCanReserve && !this._isBlockedContact){
                    permissions.push("RESERVATIONS_OWN_READER");
                }else{
                    permissions = permissions.filter(function(p){ return p != "RESERVATIONS_OWN_READER"; });
                }
                if(profile.selfServiceCanReservationConflict){
                    permissions.push("RESERVATIONS_CONFLICT_CREATOR");
                }else{
                    permissions = permissions.filter(function(p){ return p != "RESERVATIONS_CONFLICT_CREATOR"; });
                }
                if(profile.selfServiceCanCustody && !this._isBlockedContact){
                    permissions.push("ITEMS_CUSTODY_TAKER");
                    permissions.push("ITEMS_CUSTODY_OWN_READER");
                    permissions.push("ITEMS_CUSTODY_OWN_RELEASER");
                    permissions.push("ITEMS_CUSTODY_OWN_TRANSFERER");
                }else{
                    permissions = permissions.filter(function(p){ return ["ITEMS_CUSTODY_TAKER", "ITEMS_CUSTODY_OWN_READER", "ITEMS_CUSTODY_OWN_RELEASER", "ITEMS_CUSTODY_OWN_TRANSFERER"].indexOf(p) == -1; });
                }
                break;
            case "admin":
                break;
            case "user":
                break;
        }

        this.permissions = permissions;
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
                this.hasPermission("create", "syncs");
    };

    PermissionHandler.prototype.hasDashboardPermission = function(action, data, location) {
        // Selfservice cannot see dashboard if it doesn't has reservation or checkout permissions
        if(this._isSelfService){
            return this.hasReservationPermission("read") || this.hasCheckoutPermission("read");
        }

        return true;
    };


    PermissionHandler.prototype.hasCalendarPermission = function(action, data, location) {
        // Calendar permission depends on reservation or checkout permission
        return this.hasReservationPermission("read") || this.hasCheckoutPermission("read");
    };

    
    PermissionHandler.prototype.hasItemPermission = function(action, data, location) {
        return this.hasPermission(action || "read", "items", data, location);
    };

    PermissionHandler.prototype.hasItemCustodyPermission = function() {
        return this._useCustody || this._canReadOwnCustody;
    };

    PermissionHandler.prototype.hasItemFlagPermission = function() {
        return this._useFlags;
    };

    PermissionHandler.prototype.hasItemGeoPermission = function() {
        return this._useGeo;
    };

    PermissionHandler.prototype.hasItemDepreciationPermission = function() {
        return this._isRootOrAdmin && this._useDepreciations;
    };

    PermissionHandler.prototype.hasUserSyncPermission = function(){
        return this.hasAccountUserSyncPermission("read");
    };

    PermissionHandler.prototype.hasSelfservicePermission = function(){
        return this._useSelfService;
    };
    
    PermissionHandler.prototype.hasReportingPermission = function() {
        return this._isRootOrAdmin && this._useReporting;
    };

    PermissionHandler.prototype.hasLabelPermission = function() {
        return this._canSetLabel && this._canClearLabel;
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
        return this.permissions.indexOf("CUSTOMERS_OWN_READER") == -1;
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
                    case "getDepreciation":
                    case "getImage":
                    case "getLastItemNumber":
                    case "getMultiple":
                    case "getReport":
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
                    // Attachment actions
                    case "attach":
                    case "detach":
                    case "addAttachment":
                    // Other update/delete actions
                    case "changeLocation":
                    case "updatePermissions":
                    case "updateGeo":
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
                    case "updateComment":
                        return can(["ITEMS_COMMENTER"]);
                    case "removeComment":
                        return can(["ITEMS_COMMENTS_DELETER", "ITEMS_COMMENTS_OWN_DELETER"]);
                    // Permissings for asset labels
                    case "printLabel":
                        return can(["ITEMS_DOCUMENT_GENERATOR"]);
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
                        return this._useCustody && can(["ITEMS_CUSTODY_TAKER", "ITEMS_CUSTODY_TAKER_RESTRICTED"]);
                    case "releaseCustody":
                        return this._useCustody && can(["ITEMS_CUSTODY_RELEASER", "ITEMS_CUSTODY_RELEASER_RESTRICTED", "ITEMS_CUSTODY_OWN_RELEASER"]);
                    case "transferCustody":
                        return this._useCustody && can(["ITEMS_CUSTODY_TRANSFERER", "ITEMS_CUSTODY_TRANSFERER_RESTRICTED", "ITEMS_CUSTODY_OWN_TRANSFERER"]);
                    case "giveCustody":
                        return this.hasItemPermission("takeCustody") && this.hasItemPermission("transferCustody");
                    case "releaseCustodyAt":
                        return this.hasItemPermission("releaseCustody") && this._useReleaseAtLocation;
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
                    case "addAttachment":
                        return can(["KITS_ADMIN", "KITS_ADMIN_RESTRICTED"]);
                    case "addComment":
                    case "updateComment":
                        return can(["KITS_COMMENTS_WRITER", "KITS_COMMENTS_OWN_WRITER"]);
                    case "removeComment":
                        return can(["KITS_COMMENTS_DELETER", "KITS_COMMENTS_OWN_DELETER"]);
                    case "updatePermissions":
                        return can(["KITS_ADMIN", "KITS_ADMIN_RESTRICTED"]);
                    case "import":
                        return can(["KITS_IMPORTER", "KITS_IMPORTER_RESTRICTED"]);
                    case "export":
                        return can(["KITS_EXPORTER", "KITS_EXPORTER_RESTRICTED"]);
                    // Permissings for asset labels
                    case "printLabel":
                        return can(["KITS_DOCUMENT_GENERATOR"]);
                    // Reservation
                    case "reserve":
                        return this.hasReservationPermission("create");
                    // Checkout
                    case "checkout":
                        return this.hasCheckoutPermission("create");
                    // Custody
                    case "seeOwnCustody":
                        return this._useCustody && can(["KITS_CUSTODY_OWN_READER"]);
                    case "takeCustody":
                        return this._useCustody && can(["KITS_CUSTODY_TAKER", "KITS_CUSTODY_TAKER_RESTRICTED"]);
                    case "releaseCustody":
                        return this._useCustody && can(["KITS_CUSTODY_RELEASER", "KITS_CUSTODY_RELEASER_RESTRICTED", "KITS_CUSTODY_OWN_RELEASER"]);
                    case "transferCustody":
                        return this._useCustody && can(["KITS_CUSTODY_TRANSFERER", "KITS_CUSTODY_TRANSFERER_RESTRICTED", "KITS_CUSTODY_OWN_TRANSFERER"]);
                    case "giveCustody":
                        return this.hasKitPermission("takeCustody") && this.hasKitPermission("transferCustody");
                    case "releaseCustodyAt":
                        return this.hasKitPermission("releaseCustody") && this._useReleaseAtLocation;
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
                    case "extend":
                    case "checkoutAgain":
                        return can(["ORDERS_WRITER", "ORDERS_WRITER_RESTRICTED", "ORDERS_OWN_WRITER"]);
                    case "read":
                        return can(["ORDERS_READER", "ORDERS_READER_RESTRICTED", "ORDERS_OWN_READER"])                  
                    
                    // Generic actions
                    case "attach":
                    case "addAttachment":
                        return can(["ORDERS_ATTACHMENTS_OWN_WRITER", "ORDERS_OWN_ATTACHMENTS_OWN_WRITER"]);
                    case "detach":
                    case "removeAttachment":
                        return can(["ORDERS_ATTACHMENTS_DELETER", "ORDERS_ATTACHMENTS_OWN_DELETER", "ORDERS_OWN_ATTACHMENTS_OWN_DELETER"]);
                    case "addComment":
                    case "updateComment":
                        return can(["ORDERS_COMMENTS_WRITER", "ORDERS_COMMENTS_OWN_WRITER", "ORDERS_OWN_COMMENTS_OWN_WRITER"]);
                    case "removeComment":
                        return can(["ORDERS_COMMENTS_DELETER", "ORDERS_COMMENTS_OWN_DELETER", "ORDERS_OWN_COMMENTS_OWN_DELETER"]);
                    case "setLabel":
                    case "clearLabel":
                        return can(["RESERVATIONS_LABELER", "RESERVATIONS_LABELER_RESTRICTED", "RESERVATIONS_OWN_LABELER"]);
                    case "export":
                        return can(["ORDERS_EXPORTER"]);
                    case "archive":
                    case "undoArchive":
                        return can(["ORDERS_ARCHIVER", "ORDERS_ARCHIVER_RESTRICTED", "ORDERS_OWN_ARCHIVER"]);
                    // Other
                    case "generateDocument":
                        return can(["ORDERS_DOCUMENT_GENERATOR", "ORDERS_OWN_DOCUMENT_GENERATOR"]);
                    case "checkinAt":
                        return this._useCheckinLocation && this.hasCheckoutPermission("checkin");
                    case "forceCheckListCheckin":
                        return this.profile.forceCheckListCheckin && this.hasCheckoutPermission("checkin");
                    case "ignoreConflicts":
                        return can(["ORDERS_CONFLICT_CREATOR"]);
                }
                break;
            case "reservations":
                if(!this._useReservations) return false;

                switch (action) {
                    default:
                        return false;
                    
                    // CRUD
                    case "create":
                    case "update":
                    case "delete":
                        return can(["RESERVATIONS_WRITER", "RESERVATIONS_WRITER_RESTRICTED", "RESERVATIONS_OWN_WRITER"])

                    case "search":
                    case "list":
                    case "read":
                        return can(["RESERVATIONS_READER", "RESERVATIONS_READER_RESTRICTED", "RESERVATIONS_OWN_READER"]);

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
                    case "reserveAgain":
                    case "reserveRepeat":

                    // Generic actions
                    case "setFields":
                    case "setField":
                    case "clearField":
                        return this.hasReservationPermission("update");
                    case "attach":
                    case "addAttachment":
                        return can(["RESERVATIONS_ATTACHMENTS_OWN_WRITER", "RESERVATIONS_OWN_ATTACHMENTS_OWN_WRITER"]);
                    case "detach":
                    case "removeAttachment":
                        return can(["RESERVATIONS_ATTACHMENTS_DELETER", "RESERVATIONS_ATTACHMENTS_OWN_DELETER", "RESERVATIONS_OWN_ATTACHMENTS_OWN_DELETER"]);
                    case "addComment":
                    case "updateComment":
                        return can(["RESERVATIONS_COMMENTS_OWN_WRITER", "RESERVATIONS_OWN_COMMENTS_OWN_WRITER"]);
                    case "removeComment":
                        return can([]);
                    case "export":
                        return can(["RESERVATIONS_EXPORTER"]);
                    case "switchToOrder":
                    case "makeOrder":
                        return this.hasCheckoutPermission("create");
                    case "cancel":
                    case "undoCancel":
                        return can(["RESERVATIONS_CANCELER", "RESERVATIONS_CANCELER_RESTRICTED", "RESERVATIONS_OWN_CANCELER"]);
                    case "archive":
                    case "undoArchive":
                        return can([ "RESERVATIONS_ARCHIVER", "RESERVATIONS_ARCHIVER_RESTRICTED", "RESERVATIONS_OWN_ARCHIVER"]);
                    // Other
                    case "generateDocument":
                        return can(["RESERVATIONS_DOCUMENT_GENERATOR", "RESERVATIONS_DOCUMENT_GENERATOR_RESTRICTED", "RESERVATIONS_OWN_DOCUMENT_GENERATOR"]);
                    case "ignoreConflicts":
                        return can(["RESERVATIONS_CONFLICT_CREATOR"]);
                    case "close":
                    case "undoClose":
                        return this._useReservationsClose && can(["RESERVATIONS_CLOSER", "RESERVATIONS_CLOSER_RESTRICTED", "RESERVATIONS_OWN_CLOSER"]);
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
                    case "addAttachment":                                    
                        return can(["CUSTOMERS_ADMIN"]);
                    case "addComment":
                    case "updateComment":
                        return can(["CUSTOMERS_COMMENTS_OWN_WRITER", "CUSTOMERS_OWN_COMMENTS_OWN_WRITER"]);
                    case "removeComment":   
                        return can(["CUSTOMERS_COMMENTS_DELETER", "CUSTOMERS_COMMENTS_OWN_DELETER", "CUSTOMERS_OWN_COMMENTS_OWN_DELETER"]);
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
                        return can(["CUSTOMERS_BLOCK_ADMIN"]);
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
                        return can(["USERS_ADMIN"]);
                    case "changeAccountOwner":
                        return can(["ACCOUNT_SUBSCRIPTIONS_ADMIN"]);
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
                        return can(["ACCOUNT_SUBSCRIPTIONS_READER"]);
                    case "reset":
                    case "cancelPlan":
                    case "changePlan":
                    case "upgrade":
                        return can(["ACCOUNT_SUBSCRIPTIONS_ADMIN"]);
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
        }
    };

    return PermissionHandler;

});
