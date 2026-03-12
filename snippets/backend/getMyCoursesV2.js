/**
 * Resolver: getMyCoursesV2
 *
 * Fetches all course enrollments (UserStatuses) for a student.
 * Each UserStatus links a user to a group (course instance) with a status
 * like "Studying", "Registration", "Declined", etc.
 *
 * Called by the student frontend on dashboard load.
 */

// import { insertErrorLog } from '<error-logging-utility>';

async function getMyCoursesV2(parent, args, ctx, info) {
  const userId = args.userId || '';

  try {
    const userStatuses = await ctx.db.query.userStatuses(
      {
        where: {
          user: { id: userId },
          OR: [
            {
              AND: [
                {
                  status: { name: 'Declined' },
                  subStatusMany_some: { name_in: ['Autodeclined'] },
                },
              ],
            },
            {
              status: { name_not: 'Declined' },
            },
          ],
          NOT: { group: null },
        },
        orderBy: 'id_DESC',
      },
      `{
        id
        user {
          id
          email
          userName
          /* ... profile fields ... */
        }
        status {
          id
          name
        }
        paidStatus
        group {
          id
          groupStatus
          startDate
          course {
            id
            defaultLabel
          }
          teachers {
            id
            userName
          }
          groupCourse {
            id
            title
            description
            courseImage
          }
          students(where: { student: { id: "${userId}" } }) {
            groupEntryTests { /* ... */ }
            groupStudentJournals { /* ... lesson data ... */ }
          }
        }
        /* ... additional fields ... */
      }`,
    );

    return userStatuses;
  } catch (error) {
    insertErrorLog({
      logAction: 'READ',
      error,
      ctx,
      title: 'getMyCoursesV2',
    });
    return [];
  }
}

export default getMyCoursesV2;
