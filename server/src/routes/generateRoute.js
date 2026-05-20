// server/src/routes/generateRoute.js
import { Router } from 'express';
import axios from 'axios';
import {
  generateCoverLetter,
  generatePortfolioJson,
  generateFollowupQuestions,
  evaluateAnswerQuality,
  improveUserAnswer,
  suggestStrongAnswer,
  polishResumeText,
} from '../services/llm.js';
import { analyzeJobPost } from '../services/jobPostParser.js';

const router = Router();

// 채용공고 URL/텍스트 분석
router.post('/analyze-job-post', async (req, res) => {
  try {
    const { input, userProfile } = req.body;

    if (!input || !String(input).trim()) {
      return res.status(400).json({
        success: false,
        isJobPost: false,
        needsMoreDetail: true,
        showJobHelp: true,
        message: '분석할 채용공고 URL이나 공고 내용을 입력해 주세요.',
      });
    }

    const result = await analyzeJobPost({ input, userProfile });
    return res.json(result);
  } catch (err) {
    console.error('❌ /api/generate/analyze-job-post 에러:', err);
    return res.status(500).json({
      success: false,
      isJobPost: false,
      needsMoreDetail: true,
      showJobHelp: true,
      message: err.message || '채용공고 분석 중 서버 오류가 발생했습니다.',
    });
  }
});

// 자기소개서 생성
router.post('/cover-letter', async (req, res) => {
  try {
    const { resume, jobPost, options } = req.body;

    if (!resume?.experience || !jobPost) {
      return res.status(400).json({
        success: false,
        canGenerate: false,
        error: 'resume.experience 와 jobPost는 필수입니다.',
      });
    }

    console.log(' /api/generate/cover-letter 요청 도착:', {
      hasExperience: Boolean(resume?.experience),
      usableAnswers: resume?.interviewAnswers?.length || 0,
      rejectedAnswers: resume?.rejectedAnswers?.length || 0,
      options,
    });

    const result = await generateCoverLetter({ resume, jobPost, options });

    if (typeof result === 'string') {
      return res.json({ success: true, canGenerate: true, content: result });
    }

    return res.json({
      success: true,
      canGenerate: result.canGenerate !== false,
      content: result.content || '',
      missingFields: result.missingFields || [],
      message: result.message || '',
      nextQuestion: result.nextQuestion || '',
      lengthInfo: result.lengthInfo || null,
    });
  } catch (err) {
    console.error('❌ /api/generate/cover-letter 에러:', err);
    return res.status(500).json({
      success: false,
      canGenerate: false,
      error: err.message || '서버 내부 오류가 발생했습니다.',
    });
  }
});

// 꼬리 질문 생성
router.post('/followup', async (req, res) => {
  try {
    const { experienceText, companyQuestion } = req.body;

    if (!experienceText || !companyQuestion) {
      return res.status(400).json({
        error: 'experienceText와 companyQuestion이 필요합니다.',
      });
    }

    console.log(' /api/generate/followup 요청 도착');

    const questions = await generateFollowupQuestions({ experienceText, companyQuestion });

    return res.json({ success: true, questions });
  } catch (err) {
    console.error('❌ /api/generate/followup 에러:', err);
    return res.status(500).json({
      error: err.message || '꼬리 질문 생성 중 오류가 발생했습니다.',
    });
  }
});

// 답변 품질 평가
router.post('/evaluate-answer', async (req, res) => {
  try {
    const { jobPost, baseExperience, question, answer, previousAnswers, userProfile, turnCount } = req.body;

    if (!answer || !String(answer).trim()) {
      return res.status(400).json({
        success: false,
        usable: false,
        readyToGenerate: false,
        message: '평가할 답변이 필요합니다.',
      });
    }

    const result = await evaluateAnswerQuality({
      jobPost,
      baseExperience,
      question,
      answer,
      previousAnswers,
      userProfile,
      turnCount,
    });

    return res.json({
      success: true,
      ...result,
    });
  } catch (err) {
    console.error('❌ /api/generate/evaluate-answer 에러:', err);
    return res.status(500).json({
      success: false,
      usable: false,
      readyToGenerate: false,
      shouldAskAgain: true,
      message: err.message || '답변 평가 중 오류가 발생했습니다.',
      nextQuestion: '조금 더 구체적으로 본인이 직접 한 일과 결과를 알려주실 수 있을까요?',
    });
  }
});

