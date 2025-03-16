import type { RouteDefinition } from "./types";

export { default } from "./TypedTrail";

export type DefineApiRoutes<T extends RouteDefinition> = T;
