class Http {
    headers = this.loadHeadersFromLocalStorage();

    async get(url) {
        try {
            const response = await fetch(url, {
                headers: this.headers
            });
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
                    ...this.headers,
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

    setHeader(header, value) {
        this.headers[header] = value;
        this.saveHeadersToLocalStorage();
    }

    removeHeader(header) {
        delete this.headers[header];
        this.saveHeadersToLocalStorage();
    }

    saveHeadersToLocalStorage() {
        localStorage.setItem('httpHeaders', JSON.stringify(this.headers));
    }

    private loadHeadersFromLocalStorage() {
        const storedHeaders = localStorage.getItem('httpHeaders');
        return storedHeaders ? JSON.parse(storedHeaders) : {};
    }
}

export default new Http();
