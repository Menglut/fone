import mongoose from 'mongoose';

const portfolioSchema = new mongoose.Schema({
  userId: { type: String, required: true }, // 사용자 ID
  title: { type: String, required: true },  // 포트폴리오 제목
  
  // 💡 [수정 포인트 1] 단순 Object 대신 프론트엔드 구조와 똑같이 명시
  content: {
    profile: {
      name: { type: String, default: '' },
      jobTitle: { type: String, default: '' },
      email: { type: String, default: '' },
      intro: { type: String, default: '' }
    },
    projects: [{
      id: { type: String }, // 프론트엔드에서 만든 UUID
      title: { type: String, default: '' },
      period: { type: String, default: '' },
      techStack: { type: String, default: '' },
      description: { type: String, default: '' }
    }]
  }
}, { 
  // 💡 [수정 포인트 2] Mongoose 내장 타임스탬프 옵션 사용
  // 이걸 켜두면 createdAt과 updatedAt을 우리가 직접 적어줄 필요 없이 
  // 데이터가 생성/수정될 때 DB가 알아서 시간을 기록해 줍니다.
  timestamps: true 
});

const Portfolio = mongoose.model('Portfolio', portfolioSchema);
export default Portfolio;