/**
 * Apollo Client — Error Link
 *
 * This is extracted from the Apollo Client setup in the app's entry point.
 * It intercepts GraphQL and network errors before they reach components.
 *
 * `eventBus.dispatch('globalErrorEvent', ...)` triggers the global Snackbar
 * component to display an error notification to the user.
 */

import { onError } from '@apollo/client/link/error';
import eventBus from './EventBus';

const errorLink = onError(({ graphQLErrors, networkError }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message }) => {
      // Suppress known non-critical messages handled by specific components
      // e.g., Registration with existing email shows WelcomeBackDialog
      if (/already\s+exists/i.test(message)) {
        return;
      }
      eventBus.dispatch('globalErrorEvent', { message });
    });
  }

  if (networkError) {
    eventBus.dispatch('globalErrorEvent', { message: networkError });
  }
});

// Used in Apollo Client link chain:
// const client = new ApolloClient({
//   link: from([preloadingLink, errorLink, splitLink]),
//   cache: new InMemoryCache(),
//   ...
// });
