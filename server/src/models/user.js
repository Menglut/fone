import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  // 구글 로그인은 googleId가 있지만, 일반 로그인은 없으므로 required: false 로 변경
  googleId: { type: String, unique: true, sparse: true },
  email: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  // 일반 가입자는 비밀번호가 필요함
  password: { type: String },
  picture: { type: String },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('User', userSchema);