import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  // 기존 회원가입/로그인 필드
  googleId: { type: String, unique: true, sparse: true },
  email: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  password: { type: String },
  picture: { type: String },
  createdAt: { type: Date, default: Date.now },

  // ✨ 포트폴리오 마스터 프로필을 위한 추가 필드
  jobTitle: { type: String, default: '' }, // 직무
  github: { type: String, default: '' },   // 깃허브/블로그 링크
  intro: { type: String, default: '' },    // 자기소개
});

export default mongoose.model('User', userSchema);