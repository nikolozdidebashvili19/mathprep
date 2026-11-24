import { CourseNeedsDiagnostic } from '@/features/course/components/course-needs-diagnostic';
import { CourseOverview } from '@/features/course/components/course-overview';
import { CourseSetup } from '@/features/course/components/course-setup';
import { getActiveCourseService, getCoursePreviewsService } from '@/features/course/service/course.service';
import { auth } from '@/shared/lib/auth';

type SessionUser = { id?: string };

export default async function CoursePage() {
  const session = await auth();
  const userId = (session?.user as SessionUser | undefined)?.id ?? '';

  const course = await getActiveCourseService(userId);
  if (course) return <CourseOverview course={course} />;

  const { data } = await getCoursePreviewsService(userId);
  if ('error' in data) return <CourseNeedsDiagnostic />;
  return <CourseSetup previews={data} />;
}
