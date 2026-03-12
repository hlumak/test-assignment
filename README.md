# Test Assignment: Middle Full-Stack Developer

**Title:** "Debugging a Student LMS — Why Can't Students See Their Courses?"

**Time budget:** 3–5 hours

---

## Context

You're joining a team that maintains a Learning Management System (LMS). The system has three main components:

- **Backend** — Node.js GraphQL API (GraphQL Yoga + Prisma ORM + MySQL)
- **Student Frontend** — React 18 single-page application with Apollo Client
- **Admin Panel** — internal tool (not relevant to this task)

The student portal has a bug reported by multiple users. Your task is to investigate the issue, identify the root cause(s), and propose fixes.

---

## Bug Report

> **Reported by:** Customer Support
> **Priority:** High
> **Affected users:** All students (not a single account — no student can see their courses)
>
> "Students log in to the student portal successfully, but see an empty course list on their dashboard. No error messages appear.
>
> We verified the data directly in the database: the test student has active enrollments with 'Studying' status. The admin panel shows these enrollments correctly. Login works, the student's name appears in the UI — only the course list is empty.
>
> This affects all students, not just one account. Everything was working before last Thursday's backend deployment."

---

## What You Have Access To

### 1. Live Environment

| Resource | URL | Notes |
|----------|-----|-------|
| Student Portal | `https://betastudent.beetroot.academy` | Beta environment |

**Test credentials** (will be provided separately):
- Email: `testcandidate@test.com`
- Password: *(provided in the email)*

### 2. Code Snippets

You have been given **9 code snippets** from the relevant parts of the system. These are sanitized extracts — not the full codebase. They contain enough information to diagnose and fix the reported issues.

```
snippets/
├── backend/
│   ├── getMyCoursesV2.js     — The resolver that fetches student courses
│   ├── getUser.js            — Utility that extracts the authenticated user from JWT
│   └── logger.js             — Audit logging utility
└── frontend/
    ├── apolloClient.js       — Apollo Client configuration (cache, links, fetch policy)
    ├── apollo-error-link.js  — Apollo Client error handling configuration
    ├── CourseManager.jsx      — Dashboard component that routes based on enrolled courses
    ├── Snackbar.jsx          — Global error notification component
    ├── EventBus.js           — Event dispatch mechanism (connects errors to UI)
    └── studentPartQuery.js   — The GraphQL query the dashboard sends
```

### 3. Architecture Overview

See [ARCHITECTURE.md](./ARCHITECTURE.md) for a simplified system diagram.

---

## Your Task

1. **Investigate** the reported bug using:
   - Browser DevTools (Network tab, Console)
   - The provided code snippets

2. **Identify** the root cause(s) — there may be more than one issue contributing to the problem.

3. **Write up your findings** in a `SOLUTION.md` file:
   - What is broken (list each issue you found)
   - How you found it (describe your debugging process step by step)
   - Why this specific combination of issues makes the bug hard to detect
   - Your proposed fix for each issue (include code diffs against the provided snippets)
   - What you would additionally improve if this were a real production system

---

## Submission

1. Clone this repository
2. Add your files:

```
├── SOLUTION.md          — Your analysis and debugging process
└── patches/             — (optional) Corrected versions of any files you fixed
```

3. Push to your own repository (GitHub, GitLab, etc.) and share the link with us — or send a zip archive
4. Briefly mention how many issues you found

Do **not** modify the original files — add your own files only.

---

## Hints

- Start with what you can observe in the browser — the Network tab is your friend.
- Not all bugs cause visible errors. Sometimes bugs **prevent** errors from being visible.
- Read the code snippets carefully — compare what the frontend sends vs. what the backend expects.
- Think about where user identity comes from in a GraphQL API: is it from the client or the server?

---

## What We're Evaluating

| Criteria | What we look for |
|----------|------------------|
| **Investigation methodology** | Systematic approach: observe → hypothesize → verify. Use of DevTools and code reading |
| **Root cause identification** | Finding the actual bugs, not just symptoms. Understanding why the combination is problematic |
| **Proposed fix quality** | Fixes that match the existing codebase patterns and don't introduce new issues |
| **Communication** | Clear, structured write-up. Explains the "why", not just the "what" |

---

Good luck! The bugs in this assignment are inspired by real issues we've encountered in production. We're interested in how you think through problems, not just whether you find the answer.
