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
 * @param {string} path - API path
 * @param {Record<string, unknown>} body
 * @returns {Promise<any>}
 * @throws {ApiErrorImpl}
 */
async function put(path, body) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "PUT",
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
async function del(path) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "DELETE",
    headers: buildHeaders(),
  });

  if (!response.ok) {
    const text = await response.text();
    throw parseError(response.status, text);
  }

  // DELETE may return 204 No Content
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (_) {
    return null;
  }
}

/**
 * Unwrap core-backend ApiResponse<T> envelope: { success, message, data }
 * @param {any} resp
 * @returns {any}
 */
function unwrap(resp) {
  if (resp == null) return null;
  if (Object.prototype.hasOwnProperty.call(resp, "data")) return resp.data;
  if (Object.prototype.hasOwnProperty.call(resp, "Data")) return resp.Data;
  return resp;
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

/* -------- Namespaced helpers -------- */

const databases = {
  list: async () => unwrap(await get("/databases")) ?? [],
  getById: async (id) => unwrap(await get(`/databases/${id}`)),
  create: async (payload) => unwrap(await post("/databases", payload)),
  update: async (id, payload) => unwrap(await put(`/databases/${id}`, payload)),
  remove: async (id) => unwrap(await del(`/databases/${id}`)),
  test: async (id) => unwrap(await post(`/databases/${id}/test`, {})),
};

const history = {
  /**
   * Backend wraps the rows in PaginatedResponse<QueryHistoryDto>:
   *   { items: [...], pageNumber, pageSize, totalCount }
   * The outer ApiResponse envelope is removed by `unwrap()`; we then peel
   * the paginated layer too and return a plain array, which is what every
   * caller expects today. If callers need pagination metadata later we can
   * expose a sibling method.
   */
  list: async ({ page = 1, pageSize = 20, dbId } = {}) => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    if (dbId) params.set("dbId", dbId);
    const payload = unwrap(await get(`/history?${params.toString()}`));
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.items)) return payload.items;
    if (Array.isArray(payload?.Items)) return payload.Items;
    return [];
  },
  getById: async (id) => unwrap(await get(`/history/${id}`)),
  remove: async (id) => unwrap(await del(`/history/${id}`)),
};

const onboarding = {
  /**
   * Live veritabanından şemayı çıkarır (AI Backend'e proxy).
   * @param {string} dbId
   * @param {string|null} [connectionString] - boş bırakılırsa kayıtlı bağlantı kullanılır
   */
  extract: async (dbId, connectionString = null) =>
    unwrap(await post("/onboarding/extract", { dbId, connectionString })),

  /**
   * Zenginleştirilmiş şemayı vector store'a kaydeder.
   * @param {string} dbId
   * @param {Array<{name:string, columns:string[], humanDescription:string, businessRules:string}>} tables
   * @param {Array<object>} [fewShotExamples]
   */
  register: async (dbId, tables, fewShotExamples = []) =>
    unwrap(await post("/onboarding/register", { dbId, tables, fewShotExamples })),

  /**
   * PostgreSQL cache'inden saklı şemayı döndürür. 404 fırlatabilir.
   * @param {string} dbId
   */
  getCachedSchema: async (dbId) =>
    unwrap(await get(`/onboarding/schema/${encodeURIComponent(dbId)}`)),
};

export const api = {
  get,
  post,
  put,
  delete: del,
  login,
  register,
  logout,
  isAuthenticated,
  unwrap,
  databases,
  history,
  onboarding,
};
export { ApiErrorImpl as ApiError };
