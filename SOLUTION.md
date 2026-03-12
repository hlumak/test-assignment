# Solution: "Why Can't Students See Their Courses?"

## Summary

I found **4 issues** that together cause the bug. The primary root cause is that the `getMyCoursesV2` resolver reads `userId` from client-sent arguments, but the frontend never sends this argument (and the GraphQL schema doesn't even define it). The remaining 3 issues form a "silent failure chain" that prevents anyone — users, developers, or monitoring — from detecting the problem.

---

## Issues Found

### Issue 1 (Root Cause): `getMyCoursesV2` resolver uses `args.userId` instead of extracting user from JWT

**File:** `snippets/backend/getMyCoursesV2.js`, line 14

```js
const userId = args.userId || '';
```

The resolver expects `userId` to be passed as a GraphQL argument. However:

1. **The frontend query sends no arguments** — `studentPartQuery.js` defines `query getMyCourses { getMyCoursesV2 { ... } }` with no variables.
2. **The GraphQL schema doesn't define `userId` as an argument** for `getMyCoursesV2` — I confirmed this by opening the Network tab in DevTools and observing the GraphQL request payload, which contains no `userId` variable. Additionally, attempting to manually send `getMyCoursesV2(userId: "...")` via the GraphQL endpoint returns: `"Unknown argument "userId" on field "getMyCoursesV2" of type "Query"."`.

So `args.userId` is always `undefined`, and `userId` falls back to `''` (empty string). The Prisma query then filters by `user: { id: '' }`, which matches no users, returning an empty array.

**The correct approach** (consistent with the architecture and `getUser.js`) is to extract the authenticated user's ID from the JWT token via the `getUser(ctx)` utility — the same pattern used by other resolvers in the system.

**How it likely broke:** Someone refactored the resolver (perhaps for the "last Thursday's backend deployment" mentioned in the bug report) and introduced `args.userId` — either intending to add a schema argument but forgetting, or mistakenly replacing the `getUser(ctx)` call.

### Issue 2 (Silent Failure): Resolver catches errors and returns empty array

**File:** `snippets/backend/getMyCoursesV2.js`, lines 79–87

```js
} catch (error) {
    insertErrorLog({ ... });
    return [];  // ← swallows the error, returns "no courses"
}
```

If any error occurs during query execution, the resolver catches it, attempts to log it (see Issue 3), and returns `[]`. The frontend receives a valid empty array — indistinguishable from a student who genuinely has no courses. No GraphQL error is returned to the client.

This means:

- No error reaches Apollo Client's error link
- No snackbar notification appears
- The dashboard shows the "no courses" state as if it were expected

### Issue 3 (Broken Logging): `insertLog` is disabled — has an early `return`

**File:** `snippets/backend/logger.js`, lines 20–22

```js
export async function insertLog(data, ctx) {
  console.log('LOGGGER ===> ');
  return;  // ← function exits immediately, nothing is logged
  // ... all logging code below is unreachable
```

The `insertErrorLog` function (called from the catch block) ultimately calls `insertLog`, which returns immediately after a console.log. No audit log entries are written to the database. The only trace of errors is a `console.log(error)` in `insertErrorLog` line 69 — easily lost in server logs.

This means even the backend team has no visibility into the failing resolver.

### Issue 4 (Error Suppression): Apollo error link filters out messages containing "not"

**File:** `snippets/frontend/apollo-error-link.js`, line 18

```js
if (/not/i.test(message)) {
  return; // ← suppresses ANY error message containing "not"
}
```

This regex is far too broad. It was intended to suppress "known non-critical messages" but it matches critical errors like:

- `"Not authorized"` — authentication failures
- `"User not found"` — missing user records
- `"Cannot query field ... Did you mean ...?"` — schema errors (contains "not")
- Any message with words like "nothing", "cannot", "do not", etc.

While this issue doesn't directly cause the current bug (since the resolver returns `[]` not an error), it would **prevent detection** of any error that did make it through. It's a safety net with a hole in it.

**Note:** There are two versions of the error link in the snippets — `apolloClient.js` (lines 59–73) does NOT have this filter, while `apollo-error-link.js` does. The version with the `/not/i` filter appears to be the one actually deployed, given that the bug report states "no error messages appear."

---

## Debugging Process

### Step 1: Reproduce the bug in the browser

I opened `https://betastudent.beetroot.academy` and logged in with the test credentials (`testcandidate@test.com`). Login succeeded — my courses and profile settings appeared in the UI header, confirming authentication works. However, the dashboard displayed a "You don't have any courses yet" instead of course cards, exactly as described in the bug report.

### Step 2: Inspect the network traffic in DevTools

I opened Chrome DevTools → Network tab and filtered by `Fetch/XHR`. After login, two `POST` requests were sent to `betastudent.beetroot.academy:4000/`:

**Request 1 — `getStudentNotifications`:**

```
POST / HTTP/1.1
Host: betastudent.beetroot.academy:4000
authorization: Bearer eyJhbGciOiJIUzI1NiIs...0goGgqSvBxIIwRixuG6LWZWT-rxs3joKCaD7AzFyaaA
userrole: ROLE_STUDENT
content-type: application/json
```

```json
{
  "operationName": "getStudentNotifications",
  "variables": {},
  "query": "query getStudentNotifications { getStudentNotifications { id createdAt type title text isRead isNew ... } }"
}
```

Response: `{"data":{"getStudentNotifications":[]}}` — HTTP 200, empty but valid.

**Request 2 — `getMyCourses` (the broken one):**

```
POST / HTTP/1.1
Host: betastudent.beetroot.academy:4000
authorization: Bearer eyJhbGciOiJIUzI1NiIs...0goGgqSvBxIIwRixuG6LWZWT-rxs3joKCaD7AzFyaaA
userrole: ROLE_STUDENT
content-type: application/json
```

```json
{
  "operationName": "getMyCourses",
  "variables": {},
  "query": "query getMyCourses { getMyCoursesV2 { id user { id email userName ... } status { id name } group { id groupStatus startDate course { ... } teachers { ... } groupCourse { ... } students { groupEntryTests { ... } groupStudentJournals { ... } } } ... } }"
}
```

Response: `{"data":{"getMyCoursesV2":[]}}` — HTTP 200, **no GraphQL errors**, just an empty array.

Key observation: `"variables": {}` — **the frontend sends no arguments at all** to `getMyCoursesV2`. The `Authorization` header carries the JWT, so the backend is expected to identify the user server-side.

### Step 3: Check the Console tab

No GraphQL errors or application errors appeared in the Console. The only messages were:

- An i18next warning: `i18next::backendConnector: loading namespace translation for language en-US failed failed parsing /locales/en-US/translation.json to json` — a localization file failed to load, but this is unrelated to the course list bug (translations fall back to `en` which loads successfully).
- `i18next: languageChanged en-US` and `i18next: initialized` — normal i18next lifecycle.
- `[WS] Connection established` — WebSocket connection for subscriptions, working fine.

No snackbar/toast notifications were shown to the user. No network errors, no GraphQL error messages — the application behaved as if the empty course list was a completely normal, expected state.

### Step 4: Decode the JWT to verify user data exists

I decoded the JWT from the `Authorization` header in DevTools Console:

```js
JSON.parse(atob(localStorage.getItem('vtoken').split('.')[1]));
```

Result:

```json
{
  "bx": true,
  "bxs": true,
  "userName": "TEST CANDIDATE",
  "user": {
    "id": "cmm8v76n96hpp0834hnz92nsd",
    "userName": "TEST CANDIDATE",
    "email": "testcandidate@test.com",
    "activated": true,
    "roles": [{ "name": "ROLE_STUDENT" }],
    "countryCode": { "name": "UA" }
  },
  "iat": 1773315753,
  "exp": 1774525353
}
```

The token contains a valid user ID (`cmm8v76n96hpp0834hnz92nsd`), email, name, and `ROLE_STUDENT` role. The backend has everything it needs to identify the user — it just needs to read the JWT from the request context.

### Step 5: Examine the frontend query code

Looking at `studentPartQuery.js`, the query is defined as `query getMyCourses { getMyCoursesV2 { ... } }` with no variables or arguments. This matches what I saw in the Network tab (`"variables": {}`). The frontend relies entirely on the backend to identify the user from the JWT token — this is the correct pattern per the architecture (`ARCHITECTURE.md`: "Backend resolvers call getUser(ctx) to extract the authenticated user from the JWT").

### Step 6: Examine the backend resolver code — found the root cause

Opening `getMyCoursesV2.js`, line 14 immediately stood out:

```js
const userId = args.userId || '';
```

The resolver reads `userId` from `args` (client-sent GraphQL arguments). But as I observed in the Network tab, the frontend sends `"variables": {}` — **no arguments at all**. So `args.userId` is `undefined`, and `userId` falls back to `''` (empty string). The Prisma query then filters by `user: { id: '' }`, which matches no users → returns `[]`.

I cross-referenced this with the `getUser.js` utility, which correctly extracts the user from the JWT via `ctx.request.headers.authorization`. The resolver should be calling `const user = await getUser(ctx)` to get the authenticated user's ID — but it doesn't. This is the root cause.

### Step 7: Verify the hypothesis via manual API calls

To confirm that the schema doesn't support a `userId` argument, I sent a test query from the DevTools Console:

```js
fetch('https://betastudent.beetroot.academy:4000/', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('vtoken')}`
  },
  body: JSON.stringify({
    query: '{ getMyCoursesV2(userId: "cmm8v76n96hpp0834hnz92nsd") { id } }'
  })
})
  .then(r => r.json())
  .then(console.log);
