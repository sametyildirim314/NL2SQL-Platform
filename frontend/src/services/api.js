const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";
const ACCESS_TOKEN_KEY = "token";
const REFRESH_TOKEN_KEY = "refreshToken";
const USER_KEY = "user";

/**
 * @typedef {Object} ApiError
 * @property {number} status
 * @property {string} message
 * @property {Record<string, string>|null} fieldErrors
 */

class ApiErrorImpl extends Error {
  /**
   * @param {number} status
   * @param {string} message
   * @param {Record<string, string>|null} fieldErrors
   */
  constructor(status, message, fieldErrors = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

/**
 * Parse error body from various API response formats.
 * @param {number} status
 * @param {string} bodyText
 * @returns {ApiErrorImpl}
 */
function parseError(status, bodyText) {
  let message = `İstek başarısız: ${status}`;
  let fieldErrors = null;

  try {
    const json = JSON.parse(bodyText);
    message =
      json.message ||
      json.Message ||
      json.error ||
      json.Error ||
      json.error_message ||
      json.errorMessage ||
      json.detail ||
      json.Detail ||
      (typeof json.title === "string" ? json.title : null) ||
      message;

    // .NET ValidationProblemDetails style
    if (json.errors && typeof json.errors === "object") {
      fieldErrors = {};
      for (const [field, msgs] of Object.entries(json.errors)) {
        fieldErrors[field] = Array.isArray(msgs) ? msgs.join(", ") : String(msgs);
      }
    }
  } catch (_) {
    if (bodyText && bodyText.length < 200) {
      message = bodyText;
    }
  }

  if (status === 401 && message === `İstek başarısız: ${status}`) {
    message = "Giriş bilgileri hatalı. E-posta ve şifrenizi kontrol edin.";
  }

  return new ApiErrorImpl(status, message, fieldErrors);
}

/**
 * Build headers with JWT token if available.
 * @returns {Record<string, string>}
 */
function buildHeaders() {
  const headers = { "Content-Type": "application/json" };
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

/**
 * @param {string} path - API path (e.g. '/query/generate-sql')
 * @param {Record<string, unknown>} body
 * @returns {Promise<any>}
 * @throws {ApiErrorImpl}
 */
async function post(path, body) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw parseError(response.status, text);
  }

  return response.json();
}

/**
 * @param {string} path - API path
 * @returns {Promise<any>}
 * @throws {ApiErrorImpl}
 */
async function get(path) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "GET",
    headers: buildHeaders(),
  });

  if (!response.ok) {
    const text = await response.text();
    throw parseError(response.status, text);
  }

  return response.json();
}

/**
 * @param {{email: string, password: string}} credentials
 * @returns {Promise<any>}
 * @throws {ApiErrorImpl}
 */
async function login(credentials) {
  const response = await post("/auth/login", credentials);
  persistAuthResponse(response);
  return response;
}

/**
 * @param {{email: string, password: string, fullName: string}} payload
 * @returns {Promise<any>}
 * @throws {ApiErrorImpl}
 */
async function register(payload) {
  const response = await post("/auth/register", payload);
  persistAuthResponse(response);
  return response;
}

/**
 * @param {any} response
 */
function persistAuthResponse(response) {
  const payload = response?.data ?? response?.Data ?? response;

  if (!payload?.accessToken) {
    throw new ApiErrorImpl(500, "Sunucudan geçerli bir erişim anahtarı alınamadı.");
  }

  localStorage.setItem(ACCESS_TOKEN_KEY, payload.accessToken);
  if (payload.refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, payload.refreshToken);
  }
  if (payload.user) {
    localStorage.setItem(USER_KEY, JSON.stringify(payload.user));
  }
}

function logout() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

function isAuthenticated() {
  return Boolean(localStorage.getItem(ACCESS_TOKEN_KEY));
}

export const api = { get, post, login, register, logout, isAuthenticated };
export { ApiErrorImpl as ApiError };