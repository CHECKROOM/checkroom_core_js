/**
 * The ColorLabel module
 * @module field
 * @copyright CHECKROOM NV 2015
 */
define(['jquery'], /** ColorLabel */ function ($) {

    var DEFAULTS = {
        id: null,
        name: '',
        color: 'Gold'
    };

    /**
     * @name  ColorLabel
     * @class
     * @param spec
     * @constructor
     */
    var ColorLabel = function(spec) {
        spec = spec || {};
    
        this.raw = $.extend({}, DEFAULTS, spec);
        
        this.id = spec.id || DEFAULTS.id;
        this.name = spec.name || DEFAULTS.name;
        this.color = spec.color || DEFAULTS.color;
    };

    /**
     * isDirty
     * @name  Field#isDirty
     * @method
     * @returns {boolean}
     */
    ColorLabel.prototype.isDirty = function() {
        return this.raw.name != this.name ||
               this.raw.color != this.color;
    };

     /**
     * isValid
     * @name  Field#isValid
     * @method
     * @returns {boolean}
     */
    ColorLabel.prototype.isValid = function() {
        return this.name && this.name.length > 0;
    };
 
    return ColorLabel;
});