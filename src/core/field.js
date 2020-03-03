/**
 * The Field module
 * @module field
 * @copyright CHECKROOM NV 2015
 */
define(['jquery', 'common/validation'], /** Field */ function ($, validationHelper) {

    var DEFAULTS = {
        name: null,
        value: null,
        required: false,
        unit: "",
        kind: "string",
        form: false,
        editor: null,
        description: "",
        select: []
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
        this.select = spec.select || DEFAULTS.select;
    };

    /**
     * isValid
     * @name  Field#isValid
     * @method
     * @returns {boolean}
     */
    Field.prototype.isValid = function(allowEmpty) {
        var value = $.trim(this.value);

        // skip if not required and empty
        if(!this.required && value == "") return true;

        switch(this.kind){
            case "float":
            case "decimal":
            case "currency":
                return validationHelper.isNumeric(value);
            case "int":
                return validationHelper.isNumeric(value, true);
            case "date":
            case "datetime":
                return validationHelper.isValidDate(value);
            case "string":
            case "select":
                if(this.editor == "phone"){
                    return validationHelper.isValidPhone(value);
                }
                if(this.editor == "email"){
                    return validationHelper.isValidEmail(value);
                }
                if(this.editor == "url"){
                    return validationHelper.isValidURL(value);
                }
                if(this.editor == "number"){
                    return validationHelper.isNumeric(value);
                }

                return value != "";
            default:

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