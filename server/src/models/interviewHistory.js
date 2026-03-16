// models/interviewHistory.js
import mongoose from 'mongoose';

const interviewHistorySchema = new mongoose.Schema({
  userId: { 
    type: String, 
    required: true 
  },
  docId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Resume' // 어떤 자소서를 기반으로 한 면접인지 연결
  },
  title: { 
    type: String, 
    default: '역면접 스트레스 테스트 기록' 
  },
  chatHistory: [
    {
      sender: { type: String, enum: ['user', 'ai'], required: true },
      text: { type: String, required: true },
      isStuttering: { type: Boolean, default: false },
      createdAt: { type: Date, default: Date.now }
    }
  ],
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

export default mongoose.model('InterviewHistory', interviewHistorySchema);