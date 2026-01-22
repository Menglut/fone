// src/routes/interview.js
import { Router } from 'express';
import { generateFollowupQuestions } from '../services/llm.js';

const router = Router();

/**
 * POST /api/interview/questions
 * body: { experienceText: string, companyQuestion: string }
 * resp: { questions: [{ id, category, text }] }
 */
router.post('/questions', async (req, res) => {
  try {
    const { experienceText, companyQuestion } = req.body;

    if (!experienceText || !companyQuestion) {
      return res.status(400).json({
        error: 'experienceText 와 companyQuestion는 필수입니다.',
      });
    }

    const questions = await generateFollowupQuestions({ experienceText, companyQuestion });
    return res.json({ questions });
  } catch (err) {
    console.error('❌ /api/interview/questions 에러:', err);
    return res.status(500).json({
      error: err.message || '서버 내부 오류가 발생했습니다.',
    });
  }
});

export default router;
