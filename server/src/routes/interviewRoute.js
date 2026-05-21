// routes/interviewRoute.js
import express from 'express';
import mongoose from 'mongoose';
import axios from 'axios';

import Resume from '../models/resume.js';
import Portfolio from '../models/portfolio.js';
import Experience from '../models/experience.js';
import InterviewHistory from '../models/interviewHistory.js';
import InterviewSession from '../models/interviewSession.js';

import {
  generateReverseInterviewAttacks,
  generateInterviewResponseAndFollowUps,
} from '../services/llm.js';

import {
  generateInterviewQuestions,
  generateFreePracticeQuestion,
  evaluateInterviewAnswer,
  analyzeJobPostingText,
  generateReverseInterviewAnswer,
  generateReverseQuestionSuggestions,
} from '../services/interviewCoach.js';

const router = express.Router();

const ALLOWED_MODES = ['reverse', 'weakness', 'strength', 'free'];

function isValidObjectId(id) {
  return Boolean(id && mongoose.Types.ObjectId.isValid(id));
}

function normalizeMode(mode) {
  return ALLOWED_MODES.includes(mode) ? mode : 'weakness';
}

function compactText(value = '', maxLength = 5000) {
  const text = String(value || '').trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trim()}...`;
}

function normalizeCompany(company = {}) {
  return {
    name: String(company.name || '').trim(),
    position: String(company.position || company.targetJob || '').trim(),
    jobDescription: String(company.jobDescription || company.jd || '').trim(),
    jobPostingUrl: String(company.jobPostingUrl || company.url || '').trim(),
    requiredSkills: Array.isArray(company.requiredSkills)
      ? company.requiredSkills.filter(Boolean)
      : [],
  };
}

function normalizeSelectedExperience(item = {}, fallbackType = 'experience') {
  return {
    id: String(item.id || item._id || ''),
    type: item.type || fallbackType,
    title: String(item.title || item.name || '선택 경험').trim(),
    sourceTitle: String(item.sourceTitle || item.source || fallbackType).trim(),
    content: compactText(
      item.content ||
        item.summary ||
        item.description ||
        item.text ||
        JSON.stringify(item, null, 2),
      5000,
    ),
  };
}

function resumeToExperience(resume) {
  const qnaText = Array.isArray(resume.qnaList)
    ? resume.qnaList
        .map((q, index) => {
          return [`문항 ${index + 1}: ${q.question || ''}`, `답변 ${index + 1}: ${q.answer || ''}`]
            .filter(Boolean)
            .join('\n');
        })
        .join('\n\n')
    : '';

  return normalizeSelectedExperience(
    {
      id: resume._id,
      type: 'resume',
      title: resume.title || '자기소개서',
      sourceTitle: resume.targetCompany || '자기소개서',
      content: [
        resume.targetCompany && `지원 기업: ${resume.targetCompany}`,
        resume.targetJob && `지원 직무: ${resume.targetJob}`,
        resume.content && `본문:\n${resume.content}`,
        qnaText && `문항 답변:\n${qnaText}`,
      ]
        .filter(Boolean)
        .join('\n\n'),
    },
    'resume',
  );
}

function portfolioToExperience(portfolio) {
  return normalizeSelectedExperience(
    {
      id: portfolio._id,
      type: 'portfolio',
      title: portfolio.title || '포트폴리오',
      sourceTitle: '포트폴리오',
      content: JSON.stringify(portfolio.content || [], null, 2),
    },
    'portfolio',
  );
}

function experienceToExperience(experience) {
  const troubleshootings = Array.isArray(experience.troubleshootings)
    ? experience.troubleshootings
        .map((item, index) => {
          return [
            `트러블슈팅 ${index + 1}: ${item.title || ''}`,
            item.why && `Why: ${item.why}`,
            item.how && `How: ${item.how}`,
            item.then && `Then: ${item.then}`,
          ]
            .filter(Boolean)
            .join('\n');
        })
        .join('\n\n')
    : '';

  const techStack = Array.isArray(experience.techStack)
    ? experience.techStack.join(', ')
    : String(experience.techStack || '');

  return normalizeSelectedExperience(
    {
      id: experience._id,
      type: 'experience',
      title: experience.title || '경험/프로젝트',
      sourceTitle: '경험 관리',
      content: [
        experience.period && `기간: ${experience.period}`,
        experience.role && `역할: ${experience.role}`,
        techStack && `기술 스택: ${techStack}`,
        experience.summary && `요약: ${experience.summary}`,
        troubleshootings && `상세 경험:\n${troubleshootings}`,
      ]
        .filter(Boolean)
        .join('\n'),
    },
    'experience',
  );
}

async function resolveSelectedExperiences({ selectedExperiences = [], selectedSources = [], selectedExperienceIds = [] }) {
  const directItems = Array.isArray(selectedExperiences)
    ? selectedExperiences.map((item) => normalizeSelectedExperience(item, item.type || 'custom'))
    : [];

  const sources = Array.isArray(selectedSources) ? [...selectedSources] : [];

  if (Array.isArray(selectedExperienceIds) && selectedExperienceIds.length > 0) {
    selectedExperienceIds.forEach((id) => {
      if (typeof id === 'string') sources.push({ type: 'experience', id });
      else if (id?.id) sources.push(id);
    });
  }

  const fetchedItems = [];

  for (const source of sources) {
    const type = source.type || 'experience';
    const id = source.id || source._id || source.docId;

    if (!isValidObjectId(id)) continue;

    if (type === 'resume') {
      const resume = await Resume.findById(id);
      if (resume) fetchedItems.push(resumeToExperience(resume));
    }

    if (type === 'portfolio') {
      const portfolio = await Portfolio.findById(id);
      if (portfolio) fetchedItems.push(portfolioToExperience(portfolio));
    }

    if (type === 'experience') {
      const experience = await Experience.findById(id);
      if (experience) fetchedItems.push(experienceToExperience(experience));
    }
  }

  const merged = [...directItems, ...fetchedItems].filter((item) => item.title || item.content);
  const seen = new Set();

  return merged.filter((item) => {
    const key = `${item.type}:${item.id || item.title}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function calculateTotalScore(questions = []) {
  const scored = questions.filter((q) => typeof q.score === 'number' && Number.isFinite(q.score));
  if (!scored.length) return null;
  const total = scored.reduce((sum, q) => sum + q.score, 0);
  return Math.round(total / scored.length);
}


