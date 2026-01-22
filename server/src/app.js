import express from 'express';
import cors from 'cors';
import generateRouter from './routes/generate.js';
import pdfRouter from './routes/pdf.js';
import interviewRouter from './routes/interview.js';

const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.use('/api/generate', generateRouter);
app.use('/api/pdf', pdfRouter);
app.use('/api/interview', interviewRouter);

export default app;
