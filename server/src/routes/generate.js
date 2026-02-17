// src/routes/generate.js
import { Router } from 'express';
import { generateCoverLetter, generatePortfolioJson } from '../services/llm.js';

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

/**
 * [추가] AI 포트폴리오 생성 API
 * POST /api/generate/portfolio
 * Body: { userPrompt: "사용자의 경험 내역" }
 */
router.post('/portfolio', async (req, res) => {
  try {
    const { userPrompt } = req.body;

    if (!userPrompt) {
      return res.status(400).json({ error: 'userPrompt(사용자 입력)가 필요합니다.' });
    }

    console.log('🤖 포트폴리오 생성 요청:', userPrompt.substring(0, 20) + '...');

    // AI 서비스 호출
    const portfolioData = await generatePortfolioJson({ userPrompt });

    // 성공 시 JSON 데이터 반환
    return res.json({ success: true, data: portfolioData });

  } catch (err) {
    console.error('❌ 포트폴리오 생성 에러:', err);
    return res.status(500).json({
      error: err.message || '서버 에러 발생',
    });
  }
});

export default router;
