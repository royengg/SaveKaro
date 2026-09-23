import axios, {
  type AxiosAdapter,
  type AxiosRequestConfig,
  type AxiosResponse,
} from "axios";

export const DEFAULT_TIMEOUT_MS = 15_000;

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  timeoutMs?: number;
  /** Whether to attach an access token and attempt one refresh after a 401. */
  authenticated?: boolean;
  /** Backwards-compatible shorthand for `authenticated`. */
  auth?: boolean;
}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore?: boolean;
}

export interface PageResult<T> {
  data: T[];
  pagination: Pagination;
  unreadCount?: number;
}

export type RefreshResult =
  | string
  | null
  | undefined
  | { accessToken?: string | null };

export interface CreateApiClientOptions {
  baseUrl: string;
  getAccessToken: () =>
    | string
    | null
    | undefined
    | Promise<string | null | undefined>;
  refreshAccessToken?: () => RefreshResult | Promise<RefreshResult>;
  onUnauthorized?: () => void | Promise<void>;
  defaultHeaders?: Record<string, string>;
  timeoutMs?: number;
  /** Primarily intended for deterministic tests or a custom native transport. */
  adapter?: AxiosAdapter;
}

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  details?: unknown;
  pagination?: Pagination;
  unreadCount?: number;
}

export class ApiError extends Error {
  readonly status: number;
  readonly details: unknown;
  readonly code?: string;

  constructor(
    message: string,
    status: number,
    details?: unknown,
    code?: string,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
    this.code = code;
  }
}

export interface ApiClient {
  request<T>(path: string, options?: RequestOptions): Promise<T>;
  requestPage<T>(path: string, options?: RequestOptions): Promise<PageResult<T>>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isEnvelope(value: unknown): value is ApiEnvelope<unknown> {
  return (
    isRecord(value) &&
    "success" in value &&
    typeof value.success === "boolean"
  );
}

function abortError(signal?: AbortSignal): Error {
  if (signal?.reason instanceof Error) return signal.reason;
  const error = new Error("The request was aborted.");
  error.name = "AbortError";
  return error;
}

function waitFor<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return promise;
  if (signal.aborted) return Promise.reject(abortError(signal));

  return new Promise<T>((resolve, reject) => {
    const cleanup = () => signal.removeEventListener("abort", onAbort);
    const onAbort = () => {
      cleanup();
      reject(abortError(signal));
    };

    signal.addEventListener("abort", onAbort, { once: true });
    promise.then(
      (value) => {
        cleanup();
        resolve(value);
      },
      (error: unknown) => {
        cleanup();
        reject(error);
      },
    );
  });
}

function tokenFromRefresh(result: RefreshResult): string | null {
  if (typeof result === "string") return result;
  if (result && typeof result.accessToken === "string") {
    return result.accessToken;
  }
  return null;
}

function safeServerMessage(payload: unknown): string | null {
  let candidate: unknown;
  if (isEnvelope(payload)) candidate = payload.error;
  else if (isRecord(payload)) candidate = payload.message;
  else candidate = payload;

  if (typeof candidate !== "string") return null;
  const message = candidate.replace(/\s+/g, " ").trim();
  if (!message || message.length > 300 || /<[^>]+>/.test(message)) return null;
  return message;
}

function fallbackHttpMessage(status: number): string {
  if (status === 401) return "Your session has expired. Please sign in again.";
  if (status === 403) return "You do not have permission to do that.";
  if (status === 404) return "The requested item could not be found.";
  if (status === 409) return "That change conflicts with the current state.";
  if (status === 429) return "Too many requests. Please wait and try again.";
  if (status >= 500) {
    return "SaveKaro is temporarily unavailable. Please try again.";
  }
  return "The request could not be completed. Please try again.";
}

function serverErrorCode(payload: unknown): string | undefined {
  return isRecord(payload) && typeof payload.code === "string"
    ? payload.code
    : undefined;
}

function httpError(response: AxiosResponse<unknown>): ApiError {
  const payload = response.data;
  return new ApiError(
    safeServerMessage(payload) ?? fallbackHttpMessage(response.status),
    response.status,
    isEnvelope(payload) ? payload.details : payload,
    serverErrorCode(payload),
  );
}