function stripHtmlToText(html = '') {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function isAllowedHttpUrl(url = '') {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch (_) {
    return false;
  }
}

/**
 * 채용공고 URL 분석
 * POST /api/interview/job-posting/preview
 */
router.post('/job-posting/preview', async (req, res) => {
  try {
    const { url } = req.body;
    const targetUrl = String(url || '').trim();

    if (!isAllowedHttpUrl(targetUrl)) {
      return res.status(400).json({ success: false, message: '유효한 채용공고 URL을 입력해주세요.' });
    }

    const pageRes = await axios.get(targetUrl, {
      timeout: 12000,
      maxRedirects: 5,
      responseType: 'text',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      validateStatus: (status) => status >= 200 && status < 400,
    });

    const html = String(pageRes.data || '');
    const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]
      ?.replace(/\s+/g, ' ')
      ?.trim() || '';
    const text = stripHtmlToText(html);

    if (!text || text.length < 120) {
      return res.status(422).json({
        success: false,
        message: '공고 내용을 충분히 읽지 못했습니다. 로그인/봇 차단이 있는 공고라면 내용을 직접 붙여넣어 주세요.',
      });
    }

    const analyzed = await analyzeJobPostingText({
      url: targetUrl,
      title,
      rawText: compactText(text, 9000),
    });

    res.status(200).json({
      success: true,
      data: {
        url: targetUrl,
        title,
        company: analyzed.company,
        summary: analyzed.summary,
        rawPreview: compactText(text, 1200),
      },
    });
  } catch (error) {
    console.error('채용공고 URL 분석 실패:', error);
    res.status(500).json({
      success: false,
      message: '채용공고 URL을 불러오지 못했습니다. 공고 내용을 직접 붙여넣어 주세요.',
    });
  }
});

