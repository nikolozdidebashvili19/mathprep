'use client';
import { useRouter } from 'next/navigation';
import { UseFormReturn } from 'react-hook-form';

import { CreateCourseType } from '@/features/course/validations/course.validation';
import { COURSE_COPY } from '@/shared/const/course.const';
import { http } from '@/shared/lib/http';

/** Creates the course, then re-renders /course (server component) to show it. Errors go to the form root. */
export const useCreateCourse = (form: UseFormReturn<CreateCourseType>) => {
  const router = useRouter();

  const createCourse = async (data: CreateCourseType) => {
    try {
      await http.post('/course', data);
      router.refresh();
    } catch {
      form.setError('root', { message: COURSE_COPY.createError });
    }
  };

  return { createCourse };
};
