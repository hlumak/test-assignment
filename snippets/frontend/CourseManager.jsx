/**
 * Component: CourseManager
 *
 * Manages course routing on the student dashboard.
 * Receives the list of enrolled courses and determines which view to show:
 * - If the student has no courses → shows "no courses" modal
 * - If the student has courses → redirects to the appropriate study room or enrollment page
 *
 * This component does NOT fetch data — it receives `dataMyCourses` as a prop
 * from the parent dashboard component (which calls the getMyCoursesV2 query).
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Box } from '@mui/material';
import LinkBox from '../Auth/Common/LinkBox';
import { getWebsiteUrl } from '../../helpers/utils';
import ShadowBox from '../Common/ShadowBox';
import { getSortedLessons } from './StudyRoom/helper.js';

const CourseManager = ({ dataMyCourses }) => {
  const navigate = useNavigate();
  const { courseId } = useParams();
  const { t } = useTranslation();

  const [selectedCourseId, setSelectedCourseId] = useState();

  const handleCourseSelection = () => {
    const websiteUrl = getWebsiteUrl();
    window.open(websiteUrl, '_blank', 'noopener,noreferrer');
  };

  useEffect(() => {
    if (dataMyCourses) {
      if (!courseId) {
        const lastInviteGroupId = localStorage.getItem('lastInviteGroupId');

        if (lastInviteGroupId) {
          const courseFromInvite = dataMyCourses.find(
            (course) => course.group.id === lastInviteGroupId,
          );

          if (courseFromInvite) {
            localStorage.removeItem('lastInviteGroupId');

            const isEnrollment =
              !['Studying', 'Graduated'].includes(courseFromInvite.status.name) ||
              !['Active', 'Graduated'].includes(courseFromInvite.group.groupStatus);

            if (isEnrollment) {
              navigate(`/enrollment/${courseFromInvite.id}`);
            } else {
              navigate(`/study-room/${courseFromInvite.id}`);
            }

            return;
          }
        }

        const lastCourseId = JSON.parse(localStorage.getItem('lastCourseId'));

        if (lastCourseId) {
          const { courseId } = lastCourseId;

          const urlOptions = JSON.parse(localStorage.getItem(`${courseId}`));

          if (urlOptions) {
            const { groupStudentJournalId, tab, type } = urlOptions;

            if (type === 'enrollment') {
              navigate(`/enrollment/${courseId}`);
            } else {
              navigate(`/studying/${courseId}/${tab}/${groupStudentJournalId}`);
            }
          }
        }
      }

      if (courseId) {
        const selectedCourse = dataMyCourses.find(
          (course) => course.id === courseId,
        );

        const urlOptions = JSON.parse(localStorage.getItem(`${courseId}`));

        if (urlOptions) {
          const { groupStudentJournalId, tab, type } = urlOptions;

          if (
            ['Studying', 'Graduated'].includes(selectedCourse.status.name) &&
            type === 'enrollment'
          ) {
            localStorage.removeItem(`${courseId}`);
          } else if (
            !['Studying', 'Graduated'].includes(selectedCourse.status.name) &&
            type === 'studying'
          ) {
            localStorage.removeItem(`${courseId}`);
          } else {
            if (type === 'enrollment') {
              navigate(`/enrollment/${courseId}`);
            } else {
              navigate(`/studying/${courseId}/${tab}/${groupStudentJournalId}`);
            }
          }
        }
      }

      const lastInviteGroupId = localStorage.getItem('lastInviteGroupId');
      let defaultCourseId = dataMyCourses[0]?.id;

      if (lastInviteGroupId) {
        const courseFromInvite = dataMyCourses.find(
          (course) => course.group.id === lastInviteGroupId,
        );

        if (courseFromInvite) {
          defaultCourseId = courseFromInvite.id;
          localStorage.removeItem('lastInviteGroupId');
        }
      }

      setSelectedCourseId(courseId || defaultCourseId);
    }
  }, [dataMyCourses, courseId, navigate]);

  useEffect(() => {
    if (dataMyCourses) {
      const selectedCourse = dataMyCourses.find(
        (course) => course.id === selectedCourseId,
      );

      if (
        selectedCourse &&
        (!['Studying', 'Graduated'].includes(selectedCourse.status.name) ||
          !['Active', 'Graduated'].includes(selectedCourse.group.groupStatus))
      ) {
        navigate(`/enrollment/${selectedCourseId}`);
      } else if (selectedCourse) {
        const { sortedLessons: previewSortedLessons } =
          getSortedLessons(selectedCourse);

        const activeLesson = previewSortedLessons?.find(
          (lesson) => lesson.groupLesson.status === 'Active',
        );

        if (activeLesson) {
          navigate(`/studying/${selectedCourseId}/theory/${activeLesson.id}`);
        }

        const lastOpenedLesson = previewSortedLessons?.filter(
          (lesson) => lesson.groupLesson.status === 'Open',
        );

        if (lastOpenedLesson.length) {
          navigate(
            `/studying/${selectedCourseId}/theory/${
              lastOpenedLesson[lastOpenedLesson.length - 1].id
            }`,
          );
        }
      }
    }
  }, [selectedCourseId, dataMyCourses, navigate]);

  if (dataMyCourses && dataMyCourses.length === 0) {
    return (
      <Box
        sx={{
          position: 'fixed',
          top: '72px',
          left: 0,
          width: '100vw',
          height: 'calc(100vh - 72px)',
          bgcolor: 'rgba(0,0,0,0.5)',
          zIndex: 1400,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ShadowBox
          sx={{
            width: { xs: '90%', sm: '500px' },
            maxWidth: '90%',
            backgroundColor: 'white',
            padding: '45px',
          }}
        >
          <Box
            sx={{
              p: { xs: 2, sm: 3 },
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              whiteSpace: 'nowrap',
              gap: 1,
            }}
          >
            {t('courseManager.noCoursesText')}
            <LinkBox
              onClick={handleCourseSelection}
              linkText={t('courseManager.selectCourse')}
            />
          </Box>
        </ShadowBox>
      </Box>
    );
  }

  return null;
};

export default CourseManager;