/**
 * 새 역면접 시작 화면용 자료 조회
 * GET /api/interview/sources/:userId
 */
router.get('/sources/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ success: false, message: '사용자 ID가 필요합니다.' });
    }

    const [resumes, portfolios, experiences] = await Promise.all([
      Resume.find({ userId }).sort({ updatedAt: -1, createdAt: -1 }),
      Portfolio.find({ userId }).sort({ updatedAt: -1, createdAt: -1 }),
      Experience.find({ userId }).sort({ updatedAt: -1, createdAt: -1 }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        resumes: resumes.map((resume) => ({
          id: resume._id,
          type: 'resume',
          title: resume.title,
          targetCompany: resume.targetCompany || '',
          targetJob: resume.targetJob || '',
          preview: compactText(resume.content || JSON.stringify(resume.qnaList || []), 180),
          updatedAt: resume.updatedAt,
        })),
        portfolios: portfolios.map((portfolio) => ({
          id: portfolio._id,
          type: 'portfolio',
          title: portfolio.title,
          preview: compactText(JSON.stringify(portfolio.content || []), 180),
          updatedAt: portfolio.updatedAt,
        })),
        experiences: experiences.map((experience) => ({
          id: experience._id,
          type: 'experience',
          title: experience.title,
          role: experience.role || '',
          period: experience.period || '',
          techStack: experience.techStack || [],
          preview: compactText(experience.summary || JSON.stringify(experience.troubleshootings || []), 180),
          updatedAt: experience.updatedAt,
        })),
      },
    });
  } catch (error) {
    console.error('면접 자료 조회 실패:', error);
    res.status(500).json({ success: false, message: '면접 자료를 불러오지 못했습니다.' });
  }
});

/**
 * 역면접 세션 준비
 * POST /api/interview/prepare
 *
 * - mode: 'reverse'이면 질문을 미리 만들지 않고 세션만 준비한다.
 * - 약점/강점/자유 기능 선택은 면접방에서 사용자가 자유롭게 전환한다.
 * - 기존 호환을 위해 mode가 weakness/strength/free이면 기존처럼 질문을 생성한다.
 */
router.post('/prepare', async (req, res) => {
  try {
    const {
      userId,
      mode = 'reverse',
      company = {},
      selectedSources = [],
      selectedExperienceIds = [],
      selectedExperiences = [],
      save = true,
    } = req.body;

    const safeMode = normalizeMode(mode);
    const normalizedCompany = normalizeCompany(company);
    const resolvedExperiences = await resolveSelectedExperiences({
      selectedExperiences,
      selectedSources,
      selectedExperienceIds,
    });

    if (resolvedExperiences.length === 0) {
      return res.status(400).json({
        success: false,
        message: '역면접에 사용할 선택 자료가 필요합니다.',
      });
    }

    // 새 구조: 준비 화면에서는 기업/경험만 저장하고, 면접방에서 약점/강점/자유 모드를 고른다.
    if (safeMode === 'reverse') {
      let session = null;
      const summary = '역면접 세션이 준비되었습니다. 면접방에서 약점/강점/자유 모드를 선택할 수 있습니다.';

      if (save && userId) {
        session = await InterviewSession.create({
          userId,
          title: `${normalizedCompany.name || '기업 미정'} 역면접`,
          mode: 'reverse',
          company: normalizedCompany,
          selectedExperiences: resolvedExperiences,
          summary,
          questions: [],
          reverseTurns: [],
          status: 'prepared',
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          sessionId: session?._id || null,
          session,
          mode: 'reverse',
          company: normalizedCompany,
          selectedExperiences: resolvedExperiences,
          summary,
          questions: [],
        },
      });
    }

    let result;

    if (safeMode === 'free') {
      const freeQuestion = await generateFreePracticeQuestion({
        company: normalizedCompany,
        selectedExperiences: resolvedExperiences,
      });

      result = {
        mode: safeMode,
        summary: '자유 면접 연습 질문을 생성했습니다.',
        questions: [
          {
            id: 'q1',
            question: freeQuestion.question,
            intent: freeQuestion.intent,
            focus: freeQuestion.evaluationFocus.join(', '),
            difficulty: 'normal',
          },
        ],
      };
    } else {
      result = await generateInterviewQuestions({
        mode: safeMode,
        company: normalizedCompany,
        selectedExperiences: resolvedExperiences,
      });
    }

    let session = null;

    if (save && userId) {
      session = await InterviewSession.create({
        userId,
        title: `${normalizedCompany.name || '기업 미정'} ${
          safeMode === 'weakness' ? '약점 분석' : safeMode === 'strength' ? '강점 어필' : '자유 연습'
        }`,
        mode: safeMode,
        company: normalizedCompany,
        selectedExperiences: resolvedExperiences,
        summary: result.summary,
        questions: result.questions,
        status: 'prepared',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        sessionId: session?._id || null,
        session,
        mode: safeMode,
        company: normalizedCompany,
        selectedExperiences: resolvedExperiences,
        summary: result.summary,
        questions: result.questions,
      },
    });
  } catch (error) {
    console.error('면접 준비 실패:', error);
    res.status(500).json({ success: false, message: '면접 준비 중 서버 오류가 발생했습니다.' });
  }
});


