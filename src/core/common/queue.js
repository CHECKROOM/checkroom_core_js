//Queued AJAX requests
//https://stackoverflow.com/questions/3034874/sequencing-ajax-requests/3035268#3035268
//http://jsfiddle.net/p4zjH/1/
define(['jquery'], function($){
	$.fn.ajaxQueue = function () {
	    var previous = new $.Deferred().resolve();
	    
	    return function (fn, fail) {
	        if (typeof fn !== 'function') {
	            throw 'must be a function';
	        }
	        
	        return previous = previous.then(fn, fail || fn);
	    };
	};
})