class Dom {
	template(sourceSelector, variables = {}) {
		const sourceElement = document.getElementById('template-'+sourceSelector);

		if (sourceElement) {
			let code = sourceElement.innerHTML;

			for (const variable in variables) {
				code = code.split('{' + variable + '}').join(variables[variable]);
			}

			return code;
		} else {
			console.error('Source element not found.');
		}
	}

	replace(parentSelector, childHtml) {
		const parentElement = document.getElementById(parentSelector);

		if (parentElement) {
			parentElement.innerHTML = childHtml;
		} else {
			console.error('Parent element not found.');
		}
	}

	add(parentSelector, childHtml) {
		const parentElement = document.getElementById(parentSelector);

		if (parentElement) {
			const childElement = document.createElement('div');
			childElement.innerHTML = childHtml;
			parentElement.appendChild(childElement);
		} else {
			console.error('Parent element not found.');
		}
	}

	clear(elementId) {
		const element = document.getElementById(elementId);

		if (element) {
			childElement.innerHTML = '';
		} else {
			console.error(`Element with ID ${elementId} not found.`);
		}
	}

	remove(elementId) {
		const element = document.getElementById(elementId);

		if (element) {
			element.remove();
		} else {
			console.error(`Element with ID ${elementId} not found.`);
		}
	}

		click(elementId, callback) {
		const element = document.getElementById(elementId);

		if (!element) {
			console.error(`Element with ID '${id}' not found.`);
			return;
		}

		// Attach the click event listener
		element.addEventListener('click', callback);
	}
}

export default new Dom();
