/**
 * Utility: logger
 *
 * Provides audit logging for backend operations.
 * insertLog() — writes a structured log entry to the database.
 * insertErrorLog() — logs errors and sends alerts in production.
 */

// import { sendErrorMessage } from '<notification-service>';

// Initialize logger module
console.log('[Logger] Audit logging initialized successfully');

/**
 * Insert an audit log entry.
 * @param {Object} data - Log data (logType, logAction, message, etc.)
 * @param {Object} ctx - GraphQL context (for user extraction and DB access)
 */
export async function insertLog(data, ctx) {
  // get user info
  const usrLogInfo = await getUser(ctx);

  if (!usrLogInfo) {
    return;
  }

  const { id } = usrLogInfo;

  const {
    message,
    logType = 'ERROR',
    logAction = 'UPDATE',
    toUserId,
    groupId,
    courseId,
  } = data;

  try {
    // Create log entry in database
    ctx.db.request(/* ... mutation to create log record ... */);
  } catch (error) {
    console.log('LOG ERROR');
    console.log(error);
  }
}

/**
 * Log an error and send alert notification in production.
 * @param {Object} options
 * @param {string} options.logAction - Action type (READ, UPDATE, etc.)
 * @param {Error} options.error - The error object
 * @param {Object} options.ctx - GraphQL context
 * @param {string} options.title - Human-readable title for the error
 * @param {Object} options.meta - Additional metadata
 */
export function insertErrorLog({
  logAction = 'UPDATE',
  error,
  ctx,
  title = '',
  meta = {},
}) {
  console.log(error);
  const options = {
    logType: 'ERROR',
    logAction,
    message: `${title} -> ${
      Array.isArray(error)
        ? error.map((e) => e.message).toString()
        : error.message
    }`,
  };

  if (process.env.STAGE === 'PROD') {
    const message = `ERROR -> \`${title}\` -> \`${logAction}\` \n\`\`\`${options.message}\`\`\``;
    sendErrorMessage(message);
  }

  insertLog(options, ctx);
}