/**
 * 기업/직무/선택 서류 기반 역면접 추천 질문 생성
 * POST /api/interview/reverse-suggestions
 *
 * 약점/강점 역면접에서 사용자가 면접관처럼 던질 만한 질문을 생성한다.
 */
router.post('/reverse-suggestions', async (req, res) => {
  try {
    const {
      sessionId,
      mode = 'weakness',
      company = {},
      selectedSources = [],
      selectedExperienceIds = [],
      selectedExperiences = [],
    } = req.body;

    const safeMode = mode === 'strength' ? 'strength' : 'weakness';
    let finalCompany = normalizeCompany(company);
    let finalSelectedExperiences = await resolveSelectedExperiences({
      selectedExperiences,
      selectedSources,
      selectedExperienceIds,
    });

    if (sessionId && isValidObjectId(sessionId)) {
      const session = await InterviewSession.findById(sessionId);
      if (session) {
        finalCompany = normalizeCompany(session.company || {});
        finalSelectedExperiences = session.selectedExperiences || finalSelectedExperiences;
      }
    }

    if (!finalSelectedExperiences.length) {
      return res.status(400).json({
        success: false,
        message: '추천 질문 생성을 위해 선택한 서류/경험 데이터가 필요합니다.',
      });
    }

    const result = await generateReverseQuestionSuggestions({
      mode: safeMode,
      company: finalCompany,
      selectedExperiences: finalSelectedExperiences,
    });

    res.status(200).json({
      success: true,
      data: {
        mode: safeMode,
        company: finalCompany,
        basis: result.basis,
        suggestions: result.suggestions,
      },
    });
  } catch (error) {
    console.error('역면접 추천 질문 생성 실패:', error);
    res.status(500).json({ success: false, message: '역면접 추천 질문 생성 중 서버 오류가 발생했습니다.' });
  }
});

/**
 * 역면접 답변 생성
 * POST /api/interview/reverse-answer
 *
 * 사용자가 면접관 질문을 입력하면 AI가 지원자처럼 답변하고,
 * 해당 답변에 대한 피드백을 함께 반환한다.
 */
