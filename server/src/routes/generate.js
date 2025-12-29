// src/routes/generate.js
import { Router } from 'express';
import { generateCoverLetter } from '../services/llm.js';

const router = Router();

router.post('/', async (req, res) => {
  try {
    const { resume, jobPost, options } = req.body;

    // 필수 값 체크
    if (!resume?.experience || !jobPost) {
      return res.status(400).json({
        error: 'resume.experience 와 jobPost는 필수입니다.',
      });
    }

    console.log('🔥 /api/generate 요청 도착:', { resume, jobPost, options });

    // ✅ llm.js에 있는 함수 호출
    const text = await generateCoverLetter({ resume, jobPost, options });

    return res.json({ text });
  } catch (err) {
    console.error('❌ /api/generate 에러:', err);
    return res.status(500).json({
      error: err.message || '서버 내부 오류가 발생했습니다.',
    });
  }
});

export default router;
