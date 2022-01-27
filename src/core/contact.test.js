import Contact from './contact';

describe('testing contact', () => {
	it('should be dirty', async () => {
		const contact = new Contact();

		expect(contact.isDirty()).toBeFalsy();

		contact._fromJson({ name: 'Test User', email: 'test@cheqroom.com', _id: 'sampleid' });
		contact.name = 'Updated name';
		expect(contact.isDirty()).toBeTruthy();
	});
});
