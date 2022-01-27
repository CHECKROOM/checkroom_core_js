import Field from './field';

describe('testing Field', () => {
	it('should be empty', () => {
		const field = new Field();

		expect(field.isEmpty()).toBeTruthy();

		field.value = 'test';
		expect(field.isEmpty()).toBeFalsy();

		field.value = 200;
		expect(field.isEmpty()).toBeFalsy();
	});
});