```

Response:

```json
{
  "errors": [
    { "message": "Unknown argument \"userId\" on field \"getMyCoursesV2\" of type \"Query\"." }
  ]
}
```

This confirms: the resolver code reads `args.userId`, but the GraphQL schema doesn't define `userId` as an argument for `getMyCoursesV2`. The `args` object will always be empty, making `userId` always `''`. The resolver was changed (likely in last Thursday's deployment) to use `args.userId` instead of `getUser(ctx)`, breaking the query for all students.

### Step 8: Investigate why no error is visible to users

The response is a clean HTTP 200 with `{"data":{"getMyCoursesV2":[]}}` — no GraphQL errors at all. But I traced through the entire error handling chain to understand why even actual errors would be invisible:

1. **Resolver catch block** (`getMyCoursesV2.js:79-87`): If the Prisma query threw an error, the catch block returns `[]` instead of re-throwing. The frontend would receive a valid empty array, not a GraphQL error.

2. **Logger** (`logger.js:20-22`): The `insertLog` function has `return;` on line 22 — it exits immediately after `console.log('LOGGGER ===> ')`. So `insertErrorLog` → `insertLog` does nothing. No audit logs are recorded in the database.

3. **Error link** (`apollo-error-link.js:18`): The regex `/not/i` filters out any error message containing "not". Even if a "Not authorized" error somehow reached the frontend, this filter would suppress it before it reaches the Snackbar.

4. **Snackbar** (`Snackbar.jsx`): Never receives events because the error link filters them before dispatch.

---

## Why This Combination Makes the Bug Hard to Detect

These four issues create a **perfect silent failure**:

1. **No client-side error** — The resolver returns `[]` (valid data), not an error. Apollo Client processes it as a successful response.
2. **No visible notification** — Even if an error occurred, the overly broad `/not/i` regex filter in the error link would suppress it.
3. **No server-side logging** — The `insertLog` function has an early `return`, so `insertErrorLog` writes nothing to the database.
4. **Plausible UI state** — An empty course list shows the "no courses" modal, which looks like a legitimate state (e.g., "student hasn't enrolled yet"), not an error.

The only surviving evidence is a `console.log(error)` in `insertErrorLog` that goes to stdout — easily missed unless someone is actively watching server logs. The system appears to work correctly at every layer: login succeeds, the student's name appears, and the dashboard renders without errors. Only the course data is missing — and the UI gracefully handles that case, making it look intentional.

---

## Proposed Fixes

### Fix 1: Use `getUser(ctx)` in the resolver (Critical)

Replace `args.userId` with server-side user extraction from JWT:

```diff
+ import getUser from './getUser';
+
  async function getMyCoursesV2(parent, args, ctx, info) {
-   const userId = args.userId || '';
+   const user = await getUser(ctx);
+
+   if (!user) {
+     throw new Error('Not authorized');
+   }
+
+   const userId = user.id;
```

This is consistent with the system architecture (ARCHITECTURE.md: "Backend resolvers call getUser(ctx) to extract the authenticated user from the JWT") and the existing `getUser.js` utility.

### Fix 2: Don't swallow errors in the resolver (Important)

Re-throw errors instead of silently returning an empty array:

```diff
    } catch (error) {
      insertErrorLog({
        logAction: 'READ',
        error,
        ctx,
        title: 'getMyCoursesV2',
      });
-     return [];
+     throw error;
    }
