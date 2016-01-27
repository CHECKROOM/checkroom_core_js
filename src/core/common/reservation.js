/*
 * Reservation helpers
 */
define(function () {
    return {
        /**
         * getFriendlyReservationCss
         *
         * @memberOf common
         * @name  common#getFriendlyReservationCss
         * @method
         * 
         * @param  {string} status 
         * @return {string}        
         */
        getFriendlyReservationCss: function(status) {
            switch(status) {
                case 'creating': return 'label-creating';
                case 'open': return 'label-open';
                case 'closed': return 'label-closed';
                case 'cancelled': return 'label-cancelled';
                default: return '';
            }
        },
        /**
         * getFriendlyReservationStatus 
         *
         * @memberOf common
         * @name  common#getFriendlyReservationStatus
         * @method
         * 
         * @param  {string} status 
         * @return {string}        
         */
        getFriendlyReservationStatus: function(status) {
            switch(status) {
                case 'creating': return 'Incomplete';
                case 'open': return 'Open';
                case 'closed': return 'Closed';
                case 'cancelled': return 'Cancelled';
                default: return 'Unknown';
            }
        }
    };
});