// 사용자 답변 다듬기
router.post('/improve-answer', async (req, res) => {
  try {
    const { jobPost, baseExperience, question, answer, userProfile } = req.body;

    if (!answer || !String(answer).trim()) {
      return res.status(400).json({
        success: false,
        canImprove: false,
        message: '다듬을 답변이 필요합니다.',
      });
    }

    const result = await improveUserAnswer({
      jobPost,
      baseExperience,
      question,
      answer,
      userProfile,
    });

    return res.json({
      success: true,
      ...result,
    });
  } catch (err) {
    console.error('❌ /api/generate/improve-answer 에러:', err);
    return res.status(500).json({
      success: false,
      canImprove: false,
      message: err.message || '답변 다듬기 중 오류가 발생했습니다.',
    });
  }
});


// 통과에 필요한 답변 가이드 생성
router.post('/suggest-answer', async (req, res) => {
  try {
    const { jobPost, baseExperience, question, currentInput, previousAnswers, userProfile } = req.body;

    if (!question || !String(question).trim()) {
      return res.status(400).json({
        success: false,
        suggestedAnswer: '',
        checklist: [],
        note: '추천 답변을 만들 질문이 필요합니다.',
      });
    }

    const result = await suggestStrongAnswer({
      jobPost,
      baseExperience,
      question,
      currentInput,
      previousAnswers,
      userProfile,
    });

    return res.json({
      success: true,
      ...result,
    });
  } catch (err) {
    console.error('❌ /api/generate/suggest-answer 에러:', err);
    return res.status(500).json({
      success: false,
      suggestedAnswer: '',
      checklist: [],
      note: err.message || '추천 답변 생성 중 오류가 발생했습니다.',
    });
  }
});


// 저장된 자기소개서 전체 글 다듬기
router.post('/polish-resume', async (req, res) => {
  try {
    const { title, content, mode, targetLength } = req.body;

    if (!content || !String(content).trim()) {
      return res.status(400).json({
        success: false,
        polishedText: '',
        note: '다듬을 자기소개서 내용이 필요합니다.',
      });
    }

    const result = await polishResumeText({
      title,
      content,
      mode,
      targetLength,
    });

    return res.json({
      success: true,
      ...result,
    });
  } catch (err) {
    console.error('❌ /api/generate/polish-resume 에러:', err);
    return res.status(500).json({
      success: false,
      polishedText: '',
      note: err.message || '자기소개서 글 다듬기 중 오류가 발생했습니다.',
    });
  }
});

// AI 포트폴리오 생성
router.post('/portfolio', async (req, res) => {
  try {
    const { userPrompt } = req.body;

    if (!userPrompt) {
      return res.status(400).json({
        success: false,
        message: 'userPrompt(사용자 입력)가 필요합니다.',
      });
    }

    console.log(' 포트폴리오 생성 요청:', userPrompt.substring(0, 20) + '...');

    const portfolioData = await generatePortfolioJson({ userPrompt });

    return res.json({ success: true, data: portfolioData });
  } catch (err) {
    console.error('❌ 포트폴리오 생성 에러:', err);
    return res.status(500).json({
      success: false,
      message: err.message || '서버 에러 발생',
    });
  }
});

// 프로필 문장 스트리밍
router.post('/profile-stream', async (req, res) => {
  const { userPrompt } = req.body;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const response = await axios.post(
      'https://api.deepseek.com/chat/completions',
      {
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content:
              '너는 전문 커리어 컨설턴트야. 반드시 한국어로 대답해. 다른 설명이나 JSON 형식 없이 오직 매력적인 자기소개 문장만 2문장 이내로 출력해.',
          },
          { role: 'user', content: userPrompt },
        ],
        stream: true,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        },
        responseType: 'stream',
      }
    );

    response.data.on('data', (chunk) => {
      res.write(chunk);
    });

    response.data.on('end', () => {
      res.write('data: [DONE]\n\n');
      res.end();
    });

    response.data.on('error', (err) => {
      console.error('Stream Data Error:', err);
      res.end();
    });
  } catch (error) {
    console.error('Stream Request Error:', error);
    if (!res.headersSent) {
      res.status(500).end();
    } else {
      res.end();
    }
  }
});

export default router;
