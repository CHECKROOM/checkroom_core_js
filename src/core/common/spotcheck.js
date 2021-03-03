/*
 * Spotcheck helpers
 */
define(function () {
    var that = {
        /**
         * getFriendlySpotcheckCss
         *
         * @memberOf common
         * @name  common#getFriendlySpotcheckCss
         * @method
         * 
         * @param  {object} spotcheck 
         * @return {string}        
         */
        getFriendlySpotcheckCss: function(spotcheck) {
            spotcheck = spotcheck || {};

            switch(spotcheck.status) {
                case 'open': return 'status-progress';
                case 'closed': 
                    if(spotcheck.numUnexpected || spotcheck.numUnchecked){
                        return 'status-exclamation';
                    }else{
                        return 'status-success';
                    }  
                case 'cancelled':
                    return 'status-cancelled';                  
                default: return '';
            }
        },
        /**
         * getFriendlySpotcheckStatus 
         *
         * @memberOf common
         * @name  common#getFriendlySpotcheckStatus
         * @method
         * 
         * @param  {object} spotcheck 
         * @return {string}        
         */
        getFriendlySpotcheckStatus: function(spotcheck) {
            spotcheck = spotcheck || {};

            switch(spotcheck.status) {
                case 'open': 
                    return 'In progress';
                case 'closed': 
                    if(spotcheck.numUnexpected || spotcheck.numUnchecked){
                        return 'Finished with issues (' + (spotcheck.numUnexpected + spotcheck.numUnchecked) + ')';
                    }else{
                        return 'Finished';
                    }      
                case 'cancelled': 
                    return 'Cancelled';           
                default: 
                    return '';
            }
        },

        /**
         * getSpotcheckProgressMessage
         * @param  {[type]} spotcheck [description]
         * @return {[type]}           [description]
         */
        getSpotcheckProgressMessage: function(spotcheck){
            if(spotcheck.status === "open"){
                if(!spotcheck.numUnchecked){
                    return "<i class='fa fa-check-circle color-green'></i> All " + spotcheck.numChecked + " item".pluralize(spotcheck.numChecked) + " have been scanned"
                }else{
                    return spotcheck.numUnchecked + " item".pluralize(spotcheck.numUnchecked) + " left to scan";
                }
            }else{
                var numIssues = spotcheck.numUnchecked + spotcheck.numUnexpected;

                if(numIssues){   
                    if(spotcheck.numChecked === 0){
                        return "<i class='fa fa-exclamation-circle color-orange'></i> No items scanned"
                    }else{
                        var message = "<i class='fa fa-exclamation-circle color-orange'></i> ";

                        // 1 unscanned and 2 scanned exceptions
                        var msg = [];

                        if(spotcheck.numUnchecked){
                            msg.push(spotcheck.numUnchecked + " unscanned " + "issue".pluralize(spotcheck.numUnchecked));
                        }
                        if(spotcheck.numUnexpected){
                            msg.push(spotcheck.numUnexpected + " scanned " + "exception".pluralize(spotcheck.numUnexpected) + " issue".pluralize(spotcheck.numUnexpected));
                        }
                        
                        message += msg.joinAdvanced(', ', ' and ');
                        
                        return message;
                    }
                }else{
                    return "<i class='fa fa-check-circle color-green'></i> All " + spotcheck.numChecked + " item".pluralize(spotcheck.numChecked) + " scanned"
                }
            }
        }
    };

    that.getSpotcheckMessages = function(spotcheck){
            var messages = [],
                MessagePriority = {
                    'Critical': 0,
                    'High': 1,
                    'Medium': 2,
                    'Low': 3
                };

            if(spotcheck.status === "open"){
                messages.push({
                    kind: "progress",
                    spotcheck: spotcheck,
                    priority: MessagePriority.Critical,
                    message: that.getSpotcheckProgressMessage(spotcheck)
                });
            }

            /*if(spotcheck.kind === "order"){
                messages.push({
                    kind: "checkout",
                    id: spotcheck.docId,
                    priority: MessagePriority.Critical,
                    message: "Spotcheck on check-out"
                });
            }

            if(spotcheck.kind === "reservation"){
                 messages.push({
                    kind: "reservation",
                    id: spotcheck.docId,
                    priority: MessagePriority.Critical,
                    message: "Spotcheck on reservation"
                });
            }

            if(spotcheck.kind === "kit"){
                 messages.push({
                    kind: "kit",
                    id: spotcheck.docId,
                    priority: MessagePriority.Critical,
                    message: "Spotcheck on kit"
                });
            }

            if(spotcheck.kind === "custody"){
                 messages.push({
                    kind: "custody",
                    id: spotcheck.docId,
                    priority: MessagePriority.Critical,
                    message: "Spotcheck on items in custody of"
                });
            }

             if(spotcheck.kind === "itemFilter"){
                if(spotcheck.itemFilter.location__in){
                    messages.push({
                        kind: "location",
                        priority: MessagePriority.Critical,
                        message: "Spotcheck on " + spotcheck.itemFilter.location__in.length + " location".pluralize(spotcheck.itemFilter.location__in.length)
                    });
                }else{
                    messages.push({
                        kind: "category",
                        priority: MessagePriority.Critical,
                        message: "Spotcheck on " + spotcheck.itemFilter.category__in.length + " category".pluralize(spotcheck.itemFilter.category__in.length)
                    });
                }
            }*/


            var dfd =  $.Deferred();

            dfd.resolve();

            return dfd.then(function(){
                // Sort by priority High > Low
                return messages.sort(function(a, b){
                    return a.priority - b.priority;
                });
            });
        };

    return that;
});