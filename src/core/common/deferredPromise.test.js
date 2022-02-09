import DeferredPromise from './deferredPromise';

jest.useFakeTimers();
jest.spyOn(global, 'setTimeout');

describe('testing DeferredPromise', () => {
	it('should defer', () => {
		const deferred = new DeferredPromise();
		const callback = jest.fn();

		setTimeout(() => {
			callback();
			deferred.resolve();
		}, 2000);

		// At this point in time, the callback should not have been called yet
		expect(callback).not.toBeCalled();

		// Fast-forward until all timers have been executed
		jest.runAllTimers();

		// Now our callback should have been called!
		expect(callback).toBeCalled();
		expect(callback).toHaveBeenCalledTimes(1);
	});
});
