export const AUTH_ROUTES = ['/sign-in', '/sign-up'];

export const PROTECTED_ROUTES = ['/dashboard', '/onboarding', '/diagnostic', '/report', '/course', '/progress'];

export const HOME_ROUTE_AFTER_LOGIN = '/dashboard';

export const ONBOARDING_ROUTE = '/onboarding';

export const DIAGNOSTIC_ROUTE = '/diagnostic';
export const QUICK_CHECK_ROUTE = '/diagnostic/quick';
export const COURSE_ROUTE = '/course';
export const PRACTICE_TODAY_ROUTE = '/course/today';
export const COURSE_DAY_ROUTE = '/course/day';

/** Question figures are served from content/images/ through this API route. */
export const QUESTION_IMAGE_ROUTE = '/api/question-images';
export const WORK_PHOTO_ROUTE = '/api/diagnostic/photos';
export const REPORT_ROUTE = '/report';
