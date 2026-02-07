import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose'; // [추가] DB 라이브러리
import dotenv from 'dotenv';     // [추가] 환경변수 관리

import generateRouter from './routes/generate.js';
import pdfRouter from './routes/pdf.js';
import interviewRouter from './routes/interview.js';
import portfolioRouter from './routes/portfolio.js'; // [추가] 포트폴리오 라우터

// 환경변수 설정 로드 (.env 파일)
dotenv.config();

const app = express();

// [추가] MongoDB 연결 설정
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

app.use(cors());

// [수정] 포트폴리오 데이터(이미지 포함 가능성)를 위해 용량 제한을 늘려주세요 (1mb -> 10mb)
app.use(express.json({ limit: '10mb' })); 
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// 라우터 등록
app.use('/api/generate', generateRouter);
app.use('/api/pdf', pdfRouter);
app.use('/api/interview', interviewRouter);
app.use('/api/portfolio', portfolioRouter); // [추가] API 경로 설정

export default app;