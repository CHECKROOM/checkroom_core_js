/**
 * The Field module
 * @module field
 * @copyright CHECKROOM NV 2015
 */
define(['jquery', 'common'], /** Field */ function ($, common) {

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
        var value = $.trim(this.value);

        // skip if not required and empty
        if(!this.required && value == "") return true;

        switch(this.kind){
            case "float":
            case "decimal":
            case "currency":
                return common.isNumeric(value);
            case "int":
                return common.isNumeric(value, true);
            case "date":
            case "datetime":
                return common.isValidDate(value);
            default:
                if(this.editor == "phone"){
                    return common.isValidPhone(value);
                }
                return true;
        }     
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