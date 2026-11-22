import { mongo as mongoDriver, Types } from 'mongoose';

import { WorkPhotoDocument, WorkPhotoModel } from '@/features/handwriting/schema/work-photo.schema';
import { CompletedWorkAnalysis, FailedWorkAnalysis } from '@/features/handwriting/types/handwriting.types';
import { mongo } from '@/shared/lib/mongo';

type NewWorkPhoto = { userId: string; sessionId: string; questionId: string; mimeType: string; data: Buffer };

/** Image bytes are excluded unless a method says otherwise. */
const WITHOUT_DATA = { data: 0 };

export const workPhotoRepository = {
  /** One photo per question per session: a retake replaces the old photo and resets its analysis. */
  async upsert(photo: NewWorkPhoto): Promise<string> {
    await mongo.connect();
    const doc = await WorkPhotoModel.findOneAndUpdate(
      { sessionId: photo.sessionId, questionId: photo.questionId },
      {
        $set: {
          userId: new Types.ObjectId(photo.userId),
          mimeType: photo.mimeType,
          size: photo.data.length,
          data: photo.data,
          analysis: { status: 'pending', mistakes: [], skillsShown: [] },
        },
      },
      { upsert: true, returnDocument: 'after', projection: { _id: 1 } }
    ).exec();
    return doc._id.toString();
  },

  /**
   * The image as a real Buffer. MongoDB returns stored bytes as a BSON Binary, and Buffer.from(binary) silently
   * yields an empty buffer, so the bytes are taken from binary.buffer.
   */
  async findImageById(id: string): Promise<{ userId: string; mimeType: string; data: Buffer } | null> {
    await mongo.connect();
    const doc = await WorkPhotoModel.findById(id, { userId: 1, mimeType: 1, data: 1 })
      .lean<{ userId: Types.ObjectId; mimeType: string; data: mongoDriver.Binary }>()
      .exec();
    return doc ? { userId: doc.userId.toString(), mimeType: doc.mimeType, data: Buffer.from(doc.data.buffer) } : null;
  },

  async findBySession(sessionId: string): Promise<WorkPhotoDocument[]> {
    await mongo.connect();
    return WorkPhotoModel.find({ sessionId }, WITHOUT_DATA).lean<WorkPhotoDocument[]>().exec();
  },

  async findOneForQuestion(sessionId: string, questionId: string): Promise<WorkPhotoDocument | null> {
    await mongo.connect();
    return WorkPhotoModel.findOne({ sessionId, questionId }, WITHOUT_DATA).lean<WorkPhotoDocument>().exec();
  },

  async setAnalysis(id: string, analysis: CompletedWorkAnalysis | FailedWorkAnalysis): Promise<void> {
    await mongo.connect();
    await WorkPhotoModel.updateOne({ _id: id }, { $set: { analysis } }).exec();
  },
};
