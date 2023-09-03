class Http {
	async get(url) {
		try {
			const response = await fetch(url);
			if (!response.ok) {
				throw new Error(`HTTP Error! Status: ${response.status}`);
			}
			return await response.json();
		} catch (error) {
			throw new Error(`Failed to fetch data: ${error.message}`);
		}
	}

	async post(url, data) {
		try {
			const response = await fetch(url, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(data),
			});

			if (!response.ok) {
				throw new Error(`HTTP Error! Status: ${response.status}`);
			}

			return await response.json();
		} catch (error) {
			throw new Error(`Failed to post data: ${error.message}`);
		}
	}
}

export default new Http();
