/**
 * GraphQL Query: getMyCourses
 *
 * This is the query sent by the student dashboard to fetch
 * the logged-in student's course enrollments.
 */

import { gql } from '@apollo/client';

const GET_MY_COURSES_QUERY = gql`
  query getMyCourses {
    getMyCoursesV2 {
      id
      user {
        id
        email
        userName
        userProfileFields {
          id
          name {
            id
            name
          }
          value
        }
      }
      countryCode {
        id
        name
      }
      orders {
        id
        status
        price
        currency
        type
      }
      paidStatus
      status {
        id
        name
      }
      group {
        id
        groupStatus
        startDate
        course {
          id
          defaultLabel
          courseDuration
        }
        teachers {
          id
          userName
          avatar
        }
        groupCourse {
          id
          title
          description
          courseImage
          selectedEntryTest {
            id
            timer
            questions {
              id
            }
          }
        }
        students {
          groupEntryTests {
            id
            entryTestProgress
            durationLeft
            entryTestPoint
          }
          groupStudentJournals {
            id
            groupLesson {
              id
              startDate
              endDate
              status
              lesson {
                id
                title
                description
              }
            }
            lessonPoint
            visited
            groupLessonTests {
              id
              testPoint
            }
            groupUserHomeworks {
              id
              homeworkPoint
              homeworkLink
            }
            teacherComment
          }
        }
      }
    }
  }
`;

export default GET_MY_COURSES_QUERY;
