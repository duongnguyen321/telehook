/**
 * Centralized API Client for Admin Dashboard
 * All API calls should use this to ensure consistent auth headers
 */

const API = {
	/**
	 * Get the auth token from localStorage
	 * Checks multiple keys for backwards compatibility
	 * @returns {string|null}
	 */
	getToken() {
		return (
			localStorage.getItem('auth_token') ||
			localStorage.getItem('token') ||
			localStorage.getItem('dashboard_token') ||
			localStorage.getItem('feed_token') ||
			null
		);
	},

	/**
	 * Set the auth token (standardized key)
	 * @param {string} token
	 */
	setToken(token) {
		localStorage.setItem('auth_token', token);
		// Clean up old keys
		localStorage.removeItem('token');
		localStorage.removeItem('dashboard_token');
		localStorage.removeItem('feed_token');
	},

	/**
	 * Clear auth token
	 */
	clearToken() {
		localStorage.removeItem('auth_token');
		localStorage.removeItem('token');
		localStorage.removeItem('dashboard_token');
		localStorage.removeItem('feed_token');
	},

	/**
	 * Get authorization headers
	 * @param {boolean} includeContentType - Include Content-Type: application/json
	 * @returns {Object} Headers object
	 */
	getHeaders(includeContentType = false) {
		const token = this.getToken();
		const headers = {};
		if (token) {
			headers['Authorization'] = `Bearer ${token}`;
		}
		if (includeContentType) {
			headers['Content-Type'] = 'application/json';
		}
		return headers;
	},

	/**
	 * Handle API response
	 * @param {Response} res
	 * @returns {Promise<{ok: boolean, data?: any, error?: string, status: number}>}
	 */
	async handleResponse(res) {
		try {
			const data = await res.json();
			return {
				ok: res.ok,
				status: res.status,
				data: res.ok ? data : null,
				error: res.ok ? null : data.error || 'Request failed',
			};
		} catch (e) {
			return {
				ok: false,
				status: res.status,
				data: null,
				error: 'Invalid response',
			};
		}
	},

	/**
	 * GET request
	 * @param {string} url
	 * @returns {Promise<{ok: boolean, data?: any, error?: string}>}
	 */
	async get(url) {
		const res = await fetch(url, {
			method: 'GET',
			headers: this.getHeaders(),
		});
		return this.handleResponse(res);
	},

	/**
	 * POST request with JSON body
	 * @param {string} url
	 * @param {Object} data
	 * @returns {Promise<{ok: boolean, data?: any, error?: string}>}
	 */
	async post(url, data = {}) {
		const res = await fetch(url, {
			method: 'POST',
			headers: this.getHeaders(true),
			body: JSON.stringify(data),
		});
		return this.handleResponse(res);
	},

	/**
	 * PUT request with JSON body
	 * @param {string} url
	 * @param {Object} data
	 * @returns {Promise<{ok: boolean, data?: any, error?: string}>}
	 */
	async put(url, data = {}) {
		const res = await fetch(url, {
			method: 'PUT',
			headers: this.getHeaders(true),
			body: JSON.stringify(data),
		});
		return this.handleResponse(res);
	},

	/**
	 * DELETE request
	 * @param {string} url
	 * @returns {Promise<{ok: boolean, data?: any, error?: string}>}
	 */
	async delete(url) {
		const res = await fetch(url, {
			method: 'DELETE',
			headers: this.getHeaders(),
		});
		return this.handleResponse(res);
	},

	/**
	 * POST request with FormData (file uploads)
	 * @param {string} url
	 * @param {FormData} formData
	 * @returns {Promise<{ok: boolean, data?: any, error?: string}>}
	 */
	async upload(url, formData) {
		const token = this.getToken();
		const headers = token ? { Authorization: `Bearer ${token}` } : {};
		const res = await fetch(url, {
			method: 'POST',
			headers,
			body: formData,
		});
		return this.handleResponse(res);
	},
};

// Export for use in other scripts
window.API = API;

/**
 * UI Helper - Custom modals to replace native alert/confirm/prompt
 */
