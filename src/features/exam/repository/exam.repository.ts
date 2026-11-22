import { ExamDocument, ExamModel } from '@/features/exam/schema/exam.schema';
import { mongo } from '@/shared/lib/mongo';

type ExamFields = Omit<ExamDocument, '_id' | 'createdAt' | 'updatedAt'>;

export const examRepository = {
  async findAll(): Promise<ExamDocument[]> {
    await mongo.connect();
    return ExamModel.find({}).sort({ year: -1, variant: 1 }).lean<ExamDocument[]>().exec();
  },

  async findUsableForDiagnostic(): Promise<ExamDocument[]> {
    await mongo.connect();
    return ExamModel.find({ usableForDiagnostic: true }).sort({ year: -1, variant: 1 }).lean<ExamDocument[]>().exec();
  },

  async findById(id: string): Promise<ExamDocument | null> {
    await mongo.connect();
    return ExamModel.findById(id).lean<ExamDocument>().exec();
  },

  async findByCode(code: string): Promise<ExamDocument | null> {
    await mongo.connect();
    return ExamModel.findOne({ code }).lean<ExamDocument>().exec();
  },

  async upsertByCode(data: ExamFields): Promise<string> {
    await mongo.connect();
    const doc = await ExamModel.findOneAndUpdate({ code: data.code }, { $set: data }, { upsert: true, returnDocument: 'after' }).exec();
    return doc._id.toString();
  },
};