router.post('/reverse-answer', async (req, res) => {
  try {
    const {
      sessionId,
      mode = 'weakness',
      company = {},
      selectedSources = [],
      selectedExperienceIds = [],
      selectedExperiences = [],
      interviewerQuestion,
      chatContext = [],
    } = req.body;

    const safeMode = mode === 'strength' ? 'strength' : 'weakness';
    const question = String(interviewerQuestion || '').trim();

    if (!question) {
      return res.status(400).json({ success: false, message: '면접관 질문이 필요합니다.' });
    }

    let session = null;
    let finalCompany = normalizeCompany(company);
    let finalSelectedExperiences = await resolveSelectedExperiences({
      selectedExperiences,
      selectedSources,
      selectedExperienceIds,
    });

    if (sessionId && isValidObjectId(sessionId)) {
      session = await InterviewSession.findById(sessionId);

      if (session) {
        finalCompany = normalizeCompany(session.company || {});
        finalSelectedExperiences = session.selectedExperiences || [];
      }
    }

    if (!finalSelectedExperiences.length) {
      return res.status(400).json({
        success: false,
        message: 'AI 지원자가 답변할 서류/경험 데이터가 필요합니다.',
      });
    }

    const result = await generateReverseInterviewAnswer({
      mode: safeMode,
      company: finalCompany,
      selectedExperiences: finalSelectedExperiences,
      interviewerQuestion: question,
      chatContext,
    });

    const turn = {
      id: `r${Date.now()}`,
      mode: safeMode,
      interviewerQuestion: question,
      aiAnswer: result.aiAnswer,
      detectedPoint: result.detectedPoint,
      feedback: result.feedback,
    };

    if (session) {
      session.reverseTurns.push(turn);
      session.status = 'in_progress';
      await session.save();
    }

    res.status(200).json({
      success: true,
      data: {
        turnId: turn.id,
        sessionId: session?._id || null,
        mode: safeMode,
        interviewerQuestion: question,
        detectedPoint: result.detectedPoint,
        aiAnswer: result.aiAnswer,
        feedback: result.feedback,
      },
    });
  } catch (error) {
    console.error('역면접 답변 생성 실패:', error);
    res.status(500).json({ success: false, message: '역면접 답변 생성 중 서버 오류가 발생했습니다.' });
  }
});

/**
 * 자유 연습 질문 1개 생성
 * POST /api/interview/free-question
 */
router.post('/free-question', async (req, res) => {
  try {
    const {
      company = {},
      selectedSources = [],
      selectedExperienceIds = [],
      selectedExperiences = [],
      userPrompt = '',
      previousQuestions = [],
      chatContext = [],
      randomSeed = '',
    } = req.body;

    const resolvedExperiences = await resolveSelectedExperiences({
      selectedExperiences,
      selectedSources,
      selectedExperienceIds,
    });

    const question = await generateFreePracticeQuestion({
      company: normalizeCompany(company),
      selectedExperiences: resolvedExperiences,
      userPrompt,
      previousQuestions,
      chatContext,
      randomSeed,
    });

    res.status(200).json({ success: true, data: question });
  } catch (error) {
    console.error('자유 질문 생성 실패:', error);
    res.status(500).json({ success: false, message: '자유 질문 생성 중 서버 오류가 발생했습니다.' });
  }
});

/**
 * 답변 평가 및 세션 업데이트
 * POST /api/interview/evaluate
 */
