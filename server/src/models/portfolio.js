import mongoose from 'mongoose';

const portfolioSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  title: { type: String, required: true },

  // ✨ 프론트엔드의 데이터 구조에 완벽하게 맞춰서 '배열 안의 평탄화된 객체' 형태로 변경했습니다.
  content: [{
    title: { type: String, default: '' },
    techStack: { type: String, default: '' },
    why: { type: String, default: '' },
    how: { type: String, default: '' },
    then: { type: String, default: '' },
    architectureCode: { type: String, default: '' },
    
    // 차트 데이터는 배열이 들어올 수도 있고, 빈 문자열이 들어올 수도 있으므로 Mixed 타입으로 유연하게 받습니다.
    chartData: { type: mongoose.Schema.Types.Mixed, default: [] }
  }]
}, {
  timestamps: true 
});

const Portfolio = mongoose.model('Portfolio', portfolioSchema);
export default Portfolio;