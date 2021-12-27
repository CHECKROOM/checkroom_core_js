import { enableFetchMocks } from 'jest-fetch-mock';
import moment from 'moment';
import api from './api';

enableFetchMocks();

describe('testing api', () => {
	const user = new api.ApiUser({
		tokenType: 'jwt',
		userId: 'heavy',
		userToken: 'todo',
		jwt: 'todo',
	});
	const ajax = new api.ApiAjax({
		customHeaders: () => {
			return {
				authorization: `Bearer ${user.userJwt}`,
			};
		},
	});
	const ds = new api.ApiDataSource({
		collection: 'items',
		urlApi: 'https://app.cheqroom.com/api/v2_5/',
		user,
		ajax,
	});
	const getError = (statusCode = 500, message = 'Error') => {
		return [
			JSON.stringify({ message, stackTrace: '', httpError: '', status: statusCode }),
			{ status: statusCode, statusText: message, headers: { 'content-type': 'application/json' } },
		];
	};

	beforeEach(() => {
		fetch.resetMocks();
	});

	it('get items', async () => {
		const RESPONSE_MOCK = {
			count: 1,
			docs: [{ _id: 'itemid' }],
		};

		fetch.mockResponse(JSON.stringify(RESPONSE_MOCK), {
			headers: { 'content-type': 'application/json' },
		});

		await expect(ds.get('test')).resolves.toStrictEqual(RESPONSE_MOCK);
		await expect(ds.search()).resolves.toStrictEqual(RESPONSE_MOCK);
	});

	it('should throw ApiServerCapicity (503)', async () => {
		fetch.mockResponse(...getError(503, '503 error'));
		await expect(ds.search()).rejects.toThrow(new api.ApiServerCapicity());
	});

	it('should throw ApiSubscriptionLimit (422)', async () => {
		fetch.mockResponse(...getError(422, '422 limit error'));
		await expect(ds.search()).rejects.toThrow(new api.ApiSubscriptionLimit('422 limit error'));
	});

	it('should throw ApiUnprocessableEntity (422)', async () => {
		fetch.mockResponse(...getError(422, '422 error'));
		await expect(ds.search()).rejects.toThrow(new api.ApiUnprocessableEntity('422 error'));
	});

	it('should throw NetworkTimeout (408)', async () => {
		fetch.mockResponse(...getError(408, '408 error'));
		await expect(ds.search()).rejects.toThrow(new api.NetworkTimeout());
	});

	it('should throw ApiNotFound (404)', async () => {
		fetch.mockResponse(...getError(404, '404 error'));
		await expect(ds.get('notfound')).rejects.toThrow(new api.ApiNotFound());
	});

	it('should throw ApiForbidden (403)', async () => {
		fetch.mockResponse(...getError(403, '403 error'));
		await expect(ds.search()).rejects.toThrow(new api.ApiForbidden());
	});

	it('should throw ApiPaymentRequired (402)', async () => {
		fetch.mockResponse(...getError(402, '402 error'));
		await expect(ds.search()).rejects.toThrow(new api.ApiPaymentRequired());
	});

	it('should throw ApiUnauthorized (401)', async () => {
		fetch.mockResponse(...getError(401, '401 error'));
		await expect(ds.search()).rejects.toThrow(new api.ApiUnauthorized());
	});

	it('should throw ApiUnauthorized (400)', async () => {
		fetch.mockResponse(...getError(400, '400 error'));
		await expect(ds.search()).rejects.toThrow(new api.ApiBadRequest());
	});

	it('should throw ApiError (500)', async () => {
		fetch.mockResponse(...getError(500, '500 error'));
		await expect(ds.search()).rejects.toThrow(new api.ApiError());
	});

	it('should do multiple queued requests', async () => {
		const onResponse = jest.fn();
		const onError = jest.fn();
		fetch.mockResponse(() => new Promise((resolve) => resolve({})).then(onResponse).catch(onError));

		await ds.getMultiple(Array(200).fill('itemid')).then(async () => {
			expect(onResponse).toHaveBeenCalledTimes(2);
			expect(onError).toHaveBeenCalledTimes(0);
		});
	});
});