const UI = {
	_confirmResolver: null,
	_promptResolver: null,

	/**
	 * Initialize modals (auto-creates modal HTML if not present)
	 */
	init() {
		if (!document.getElementById('ui-confirm-modal')) {
			const html = `
				<div id="ui-confirm-modal" class="modal hidden">
					<div class="modal-content modal-small">
						<div id="ui-confirm-icon" class="notify-icon">⚠️</div>
						<h3 id="ui-confirm-title">Xác nhận</h3>
						<p id="ui-confirm-message"></p>
						<div class="modal-actions">
							<button id="ui-confirm-yes" class="btn-danger">Xác nhận</button>
							<button id="ui-confirm-no" class="btn-secondary">Hủy</button>
						</div>
					</div>
				</div>
				<div id="ui-prompt-modal" class="modal hidden">
					<div class="modal-content modal-small">
						<button class="modal-close" id="ui-prompt-close">×</button>
						<h3 id="ui-prompt-title">Nhập thông tin</h3>
						<p id="ui-prompt-message"></p>
						<textarea id="ui-prompt-input" rows="3"></textarea>
						<div class="modal-actions">
							<button id="ui-prompt-submit" class="btn-primary">OK</button>
							<button id="ui-prompt-cancel" class="btn-secondary">Hủy</button>
						</div>
					</div>
				</div>
			`;
			document.body.insertAdjacentHTML('beforeend', html);

			// Bind confirm events
			document
				.getElementById('ui-confirm-yes')
				.addEventListener('click', () => {
					UI._confirmResolver?.(true);
					UI.closeConfirm();
				});
			document.getElementById('ui-confirm-no').addEventListener('click', () => {
				UI._confirmResolver?.(false);
				UI.closeConfirm();
			});

			// Bind prompt events
			document
				.getElementById('ui-prompt-submit')
				.addEventListener('click', () => {
					UI._promptResolver?.(
						document.getElementById('ui-prompt-input').value
					);
					UI.closePrompt();
				});
			document
				.getElementById('ui-prompt-cancel')
				.addEventListener('click', () => {
					UI._promptResolver?.(null);
					UI.closePrompt();
				});
			document
				.getElementById('ui-prompt-close')
				.addEventListener('click', () => {
					UI._promptResolver?.(null);
					UI.closePrompt();
				});
		}
	},

	/**
	 * Show confirm dialog (replaces confirm())
	 * @param {string} message - Confirmation message
	 * @param {Object} options - { title, icon }
	 * @returns {Promise<boolean>}
	 */
	confirm(message, options = {}) {
		this.init();
		return new Promise((resolve) => {
			this._confirmResolver = resolve;
			document.getElementById('ui-confirm-title').textContent =
				options.title || 'Xác nhận';
			document.getElementById('ui-confirm-message').textContent = message;
			document.getElementById('ui-confirm-icon').textContent =
				options.icon || '⚠️';
			document.getElementById('ui-confirm-modal').classList.remove('hidden');
		});
	},

	closeConfirm() {
		document.getElementById('ui-confirm-modal').classList.add('hidden');
		this._confirmResolver = null;
	},

	/**
	 * Show prompt dialog (replaces prompt())
	 * @param {string} message - Prompt message
	 * @param {Object} options - { title, defaultValue, placeholder }
	 * @returns {Promise<string|null>}
	 */
	prompt(message, options = {}) {
		this.init();
		return new Promise((resolve) => {
			this._promptResolver = resolve;
			document.getElementById('ui-prompt-title').textContent =
				options.title || 'Nhập thông tin';
			document.getElementById('ui-prompt-message').textContent = message;
			const input = document.getElementById('ui-prompt-input');
			input.value = options.defaultValue || '';
			input.placeholder = options.placeholder || '';
			document.getElementById('ui-prompt-modal').classList.remove('hidden');
			input.focus();
		});
	},

	closePrompt() {
		document.getElementById('ui-prompt-modal').classList.add('hidden');
		this._promptResolver = null;
	},

	/**
	 * Show alert (uses showNotify if available, else native alert)
	 * @param {string} message
	 * @param {string} type - 'success' | 'error' | 'info'
	 */
	alert(message, type = 'info') {
		if (typeof showNotify === 'function') {
			showNotify(type, type === 'error' ? 'Lỗi' : 'Thông báo', message);
		} else {
			alert(message);
		}
	},
};

window.UI = UI;
