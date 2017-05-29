/**
 * The Field module
 * @module field
 * @copyright CHECKROOM NV 2015
 */
define(['jquery'], /** Field */ function ($) {

    var DEFAULTS = {
        name: null,
        value: null,
        required: false,
        unit: "",
        kind: "string",
        form: false,
        editor: null,
        description: ""
    };

    /**
     * @name  Field
     * @class
     * @param spec
     * @constructor
     */
    var Field = function(spec) {
        spec = spec || {};
    
        this.raw = spec;
    
        this.name = spec.name || DEFAULTS.name;
        this.value = spec.value || DEFAULTS.value;
        this.required = spec.required || DEFAULTS.required;
        this.unit = spec.unit || DEFAULTS.unit;
        this.kind = spec.kind || DEFAULTS.kind;
        this.form = spec.form || DEFAULTS.form;
        this.editor = spec.editor || DEFAULTS.editor;   
        this.description = spec.description || DEFAULTS.description; 
    };

    /**
     * isValid
     * @name  Field#isValid
     * @method
     * @returns {boolean}
     */
    Field.prototype.isValid = function() {
        if(!this.required) return true;
        return $.trim(this.value) != "";
    };

    /**
     * isDirty
     * @name  Field#isDirty
     * @method
     * @returns {boolean}
     */
    Field.prototype.isDirty = function() {
        return this.raw.value != this.value;
    };

    /**
     * isEmpty
     * @name  Field#isEmpty
     * @method
     * @returns {boolean}
     */
    Field.prototype.isEmpty = function(){
        return $.trim(this.value) == "";
    };

    return Field;
});