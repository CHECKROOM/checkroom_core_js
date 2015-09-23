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
    'common/slimdown'], function($, code, order, reservation, item, conflicts, keyvalues, image, attachment, inflection, validation, utils, slimdown) {  
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
        utils);
});