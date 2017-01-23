/**
 * The Signup module
 * a Signup class
 * @module signup
 * @copyright CHECKROOM NV 2017
 */
define([
    "jquery",
    "jstz", 
    "api",
    "settings",
    "common/validation",
    "common/utils"], function ($, jstz, api, settings, validation, utils) {

    var DEFAULT_PLAN = "1215_cr_90";
    var DEFAULT_PERIOD = "yearly";
    var DEFAULT_SOURCE = "attempt";
    var DEFAULT_KIND = "trial";

    var Signup = function(opt) {
        this.ds = opt.ds || new api.ApiAnonymous({
                urlApi: settings.urlApi,
                ajax: new api.ApiAjax({useJsonp: settings.useJsonp})
            });

        this.firstName = opt.firstName || "";  // between 2 and 25 chars
        this.lastName = opt.lastName || "";  // between 2 and 25 chars
        this.company = opt.lastName || "";  // between 3 and 50 chars
        this.timezone = opt.timezone || jstz.determine().name();
        this.email = opt.email || "";
        this.login = opt.login || "";
        this.password = opt.password || "";
        this.plan = opt.plan || DEFAULT_PLAN;
        this.period = opt.plan || DEFAULT_PERIOD;
        this.source = opt.source || "";
        this.phone = opt.phone || "";
        this.industry = opt.industry || "";

        this.onBeforeCreateAccount = opt.onBeforeCreateAccount;
        this.onCreatedAccount = opt.onCreatedAccount;
        this.onBeforeActivateAccount = opt.onBeforeActivateAccount;
        this.onActivatedAccount = opt.onActivatedAccount;
    };

    // Implementation
    // ---
    Signup.prototype.validContactInfo = function() {
        return this.firstNameIsValid() &&
            this.lastNameIsValid() &&
            this.companyIsValid() &&
            this.emailIsValid();
    };

    Signup.prototype.validCredentials = function() {
        return this.loginIsValid() &&
            this.passwordIsValid();
    };

    Signup.prototype.firstNameIsValid = function() {
        var firstName = $.trim(this.firstName);
        return (firstName.length) >= 2 && (firstName.length <= 25);
    };

    Signup.prototype.lastNameIsValid = function() {
        var lastName = $.trim(this.lastName);
        return (lastName.length) >= 2 && (lastName.length <= 25);
    };

    Signup.prototype.companyIsValid = function() {
        var company = $.trim(this.company);
        return (company.length>=3) && (company.length<=50);
    };

    Signup.prototype.companyExists = function() {
        var account = this.getGroupId();
        return this.ds.call("accountExists", {account: account})
            .then(function(resp) {
                return resp.result;
            });
    };

    Signup.prototype.emailIsValid = function() {
        return validation.isValidEmail(this.email);
    };

    Signup.prototype.emailExists = function() {
        if (this.emailIsValid()) {
            return this.ds.call('emailExists', {email: this.email})
                .then(function(resp) {
                    return resp.result;
                });
        } else {
            return $.Deferred().resolve(true);
        }
    };

    Signup.prototype.loginIsValid = function() {
        var login = this.login
            .NoWhiteSpaceInWord()
            .OnlyAlphaNumSpaceUnderscoreAndDot();
        return (login.length>=4) && (login==this.login);
    };

    Signup.prototype.loginExists = function() {
        if (this.loginIsValid()) {
            return this.ds.call('loginExists', {login: this.login})
                .then(function(resp) {
                    return resp.result;
                });
        } else {
            return $.Deferred().resolve(true);
        }
    };

    Signup.prototype.passwordIsValid = function() {
        return validation.isValidPassword($.trim(this.password));
    };

    Signup.prototype.phoneIsValid = function() {
        return validation.isValidPhone($.trim(this.phone));
    };

    // Business logic
    // ----
    Signup.prototype.getGroupId = function() {
        var company = $.trim(this.company);
        return company.OnlyAlphaNumSpaceAndUnderscore();
    };

    Signup.prototype.getFullName = function() {
        var firstName = $.trim(this.firstName);
        var lastName = $.trim(this.lastName);
        return firstName + " " + lastName;
    };

    Signup.prototype.createAccount = function() {
        var that = this,
            beforeCreate = this.onBeforeCreateAccount || $.Deferred().resolve(),
            afterCreate = this.onCreatedAccount || $.Deferred().resolve();

        return beforeCreate()
            .then(function() {
                return that.ds.longCall("createAccount", {
                    kind: DEFAULT_KIND,
                    period: $.trim(that.period),
                    plan: $.trim(that.plan),
                    company: $.trim(that.company),
                    groupId: that.getGroupId()
                })
                    .then(function(data) {
                        return afterCreate(data);
                    });
            })
    };

    Signup.prototype.activateAccount = function() {
        var that = this,
            beforeActivate = this.onBeforeActivateAccount || $.Deferred().resolve(),
            afterActivate = this.onActivatedAccount || $.Deferred().resolve();

        return beforeActivate()
            .then(function() {
                return that.ds.longCall("activateAccount", {
                    groupId: that.getGroupId(),
                    name: that.getFullName(),
                    login: $.trim(that.login),
                    password: $.trim(that.password),
                    timezone: $.trim(that.timezone),
                    load_sample: false,
                    owner_customer: true,
                    maintenance_customer: true
                })
                    .then(function(data) {
                        return afterActivate(data);
                    });
            });

    };

    // Static constructor
    // ----
    /**
     * Constructor function that creates a Signup object from the params on the querystring
     * @returns {Signup}
     */
    Signup.fromQueryString = function() {
        var name = utils.getUrlParam("name", "").capitalize(),
            email = utils.getUrlParam("email", ""),
            company = utils.getUrlParam("company", ""),
            firstName = utils.getUrlParam("firstName", "").capitalize(),
            lastName = utils.getUrlParam("lastName", "").capitalize(),
            login = utils.getUrlParam("login", "").toLowerCase(),
            source = utils.getUrlParam("source", DEFAULT_SOURCE),
            plan = utils.getUrlParam("plan", DEFAULT_PLAN),
            period = utils.getUrlParam("period", DEFAULT_PERIOD),
            timezone = utils.getUrlParam("period", jstz.determine().name());

        if( (firstName.length==0) &&
            (lastName.length==0) &&
            (name.length>0)) {
            var parts = name.split(" ");
            firstName = parts.shift();
            lastName = parts.join(" ");
        }

        if( (login.length==0) &&
            (firstName.length>0) &&
            (lastName.length>0)) {
            login = utils.getLoginName(firstName, lastName);
        }

        return new Signup({
            name: name,
            email: email,
            company: company,
            timezone: timezone,
            firstName: firstName,
            lastName: lastName,
            login: login,
            source: source,
            plan: plan,
            period: period
        });
    };

    return Signup;

});