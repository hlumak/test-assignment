# System Architecture

## Overview

The LMS (Learning Management System) is a multi-component web application that manages online education — student enrollment, course delivery, lesson scheduling, homework, and payments.

## High-Level Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                        Student's Browser                           │
│                                                                    │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  React 18 SPA (Student Frontend)                            │   │
│  │                                                             │   │
│  │  Apollo Client ──── GraphQL queries/mutations ────────────────────┐
│  │       │                                                     │   │ │
│  │   Error Link ── filters errors ── EventBus ── Snackbar      │   │ │
│  └─────────────────────────────────────────────────────────────┘   │ │
└────────────────────────────────────────────────────────────────────┘ │
                                                                       │
                         HTTPS (port 443)                              │
                                                                       │
┌────────────────────────────────────────────────────────────────────┐ │
│  Backend (Node.js)                                                 │ │
│                                                                    │ │
│  ┌──────────────────────────────────┐                              │ │
│  │  GraphQL Yoga Server (port 4000) │ ◄──────────────────────────────┘
│  │                                  │                              │
│  │  ┌────────────────────────────┐  │                              │
│  │  │  Resolvers                 │  │                              │
│  │  │  ├── Auth (login, JWT)     │  │                              │
│  │  │  ├── StudentPart           │  │                              │
│  │  │  │   └── getMyCoursesV2()  │  │                              │
│  │  │  └── ...                   │  │                              │
│  │  └────────────────────────────┘  │                              │
│  │                                  │                              │
│  │  ┌────────────────────────────┐  │                              │
│  │  │  Utilities                 │  │                              │
│  │  │  ├── getUser() (JWT→user)  │  │                              │
│  │  │  └── logger (audit logs)   │  │                              │
│  │  └────────────────────────────┘  │                              │
│  └──────────────────────────────────┘                              │
│                    │                                               │
│              Prisma ORM                                            │
│                    │                                               │
│  ┌──────────────────────────────────┐                              │
│  │  MySQL Database                  │                              │
│  │  ├── User (students, teachers)   │                              │
│  │  ├── UserStatus (enrollment)     │                              │
│  │  ├── Group (course instance)     │                              │
│  │  ├── Course                      │                              │
│  │  └── ...                         │                              │
│  └──────────────────────────────────┘                              │
└────────────────────────────────────────────────────────────────────┘
```

## Authentication Flow

```
1. Student enters email + password on /login
2. Frontend sends `loginStudent` mutation to backend
3. Backend verifies credentials, creates JWT with { user: { id, roles, ... } }
4. JWT is stored in localStorage as 'vtoken'
5. All subsequent requests include Authorization: Bearer <JWT> header
6. Backend resolvers call getUser(ctx) to extract the authenticated user from the JWT
```

## Data Flow for "My Courses" (the broken feature)

```
Student Dashboard loads
        │
        ▼
Apollo Client sends query:
  query getMyCourses {
    getMyCoursesV2 { ... }
  }
        │
        ▼
Backend receives request
        │
        ▼
getMyCoursesV2 resolver executes:
  1. Determines which user is requesting
  2. Queries Prisma for UserStatuses WHERE user.id = <userId>
  3. Returns array of enrollments (with group, course, lessons, etc.)
        │
        ▼
Apollo Client receives response
        │
        ▼
If errors → Error Link → EventBus → Snackbar (shows error toast)
If data   → Dashboard component renders course cards
If empty  → Dashboard shows "No courses" state
```

## Key Concepts

| Concept | Description |
|---------|-------------|
| **UserStatus** | The junction between a User and a Group. Has a status like "Studying", "Registration", "Declined". One user can have multiple UserStatuses (enrolled in multiple groups). |
| **Group** | An instance of a course — has a start date, teachers, students, lessons. Think of it as a "class" or "cohort". |
| **Resolver** | A function that handles a specific GraphQL query or mutation. Receives `(parent, args, ctx, info)` where `args` contains client-sent variables and `ctx` contains the request context (headers, DB connection, etc.). |
| **getUser(ctx)** | Utility that extracts the JWT from the Authorization header, verifies it, and returns the authenticated user's record from the database. |
| **Apollo Error Link** | Middleware in the Apollo Client link chain that intercepts errors before they reach React components. Can log, filter, or transform errors. |
| **EventBus** | Simple pub/sub using DOM CustomEvents. Decouples error handling (Apollo link) from error display (Snackbar component). |

## Ports (Beta Environment)

| Service | Port |
|---------|------|
| Backend GraphQL API | 4000 |
| Student Frontend | 443 (HTTPS) |
