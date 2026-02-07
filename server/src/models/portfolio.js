import mongoose from 'mongoose';

const portfolioSchema = new mongoose.Schema({
  userId: { type: String, required: true }, // 사용자 ID
  title: { type: String, required: true },  // 포트폴리오 제목
  content: { type: Object, required: true }, // 포트폴리오 내용 (JSON 통째로 저장)
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// ES Module 방식의 export
const Portfolio = mongoose.model('Portfolio', portfolioSchema);
export default Portfolio;