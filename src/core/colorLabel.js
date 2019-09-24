/**
 * The ColorLabel module
 * @module field
 * @copyright CHECKROOM NV 2015
 */
define(['jquery'], /** ColorLabel */ function ($) {

    var DEFAULTS = {
        id: null,
        name: '',
        color: 'Gold',
        readonly: false,
        selected: false,
        default: false
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
        this.readonly = spec.readonly || DEFAULTS.readonly;
        this.selected = spec.selected || DEFAULTS.selected;
        this.default = spec.default || DEFAULTS.default;
    };

    /**
     * isDirty
     * @name  ColorLabel#isDirty
     * @method
     * @returns {boolean}
     */
    ColorLabel.prototype.isDirty = function() {
        return this.raw.name != this.name ||
               this.raw.color != this.color;
    };

     /**
     * isValid
     * @name  ColorLabel#isValid
     * @method
     * @returns {boolean}
     */
    ColorLabel.prototype.isValid = function() {
        return this.name && this.name.length > 0;
    };

    /**
     * _fromJson
     * @name  ColorLabel#_fromJson
     * @method
     * @returns {boolean}
     */
    ColorLabel.prototype._fromJson = function(data){
        this.id = data.id || DEFAULTS.id;
        this.name = data.name || DEFAULTS.name;
        this.color = data.color || DEFAULTS.color;
        this.selected = data.selected || DEFAULTS.selected;
        this.readonly = data.readonly || DEFAULTS.readonly;
        this.default = data.default || DEFAULTS.default;

        return $.Deferred().resolve();
    };

    /**
     * _toJson
     * @name  ColorLabel#_toJson
     * @method
     * @returns {boolean}
     */
    ColorLabel.prototype._toJson = function(){
        return {
            id: this.id,
            name: this.name,
            color: this.color,
            selected: this.selected,
            readonly: this.readonly,
            default: this.default
        };
    };
 
    return ColorLabel;
});