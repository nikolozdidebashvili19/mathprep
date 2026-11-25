import { CourseDocument, CourseModel } from '@/features/course/schema/course.schema';
import { StudentLevel } from '@/features/course/types/course.types';
import { mongo } from '@/shared/lib/mongo';

type NewCourse = {
  userId: string;
  durationDays: number;
  minutesPerDay: number;
  startDate: Date;
  skills: string[];
  omittedSkills: string[];
  coverage: number;
  realistic: boolean;
  level: StudentLevel;
};

export const courseRepository = {
  async findActiveByUser(userId: string): Promise<CourseDocument | null> {
    await mongo.connect();
    return CourseModel.findOne({ userId, status: 'active' }).sort({ createdAt: -1 }).lean<CourseDocument>().exec();
  },

  async create(course: NewCourse): Promise<CourseDocument> {
    await mongo.connect();
    const doc = await CourseModel.create({ ...course, status: 'active' });
    return doc.toObject() as CourseDocument;
  },

  /** Ends an active course (the student re-plans). Returns how many matched. */
  async abandon(courseId: string, userId: string): Promise<number> {
    await mongo.connect();
    const result = await CourseModel.updateOne({ _id: courseId, userId, status: 'active' }, { $set: { status: 'abandoned' } }).exec();
    return result.matchedCount;
  },
};