router.post('/evaluate', async (req, res) => {
  try {
    const {
      sessionId,
      mode = 'free',
      company = {},
      selectedSources = [],
      selectedExperienceIds = [],
      selectedExperiences = [],
      questionId,
      question,
      answer,
      chatContext = [],
    } = req.body;

    let session = null;
    let finalMode = normalizeMode(mode);
    let finalCompany = normalizeCompany(company);
    let finalSelectedExperiences = await resolveSelectedExperiences({
      selectedExperiences,
      selectedSources,
      selectedExperienceIds,
    });
    let finalQuestion = question;

    if (sessionId && isValidObjectId(sessionId)) {
      session = await InterviewSession.findById(sessionId);
      if (session) {
        // reverse 세션에서는 면접방에서 선택한 현재 모드(free)를 그대로 사용한다.
        finalMode = session.mode === 'reverse' ? normalizeMode(mode) : session.mode;
        finalCompany = normalizeCompany(session.company || {});
        finalSelectedExperiences = session.selectedExperiences || [];

        const foundQuestion = session.questions.find((q) => q.id === questionId);
        if (!finalQuestion && foundQuestion) finalQuestion = foundQuestion.question;
      }
    }

    if (!finalQuestion) {
      return res.status(400).json({ success: false, message: '평가할 질문이 필요합니다.' });
    }

    if (!answer || !String(answer).trim()) {
      return res.status(400).json({ success: false, message: '평가할 답변이 필요합니다.' });
    }

    const evaluation = await evaluateInterviewAnswer({
      mode: finalMode,
      company: finalCompany,
      selectedExperiences: finalSelectedExperiences,
      question: finalQuestion,
      answer,
      chatContext,
    });

    if (session) {
      const targetQuestion = session.questions.find((q) => q.id === questionId || q.question === finalQuestion);

      if (targetQuestion) {
        targetQuestion.answer = answer;
        targetQuestion.score = evaluation.score;
        targetQuestion.level = evaluation.level;
        targetQuestion.scoreBreakdown = evaluation.scoreBreakdown;
        targetQuestion.goodPoints = evaluation.goodPoints;
        targetQuestion.weakPoints = evaluation.weakPoints;
        targetQuestion.advice = evaluation.advice;
        targetQuestion.improvedAnswer = evaluation.improvedAnswer;
        targetQuestion.followUpQuestion = evaluation.followUpQuestion;
      } else {
        session.questions.push({
          id: questionId || `q${session.questions.length + 1}`,
          question: finalQuestion,
          answer,
          score: evaluation.score,
          level: evaluation.level,
          scoreBreakdown: evaluation.scoreBreakdown,
          goodPoints: evaluation.goodPoints,
          weakPoints: evaluation.weakPoints,
          advice: evaluation.advice,
          improvedAnswer: evaluation.improvedAnswer,
          followUpQuestion: evaluation.followUpQuestion,
        });
      }

      session.status = 'in_progress';
      session.totalScore = calculateTotalScore(session.questions);
      await session.save();
    }

    res.status(200).json({
      success: true,
      data: {
        evaluation,
        sessionId: session?._id || null,
        totalScore: session?.totalScore ?? null,
      },
    });
  } catch (error) {
    console.error('면접 답변 평가 실패:', error);
    res.status(500).json({ success: false, message: '답변 평가 중 서버 오류가 발생했습니다.' });
  }
});

/**
 * 세션 완료/수동 저장
 * POST /api/interview/save-session
 */
router.post('/save-session', async (req, res) => {
  try {
    const { sessionId, userId, title, mode = 'free', company = {}, selectedExperiences = [], questions = [] } = req.body;

    let session;

    if (sessionId && isValidObjectId(sessionId)) {
      session = await InterviewSession.findByIdAndUpdate(
        sessionId,
        {
          ...(title ? { title } : {}),
          ...(questions.length ? { questions } : {}),
          totalScore: calculateTotalScore(questions),
          status: 'completed',
        },
        { new: true },
      );
    } else {
      if (!userId) {
        return res.status(400).json({ success: false, message: '사용자 ID가 필요합니다.' });
      }

      session = await InterviewSession.create({
        userId,
        title: title || 'AI 면접 연습 기록',
        mode: normalizeMode(mode),
        company: normalizeCompany(company),
        selectedExperiences,
        questions,
        totalScore: calculateTotalScore(questions),
        status: 'completed',
      });
    }

    if (!session) {
      return res.status(404).json({ success: false, message: '저장할 세션을 찾지 못했습니다.' });
    }

    res.status(200).json({ success: true, message: '면접 세션이 저장되었습니다.', data: session });
  } catch (error) {
    console.error('면접 세션 저장 실패:', error);
    res.status(500).json({ success: false, message: '면접 세션 저장 중 서버 오류가 발생했습니다.' });
  }
});

/**
 * 새 면접 세션 목록
 * GET /api/interview/sessions/:userId
 */
router.get('/sessions/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const sessions = await InterviewSession.find({ userId }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: sessions });
  } catch (error) {
    console.error('면접 세션 목록 조회 실패:', error);
    res.status(500).json({ success: false, message: '면접 세션 목록을 불러오지 못했습니다.' });
  }
});

/**
 * 새 면접 세션 상세
 * GET /api/interview/session/:sessionId
 */
