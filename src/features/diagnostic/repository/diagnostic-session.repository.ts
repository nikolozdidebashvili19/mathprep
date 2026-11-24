import { Types } from 'mongoose';

import {
  DiagnosticSessionDocument,
  DiagnosticSessionModel,
} from '@/features/diagnostic/schema/diagnostic-session.schema';
import { mongo } from '@/shared/lib/mongo';

type SessionResult = {
  score: number;
  maxScore: number;
  correctCount: number;
  skillSummary?: { skillCode: string; score: number; reasons: string[] }[];
};

export const diagnosticSessionRepository = {
  async findById(id: string): Promise<DiagnosticSessionDocument | null> {
    await mongo.connect();
    return DiagnosticSessionModel.findById(id).lean<DiagnosticSessionDocument>().exec();
  },

  async findInProgress(userId: string, examId: string): Promise<DiagnosticSessionDocument | null> {
    await mongo.connect();
    return DiagnosticSessionModel.findOne({ userId, examId, kind: { $ne: 'quick' }, status: 'in_progress' })
      .lean<DiagnosticSessionDocument>()
      .exec();
  },

  async findQuickInProgress(userId: string): Promise<DiagnosticSessionDocument | null> {
    await mongo.connect();
    return DiagnosticSessionModel.findOne({ userId, kind: 'quick', status: 'in_progress' }).lean<DiagnosticSessionDocument>().exec();
  },

  async findLatestCompletedQuick(userId: string): Promise<DiagnosticSessionDocument | null> {
    await mongo.connect();
    return DiagnosticSessionModel.findOne({ userId, kind: 'quick', status: 'completed' })
      .sort({ completedAt: -1 })
      .lean<DiagnosticSessionDocument>()
      .exec();
  },

  async createQuick(userId: string, firstQuestionId: string, ability: number): Promise<DiagnosticSessionDocument> {
    await mongo.connect();
    const doc = await DiagnosticSessionModel.create({ userId, kind: 'quick', ability, questionIds: [firstQuestionId], answers: [] });
    return doc.toObject() as DiagnosticSessionDocument;
  },

  /**
   * Quick check: records the answer to the current question, the new ability and (unless it was the last one)
   * the next question, in one update. Matches only while this question is still unanswered, so a double
   * submit is a no-op (returns 0).
   */
  async recordQuickAnswer(
    sessionId: string,
    input: { questionId: string; answer: string; ability: number; nextQuestionId: string | null }
  ): Promise<number> {
    await mongo.connect();
    const qid = new Types.ObjectId(input.questionId);
    const push: Record<string, unknown> = { answers: { questionId: qid, answer: input.answer } };
    if (input.nextQuestionId) push.questionIds = new Types.ObjectId(input.nextQuestionId);
    const result = await DiagnosticSessionModel.updateOne(
      { _id: sessionId, kind: 'quick', status: 'in_progress', questionIds: qid, 'answers.questionId': { $ne: qid } },
      { $push: push, $set: { ability: input.ability } }
    ).exec();
    return result.matchedCount;
  },

  async countCompletedByUser(userId: string): Promise<number> {
    await mongo.connect();
    return DiagnosticSessionModel.countDocuments({ userId, status: 'completed' }).exec();
  },

  async findCompletedByUser(userId: string): Promise<DiagnosticSessionDocument[]> {
    await mongo.connect();
    return DiagnosticSessionModel.find({ userId, status: 'completed' }).sort({ completedAt: -1 }).lean<DiagnosticSessionDocument[]>().exec();
  },

  async findByUser(userId: string): Promise<DiagnosticSessionDocument[]> {
    await mongo.connect();
    return DiagnosticSessionModel.find({ userId }).sort({ updatedAt: -1 }).lean<DiagnosticSessionDocument[]>().exec();
  },

  async create(userId: string, examId: string, questionIds: string[]): Promise<DiagnosticSessionDocument> {
    await mongo.connect();
    const doc = await DiagnosticSessionModel.create({ userId, examId, questionIds, answers: [] });
    return doc.toObject() as DiagnosticSessionDocument;
  },

  /** Replaces this question's saved answer (or adds it) in one atomic update. */
  async setAnswer(sessionId: string, questionId: string, answer: string): Promise<number> {
    await mongo.connect();
    const qid = new Types.ObjectId(questionId);
    // Mongoose 9 rejects pipeline updates unless `updatePipeline` is set.
    const result = await DiagnosticSessionModel.updateOne(
      { _id: sessionId, status: 'in_progress' },
      [
        {
          $set: {
            answers: {
              $concatArrays: [
                { $filter: { input: '$answers', cond: { $ne: ['$$this.questionId', qid] } } },
                [{ questionId: qid, answer }],
              ],
            },
          },
        },
      ],
      { updatePipeline: true }
    ).exec();
    return result.matchedCount;
  },

  async complete(sessionId: string, result: SessionResult): Promise<number> {
    await mongo.connect();
    const update = await DiagnosticSessionModel.updateOne(
      { _id: sessionId, status: 'in_progress' },
      { $set: { ...result, status: 'completed', completedAt: new Date() } }
    ).exec();
    return update.matchedCount;
  },
};
