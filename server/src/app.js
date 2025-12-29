import express from 'express';
import cors from 'cors';
import generateRouter from './routes/generate.js';
import pdfRouter from './routes/pdf.js';

const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.use('/api/generate', generateRouter);
app.use('/api/pdf', pdfRouter);

export default app;
