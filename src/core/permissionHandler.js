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

        this._canSetFlag = false;
        this._canClearFlag = false;

        switch(user.role) {
            case "selfservice":
                this._canSetFlag = this._useFlags && profile.selfServiceCanSetFlag;
                this._canClearFlag = this._useFlags && profile.selfServiceCanClearFlag;
                this._canSetLabel = profile.selfServiceCanSetLabel;
                this._canClearLabel = profile.selfServiceCanClearLabel;
                this._canReadOrders = this._useOrders && profile.selfServiceCanSeeOwnOrders;
                this._canCreateOrders = this._useOrders && profile.selfServiceCanOrder && !this._isBlockedContact;
                this._canOrderConflict = this._useOrders && profile.selfServiceCanOrderConflict;
                this._canCreateReservations = this._useReservations && profile.selfServiceCanReserve && !this._isBlockedContact;
                this._canReadReservations = this._useReservations && profile.selfServiceCanReserve;
                this._canReservationConflict = this._useReservations && profile.selfServiceCanReservationConflict;
                this._canTakeCustody = this._useCustody && profile.selfServiceCanCustody && !this._isBlockedContact;
                this._canReadOwnCustody = this._useCustody;
                this._canBlockContacts = false;
                break;
            case "user":
                this._canSetFlag = this._useFlags && profile.userCanSetFlag;
                this._canClearFlag = this._useFlags && profile.userCanClearFlag;
                this._canSetLabel = profile.userCanSetLabel;
                this._canClearLabel = profile.userCanClearLabel;
                this._canReadOrders = this._useOrders;
                this._canCreateOrders = this._useOrders;
                this._canOrderConflict = this._useOrders && profile.userCanOrderConflict;
                this._canCreateReservations = this._useReservations;
                this._canReadReservations = this._useReservations;
                this._canReservationConflict = this._useOrders && profile.userCanReservationConflict;
                this._canTakeCustody = this._useCustody;
                this._canReadOwnCustody = this._useCustody;
                this._canBlockContacts = this._useBlockContacts && profile.userCanBlock;
                break;
            default:
                this._canSetFlag = this._useFlags;
                this._canClearFlag = this._useFlags;
                this._canSetLabel = true;
                this._canClearLabel = true;
                this._canReadOrders = this._useOrders;
                this._canCreateOrders = this._useOrders;
                this._canOrderConflict = this._useOrders && profile.adminCanOrderConflict;
                this._canCreateReservations = this._useReservations;
                this._canReadReservations = this._useReservations;
                this._canReservationConflict = this._useOrders && profile.adminCanReservationConflict;
                this._canTakeCustody = this._useCustody;
                this._canReadOwnCustody = this._useCustody;
                this._canBlockContacts = this._useBlockContacts;
                break;
        }
    };

    // 
    // Module helpers
    // 
    PermissionHandler.prototype.canUseItemCustody = function(){
        return this.limits.allowCustody;    
    }
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
        return this._isOwner || this._isRootOrAdmin;
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
        return (!this._isSelfService);
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
                    case "setFields":
                    case "setField":
                    case "clearField":
                    case "addAttachment":
                    case "addComment":
                    case "updateComment":
                    case "removeComment":
                    case "import":
                    case "export":
                    case "updateGeo":
                    case "changeLocation":
                    case "changeCategory":
                    case "updatePermissions":
                        return this._isRootOrAdmin;
                    // Permissings for asset labels
                    case "printLabel":
                        return this._isRootOrAdmin;
                    // Permissions for flags
                    case "setFlag":
                        return this._useFlags && this._canSetFlag;
                    case "clearFlag":
                        return this._useFlags && this._canClearFlag;
                    // Modules
                    case "reserve":
                        return this._canCreateReservations;
                    case "checkout":
                        return this._canCreateOrders;
                    case "seeOwnCustody":
                        return this._canReadOwnCustody;
                    case "takeCustody":
                    case "releaseCustody":
                    case "transferCustody":
                        return this._canTakeCustody;
                    case "giveCustody":
                        return this._canTakeCustody && this._isRootOrAdmin;
                    case "releaseCustodyAt":
                        return this._canTakeCustody && this._useReleaseAtLocation;
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
                    case "setFields":
                    case "setField":
                    case "clearField":
                    case "addAttachment":
                    case "addComment":
                    case "updateComment":
                    case "removeComment":
                    case "addItems":
                    case "removeItems":
                    case "moveItem":
                    case "export":
                    case "updatePermissions":
                        return this._useKits && this._isRootOrAdmin;
                    // Permissings for asset labels
                    case "printLabel":
                        return this._isRootOrAdmin;
                    // Permissions for flags
                    case "setFlag":
                        return this._useFlags && this._canSetFlag;
                    case "clearFlag":
                        return this._useFlags && this._canClearFlag;
                    // Other
                    case "takeApart":
                        return this.profile.canTakeApartKits;
                    // Modules
                    // Modules
                    case "reserve":
                        return this._canCreateReservations;
                    case "checkout":
                        return this._canCreateOrders;
                    case "seeOwnCustody":
                        return this._canReadOwnCustody;
                    case "takeCustody":
                    case "releaseCustody":
                    case "transferCustody":
                        return this._canTakeCustody;
                    case "giveCustody":
                        return this._canTakeCustody && this._isRootOrAdmin;
                    case "releaseCustodyAt":
                        return this._canTakeCustody && this._useReleaseAtLocation;
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
                    case "update":
                    case "delete":
                        return this._canCreateOrders;
                    case "read":
                        return this._canReadOrders;                    
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
                        return this._canCreateOrders;
                    // Generic actions
                    case "addAttachment":
                    case "addComment":
                    case "updateComment":
                    case "removeComment":
                    case "export":
                        return this._useOrders;
                    case "archive":
                    case "undoArchive":
                        return this._useOrders && this._isRootOrAdmin;
                    // Permissions for flags
                    case "setFlag":
                        return this._useFlags && this._canSetFlag;
                    case "clearFlag":
                        return this._useFlags && this._canClearFlag;
                    // Other
                    case "generateDocument":
                        return this._usePdf && this._canCreateOrders;
                    case "checkinAt":
                        return this._canCreateOrders && this._useCheckinLocation;
                    case "forceCheckListCheckin":
                        return this.profile.forceCheckListCheckin;
                    case "ignoreConflicts":
                        return this._canOrderConflict;
                }
                break;
            case "reservations":
                switch (action) {
                    default:
                        return false;
                    
                    // CRUD
                    case "create":
                    case "update":
                    case "delete":
                        return this._canCreateReservations;

                    case "read":
                        return this._canReadReservations;

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
                    case "reserveAgain":
                    case "reserveRepeat":

                    // Generic actions
                    case "setFields":
                    case "setField":
                    case "clearField":
                    case "addAttachment":
                    case "addComment":
                    case "updateComment":
                    case "removeComment":
                    case "export":
                        return this._canCreateReservations;

                    case "makeOrder":
                        return this._canCreateOrders;
                        
                    case "archive":
                    case "undoArchive":
                        return this._useReservations && this._isRootOrAdmin;
                    
                    // Permissions for flags
                    case "setFlag":
                        return this._useFlags && this._canSetFlag;
                    case "clearFlag":
                        return this._useFlags && this._canClearFlag;
                    // Other
                    case "generateDocument":
                        return this._usePdf && this._canCreateReservations;
                    case "ignoreConflicts":
                        return this._canReservationConflict;
                    case "close":
                    case "undoClose":
                        return this._useReservationsClose;
                }
                break;
            case "customers":
            case "contacts":
                switch (action) {
                    default:
                        return false;
                    case "read":
                    case "create":
                    case "update":
                    case "delete":
                    case "archive":
                    case "undoArchive":
                    case "setFields":
                    case "setField":
                    case "clearField":
                    case "addAttachment":
                    case "addComment":
                    case "updateComment":
                    case "removeComment":
                    case "import":
                    case "export":
                        return this._isRootOrAdminOrUser;
                    // Permissions for flags
                    case "setFlag":
                        return this._useFlags && this._canSetFlag;
                    case "clearFlag":
                        return this._useFlags && this._canClearFlag;
                    // Other
                    case "printLabel":
                        return this._isRootOrAdmin;
                    case "generateDocument":
                        return this._usePdf;
                    case "block":
                    case "undoBlock":
                        return this._canBlockContacts;
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
                    case "clearSync":
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
                    case "archive":
                        return this._isRootOrAdmin;
                }
                break;
            case "syncs":
                switch (action) {
                    default:
                        return false;
                    case "read":
                    case "create":
                    case "update":
                    case "delete":
                    case "clone":
                    case "testConnection":
                    case "syncUsers":
                        return this._useUserSync && this._isRootOrAdmin;
                }
                break;
            case "notifications":
                switch (action) {
                    default:
                        return false;
                    case "read":
                    case "create":
                    case "update":
                    case "delete":
                        return this._useNotifications && this._isRootOrAdmin;
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
                        return this._useWebhooks && this._isRootOrAdmin;
                }
                break;
            case "account":
                switch (action) {
                    default:
                        return this._isRootOrAdmin;
                    case "reset":
                    case "cancelPlan":
                    case "changePlan":
                        return this._isOwner;
                }
                break;
            case "subscription":
            case "invoices":
            case "billing":
            case "templates":
                switch (action) {
                    default:
                        return false;
                    case "read":
                    case "create":
                    case "update":
                    case "delete":
                    case "archive":
                    case "undoArchive":
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
