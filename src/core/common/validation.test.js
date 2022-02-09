import validation from './validation';

describe('testing common/validation', () => {
	it('should be numeric', () => {
		expect(validation.isNumeric('12345')).toBeTruthy();
		expect(validation.isNumeric(12345)).toBeTruthy();
		expect(validation.isNumeric(12.345)).toBeTruthy();
		expect(validation.isNumeric('test')).toBeFalsy();
	});
});
