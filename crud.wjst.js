import Http from '/api/wjst/http';

class Crud {
	api = '';

	constructor(apiExtended) {
		this.api = apiExtended;
	}

	async create(data) {
		try {
			const response = await Http.post(`${this.api}/create`, data);
			return response;
		} catch (error) {
			throw new Error(`Failed to create: ${error.message}`);
		}
	}

	async get() {
		try {
			const response = await Http.get(`${this.api}/get`);
			return response;
		} catch (error) {
			throw new Error(`Failed to get: ${error.message}`);
		}
	}
	perPage = 20;
	getName = '';
	async page(page, name = '') {
		try {
			 page--;
			const response = await Http.get(`${this.api}/get${name || this.getName}?skip=${page * this.perPage}&limit=${this.perPage}`);
			return response;
		} catch (error) {
			throw new Error(`Failed to get: ${error.message}`);
		}
	}

	async update(data) {
		try {
			const response = await Http.post(`${this.api}/update`, data);
			return response;
		} catch (error) {
			throw new Error(`Failed to update: ${error.message}`);
		}
	}

	async delete(data) {
		try {
			const response = await Http.post(`${this.api}/delete`, data);
			return response;
		} catch (error) {
			throw new Error(`Failed to delete: ${error.message}`);
		}
	}
}

export default Crud;