```

### Fix 3: Fix the logger (Important)

Remove the early `return` so audit logs are actually written:

```diff
  export async function insertLog(data, ctx) {
-   console.log('LOGGGER ===> ');
-
-   return;
-
-   // get user info
+   // get user info
    const usrLogInfo = await getUser(ctx);
```

### Fix 4: Fix the error link regex (Important)

Replace the overly broad `/not/i` regex with specific message matching:

```diff
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message }) => {
-     // Suppress known non-critical messages handled by specific components
-     if (/not/i.test(message)) {
-       return;
-     }
+     // Suppress known non-critical messages handled by specific components
+     if (/already\s+exists/i.test(message)) {
+       return;
+     }
      eventBus.dispatch('globalErrorEvent', { message });
    });
  }
```

Only suppress specific known messages (like "already exists" which is already handled by the Snackbar component), not everything containing "not".

---

## Additional Improvements (Production Recommendations)

1. **Add `errorPolicy: 'all'` to Apollo Client** — Currently commented out in `apolloClient.js` line 111. With this policy, Apollo returns both `data` and `errors`, allowing components to handle partial failures gracefully.

2. **Security: Never trust client-sent user IDs** — The original `args.userId` pattern is an IDOR (Insecure Direct Object Reference) vulnerability. If the schema had accepted `userId`, any authenticated user could query another user's courses by passing a different ID. Always derive user identity from the server-side JWT.

3. **Add integration tests for the "my courses" flow** — A simple test that logs in as a test student and verifies that `getMyCoursesV2` returns non-empty results would have caught this regression before deployment.

4. **Clean up dead code in logger** — The `console.log('LOGGGER ===> ')` debug line and the previously unreachable code should be cleaned up now that the early `return` is removed.

5. **Consolidate error link implementations** — There are two versions (`apolloClient.js` inline and `apollo-error-link.js` separate file). Consolidate to a single source of truth to prevent drift.
