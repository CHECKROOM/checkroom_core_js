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
    "common/inflection",
    "common/validation",
    "common/utils"], function ($, jstz, api, settings, inflection, validation, utils) {

    var DEFAULT_PLAN = "1215_cr_90";
    var DEFAULT_PERIOD = "yearly";
    var DEFAULT_SOURCE = "attempt";
    var DEFAULT_KIND = "trial";

    var Signup = function(opt, settings) {
        opt = opt || {};
        this.ds = opt.ds || new api.ApiAnonymous({
                urlApi: settings.urlApi,
                ajax: new api.ApiAjax({useJsonp: settings.useJsonp})
            });

        this.firstName = opt.firstName || "";  // between 2 and 25 chars
        this.lastName = opt.lastName || "";  // between 2 and 25 chars
        this.company = opt.company || "";  // between 3 and 50 chars
        this.timezone = opt.timezone || jstz.determine().name();
        this.email = opt.email || "";
        this.login = opt.login || "";
        this.password = opt.password || "";
        this.plan = opt.plan || DEFAULT_PLAN;
        this.period = opt.period || DEFAULT_PERIOD;
        this.source = opt.source || "";
        this.phone = opt.phone || "";
        this.industry = opt.industry || "";

        this.inviteToken = opt.inviteToken || "";

        this.onBeforeCreateAccount = opt.onBeforeCreateAccount;
        this.onCreatedAccount = opt.onCreatedAccount;
        this.onBeforeActivateAccount = opt.onBeforeActivateAccount;
        this.onActivatedAccount = opt.onActivatedAccount;
        this.onBeforeActivateInvite = opt.onBeforeActivateInvite;
        this.onActivatedInvite = opt.onActivatedInvite;
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

    Signup.prototype.emailIsValid = function(denyFreeEmail) {
        var email = $.trim(this.email);
        var isValid = validation.isValidEmail(email);
        if( (isValid) &&
            (denyFreeEmail==true)) {
            return !validation.isFreeEmail(email);
        }
        return isValid;
    };

    Signup.prototype.emailExists = function() {
        if (this.emailIsValid()) {
            return this.ds.call('emailExists', {email: this.email})
                .then(function(resp) {
                    return resp.result;
                });
        } else {
            return $.Deferred().resolve(false);
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

    Signup.prototype.inviteIsValid = function(){
        if($.trim(this.inviteToken) != ""){
            return this.ds.call('checkInvite', { code: this.inviteToken }).then(function(resp){
                return resp.result;
            });
        }else{
            return $.Deferred().resolve(false);
        }
    }

    // Business logic
    // ----
    Signup.prototype.getGroupId = function() {
        var company = $.trim(this.company);
        return company.OnlyAlphaNumSpaceAndUnderscore();
    };

    Signup.prototype.getFullName = function() {
        var firstName = $.trim(this.firstName);
        var lastName = $.trim(this.lastName);
        return $.trim(firstName + " " + lastName);
    };

    Signup.prototype.setFullName = function(name) {
        var parts = Signup.splitFirstLastName($.trim(name));
        this.firstName = parts.firstName;
        this.lastName = parts.lastName;
    };

    Signup.prototype.createAccount = function() {
        var that = this,
            beforeCreate = this.onBeforeCreateAccount,
            afterCreate = this.onCreatedAccount;

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

    Signup.prototype.activateAccount = function(storeInLocalStorage) {
        var that = this,
            beforeActivate = this.onBeforeActivateAccount,
            afterActivate = this.onActivatedAccount;

        return beforeActivate()
            .then(function() {
                return that.ds.longCall("activateAccount", {
                    groupId: that.getGroupId(),
                    name: that.getFullName(),
                    login: $.trim(that.login),
                    email: $.trim(that.email),
                    password: $.trim(that.password),
                    timezone: $.trim(that.timezone),
                    load_sample: false,
                    owner_customer: true,
                    maintenance_customer: true
                })
                    .then(function(user) {
                        if(storeInLocalStorage){
                            // Already store the login token in localStorage
                            var tmpUser = new api.ApiUser({userId: that.login, userToken: user.data.token});
                            tmpUser.toStorage();
                        }

                        return afterActivate(user);
                    });
            });

    };

    Signup.prototype.activateInvite = function(storeInLocalStorage){
        var that = this,
            beforeActivate = this.onBeforeActivateInvite,
            afterActivate = this.onActivatedInvite;

        return beforeActivate()
            .then(function(){
                return  that.ds.longCall('activateInvite', {
                    name: that.getFullName(),
                    code: that.inviteToken,
                    login: $.trim(that.login),
                    password: $.trim(that.password),
                    timezone: $.trim(that.timezone)
                }).then(function(user){
                    if(storeInLocalStorage){
                        // Already store the login token in localStorage
                        var tmpUser = new api.ApiUser({userId: that.login, userToken: user.data.token});
                        tmpUser.toStorage();
                    }

                    return afterActivate(user);
                })
            })
    }

    Signup.prototype.storeLead = function(tags){
        return this.ds.call("storeLead", {
            firstName: $.trim(this.firstName),
            lastName: $.trim(this.lastName),
            email: $.trim(this.email),
            company: $.trim(this.company),
            tags: tags || []
        });
    };

    Signup.prototype.onBeforeCreateAccount = function(){
        if(this.onBeforeCreateAccount) return this.onBeforeCreateAccount();

        return $.Deferred().resolve();
    };

    Signup.prototype.onCreatedAccount = function(){
        if(this.onCreatedAccount) return this.onCreatedAccount();

        return $.Deferred().resolve();
    };

    Signup.prototype.onBeforeActivateAccount = function(){
        if(this.onBeforeActivateAccount) return this.onBeforeActivateAccount();

        return $.Deferred().resolve();
    };


    Signup.prototype.onActivatedAccount = function(){
        if(this.onActivatedAccount) return this.onActivatedAccount();

        return $.Deferred().resolve();
    };

    Signup.prototype.onBeforeActivateInvite = function(){
        if(this.onBeforeActivateInvite) return this.onBeforeActivateInvite();

        return $.Deferred().resolve();
    };


    Signup.prototype.onActivatedInvite = function(){
        if(this.onActivatedInvite) return this.onActivatedInvite();

        return $.Deferred().resolve();
    };


    // Static constructor
    // ----
    Signup.splitFirstLastName = function(name) {
        var parts = name.split(" ");
        return {
            firstName: $.trim(parts.shift()),
            lastName: $.trim(parts.join(" "))
        };
    };

    /**
     * Constructor function that creates a Signup object from the params on the querystring
     * @returns {Signup}
     */
    Signup.fromQueryString = function(opt, settings) {
        var name = utils.getUrlParam("name", "").capitalize(),
            email = utils.getUrlParam("email", ""),
            company = utils.getUrlParam("company", ""),
            firstName = utils.getUrlParam("firstName", "").capitalize(),
            lastName = utils.getUrlParam("lastName", "").capitalize(),
            login = utils.getUrlParam("login", "").toLowerCase(),
            source = utils.getUrlParam("source", DEFAULT_SOURCE),
            plan = utils.getUrlParam("plan", DEFAULT_PLAN),
            period = utils.getUrlParam("period", DEFAULT_PERIOD),
            timezone = utils.getUrlParam("timezone", jstz.determine().name()),
            inviteToken = utils.getUrlParam("code", "");

        if( (firstName.length==0) &&
            (lastName.length==0) &&
            (name.length>0)) {
            var parts = Signup.splitFirstLastName(name);
            firstName = parts.firstName;
            lastName = parts.lastName;
        }

        if( (login.length==0) &&
            (firstName.length>0) &&
            (lastName.length>0)) {
            login = utils.getLoginName(firstName, lastName);
        }

        return new Signup($.extend({
            name: name,
            email: email,
            company: company,
            timezone: timezone,
            firstName: firstName,
            lastName: lastName,
            login: login,
            source: source,
            plan: plan,
            period: period,
            inviteToken: inviteToken
        }, opt), settings);
    };

    return Signup;

});