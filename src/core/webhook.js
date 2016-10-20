/**
 * The WebHook module
 * @copyright CHECKROOM NV 2015
 * @module webhook
 */
define([
    'jquery',
    'common',
    'api',
    'document'],  /** @lends Document */ function ($, common, api, Document) {

    /*
    id = StringField(primary_key=True, default=shortuuid.uuid)
    name = StringField(required=True, min_length=3)
    address = URLField()  # e.g.: "http://my.domain.com/inventory_update"
    topic = StringField(choices=WEBHOOK_TOPICS)
    fields = StringField(default="*, location.*, items.*, customer.*")  # see also clean function
    format = StringField(choices=WEBHOOK_FORMATS, default=WEBHOOK_FORMATS[0])
    created_at = DateTimeField()
    modified = DateTimeField(default=DateHelper.getNow)
    enabled = BooleanField(default=True)
    log = ListField(EmbeddedDocumentField(WebHookLog))  # a log per unique return code and doc id
    log10 = ListField(EmbeddedDocumentField(WebHookLog))  # a log of the 10 latest fired hooks for this webhook
    nr_consecutive_fails = IntField(default=0)  # number of consecutive fails of this webhook
    by = ReferenceField("User")  # The user that added / updated this
     */

    // Some constant values
    var DEFAULTS = {
        id: "",
        name: "",
        address: "",
        topic: "",
        hookFields: "*, location.*, items.*, customer.*",  // avoid clash with Document.fields
        format: "",
        created: null,
        modified: null,
        enabled: true,
        log10: [],
        fails: 0

    };

    // Allow overriding the ctor during inheritance
    // http://stackoverflow.com/questions/4152931/javascript-inheritance-call-super-constructor-or-use-prototype-chain
    var tmp = function(){};
    tmp.prototype = Document.prototype;

    /**
     * WebHook describes a webhook which can trigger on certain events (signals)
     * @name  WebHook
     * @class
     * @property {string} name          the name
     * @property {string} address       the url which will be called
     * @property {string} topic         the topic name ('item.changelocation', 'item.changegeo', 'item.expire', ...)
     * @property {string} hookFields    the fields which should be fetched from the db (default: `*, location.*, items.*, customer.*)
     * @property {string} format        the output format (only `json` is supported)
     * @property {Moment} created       the creation date of the webhook
     * @property {Moment} modified      the modified date of the webhook
     * @property {boolean} enabled      whether or not the webhook is enabled
     * @property {array} log10          the last 10 logs of the webhook
     * @property {int} fails            the number of consequtive fails
     * @constructor
     * @extends Document
     */
    var WebHook = function(opt) {
        var spec = $.extend({}, opt);
        Document.call(this, spec);

        this.name = spec.name || DEFAULTS.name;
        this.address = spec.address || DEFAULTS.address;
        this.topic = spec.topic || DEFAULTS.topic;
        this.hookFields = spec.hookFields || DEFAULTS.hookFields;
        this.created = spec.created || DEFAULTS.created;
        this.modified = spec.modified || DEFAULTS.modified;
        this.enabled = (spec.enabled!=null) ? (spec.enabled==true) : DEFAULTS.enabled;
        this.log10 = spec.log10 || DEFAULTS.log10.slice();
        this.fails = spec.fails || DEFAULTS.fails;
    };

    WebHook.prototype = new tmp();
    WebHook.prototype.constructor = WebHook;

    //
    // Specific validators
    /**
     * Checks if name is valid
     * @name WebHook#isValidName
     * @method
     * @return {Boolean}
     */
    WebHook.prototype.isValidName = function() {
        this.name = $.trim(this.name);
        return (this.name.length>=3);
    };

    /**
     * Checks if address is valid
     * @name  WebHook#isValidAddress
     * @method
     * @return {Boolean}
     */
    WebHook.prototype.isValidAddress = function() {
        this.address = $.trim(this.address);
        return common.isValidURL(this.address);
    };

    //
    // Document overrides
    //
    /**
     * Checks if the webhook has any validation errors
     * @name WebHook#isValid
     * @method
     * @returns {boolean}
     * @override
     */
    WebHook.prototype.isValid = function() {
        return  this.isValidName() &&
                this.isValidAddress() &&
                this.topic;  // TODO: We need a better check here
    };

    WebHook.prototype._getDefaults = function() {
        return DEFAULTS;
    };

    /**
     * Checks if the object is empty, it never is
     * @name  WebHook#isEmpty
     * @method
     * @returns {boolean}
     * @override
     */
    WebHook.prototype.isEmpty = function() {
        return (
            (Document.prototype.isEmpty.call(this)) &&
                (this.name==DEFAULTS.name) &&
                (this.address==DEFAULTS.address) &&
                (this.topic==DEFAULTS.topic));
    };

    /**
     * Checks if the webhook is dirty and needs saving
     * @returns {boolean}
     * @override
     */
    WebHook.prototype.isDirty = function() {
        var isDirty = Document.prototype.isDirty.call(this);
        if( (!isDirty) &&
            (this.raw)) {
            isDirty = (
                (this.name!=this.raw.name)||
                (this.address!=this.raw.address)||
                (this.topic!=this.raw.topic)||
                (this.enabled!=this.raw.enabled)
                );
        }
        return isDirty;
    };

    /**
     * Checks via the api if we can delete the WebHook document
     * @name  WebHook#canDelete
     * @method
     * @returns {promise}
     * @override
     */
    WebHook.prototype.canDelete = function() {
        // An WebHook can always be deleted
        return $.Deferred().resolve(true);
    };


    // toJson, fromJson
    // ----

    /**
     * _toJson, makes a dict of params to use during create / update
     * @param options
     * @returns {{}}
     * @private
     */
    WebHook.prototype._toJson = function(options) {
        var data = Document.prototype._toJson.call(this, options);
        data.name = this.name;
        data.address = this.address;
        data.topic = this.topic;
        data.fields = this.hookFields;
        data.modified = this.modified;
        data.enabled = this.enabled;
        // don't write out fields for:
        // - created_at
        // - log10, log
        // - nr_consecutive_fails
        return data;
    };

    /**
     * _fromJson: read some basic information
     * @method
     * @param {object} data the json response
     * @param {object} options dict
     * @returns {Promise}
     * @private
     */
    WebHook.prototype._fromJson = function(data, options) {
        var that = this;
        return Document.prototype._fromJson.call(this, data, options)
            .then(function() {
                that.name = data.name || DEFAULTS.name;
                that.address = data.address || DEFAULTS.address;
                that.topic = data.topic || DEFAULTS.topic;
                that.hookFields = data.fields || DEFAULTS.hookFields; // !
                that.created = data.created_at || DEFAULTS.created; // !
                that.modified = data.modified || DEFAULTS.modified;
                that.enabled = (data.enabled!=null) ? (data.enabled==true) : DEFAULTS.enabled;
                that.log10 = data.log10 || DEFAULTS.log10.slice();
                that.fails = data.nr_consecutive_fails || DEFAULTS.fails;
                return data;
            });
    };

    return WebHook;

});
