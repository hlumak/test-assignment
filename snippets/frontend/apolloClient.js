/**
 * Apollo Client Configuration
 *
 * Sets up the Apollo Client instance with HTTP link, WebSocket link (for subscriptions),
 * authentication headers, error handling, and caching.
 *
 * This is the main GraphQL client entry point — all queries and mutations
 * go through this configuration.
 */

import {
  ApolloClient,
  InMemoryCache,
  HttpLink,
  split,
  from,
  ApolloLink,
} from '@apollo/client';
import { onError } from '@apollo/client/link/error';
import { WebSocketLink } from '@apollo/client/link/ws';
import { setContext } from '@apollo/client/link/context';
import { getMainDefinition } from '@apollo/client/utilities';

import eventBus from './EventBus';
import { apiUrl, webSocketUrl } from './config';

const httpLink = new HttpLink({
  uri: apiUrl,
  credentials: 'include',
});

const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem('vtoken') || '';
  return {
    headers: {
      ...headers,
      Authorization: token ? `Bearer ${token}` : '',
      Userrole: token ? 'ROLE_STUDENT' : '',
    },
  };
});

const wsLink = new WebSocketLink({
  uri: webSocketUrl,
  options: {
    connectionParams: () => {
      const token = localStorage.getItem('vtoken') || '';
      return {
        authToken: token,
        userrole: 'ROLE_STUDENT',
      };
    },
    lazy: true,
    reconnect: true,
    reconnectionAttempts: 5,
  },
});

const errorLink = onError(({ graphQLErrors, networkError }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message }) => {
      /*  console.log(
        `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`,
      ); */
      eventBus.dispatch('globalErrorEvent', { message });
    });
  }

  if (networkError) {
    // console.log(`[Network error]: ${networkError}`);
    eventBus.dispatch('globalErrorEvent', { message: networkError });
  }
});

const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === 'OperationDefinition' &&
      definition.operation === 'subscription'
    );
  },
  wsLink,
  authLink.concat(httpLink),
);

// Loading animation link — shows spinner on the logo during requests
const preloadingLink = new ApolloLink((operation, forward) => {
  const elements = document.querySelectorAll('.logoApollo');
  // console.log('elements', elements);
  if (elements.length > 0) {
    elements[0].classList.add('logoAnimation');
  }

  // console.log(`starting request for ${operation.operationName}`);
  return forward(operation).map((data) => {
    if (elements.length > 0) {
      elements[0].classList.remove('logoAnimation');
    }
    // console.log(`ending request for ${operation.operationName}`);
    return data;
  });
});

const client = new ApolloClient({
  link: from([preloadingLink, errorLink, splitLink]),
  cache: new InMemoryCache(),
  defaultOptions: {
    query: {
      fetchPolicy: 'no-cache',
      // errorPolicy: 'all',
    },
  },
});

export default client;
