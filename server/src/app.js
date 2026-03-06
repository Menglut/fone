import dotenv from 'dotenv';     
// 환경변수 로드를 가장 먼저 실행하여 다른 모듈들이 안전하게 process.env를 쓸 수 있게 합니다.
dotenv.config();

import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose'; 

import generateRouter from './routes/generateRoute.js';
import pdfRouter from './routes/pdfRoute.js';
import interviewRouter from './routes/interviewRoute.js';
// 💡 주의: 파일명을 portfolioRoute.js 로 맞춰서 저장해 주세요!
import portfolioRouter from './routes/portfolioRoute.js'; 
import authRouter from './routes/authRoute.js';

const app = express();

// MongoDB 연결 설정
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

app.use(cors());

// 포트폴리오 데이터 용량 제한 (10mb)
app.use(express.json({ limit: '10mb' })); 
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// 라우터 등록
app.use('/api/generate', generateRouter);
app.use('/api/pdf', pdfRouter);
app.use('/api/interview', interviewRouter);
// ✨ 프론트에서 /api/portfolio 로 보내면 여기서 받아서 처리합니다.
app.use('/api/portfolio', portfolioRouter); 
app.use('/api/auth', authRouter);

export default app;