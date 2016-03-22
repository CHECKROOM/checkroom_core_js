/*
 * KeyValue helpers
 */
define(function () {
    var _getCategoryName = function(obj){
        return typeof obj === 'string' ? obj : obj["name"];
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
            if (items.length == 0) {
                return "No items";
            }

            var item = null,
                key = null,
                catName = null,
                catSummary = {},
                firstKey = "",
                firstKeyCount = 0;

            for (var i = 0, len = items.length; i < len; i++) {
                item = items[i];
                catName = (item.category) ? _getCategoryName(item.category) : '';
                key = (catName) ? this.getCategoryNameFromKey(catName) : '';
                //console.log(item.category, catName, key);

                if (!catSummary[key]) {
                    catSummary[key] = 1;
                } else {
                    catSummary[key] += 1;
                }

                // first key should be category with largest number of items
                if (catSummary[key] > firstKeyCount) {
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
                summ += ' +' + other + ' other';
            }

            return summ;
        },
        /**
         * getItemSummary
         *
         * Works much like getCategorySummary but prefers making summaries with kit names in it
         *
         * @memberOf common
         * @name  common#getItemSummary
         * @method
         *
         * @param  {array} items
         * @return {string}
         */
        getItemSummary: function(items) {
            items = items || [];
            if (items.length == 0) {
                return "No items";
            }

            var sep = ", ",
                item = null,
                numKits = 0,
                kitItems = {},
                unkittedItems = [];

            // Do a first loop to extract all items for which we have a kit name
            // If we don't have the kit.name field, we'll treat the item as if
            // the item was not in a kit, and put it in unkittedItems
            for (var i=0, len = items.length; i < len; i++) {
                item = items[i];
                if( (item.kit) &&
                    (item.kit.name)) {
                    if (kitItems[item.kit.name]) {
                        kitItems[item.kit.name].push(item);
                    } else {
                        kitItems[item.kit.name] = [item];
                        numKits += 1;
                    }
                } else {
                    unkittedItems.push(item);
                }
            }

            // If we have no kits (or no kit names),
            // we'll just use getCategorySummary
            // which works pretty well for that
            if (numKits==0) {
                return this.getCategorySummary(items);
            } else {

                // Get all the kit names as an array
                var names = $.map(kitItems, function (val, key) {return key});

                // We only have kits and not unkitted items
                // We can try to make a very short summary of the kit names
                // If we can't fit multiple kit names into a single string
                // we'll take 1 (or more) and then add "+3 other kits"
                if (unkittedItems.length == 0) {
                    var maxKitNamesLength = 30;
                    return names.joinOther(maxKitNamesLength, sep, "other kits");
                } else {
                    // We have a mix of kits an unkitted items
                    // If we only have one kit, we'll use its name
                    // and just paste getCategorySummary after it
                    if (numKits==1) {
                        return names[0] + sep + this.getCategorySummary(unkittedItems);
                    } else {
                        // We have multiple kits, so we'll put
                        // 3 kits, 5 pumps +2 other
                        return len(names) + " kits" + sep + this.getCategorySummary(unkittedItems);
                    }
                }
            }
        }
    };
});