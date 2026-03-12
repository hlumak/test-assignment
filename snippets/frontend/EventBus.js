/**
 * EventBus — simple pub/sub using DOM CustomEvents.
 *
 * Used to decouple Apollo error handling from UI components.
 * The error link dispatches events, the Snackbar component listens.
 */

const eventBus = {
  on(event, callback) {
    document.addEventListener(event, (e) => callback(e.detail));
  },
  dispatch(event, data) {
    document.dispatchEvent(new CustomEvent(event, { detail: data }));
  },
  remove(event, callback) {
    document.removeEventListener(event, callback);
  },
};

export default eventBus;
