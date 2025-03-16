# TypedTrail

## A generic REST API client that can be easily typed with TypeScript

When fetching a REST API, one of the pain points for client is having to deal with types.

**TypedTrail** is here to make it easier:

```ts
import TypedTrail, { DefineApiRoutes } from "typed-trail";

// Defining some objects handled by our hypothetical API
interface User {
  id: number;
  name: string;
  email: string;
}

interface Book {
  id: number;
  title: string;
  authorId: User["id"];
}

// Define all the routes of our hypothetical API.
// Note the usage of DefineApiRoutes: it's an utility type enabling
// TypeScript autocompletion when defining your API routes.
type ApiRoutes = DefineApiRoutes<{
  "/users": {
    // Only GET method is authorized on /users
    GET: {
      // Allowed query params on this route (?name=x&email=x&page=x)
      queryParams: { name: string; email: string; page: number };
      // This route returns an array of users
      response: User[];
    };
  };
  "/users/:userId": {
    // Only GET method is authorized on /users/:userId
    GET: {
      // Route param are parameters directly in the URL
      routeParams: { userId: number };
      // This route of course returns a single user
      response: User;
    };
  };
  "/users/:userId/books": {
    // We can get the list of books from a specific user
    GET: {
      routeParams: { userId: number };
      queryParams: { title: string };
      response: Book[];
    };
    // We can also create a new book for a specific user
    POST: {
      routeParams: { userId: number };
      body: Pick<Book, "title">;
      response: Book;
    };
  };
}>;

// Create a new client API by providing defined routes
const client = new TypedTrail<ApiRoutes>("https://www.contoso.com/api");

client
  // createGetRequest only accepts as parameter routes with GET key defined
  .createGetRequest("/users/:userId")
  // setRouteParam only accepts properties defined via prop "routeParams" of corresponding route
  .setRouteParam("userId", 123)
  // execute fetch the request and returns a Promise with the response of the API
  .execute()
  .then(({ body }) => {
    console.log(body.id); // The response body is correctly typed as User
  });

client
  // createPostRequest only accepts as parameter routes with POST key defined
  .createPostRequest("/users/:userId/books")
  // setRouteParam only accepts properties defined via prop "routeParams" of corresponding route
  .setRouteParam("userId", 123)
  // setBody only accepts properties defined via prop "body" of corresponding route
  .setBody({
    title: "Jurassic Park",
  })
  // execute fetch the request and returns a Promise with the response of the API
  .execute()
  .then(({ body }) => {
    console.log(body.id); // The response body is correctly typed as Book
  });
```