router.get('/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    if (!isValidObjectId(sessionId)) {
      return res.status(400).json({ success: false, message: '유효하지 않은 세션 ID입니다.' });
    }

    const session = await InterviewSession.findById(sessionId);

    if (!session) {
      return res.status(404).json({ success: false, message: '면접 세션을 찾을 수 없습니다.' });
    }

    res.status(200).json({ success: true, data: session });
  } catch (error) {
    console.error('면접 세션 상세 조회 실패:', error);
    res.status(500).json({ success: false, message: '면접 세션을 불러오지 못했습니다.' });
  }
});

/**
 * --------------------------------------------------------------------------
 * 기존 역면접 API 호환 유지
 * --------------------------------------------------------------------------
 */

// 역면접 스캐너: 전 직군 범용 공격 질문 생성 API (POST /api/interview/generate-attacks)
router.post('/generate-attacks', async (req, res) => {
  try {
    const { docType, docId } = req.body;

    if (!docId) {
      return res.status(400).json({ success: false, message: '문서 ID가 필요합니다.' });
    }

    let documentContent = '';
    let targetJob = '';

    if (docType === 'resume' || !docType) {
      const resume = await Resume.findById(docId);

      if (!resume) {
        return res.status(404).json({ success: false, message: '자기소개서를 찾을 수 없습니다.' });
      }

      targetJob = resume.targetJob || '';

      if (resume.content) {
        documentContent = `[제목]: ${resume.title}\n[내용]: ${resume.content}`;
      } else if (resume.qnaList && resume.qnaList.length > 0) {
        const combinedText = resume.qnaList.map((q) => `Q: ${q.question}\nA: ${q.answer}`).join('\n\n');
        documentContent = `[제목]: ${resume.title}\n[내용]:\n${combinedText}`;
      } else {
        return res.status(400).json({ success: false, message: '문서에 내용이 없습니다.' });
      }
    } else if (docType === 'portfolio') {
      const portfolio = await Portfolio.findById(docId);

      if (!portfolio) {
        return res.status(404).json({ success: false, message: '포트폴리오를 찾을 수 없습니다.' });
      }

      targetJob = portfolio.profile?.jobTitle || '';
      documentContent = JSON.stringify(portfolio);
    } else {
      return res.status(400).json({ success: false, message: '지원하지 않는 문서 타입입니다.' });
    }

    const attacks = await generateReverseInterviewAttacks({ documentContent, targetJob });

    res.status(200).json({ success: true, data: attacks });
  } catch (error) {
    console.error('AI 공격 생성 에러:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

// 실시간 면접 채팅 및 꼬리 질문 생성 (POST /api/interview/chat)
router.post('/chat', async (req, res) => {
  try {
    const { docId, currentQuestion, chatContext } = req.body;

    const resume = await Resume.findById(docId);

    if (!resume) {
      return res.status(404).json({ success: false, message: '문서를 찾을 수 없습니다.' });
    }

    const documentContent = resume.content || JSON.stringify(resume.qnaList);
    const aiResponse = await generateInterviewResponseAndFollowUps({
      documentContent,
      currentQuestion,
      chatContext,
    });

    res.status(200).json({ success: true, data: aiResponse });
  } catch (error) {
    console.error('AI 챗 에러:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

// 기존 면접 기록 저장 (POST /api/interview/save)
router.post('/save', async (req, res) => {
  try {
    const { userId, docId, title, chatHistory } = req.body;

    const newHistory = new InterviewHistory({ userId, docId, title, chatHistory });
    await newHistory.save();

    res.status(201).json({ success: true, message: '면접 기록이 저장되었습니다.' });
  } catch (error) {
    console.error('면접 저장 에러:', error);
    res.status(500).json({ success: false, message: '기록 저장에 실패했습니다.' });
  }
});

// 기존 내 면접 기록 조회 (GET /api/interview/history/:userId)
router.get('/history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const historyList = await InterviewHistory.find({ userId }).sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: historyList });
  } catch (error) {
    console.error('기록 조회 에러:', error);
    res.status(500).json({ success: false, message: '기록을 불러오지 못했습니다.' });
  }
});

export default router;