function transportError(error: unknown, signal?: AbortSignal): Error {
  if (
    signal?.aborted ||
    axios.isCancel(error) ||
    (axios.isAxiosError(error) && error.code === "ERR_CANCELED")
  ) {
    return abortError(signal);
  }

  if (axios.isAxiosError(error)) {
    if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
      return new ApiError(
        "The request took too long. Please try again.",
        0,
        undefined,
        error.code,
      );
    }
    if (error.response) return httpError(error.response);
    return new ApiError(
      "Unable to reach SaveKaro. Check your connection and try again.",
      0,
      undefined,
      error.code,
    );
  }

  return error instanceof Error
    ? error
    : new Error("The request could not be completed.");
}

function normalizePath(path: string): string {
  const trimmed = path.trim();
  if (!trimmed || /^[a-z][a-z\d+.-]*:/i.test(trimmed) || trimmed.startsWith("//")) {
    throw new Error("API requests require a relative path.");
  }
  return `/${trimmed.replace(/^\/+/, "")}`;
}

export function createApiClient(options: CreateApiClientOptions): ApiClient {
  const baseURL = options.baseUrl.replace(/\/+$/, "");
  if (!baseURL) throw new Error("createApiClient requires a baseUrl.");

  const client = axios.create({
    baseURL,
    timeout: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    headers: {
      Accept: "application/json",
      ...options.defaultHeaders,
    },
    adapter: options.adapter,
    transitional: { clarifyTimeoutError: true },
  });
  let refreshPromise: Promise<string | null> | null = null;

  const refresh = (): Promise<string | null> => {
    if (!options.refreshAccessToken) return Promise.resolve(null);
    if (!refreshPromise) {
      refreshPromise = Promise.resolve()
        .then(() => options.refreshAccessToken!())
        .then(tokenFromRefresh)
        .finally(() => {
          refreshPromise = null;
        });
    }
    return refreshPromise;
  };

  const send = async (
    path: string,
    requestOptions: RequestOptions,
    tokenOverride?: string | null,
  ): Promise<AxiosResponse<unknown>> => {
    const authenticated =
      requestOptions.authenticated ?? requestOptions.auth ?? true;
    const token = authenticated
      ? tokenOverride === undefined
        ? await waitFor(
            Promise.resolve(options.getAccessToken()),
            requestOptions.signal,
          )
        : tokenOverride
      : null;
    const headers: Record<string, string> = { ...requestOptions.headers };
    if (token) headers.Authorization = `Bearer ${token}`;

    const config: AxiosRequestConfig = {
      url: normalizePath(path),
      method: requestOptions.method ?? "GET",
      data: requestOptions.body,
      headers,
      signal: requestOptions.signal,
      validateStatus: () => true,
      ...(requestOptions.timeoutMs === undefined
        ? {}
        : { timeout: requestOptions.timeoutMs }),
    };

    try {
      return await client.request<unknown>(config);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) return error.response;
      throw transportError(error, requestOptions.signal);
    }
  };

  const execute = async (
    path: string,
    requestOptions: RequestOptions = {},
  ): Promise<unknown> => {
    const authenticated =
      requestOptions.authenticated ?? requestOptions.auth ?? true;
    let response = await send(path, requestOptions);

    if (
      response.status === 401 &&
      authenticated &&
      options.refreshAccessToken
    ) {
      const newToken = await waitFor(refresh(), requestOptions.signal);
      if (newToken) response = await send(path, requestOptions, newToken);
    }

    if (response.status === 401 && authenticated) {
      await options.onUnauthorized?.();
    }
    if (response.status < 200 || response.status >= 300) {
      throw httpError(response);
    }

    if (isEnvelope(response.data) && !response.data.success) {
      throw new ApiError(
        safeServerMessage(response.data) ?? "The request was unsuccessful.",
        response.status,
        response.data.details,
        serverErrorCode(response.data),
      );
    }
    return response.data;
  };

  return {
    async request<T>(
      path: string,
      requestOptions: RequestOptions = {},
    ): Promise<T> {
      const payload = await execute(path, requestOptions);
      return (isEnvelope(payload) ? payload.data : payload) as T;
    },

    async requestPage<T>(
      path: string,
      requestOptions: RequestOptions = {},
    ): Promise<PageResult<T>> {
      const payload = await execute(path, requestOptions);
      if (
        !isEnvelope(payload) ||
        !Array.isArray(payload.data) ||
        !payload.pagination
      ) {
        throw new ApiError(
          "The API returned an invalid paginated response.",
          200,
          payload,
        );
      }
      return {
        data: payload.data as T[],
        pagination: payload.pagination,
        ...(typeof payload.unreadCount === "number"
          ? { unreadCount: payload.unreadCount }
          : {}),
      };
    },
  };
}
