// server/src/models/builderHistory.js
import mongoose from 'mongoose';

const builderHistorySchema = new mongoose.Schema({
  userId: { 
    type: String, 
    required: true 
  },
  title: { 
    type: String, 
    default: '포트폴리오 빌더 대화 기록' 
  },
  portfolioData: { 
    type: Array, 
    default: [] // 완성된 여러 개의 프로젝트 데이터 배열
  },
  chatHistory: [
    {
      sender: { type: String, required: true }, // 'user', 'system', 'TECH', 'DESIGN', 'HR'
      text: { type: String, required: true },
      createdAt: { type: Date, default: Date.now }
    }
  ],
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

export default mongoose.model('BuilderHistory', builderHistorySchema);