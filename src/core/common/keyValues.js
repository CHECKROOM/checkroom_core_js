/*
 * KeyValue helpers
 */
define(function () {
    var _getCategoryName = function(obj){
        return typeof obj === 'string'?obj:obj["name"]; 
    };

    return {
        /**
         * Creates a category key from a friendly name
         *
         * @memberOf  common
         * @name  common#getCategoryKeyFromName
         * @method
         * 
         * @param  {string} name 
         * @return {string}   
         */
        getCategoryKeyFromName: function(name) {
            return "cheqroom.types.item." + name.split(' ').join('_').split('.').join('').toLowerCase();
        },
        /**
         * Creates a name from a category key
         *
         * @memberOf common
         * @name  common#getCategoryNameFromKey
         * @method
         * 
         * @param  {string} key
         * @return {string}
         */
        getCategoryNameFromKey: function(key) {
            var re = new RegExp('_', 'g');
            return key.split('.').pop().replace(re, ' ');
        },
        /**
         * getCategorySummary
         *
         * @memberOf common
         * @name  common#getCategorySummary
         * @method
         * 
         * @param  {array} items 
         * @return {string}      
         */
        getCategorySummary: function(items) {
            items = items || [];
            if(items.length == 0) return "No items";

            var catSummary = {};
            var firstKey = "";
            var firstKeyCount = 0;
            var that = this;

            for (var i = 0, len = items.length; i < len; i++) {
                var item = items[i];
                var key = (item.category) ? that.getCategoryNameFromKey(_getCategoryName(item.category)) : '';

                if(!catSummary[key]){
                    catSummary[key] = 1;
                }else{
                    catSummary[key] += 1;
                }

                // first key should be category with largest number of items
                if(catSummary[key] > firstKeyCount){ 
                    firstKey = key;
                    firstKeyCount = catSummary[key];
                }
            }
            
            var summ = catSummary[firstKey] + " ";
            if (firstKeyCount == 1 && String.prototype.singularize) {
                summ += firstKey.singularize();
            } else {
                summ += firstKey;
            }

            if (items.length > catSummary[firstKey]) {
                var other = items.length - catSummary[firstKey];
                summ += ' + ' + other + ' other';
            }

            return summ;
        }
    };
});