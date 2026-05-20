import mongoose from 'mongoose';

const careerProfileSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ['rookie', 'career'],
      default: 'rookie',
    },
    jobCategory: {
      type: String,
      default: '',
    },
    jobDetail: {
      type: String,
      default: '',
    },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema({
  // 기존 회원가입/로그인 필드
  googleId: {
    type: String,
    unique: true,
    sparse: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
  },
  password: {
    type: String,
  },
  picture: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },

  // 기존 프로필 필드
  jobTitle: {
    type: String,
    default: '',
  },
  github: {
    type: String,
    default: '',
  },
  intro: {
    type: String,
    default: '',
  },

  // 새 커리어 프로필 필드
  careerProfile: {
    type: careerProfileSchema,
    default: () => ({
      status: 'rookie',
      jobCategory: '',
      jobDetail: '',
    }),
  },
});

export default mongoose.model('User', userSchema);