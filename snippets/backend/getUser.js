/**
 * Utility: getUser
 *
 * Extracts and verifies the current user from the request context.
 * Used by resolvers to get the authenticated user's identity.
 *
 * The JWT token is sent via the Authorization header (HTTP requests)
 * or via connection context (WebSocket subscriptions).
 */

import jwt from 'jsonwebtoken';
import normalizeUserRoles from './normalizeUserRoles';

const APP_SECRET = process.env.APP_SECRET;

const USER_CACHE_TTL = 5000; // 5 seconds
const userCache = new Map();

// TODO refactor this
const getUser = async (ctx) => {
  const authorization = ctx.request
    ? ctx.request.headers.authorization
    : ctx.connection.context.authToken;

  if (authorization) {
    const token = authorization.replace('Bearer ', '');
    const decoded = jwt.verify(token, APP_SECRET);

    if (!decoded) {
      throw new Error('Not authorized');
    }

    const userId = decoded.user.id;

    if (!userId) {
      throw new Error('Not authorized');
    }

    const cached = userCache.get(userId);
    if (cached) {
      return cached.promise;
    }

    const promise = ctx.db.query
      .user(
        { where: { id: userId } },
        '{id userRoles { name } userName email}',
      )
      .then((userData) => {
        if (userData) {
          return normalizeUserRoles(userData);
        }
        throw new Error('Not authorized');
      });

    userCache.set(userId, { promise });
    setTimeout(() => {
      userCache.delete(userId);
    }, USER_CACHE_TTL);

    return promise;
  }

  return null;
};

export default getUser;
