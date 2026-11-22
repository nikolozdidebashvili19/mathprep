import mongoose, { Schema, InferSchemaType } from 'mongoose';

import { LOCALES, STUDENT_GRADES } from '@/shared/const/domain.const';

const UserSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: false, default: '' },
    avatar: { type: String, required: false },
    role: { type: String, enum: ['user', 'admin'], default: 'user', required: true },
    grade: { type: Number, enum: [...STUDENT_GRADES], required: false },
    targetScore: { type: Number, min: 0, required: false },
    locale: { type: String, enum: [...LOCALES], default: 'ka', required: true },
  },
  { timestamps: true }
);

export type UserDocument = InferSchemaType<typeof UserSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const UserModel =
  mongoose.models.User || mongoose.model('User', UserSchema);
