// src/routes/generate.js
import { Router } from 'express';
import { generateCoverLetter, generatePortfolioJson } from '../services/llm.js';
import axios from 'axios';

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
      // 💡 [수정 포인트 1] error 객체 대신 success: false 와 message로 통일
      return res.status(400).json({
        success: false,
        message: 'userPrompt(사용자 입력)가 필요합니다.'
      });
    }

    console.log('🤖 포트폴리오 생성 요청:', userPrompt.substring(0, 20) + '...');

    const portfolioData = await generatePortfolioJson({ userPrompt });

    return res.json({ success: true, data: portfolioData });

  } catch (err) {
    console.error('❌ 포트폴리오 생성 에러:', err);
    // 💡 [수정 포인트 2] 서버 에러 시에도 success: false 와 message로 통일
    return res.status(500).json({
      success: false,
      message: err.message || '서버 에러 발생'
    });
  }
});

router.post('/profile-stream', async (req, res) => {
  const { userPrompt } = req.body;

  // 💡 스트리밍을 위한 헤더 설정
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const response = await axios.post('https://api.deepseek.com/chat/completions', {
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          // 💡 수정: JSON 형식이 아닌 '순수 텍스트'만 출력하도록 하여 입력창에 글자만 바로 써지게 합니다.
          content: "너는 전문 커리어 컨설턴트야. 반드시 한국어로 대답해. 다른 설명이나 JSON 형식 없이 오직 매력적인 자기소개 문장만 2문장 이내로 출력해."
        },
        { role: "user", content: userPrompt }
      ],
      stream: true
    }, {
      headers: { 'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}` },
      responseType: 'stream'
    });

    // 데이터 조각(chunk)이 들어올 때마다 프론트로 전송
    response.data.on('data', chunk => {
      res.write(chunk);
    });

    response.data.on('end', () => {
      res.write('data: [DONE]\n\n'); // 종료 신호 명시
      res.end();
    });

    // 💡 연결 오류 시 처리
    response.data.on('error', (err) => {
      console.error("Stream Data Error:", err);
      res.end();
    });

  } catch (error) {
    console.error("Stream Request Error:", error);
    // 💡 이미 헤더가 전송된 경우 status를 바꿀 수 없으므로 end로 마감
    if (!res.headersSent) {
      res.status(500).end();
    } else {
      res.end();
    }
  }
});

export default router;
