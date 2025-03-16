import type { HttpVerb, Interceptor, InterceptorRequestData } from "./types";

function serialize(dataCollection: Headers | FormData): string {
  let serializedData = "";

  for (let [key, value] of dataCollection.entries()) {
    serializedData += `${key}=${value}`;
  }

  return serializedData;
}

const queuedRequests: Map<string, Promise<any>> = new Map();

export default class RequestBuilder<
  RouteOptions extends {
    routeParams: any;
    queryParams: any;
    headers: any;
    response: any;
    responseHeaders: any;
    body: any;
  }
> {
  url: string;

  method: HttpVerb;

  routeParams: RouteOptions["routeParams"];

  queryParams: URLSearchParams;

  headers: Headers;

  response: Response | null;

  body: RouteOptions["body"] | null;

  requestInterceptors: Interceptor<InterceptorRequestData>[];

  protected abortController: AbortController | null = null;

  constructor(url: string, method: HttpVerb) {
    this.url = url;
    this.method = method;
    this.routeParams = {};
    this.queryParams = new URLSearchParams();
    this.headers = new Headers({
      Accept: "application/json",
      "Content-Type": "application/json",
    });
    this.body = null;
    this.response = null;
    this.requestInterceptors = [];
    this.abortController = new AbortController();
  }

  setRouteParam<K extends keyof RouteOptions["routeParams"]>(
    key: K,
    value: RouteOptions["routeParams"][K]
  ): this {
    this.routeParams[key] = value;
    return this;
  }

  setRouteParams(params: RouteOptions["routeParams"]): this {
    this.routeParams = { ...this.routeParams, ...params };
    return this;
  }

  setQueryParam<K extends keyof RouteOptions["queryParams"]>(
    key: K,
    value: RouteOptions["queryParams"][K]
  ): this {
    this.queryParams.set(String(key), String(value));
    return this;
  }

  setQueryParams(params: RouteOptions["queryParams"]): this {
    for (const [key, value] of Object.entries(params)) {
      this.setQueryParam(key, value);
    }
    return this;
  }

  setHeader<K extends keyof RouteOptions["headers"]>(
    key: K,
    value: RouteOptions["headers"][K]
  ): this {
    if (value === undefined) {
      this.headers.delete(String(key));
    } else {
      this.headers.set(String(key), String(value));
    }

    return this;
  }

  setHeaders(headers: RouteOptions["headers"]): this {
    for (const [key, value] of Object.entries(headers)) {
      this.setHeader(key, value);
    }
    return this;
  }

  setBody(body: RouteOptions["body"]): this {
    this.body = body;
    return this;
  }

  addRequestInterceptor(
    interceptor: Interceptor<InterceptorRequestData>
  ): this {
    this.requestInterceptors.push(interceptor);
    return this;
  }

  protected applyRequestInterceptors(
    requestData: InterceptorRequestData
  ): Promise<InterceptorRequestData> {
    return this.requestInterceptors.reduce(
      (promiseRequestData, interceptor) => promiseRequestData.then(interceptor),
      Promise.resolve(requestData)
    );
  }

  compileUrl(): string {
    let url = this.url.replace(/\/:([a-zA-Z0-9_]+)/gi, ($0, $1) =>
      this.routeParams[$1] ? `/${this.routeParams[$1]}` : ""
    );

    const queryParams = this.queryParams.toString();

    if (queryParams) {
      url += `?${queryParams}`;
    }

    return url;
  }

  getSerializedBody(): string | FormData {
    return (this.body as any) instanceof FormData
      ? (this.body as FormData)
      : JSON.stringify(this.body);
  }

  async execute<AsText extends boolean = false>(
    asText?: AsText
  ): Promise<{
    body: AsText extends true ? string : RouteOptions["response"];
    headers: RouteOptions["responseHeaders"];
    nativeResponse: Response;
  }> {
    const initialUrl = this.compileUrl();
    const initialBody =
      this.method === "GET" ? undefined : this.getSerializedBody();

    const { url, options } = await this.applyRequestInterceptors({
      url: initialUrl,
      options: {
        method: this.method,
        headers: this.headers,
        body: initialBody,
      },
    });

    const headerKey = options.headers
      ? serialize(options.headers as Headers)
      : "";

    let bodyKey = "";

    if (options.body instanceof FormData) {
      bodyKey = serialize(options.body);
    } else if (typeof options.body === "string") {
      bodyKey = options.body;
    }

    const requestKey = `${options.method} ${url} ${headerKey} ${bodyKey}`;

    let request: Promise<any>;

    if (queuedRequests.has(requestKey)) {
      request = queuedRequests.get(requestKey)!;
    } else {
      request = fetch(url, {
        ...options,
        signal: this.abortController?.signal,
      });

      queuedRequests.set(requestKey, request);
    }

    this.response = await request;

    const body = await (asText ? this.response!.text() : this.response!.json());

    if (queuedRequests.has(requestKey)) {
      queuedRequests.delete(requestKey);
    }

    return {
      body,
      headers: this.getResponseHeaders(),
      nativeResponse: this.response!,
    };
  }

  getResponseHeaders(): RouteOptions["responseHeaders"] | null {
    if (this.response === null) {
      return null;
    }

    let responseHeaders: RouteOptions["responseHeaders"] = {};

    for (let [key, value] of this.response.headers.entries()) {
      responseHeaders[key] = value;
    }

    return responseHeaders;
  }

  abort(): boolean {
    if (!this.abortController) {
      return false;
    }

    this.abortController.abort();
    this.abortController = null;

    return true;
  }
}
