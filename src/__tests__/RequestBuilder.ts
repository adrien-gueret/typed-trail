import RequestBuilder from "../RequestBuilder";

interface TestRouteOptions {
  routeParams: { id?: string; other?: string };
  queryParams: { search?: string; page?: number };
  headers: { "X-Test"?: string };
  response: any;
  responseHeaders: { [key: string]: string };
  body: any;
}

function createMockResponse(
  body: any,
  headers: Headers = new Headers({ "content-type": "application/json" })
): Response {
  return {
    ok: true,
    status: 200,
    headers,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

describe("RequestBuilder", () => {
  beforeEach(() => {
    (global as any).fetch = undefined;
  });

  test("constructor correctly init properties", () => {
    const rb = new RequestBuilder<TestRouteOptions>(
      "http://example.com/api/:id",
      "GET"
    );
    expect(rb.url).toBe("http://example.com/api/:id");
    expect(rb.method).toBe("GET");
    expect(rb.routeParams).toEqual({});
    expect(rb.queryParams.toString()).toBe("");

    expect(rb.headers.get("Accept")).toBe("application/json");
    expect(rb.headers.get("Content-Type")).toBe("application/json");
    expect(rb.body).toBeNull();
    expect(rb.response).toBeNull();

    // @ts-ignore
    expect(rb.abortController).not.toBeNull();
  });

  test("setRouteParam and setRouteParams update routeParams", () => {
    const rb = new RequestBuilder<TestRouteOptions>(
      "http://example.com/api/:id",
      "GET"
    );
    rb.setRouteParam("id", "123");
    expect(rb.routeParams).toEqual({ id: "123" });

    rb.setRouteParams({ other: "456" });
    expect(rb.routeParams).toEqual({ id: "123", other: "456" });
  });

  test("setQueryParam and setQueryParams modifient queryParams", () => {
    const rb = new RequestBuilder<TestRouteOptions>(
      "http://example.com",
      "GET"
    );
    rb.setQueryParam("search", "test");
    expect(rb.queryParams.toString()).toBe("search=test");

    rb.setQueryParams({ page: 2 });
    expect(rb.queryParams.toString()).toBe("search=test&page=2");
  });

  test("setHeader and setHeaders update headers", () => {
    const rb = new RequestBuilder<TestRouteOptions>(
      "http://example.com",
      "GET"
    );
    rb.setHeader("X-Test", "value1");
    expect(rb.headers.get("X-Test")).toBe("value1");

    rb.setHeaders({ "X-Test": "value2" });
    expect(rb.headers.get("X-Test")).toBe("value2");

    rb.setHeader("X-Test", undefined);
    expect(rb.headers.get("X-Test")).toBeNull();
  });

  test("setBody updates body", () => {
    const rb = new RequestBuilder<TestRouteOptions>(
      "http://example.com",
      "POST"
    );
    const data = { key: "value" };
    rb.setBody(data);

    expect(rb.body).toEqual(data);
  });

  test("compileUrl returns an URL based on routeParams and queryParams", () => {
    const rb = new RequestBuilder<TestRouteOptions>(
      "http://example.com/api/:id",
      "GET"
    );
    rb.setRouteParam("id", "789");
    rb.setQueryParam("search", "hello");
    const url = rb.compileUrl();
    expect(url).toBe("http://example.com/api/789?search=hello");

    // Test missing route param
    const rb2 = new RequestBuilder<TestRouteOptions>(
      "http://example.com/api/:missing",
      "GET"
    );
    const url2 = rb2.compileUrl();
    expect(url2).toBe("http://example.com/api");
  });

  test("getSerializedBody returns some JSON for a non-FormData body", () => {
    const rb = new RequestBuilder<TestRouteOptions>(
      "http://example.com",
      "POST"
    );
    rb.setBody({ a: 1 });
    const serialized = rb.getSerializedBody();

    expect(serialized).toBe(JSON.stringify({ a: 1 }));
  });

  test("getSerializedBody returns some FormData for a FormData body", () => {
    const rb = new RequestBuilder<TestRouteOptions>(
      "http://example.com",
      "POST"
    );
    const formData = new FormData();
    formData.append("a", "1");
    rb.setBody(formData);
    const serialized = rb.getSerializedBody();

    expect(serialized).toBe(formData);
  });

  describe("interceptors", () => {
    let rb: RequestBuilder<TestRouteOptions>;
    beforeEach(() => {
      rb = new RequestBuilder<TestRouteOptions>("http://example.com", "GET");
    });

    test("applyRequestInterceptors without interceptors returns initial data", async () => {
      const initialData = {
        url: "http://example.com",
        options: { method: "GET", headers: new Headers(), body: undefined },
      };
      // @ts-ignore
      const result = await rb.applyRequestInterceptors(initialData);
      expect(result).toEqual(initialData);
    });

    test("addRequestInterceptor and applyRequestInterceptors apply the interceptor", async () => {
      rb.addRequestInterceptor(({ url, options }) => {
        const { headers, ...otherOptions } = options;
        headers.set("X-Intercepted", "true");

        return {
          url: url + "/intercepted",
          options: {
            ...otherOptions,
            headers,
          },
        };
      });
      const initialData = {
        url: "http://example.com",
        options: { method: "GET", headers: new Headers(), body: undefined },
      };

      // @ts-ignore
      const result = await rb.applyRequestInterceptors(initialData);
      expect(result.url).toBe("http://example.com/intercepted");
      expect(result.options.headers.get("X-Intercepted")).toBe("true");
    });
  });

  describe("execute", () => {
    let rb: RequestBuilder<TestRouteOptions>;

    beforeEach(() => {
      rb = new RequestBuilder<TestRouteOptions>(
        "http://example.com/api/:id",
        "POST"
      );

      rb.setRouteParam("id", "101")
        .setQueryParam("search", "query")
        .setHeader("X-Test", "value")
        .setBody({ foo: "bar" });
    });

    test("execute returns JSON by default", async () => {
      const mockData = { success: true };
      const mockResponse = createMockResponse(mockData);
      global.fetch = jest.fn().mockResolvedValue(mockResponse);

      const result = await rb.execute();
      expect(result.body).toEqual(mockData);
      expect(result.headers).toEqual(
        expect.objectContaining({ "content-type": "application/json" })
      );
      expect(result.nativeResponse).toBe(mockResponse);

      const resultText = await rb.execute(true);
      expect(resultText.body).toBe('{"success":true}');
    });

    test("execute avoids calling fetch multiple times for same request data", async () => {
      let resolveFetch: (value: Response) => void;
      const fetchPromise = new Promise<Response>((resolve) => {
        resolveFetch = resolve;
      });
      global.fetch = jest.fn().mockReturnValue(fetchPromise);

      // Execute the request twice
      const execPromise1 = rb.execute();
      const execPromise2 = rb.execute();

      const mockData = { success: true };
      const mockResponse = createMockResponse(mockData);

      // Resolve the fetch promise
      resolveFetch!(mockResponse);

      const result = await execPromise1;
      expect(result.body).toEqual(mockData);

      const result2 = await execPromise2;
      expect(result2.body).toEqual(mockData);

      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("getResponseHeaders", () => {
    test("returns null if no response yet", () => {
      const rb = new RequestBuilder<TestRouteOptions>(
        "http://example.com",
        "GET"
      );
      expect(rb.getResponseHeaders()).toBeNull();
    });

    test("retourns an object with response headers keys and values", () => {
      const rb = new RequestBuilder<TestRouteOptions>(
        "http://example.com",
        "GET"
      );
      const headers = new Headers({
        "content-type": "application/json",
        "x-custom": "custom-value",
      });
      const mockResponse = createMockResponse({}, headers);
      rb.response = mockResponse;

      expect(rb.getResponseHeaders()).toEqual({
        "content-type": "application/json",
        "x-custom": "custom-value",
      });
    });
  });

  describe("abort", () => {
    test("abort aborts requests and returns true", () => {
      const rb = new RequestBuilder<TestRouteOptions>(
        "http://example.com",
        "GET"
      );
      const result = rb.abort();
      expect(result).toBe(true);

      // @ts-ignore
      expect(rb.abortController).toBeNull();
    });

    test("abort returns false if request has already been aborted", () => {
      const rb = new RequestBuilder<TestRouteOptions>(
        "http://example.com",
        "GET"
      );

      rb.abort();
      const result = rb.abort();

      expect(result).toBe(false);
    });
  });
});
