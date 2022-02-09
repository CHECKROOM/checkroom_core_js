import Webhook from './webhook';

it('test', () => {
	const { name } = new Webhook();

	expect(name).toBe('');
});
