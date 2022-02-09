//Queued AJAX requests
//https://stackoverflow.com/questions/3034874/sequencing-ajax-requests/3035268#3035268
//http://jsfiddle.net/p4zjH/1/

const ajaxQueue = () => {
	var previous = Promise.resolve();

	return function (fn, fail) {
		if (typeof fn !== 'function') {
			throw 'must be a function';
		}

		return (previous = previous.then(fn, fail || fn));
	};
};

export default ajaxQueue;
