export type RouteSegment = `/${string}`;

type BaseMethodDefinition = {
  routeParams?: Record<string, any>;
  queryParams?: Record<string, any>;
  headers?: Record<string, any>;
  response?: any;
  responseHeaders?: Record<string, any>;
};

type MethodDefinitionWithBody = BaseMethodDefinition & { body?: any };

interface SingleRouteDefinition {
  GET?: BaseMethodDefinition;
  POST?: MethodDefinitionWithBody;
  PUT?: MethodDefinitionWithBody;
  PATCH?: MethodDefinitionWithBody;
  DELETE?: MethodDefinitionWithBody;
}

export type HttpVerb = keyof SingleRouteDefinition;

export type RouteDefinition = Record<RouteSegment, SingleRouteDefinition>;

export type ExtractSpecificVerbRoutes<
  Verb extends HttpVerb,
  ApiRoutes extends RouteDefinition
> = {
  [K in keyof ApiRoutes]: ApiRoutes[K] extends { [v in Verb]: any } ? K : never;
}[keyof ApiRoutes];

export type ExtractGetRoutes<ApiRoutes extends RouteDefinition> =
  ExtractSpecificVerbRoutes<"GET", ApiRoutes>;

export type ExtractPostRoutes<ApiRoutes extends RouteDefinition> =
  ExtractSpecificVerbRoutes<"POST", ApiRoutes>;

export type ExtractPutRoutes<ApiRoutes extends RouteDefinition> =
  ExtractSpecificVerbRoutes<"PUT", ApiRoutes>;

export type ExtractPatchRoutes<ApiRoutes extends RouteDefinition> =
  ExtractSpecificVerbRoutes<"PATCH", ApiRoutes>;

export type ExtractDeleteRoutes<ApiRoutes extends RouteDefinition> =
  ExtractSpecificVerbRoutes<"DELETE", ApiRoutes>;

export type Interceptor<T> = (interceptedObject: T) => T | Promise<T>;

export type InterceptorRequestData = {
  url: string;
  options: Omit<RequestInit, "headers"> & { headers: Headers };
};
