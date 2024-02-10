class Dom {
	template(elementId, variables = {}) {
		const sourceElement = document.getElementById("template-" + elementId);

		if (sourceElement) {
			let code = sourceElement.innerHTML;

			for (const variable in variables) {
				code = code.split("{" + variable + "}").join(variables[variable]);
			}

			return code;
		} else {
			console.error(`Element with ID '${elementId}' not found.`);
		}
	}

	replace(elementId, childHtml) {
		const parentElement = document.getElementById(elementId);

		if (parentElement) {
			parentElement.innerHTML = childHtml;
		} else {
			console.error(`Element with ID '${elementId}' not found.`);
		}
	}

	add(elementId, childHtml) {
		const parentElement = document.getElementById(elementId);

		if (parentElement) {
			parentElement.innerHTML += childHtml;
		} else {
		console.error(`Element with ID '${elementId}' not found.`);
		}
	}

	addToBody(childHtml) {
		const childElement = document.createElement("div");

		childElement.innerHTML = childHtml;

		document.body.appendChild(childElement);
	}

	clear(elementId) {
		const element = document.getElementById(elementId);

		if (element) {
			element.innerHTML = "";
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
			console.error(`Element with ID '${elementId}' not found.`);
			return;
		}

		// Attach the click event listener
		element.addEventListener("click", callback);
	}

	value(elementId) {
		const element = document.getElementById(elementId);

		if (element) {
			return element.value;
		} else {
			console.error(`Element with ID '${elementId}' not found.`);
			return "";
		}
	}

	enter(elementId, callback) {
		const inputElement = document.getElementById(elementId);

		if (!inputElement) {
			console.error(`Element with ID '${elementId}' not found.`);
			return;
		}

		inputElement.addEventListener("keypress", (event) => {
			if (event.key === "Enter") {
				callback(event);
			}
		});
	}

	keypress(elementId, callback) {
		const inputElement = document.getElementById(elementId);

		if (!inputElement) {
			console.error(`Element with ID '${elementId}' not found.`);
			return;
		}

		inputElement.addEventListener("keypress", (event) => {
			callback(event);
		});
	}

	exists(elementId) {
		return !!document.getElementById(elementId);
	}

	attr(elementId, attr) {
		const inputElement = document.getElementById(elementId);

		if (!inputElement) {
			console.error(`Element with ID '${elementId}' not found.`);
			return;
		}

		return inputElement.getAttribute(attr);
	}

	submit(id, callback) {
		document.getElementById(id).addEventListener('submit', function (event) {
			event.preventDefault();
			const submition = {};
			for (const input of event.target.elements) {
				if (input.name && input.value) {
					submition[input.name] = input.value;
				}
			}
			callback(submition);
		});
	}
}

export default new Dom();
