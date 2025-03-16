import type { DefineApiRoutes } from "..";

import TypedTrail from "../TypedTrail";

type DummyResource = {
  id: number;
  name: string;
  description: string;
};

type TestApiRoutes = DefineApiRoutes<{
  "/resources": {
    GET: {
      queryParams: { search: string; page: number };
      response: DummyResource;
    };
    POST: {
      body: Omit<DummyResource, "id">;
      response: DummyResource;
    };
  };
  "/resources/:id": {
    GET: {
      routeParams: Pick<DummyResource, "id">;
      response: DummyResource;
    };
    PATCH: {
      routeParams: Pick<DummyResource, "id">;
      body: Partial<Omit<DummyResource, "id">>;
      response: DummyResource;
    };
    PUT: {
      routeParams: Pick<DummyResource, "id">;
      body: Omit<DummyResource, "id">;
      response: DummyResource;
    };
    DELETE: {
      routeParams: Pick<DummyResource, "id">;
    };
  };
}>;

describe("TypedTrail", () => {
  let sdk: TypedTrail<TestApiRoutes>;
  const rootUrl = "http://api.example.com";

  beforeEach(() => {
    sdk = new TypedTrail<TestApiRoutes>(rootUrl);
  });

  test("constructor correctly init properties", () => {
    expect(sdk.rootUrl).toBe(rootUrl);
    expect(sdk.requestInterceptors).toEqual([]);
  });

  test("createRequest returns a RequestBuilder", () => {
    const request = sdk.createRequest("/resources", "GET");

    expect(request.url).toBe("http://api.example.com/resources");
    expect(request.method).toBe("GET");
  });

  test("createRequest add interceptors from TypedTrail to RequestBuilder", () => {
    const interceptor1 = jest.fn((data) => data);
    const interceptor2 = jest.fn((data) => data);

    sdk.addRequestInterceptor(interceptor1);
    sdk.addRequestInterceptor(interceptor2);

    const request = sdk.createRequest("/resources", "GET");

    expect(request.requestInterceptors).toContain(interceptor1);
    expect(request.requestInterceptors).toContain(interceptor2);
  });

  test("createGetRequest returns a GET RequestBuilder", () => {
    const request = sdk.createGetRequest("/resources");
    expect(request.url).toBe("http://api.example.com/resources");
    expect(request.method).toBe("GET");
  });

  test("createPostRequest returns a POST RequestBuilder", () => {
    const request = sdk.createPostRequest("/resources");
    expect(request.url).toBe("http://api.example.com/resources");
    expect(request.method).toBe("POST");
  });

  test("createPatchRequest returns a PATCH RequestBuilder", () => {
    const request = sdk.createPatchRequest("/resources/:id");
    expect(request.url).toBe("http://api.example.com/resources/:id");
    expect(request.method).toBe("PATCH");
  });

  test("createPutRequest returns a PUT RequestBuilder", () => {
    const request = sdk.createPutRequest("/resources/:id");
    expect(request.url).toBe("http://api.example.com/resources/:id");
    expect(request.method).toBe("PUT");
  });

  test("createDeleteRequest retouns a DELETE RequestBuilder", () => {
    const request = sdk.createDeleteRequest("/resources/:id");
    expect(request.url).toBe("http://api.example.com/resources/:id");
    expect(request.method).toBe("DELETE");
  });
});
