import mongoose from 'mongoose';

const portfolioSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  title: { type: String, required: true },

  // ✨ 핵심: 과거 데이터(Object)와 최신 데이터(Array)를 모두 통과시키기 위해 'Mixed' 타입을 사용합니다.
  // 이제 Mongoose가 옛날 데이터를 멋대로 지우지 않고 프론트엔드로 온전히 보내줍니다.
  content: { type: mongoose.Schema.Types.Mixed, default: [] }

}, {
  timestamps: true 
});

const Portfolio = mongoose.model('Portfolio', portfolioSchema);
export default Portfolio;