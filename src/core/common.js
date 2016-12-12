/**
 * The common module
 * bundles all common helpers together
 * @module Common
 * @namespace common
 * @copyright CHECKROOM NV 2015
 */
define([
    'jquery',
    'common/code',
    'common/order',
    'common/reservation',
    'common/item',
    'common/conflicts',
    'common/keyValues',
    'common/image',
    'common/attachment',
    'common/inflection',
    'common/validation',
    'common/utils',
    'common/slimdown',
    'common/kit',
    'common/contact',
    'common/user',
    'common/template',
    'common/clientStorage',
    'common/document',
    'common/transaction'], function($, code, order, reservation, item, conflicts, keyvalues, image, attachment, inflection, validation, utils, slimdown, kit, contact, user, template, clientStorage, _document, transaction) {
     /**
     * Return common object with different helper methods
     */
    return $.extend({}, 
        code, 
        order, 
        reservation, 
        item, 
        conflicts, 
        keyvalues,
        image,
        attachment,
        validation,
        utils,
        kit,
        contact,
        user,
        template,
        _document,
        transaction);
});