/*
 * Conflict helpers
 */
define(function () {
    return {
        /**
         * getFriendlyConflictKind
         *
         * @memberOf  common
         * @name  common#getFriendlyConflictKind
         * @method
         * 
         * @param  kind 
         * @return {string}    
         */
        getFriendlyConflictKind: function(kind) {
            switch (kind) {
                case "location": return "At wrong location";
                case "order": return "Checked out";
                case "reservation": return "Already reserved";
                case "expired": return "Item is expired";
                case "custody": return "Item is in custody";
                case "not_allowed_reservation": return "Item cannot be reserved";
                case "not_allowed_order": return "Item cannot be checked out";
                case "flag": return "Item is flagged";
                default: return "";
            }
        }
    };
});