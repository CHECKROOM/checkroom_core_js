/**
 * Extend LocalStorage to handle Quota and Security exception 
 * without breaking execution
 *
 * https://gist.github.com/rachelbaker/6161375
 * https://slicedlemon.be/blog/local-storage-is-not-supported-with-safari-in-private-mode-1274581356
 * https://gist.github.com/juliocesar/926500
 * 
 * @global
 * @name  clientStorage
 */
define([], function() {
    var setItem = localStorage.setItem,
        getItem = localStorage.getItem,
        removeItem = localStorage.removeItem;

    var _data = {};

    /**
     * Override default localStorage.setItem
     * Try to set an object for a key in local storage
     * 
     * @param {string} k
     * @param {object|string} v
     * @return {bool}
     */
    Storage.prototype.setItem = function (k, v) {
        try {
            setItem.apply(this, [k, v]);
        } catch (e) {
            _data[k] = String(v);
        }

        return true;
    };

    /**
     * Override default localStorage.getItem
     * Try to get an object for a key in local storage
     * 
     * @param {string} k
     * @return {object|string|null}
     */
    Storage.prototype.getItem = function (k) {
        try {
            return getItem.apply(this, [k]);
        } catch (e) {
            return _data.hasOwnProperty(k) ? _data[k] : undefined;
        }

        return null;
    };

     /**
     * Override default localStorage.removeItem
     * Try to remove an object for a key in local storage
     * 
     * @param {string} k
     * @return {object|string|null}
     */
    Storage.prototype.removeItem = function(k) {
        try{
            removeItem.apply(this, [k]);
        } catch (e){
            delete _data[k]; 
        }

        return true;
    }
});