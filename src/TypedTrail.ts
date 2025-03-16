import type {
  RouteSegment,
  RouteDefinition,
  HttpVerb,
  ExtractSpecificVerbRoutes,
  ExtractGetRoutes,
  ExtractPostRoutes,
  ExtractPutRoutes,
  ExtractPatchRoutes,
  ExtractDeleteRoutes,
  Interceptor,
  InterceptorRequestData,
} from "./types";

import RequestBuilder from "./RequestBuilder";

type DefaultRouteMethod<T> = {
  routeParams: T extends { routeParams: infer R } ? R : never;
  queryParams: T extends { queryParams: infer Q } ? Q : never;
  headers: T extends { headers: infer H } ? H : never;
  response: T extends { response: infer Resp } ? Resp : unknown;
  responseHeaders: T extends { responseHeaders: infer RespH } ? RespH : unknown;
  body: T extends { body: infer B } ? B : never;
};

export default class TypedTrail<ApiRoutes extends RouteDefinition> {
  rootUrl: string;

  requestInterceptors: Interceptor<InterceptorRequestData>[];

  constructor(rootUrl: string) {
    this.rootUrl = rootUrl;
    this.requestInterceptors = [];
  }

  protected getFullUrl(path: RouteSegment): string {
    return this.rootUrl + path;
  }

  public createRequest<
    Verb extends HttpVerb,
    Path extends ExtractSpecificVerbRoutes<Verb, ApiRoutes> & RouteSegment
  >(
    path: Path,
    method: Verb
  ): RequestBuilder<
    DefaultRouteMethod<
      ApiRoutes[Path] extends { [v in Verb]: infer M } ? M : never
    >
  > {
    const request = new RequestBuilder<
      DefaultRouteMethod<
        ApiRoutes[Path] extends { [v in Verb]: infer M } ? M : never
      >
    >(this.getFullUrl(path), method);

    this.requestInterceptors.forEach((interceptor) => {
      request.addRequestInterceptor(interceptor);
    });

    return request;
  }

  public createGetRequest<
    Path extends ExtractGetRoutes<ApiRoutes> & RouteSegment
  >(
    path: Path
  ): RequestBuilder<
    DefaultRouteMethod<ApiRoutes[Path] extends { GET: infer M } ? M : never>
  > {
    return this.createRequest(path, "GET");
  }

  public createPostRequest<
    Path extends ExtractPostRoutes<ApiRoutes> & RouteSegment
  >(
    path: Path
  ): RequestBuilder<
    DefaultRouteMethod<ApiRoutes[Path] extends { POST: infer M } ? M : never>
  > {
    return this.createRequest(path, "POST");
  }

  public createPatchRequest<
    Path extends ExtractPatchRoutes<ApiRoutes> & RouteSegment
  >(
    path: Path
  ): RequestBuilder<
    DefaultRouteMethod<ApiRoutes[Path] extends { PATCH: infer M } ? M : never>
  > {
    return this.createRequest(path, "PATCH");
  }

  public createPutRequest<
    Path extends ExtractPutRoutes<ApiRoutes> & RouteSegment
  >(
    path: Path
  ): RequestBuilder<
    DefaultRouteMethod<ApiRoutes[Path] extends { PUT: infer M } ? M : never>
  > {
    return this.createRequest(path, "PUT");
  }

  public createDeleteRequest<
    Path extends ExtractDeleteRoutes<ApiRoutes> & RouteSegment
  >(
    path: Path
  ): RequestBuilder<
    DefaultRouteMethod<ApiRoutes[Path] extends { DELETE: infer M } ? M : never>
  > {
    return this.createRequest(path, "DELETE");
  }

  public addRequestInterceptor(
    interceptor: Interceptor<InterceptorRequestData>,
    prependInterceptor = false
  ): this {
    const addMethod = prependInterceptor ? "unshift" : "push";
    this.requestInterceptors[addMethod](interceptor);
    return this;
  }
}
