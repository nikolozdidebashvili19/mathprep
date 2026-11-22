import { CourseDayDocument, CourseDayModel } from '@/features/course/schema/course-day.schema';
import { PlanBlock } from '@/features/course/types/course.types';
import { mongo } from '@/shared/lib/mongo';

type NewCourseDay = { courseId: string; dayIndex: number; date: Date; blocks: PlanBlock[] };

export const courseDayRepository = {
  async insertMany(days: NewCourseDay[]): Promise<number> {
    await mongo.connect();
    const docs = await CourseDayModel.insertMany(days);
    return docs.length;
  },

  async findRange(courseId: string, fromIndex: number, toIndex: number): Promise<CourseDayDocument[]> {
    await mongo.connect();
    return CourseDayModel.find({ courseId, dayIndex: { $gte: fromIndex, $lte: toIndex } })
      .sort({ dayIndex: 1 })
      .lean<CourseDayDocument[]>()
      .exec();
  },

  async findOne(courseId: string, dayIndex: number): Promise<CourseDayDocument | null> {
    await mongo.connect();
    return CourseDayModel.findOne({ courseId, dayIndex }).lean<CourseDayDocument>().exec();
  },

  async markCompleted(courseId: string, dayIndex: number): Promise<void> {
    await mongo.connect();
    await CourseDayModel.updateOne({ courseId, dayIndex }, { $set: { completed: true, 'blocks.$[].completed': true } }).exec();
  },
};
