import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../css/ReverseInterviewRoom.css';
import mainLogo from '../assets/logo.png';

const API_BASE = process.env.REACT_APP_API_BASE || '';

const MODE_OPTIONS = {
  weakness: {
    chip: 'WEAKNESS REVERSE',
    title: '약점 역면접',
    shortTitle: '약점',
    description: '내 서류의 약한 지점만 찌르는 질문을 던지면 AI 지원자가 당황하며 답변하고, 어떤 점이 약점인지 피드백합니다.',
    placeholder: '예: 이 프로젝트에서 본인이 직접 한 역할이 정확히 무엇인가요?',
    submitLabel: '약점 질문하기',
  },
  strength: {
    chip: 'STRENGTH REVERSE',
    title: '강점 역면접',
    shortTitle: '강점',
    description: '내 서류의 강점 포인트를 질문하면 AI 지원자가 설득력 있게 답변하고, 왜 좋은 답변인지 피드백합니다.',
    placeholder: '예: 이 경험이 백엔드 직무와 어떻게 연결된다고 생각하나요?',
    submitLabel: '강점 질문하기',
  },
  free: {
    chip: 'FREE PRACTICE',
    title: '자유 면접 연습',
    shortTitle: '자유',
    description: '역면접이 아니라 사용자가 직접 답변하고 AI가 0~100점으로 평가하는 면접 연습 공간입니다.',
    placeholder: '예: 협업 과정에서 갈등을 해결한 경험을 말해주세요.',
    submitLabel: '질문 설정',
  },
};

const SOURCE_META = {
  resume: '자기소개서',
  portfolio: '포트폴리오',
  experience: '경험',
  custom: '자료',
};


const normalizeSuggestion = (item, index = 0, mode = 'weakness') => {
  if (typeof item === 'string') {
    return {
      id: `fallback-${index + 1}`,
      question: item,
      intent: '',
      targetPoint: mode === 'weakness' ? '약점 검증' : '강점 어필',
      companyFit: '',
      pressureLevel: mode === 'weakness' ? 'high' : 'normal',
    };
  }

  return {
    id: item?.id || `suggestion-${index + 1}`,
    question: String(item?.question || '').trim(),
    intent: String(item?.intent || '').trim(),
    targetPoint: String(item?.targetPoint || item?.focus || '').trim(),
    companyFit: String(item?.companyFit || '').trim(),
    pressureLevel: String(item?.pressureLevel || (mode === 'weakness' ? 'high' : 'normal')).trim(),
  };
};

const buildLocalReverseSuggestions = (mode, company = {}, sources = []) => {
  const companyName = String(company.name || '').trim() || '지원 기업';
  const position = String(company.position || '').trim() || '지원 직무';
  const jobDescription = String(company.jobDescription || '').replace(/\s+/g, ' ').trim();
  const firstTitle = sources?.[0]?.title || '선택한 경험';
  const jdHint = jobDescription ? `공고 요구사항(${jobDescription.slice(0, 80)}${jobDescription.length > 80 ? '...' : ''})` : `${companyName} ${position}`;

  const fallback = mode === 'strength'
    ? [
        {
          id: 'local-s1',
          question: `${companyName}의 ${position} 직무에서 ${firstTitle} 경험을 강점으로 제시한다면, 어떤 문제 해결 역량을 보여주는 사례라고 설명하시겠습니까?`,
          intent: '선택 경험을 기업/직무 요구 역량과 직접 연결해 말할 수 있는지 확인합니다.',
          targetPoint: '직무 적합성·문제 해결력',
          companyFit: jdHint,
          pressureLevel: 'normal',
        },
        {
          id: 'local-s2',
          question: `${firstTitle}에서 본인이 직접 내린 기술적 판단이나 개선 결정은 무엇이었고, 그 판단이 결과에 어떤 영향을 줬나요?`,
          intent: '단순 참여가 아니라 본인의 판단과 실행에서 성과가 나왔는지 확인합니다.',
          targetPoint: '기술 판단·주도성',
          companyFit: `${position} 실무 판단력 검증`,
          pressureLevel: 'normal',
        },
        {
          id: 'local-s3',
          question: `${companyName}에 입사한 뒤 비슷한 상황을 맡는다면, 이 경험을 바탕으로 어떤 방식으로 더 빠르게 성과를 낼 수 있습니까?`,
          intent: '과거 경험을 입사 후 기여 가능성으로 확장할 수 있는지 확인합니다.',
          targetPoint: '입사 후 기여도',
          companyFit: `${companyName} 맞춤 기여 가능성`,
          pressureLevel: 'normal',
        },
        {
          id: 'local-s4',
          question: `${firstTitle}에서 협업이나 커뮤니케이션 측면에서 본인의 강점이 드러난 순간을 구체적으로 설명해 주세요.`,
          intent: '기술 외 협업 역량을 실제 경험으로 설명할 수 있는지 확인합니다.',
          targetPoint: '협업 역량',
          companyFit: `${position} 팀 업무 적합성`,
          pressureLevel: 'normal',
        },
        {
          id: 'local-s5',
          question: `이 경험을 다른 지원자와 차별화되는 강점으로 말한다면, 면접관이 기억해야 할 한 가지 포인트는 무엇입니까?`,
          intent: '강점을 짧고 선명하게 정리할 수 있는지 확인합니다.',
          targetPoint: '차별화 포인트',
          companyFit: `${companyName} 면접 메시지`,
          pressureLevel: 'normal',
        },
      ]
    : [
        {
          id: 'local-w1',
          question: `${companyName}의 ${position} 직무 기준으로 보면 ${firstTitle} 경험에서 본인의 직접 기여 범위가 모호해 보입니다. 정확히 어떤 부분을 본인이 책임졌나요?`,
          intent: '서류에서 역할과 기여 범위가 명확한지 압박 검증합니다.',
          targetPoint: '역할 모호성',
          companyFit: jdHint,
          pressureLevel: 'high',
        },
        {
          id: 'local-w2',
          question: `${firstTitle}의 결과가 좋아 보이지만 객관적인 수치나 검증 근거가 부족합니다. 성과를 어떻게 증명할 수 있나요?`,
          intent: '성과가 주장에 그치지 않고 근거로 입증되는지 확인합니다.',
          targetPoint: '성과 근거 부족',
          companyFit: `${companyName} 면접관 관점의 검증 가능성`,
          pressureLevel: 'high',
        },
        {
          id: 'local-w3',
          question: `해당 경험에서 사용한 기술이나 방식이 ${companyName}의 ${position} 업무에도 적합하다고 볼 근거가 있나요? 단순히 써봤다는 수준은 아닌가요?`,
          intent: '기술 사용 경험이 지원 기업의 실무 맥락과 연결되는지 압박합니다.',
          targetPoint: '기업/직무 연결 약함',
          companyFit: `${companyName} ${position} 요구 역량 적합성`,
          pressureLevel: 'high',
        },
        {
          id: 'local-w4',
          question: `${firstTitle}에서 가장 어려웠던 문제를 해결했다고 했는데, 본인이 직접 해결한 과정과 팀의 도움을 받은 부분을 구분해서 설명해 주세요.`,
          intent: '문제 해결 과정에서 개인 기여와 팀 기여를 분리해 검증합니다.',
          targetPoint: '개인 기여 검증',
          companyFit: `${position} 실무 독립성`,
          pressureLevel: 'high',
        },
        {
          id: 'local-w5',
          question: `만약 ${companyName} 면접관이 이 경험에서 가장 약한 부분 하나를 지적한다면 무엇이라고 생각하고, 어떻게 보완하겠습니까?`,
          intent: '자기 객관화와 보완 계획이 있는지 확인합니다.',
          targetPoint: '자기 객관화·보완 계획',
          companyFit: `${companyName} 입사 후 성장 가능성`,
          pressureLevel: 'medium',
        },
      ];

  return fallback.map((item, index) => normalizeSuggestion(item, index, mode));
};

const toArray = (value) => {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
};

const compactText = (value, maxLength = 220) => {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trim()}...`;
};

const getStoredUser = () => {
  try {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  } catch {
    return null;
  }
};

const getUserId = (user) => user?.id || user?._id || user?.email || '';

const normalizeSourcesForRequest = (selectedSources = [], selectedExperiences = []) => {
  const requestSources = toArray(selectedSources).map((source) => ({
    type: source.type || 'custom',
    id: source.id || source._id || '',
    title: source.title || source.name || '선택 자료',
    content: source.content || source.preview || source.summary || '',
    raw: source.raw || source,
  }));

  const requestExperiences = toArray(selectedExperiences).map((source) => ({
    type: source.type || 'custom',
    id: source.id || source._id || '',
    title: source.title || source.name || '선택 자료',
    content: source.content || source.preview || source.summary || '',
  }));

  return requestExperiences.length ? requestExperiences : requestSources;
};

const normalizeReverseResponse = (responseData) => {
  const payload = responseData?.data || responseData || {};
  const feedback = payload.feedback || {};

  return {
    id: payload.turnId || payload.id || `turn-${Date.now()}`,
    mode: payload.mode || 'weakness',
    interviewerQuestion: payload.interviewerQuestion || payload.question || '',
    aiAnswer: payload.aiAnswer || payload.answer || '',
    detectedPoint: payload.detectedPoint || feedback.detectedPoint || '',
    feedback: {
      summary: feedback.summary || payload.summary || '',
      answerQuality: feedback.answerQuality || '',
      goodPoints: toArray(feedback.goodPoints || payload.goodPoints),
      weakPoints: toArray(feedback.weakPoints || payload.weakPoints),
      improvements: toArray(feedback.improvements || feedback.advice || payload.improvements),
      betterAnswer: feedback.betterAnswer || feedback.improvedAnswer || payload.betterAnswer || '',
      interviewerTip: feedback.interviewerTip || payload.interviewerTip || '',
    },
  };
};

const normalizeEvaluation = (responseData) => {
  const payload = responseData?.data || responseData || {};
  const evaluation = payload.evaluation || payload;
  const score = Number(evaluation.score ?? evaluation.totalScore ?? 0);

  return {
    score: Number.isFinite(score) ? Math.max(0, Math.min(100, score)) : 0,
    level: evaluation.level || '',
    scoreBreakdown: evaluation.scoreBreakdown || evaluation.criteria || evaluation.breakdown || {},
    goodPoints: toArray(evaluation.goodPoints),
    weakPoints: toArray(evaluation.weakPoints),
    advice: toArray(evaluation.advice || evaluation.improvements),
    improvedAnswer: evaluation.improvedAnswer || '',
    followUpQuestion: evaluation.followUpQuestion || '',
  };
};

const getScoreClass = (score) => {
  if (score >= 85) return 'excellent';
  if (score >= 70) return 'good';
  if (score >= 55) return 'normal';
  return 'danger';
};

const SCORE_BREAKDOWN_ITEMS = [
  { key: 'intent', label: '질문 의도 파악', max: 20, aliases: ['questionIntent', 'intentUnderstanding', 'questionUnderstanding', '질문 의도 파악', '질문의도파악'] },
  { key: 'specificity', label: '경험의 구체성', max: 25, aliases: ['experienceSpecificity', 'detail', 'details', 'concreteness', '경험의 구체성', '경험구체성'] },
  { key: 'jobFit', label: '직무/기업 연관성', max: 20, aliases: ['companyFit', 'relevance', 'jobRelevance', 'companyRelevance', '지원 기업/직무 연관성', '직무/기업 연관성', '직무기업연관성'] },
  { key: 'structure', label: '논리적 구성', max: 15, aliases: ['logic', 'logicalStructure', 'flow', '논리적 구성', '논리구성'] },
  { key: 'result', label: '성과와 배운 점', max: 10, aliases: ['outcome', 'learning', 'resultAndLearning', 'resultLearning', 'lesson', '성과와 배운 점', '성과와배운점', '성과/배운점'] },
  { key: 'expression', label: '표현력', max: 10, aliases: ['communication', 'attitude', 'delivery', '표현력', '표현력과 태도', '표현'] },
];

const getBreakdownValue = (breakdown = {}, item) => {
  const candidates = [item.key, ...(item.aliases || [])];

  for (const key of candidates) {
    const raw = breakdown?.[key];
    const value = typeof raw === 'object' && raw !== null
      ? Number(raw.score ?? raw.value ?? raw.point)
      : Number(raw);

    if (Number.isFinite(value)) {
      return Math.max(0, Math.min(item.max, value));
    }
  }

  return null;
};

const renderScoreBreakdown = (scoreBreakdown = {}) => {
  const rows = SCORE_BREAKDOWN_ITEMS.map((item) => ({
    ...item,
    value: getBreakdownValue(scoreBreakdown, item),
  }));

  const hasAnyScore = rows.some((row) => row.value !== null);

  if (!hasAnyScore) {
    return null;
  }

  return (
    <div className="score-breakdown-card">
      <div className="score-breakdown-title">
        <strong>평가 기준</strong>
        <span>총 100점</span>
      </div>

      <div className="score-breakdown-list">
        {rows.map((row) => {
          const percent = row.value === null ? 0 : Math.round((row.value / row.max) * 100);

          return (
            <div className="score-breakdown-row" key={row.key}>
              <div className="score-breakdown-label">
                <span>{row.label}</span>
                <b>{row.value === null ? '- ' : row.value} / {row.max}</b>
              </div>
              <div className="score-breakdown-track" aria-hidden="true">
                <div style={{ width: `${percent}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default function ReverseInterviewRoom() {
  const location = useLocation();
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);

  const {
    sessionId: initialSessionId = '',
    session = null,
    company = {},
    selectedSources = [],
    selectedExperiences = [],
    summary = '',
    initialMode = 'weakness',
  } = location.state || {};

  const [sessionId] = useState(initialSessionId || session?._id || session?.id || '');
  const [activeMode, setActiveMode] = useState(['weakness', 'strength', 'free'].includes(initialMode) ? initialMode : 'weakness');
  const [reverseQuestion, setReverseQuestion] = useState('');
  const [freeQuestion, setFreeQuestion] = useState('');
  const [freeAnswer, setFreeAnswer] = useState('');
  const [isFreeQuestionOpen, setIsFreeQuestionOpen] = useState(true);
  const [messages, setMessages] = useState(() => [
    {
      id: 'welcome',
      type: 'system',
      text: '역면접 방에 입장했습니다. 왼쪽에서 약점/강점/자유 모드를 선택한 뒤 질문을 시작하세요.',
    },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingQuestion, setIsGeneratingQuestion] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [suggestionBasis, setSuggestionBasis] = useState('');
  const [isSuggestionOpen, setIsSuggestionOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const currentMode = MODE_OPTIONS[activeMode] || MODE_OPTIONS.weakness;
  const requestExperiences = useMemo(
    () => normalizeSourcesForRequest(selectedSources, selectedExperiences),
    [selectedSources, selectedExperiences],
  );

  const displaySources = useMemo(() => {
    if (requestExperiences.length) return requestExperiences;
    return toArray(selectedSources);
  }, [requestExperiences, selectedSources]);

  const localSuggestedReverseQuestions = useMemo(
    () => buildLocalReverseSuggestions(activeMode, company, requestExperiences),
    [activeMode, company, requestExperiences],
  );

  const suggestedReverseQuestions = activeMode === 'free'
    ? []
    : (aiSuggestions.length ? aiSuggestions : localSuggestedReverseQuestions);

  const previousFreeQuestions = useMemo(() => (
    messages
      .filter((message) => message.type === 'free-question' || message.type === 'free-evaluation')
      .map((message) => message.text || message.question)
      .filter(Boolean)
      .slice(-8)
  ), [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isSubmitting]);

  useEffect(() => {
    if (!location.state) {
      alert('면접 설정 정보가 없습니다. 준비 화면으로 이동합니다.');
      navigate('/interview/prep');
    }
  }, [location.state, navigate]);


  useEffect(() => {
    let ignore = false;

    const fetchReverseSuggestions = async () => {
      if (activeMode === 'free') {
        setAiSuggestions([]);
        setSuggestionBasis('');
        return;
      }

      setIsLoadingSuggestions(true);
      setSuggestionBasis('');

      try {
        const res = await axios.post(`${API_BASE}/api/interview/reverse-suggestions`, {
          sessionId,
          mode: activeMode,
          company,
          selectedExperiences: requestExperiences,
        });

        if (ignore) return;

        const payload = res.data?.data || res.data || {};
        const suggestions = toArray(payload.suggestions)
          .map((item, index) => normalizeSuggestion(item, index, activeMode))
          .filter((item) => item.question);

        setAiSuggestions(suggestions);
        setSuggestionBasis(payload.basis || '기업/직무/선택 서류를 기준으로 추천 질문을 생성했습니다.');
      } catch (error) {
        if (ignore) return;
        console.warn('기업 맞춤 추천 질문 생성 실패, 로컬 추천 질문 사용:', error);
        setAiSuggestions([]);
        setSuggestionBasis('AI 추천 질문 생성에 실패해 기업/직무 기반 기본 추천 질문을 표시합니다.');
      } finally {
        if (!ignore) setIsLoadingSuggestions(false);
      }
    };

    fetchReverseSuggestions();

    return () => {
      ignore = true;
    };
  }, [activeMode, sessionId, company, requestExperiences]);

  const pushSystemMessage = (text) => {
    setMessages((prev) => [
      ...prev,
      {
        id: `system-${Date.now()}`,
        type: 'system',
        text,
      },
    ]);
  };

  const handleChangeMode = (nextMode) => {
    setActiveMode(nextMode);
    setErrorMessage('');
    setIsSuggestionOpen(false);
    if (nextMode === 'free' && !freeQuestion.trim()) {
      setIsFreeQuestionOpen(true);
    }

    const next = MODE_OPTIONS[nextMode];
    pushSystemMessage(`${next.title} 모드로 전환했습니다. ${next.description}`);
  };


  const handleApplySuggestion = (suggestion) => {
    const question = typeof suggestion === 'string' ? suggestion : suggestion?.question;
    setReverseQuestion(question || '');
    setIsSuggestionOpen(false);
  };

  const handleReverseSubmit = async () => {
    const question = reverseQuestion.trim();

    if (!question) {
      alert('AI 지원자에게 던질 질문을 입력해주세요.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    const userQuestionMessage = {
      id: `interviewer-${Date.now()}`,
      type: 'interviewer',
      mode: activeMode,
      text: question,
    };

    setMessages((prev) => [...prev, userQuestionMessage]);
    setReverseQuestion('');

    try {
      const res = await axios.post(`${API_BASE}/api/interview/reverse-answer`, {
        sessionId,
        mode: activeMode,
        company,
        selectedExperiences: requestExperiences,
        interviewerQuestion: question,
        chatContext: messages.slice(-8),
      });

      if (res.data?.success === false) {
        throw new Error(res.data?.message || 'AI 답변 생성에 실패했습니다.');
      }

      const result = normalizeReverseResponse(res.data);

      setMessages((prev) => [
        ...prev,
        {
          id: result.id,
          type: 'reverse-result',
          mode: activeMode,
          question,
          result,
        },
      ]);
    } catch (error) {
      console.error('역면접 답변 실패:', error);
      setErrorMessage(error.response?.data?.message || error.message || 'AI 역면접 답변 생성 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenerateFreeQuestion = async () => {
    setIsGeneratingQuestion(true);
    setErrorMessage('');

    try {
      const res = await axios.post(`${API_BASE}/api/interview/free-question`, {
        sessionId,
        company,
        selectedExperiences: requestExperiences,
        userPrompt: previousFreeQuestions.includes(freeQuestion.trim()) ? '' : freeQuestion,
        previousQuestions: previousFreeQuestions,
        chatContext: messages.slice(-10),
        randomSeed: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      });

      if (res.data?.success === false) {
        throw new Error(res.data?.message || '자유 질문 생성에 실패했습니다.');
      }

      const payload = res.data?.data || res.data || {};
      const generatedQuestion = payload.question || '지원 직무와 관련된 핵심 경험을 설명해주세요.';
      setFreeQuestion(generatedQuestion);
      setIsFreeQuestionOpen(false);

      setMessages((prev) => [
        ...prev,
        {
          id: `free-q-${Date.now()}`,
          type: 'free-question',
          text: generatedQuestion,
          intent: payload.intent || '',
          evaluationFocus: toArray(payload.evaluationFocus),
        },
      ]);
    } catch (error) {
      console.error('자유 질문 생성 실패:', error);
      setErrorMessage(error.response?.data?.message || error.message || '자유 질문 생성 중 오류가 발생했습니다.');
    } finally {
      setIsGeneratingQuestion(false);
    }
  };

  const handleFreeEvaluate = async () => {
    const question = freeQuestion.trim();
    const answer = freeAnswer.trim();

    if (!question) {
      alert('평가할 면접 질문을 입력하거나 AI 질문 생성을 눌러주세요.');
      return;
    }

    if (!answer) {
      alert('평가할 답변을 입력해주세요.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const res = await axios.post(`${API_BASE}/api/interview/evaluate`, {
        sessionId,
        mode: 'free',
        company,
        selectedExperiences: requestExperiences,
        question,
        answer,
        chatContext: messages.slice(-8),
      });

      if (res.data?.success === false) {
        throw new Error(res.data?.message || '답변 평가에 실패했습니다.');
      }

      const evaluation = normalizeEvaluation(res.data);

      setMessages((prev) => [
        ...prev,
        {
          id: `free-answer-${Date.now()}`,
          type: 'free-evaluation',
          question,
          answer,
          evaluation,
        },
      ]);

      setFreeAnswer('');
    } catch (error) {
      console.error('자유 답변 평가 실패:', error);
      setErrorMessage(error.response?.data?.message || error.message || '답변 평가 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExit = () => {
    navigate('/mypage');
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      if (activeMode === 'free') handleFreeEvaluate();
      else handleReverseSubmit();
    }
  };

  const renderReverseFeedback = (result) => {
    const feedback = result.feedback || {};

    return (
      <div className={`reverse-feedback-card ${result.mode}`}>
        <div className="reverse-feedback-head">
          <span>{result.mode === 'weakness' ? '약점 피드백' : '강점 피드백'}</span>
          <strong>{feedback.summary || result.detectedPoint || 'AI 답변에 대한 피드백입니다.'}</strong>
        </div>

        {result.detectedPoint && (
          <div className="feedback-section">
            <strong>질문이 찌른 포인트</strong>
            <p>{result.detectedPoint}</p>
          </div>
        )}

        {feedback.answerQuality && (
          <div className="quality-pill">
            답변 상태: <b>{feedback.answerQuality}</b>
          </div>
        )}

        {feedback.goodPoints.length > 0 && (
          <div className="feedback-section">
            <strong>좋았던 점</strong>
            <ul>
              {feedback.goodPoints.map((item, index) => <li key={index}>{item}</li>)}
            </ul>
          </div>
        )}

        {feedback.weakPoints.length > 0 && (
          <div className="feedback-section">
            <strong>부족하거나 흔들린 점</strong>
            <ul>
              {feedback.weakPoints.map((item, index) => <li key={index}>{item}</li>)}
            </ul>
          </div>
        )}

        {feedback.improvements.length > 0 && (
          <div className="feedback-section">
            <strong>개선 방향</strong>
            <ul>
              {feedback.improvements.map((item, index) => <li key={index}>{item}</li>)}
            </ul>
          </div>
        )}

        {feedback.betterAnswer && (
          <div className="improved-answer-box">
            <strong>더 나은 답변 예시</strong>
            <p>{feedback.betterAnswer}</p>
          </div>
        )}

        {feedback.interviewerTip && (
          <div className="followup-box">
            <strong>면접관으로 더 찌를 질문</strong>
            <button type="button" onClick={() => setReverseQuestion(feedback.interviewerTip)}>
              {feedback.interviewerTip}
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderMessage = (message) => {
    if (message.type === 'system') {
      return <div key={message.id} className="system-notice">{message.text}</div>;
    }

    if (message.type === 'interviewer') {
      return (
        <div key={message.id} className="msg-wrap user">
          <span className="user-tag">INTERVIEWER QUESTION · {MODE_OPTIONS[message.mode]?.shortTitle}</span>
          <div className="user-bubble">{message.text}</div>
        </div>
      );
    }

    if (message.type === 'reverse-result') {
      return (
        <div key={message.id} className="msg-wrap ai reverse-result-wrap">
          <div className="ai-avatar-icon">🤖</div>
          <div className="ai-bubble-wrap">
            <span className="ai-name">AI APPLICANT · {MODE_OPTIONS[message.mode]?.shortTitle}</span>
            <div className={`ai-bubble ${message.mode}`}>
              <p>{message.result.aiAnswer}</p>
            </div>
            {renderReverseFeedback(message.result)}
          </div>
        </div>
      );
    }

    if (message.type === 'free-question') {
      return (
        <div key={message.id} className="msg-wrap ai">
          <div className="ai-avatar-icon">🎯</div>
          <div className="ai-bubble-wrap">
            <span className="ai-name">AI COACH · FREE QUESTION</span>
            <div className="ai-bubble free">
              <p>{message.text}</p>
              {message.intent && (
                <div className="question-intent">
                  <strong>질문 의도</strong>
                  <span>{message.intent}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    if (message.type === 'free-evaluation') {
      const evaluation = message.evaluation;
      return (
        <div key={message.id} className="msg-wrap ai free-eval-wrap">
          <div className="ai-avatar-icon">📊</div>
          <div className="ai-bubble-wrap">
            <span className="ai-name">AI COACH · SCORE REPORT</span>
            <div className="free-question-review">
              <strong>질문</strong>
              <p>{message.question}</p>
              <strong>내 답변</strong>
              <p>{message.answer}</p>
            </div>
            <div className="feedback-card">
              <div className={`score-circle ${getScoreClass(evaluation.score)}`}>
                <strong>{evaluation.score}</strong>
                <span>점</span>
              </div>
              <div className="feedback-main">
                <div className="feedback-head">
                  <span>{evaluation.level || 'AI 평가'}</span>
                  <strong>답변을 0~100점 기준으로 평가했습니다.</strong>
                </div>

                {renderScoreBreakdown(evaluation.scoreBreakdown)}

                {evaluation.goodPoints.length > 0 && (
                  <div className="feedback-section">
                    <strong>좋았던 점</strong>
                    <ul>{evaluation.goodPoints.map((item, index) => <li key={index}>{item}</li>)}</ul>
                  </div>
                )}

                {evaluation.weakPoints.length > 0 && (
                  <div className="feedback-section">
                    <strong>부족한 점</strong>
                    <ul>{evaluation.weakPoints.map((item, index) => <li key={index}>{item}</li>)}</ul>
                  </div>
                )}

                {evaluation.advice.length > 0 && (
                  <div className="feedback-section">
                    <strong>개선 방향</strong>
                    <ul>{evaluation.advice.map((item, index) => <li key={index}>{item}</li>)}</ul>
                  </div>
                )}

                {evaluation.improvedAnswer && (
                  <div className="improved-answer-box">
                    <strong>개선 답변 예시</strong>
                    <p>{evaluation.improvedAnswer}</p>
                  </div>
                )}

                {evaluation.followUpQuestion && (
                  <div className="followup-box">
                    <strong>추가 연습 질문</strong>
                    <button
                      type="button"
                      onClick={() => {
                        setFreeQuestion(evaluation.followUpQuestion);
                        setIsFreeQuestionOpen(false);
                      }}
                    >
                      {evaluation.followUpQuestion}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="room-container reverse-room-v2">
      <header className="room-header">
        <button type="button" className="room-logo-btn" onClick={() => navigate('/')}>
          <img src={mainLogo} alt="F1ND YOUR WAY" className="room-logo-img" />
        </button>

        <div className="room-header-info">
          <span>{currentMode.chip}</span>
          <strong>
            {company.name || '기업 미정'} · {company.position || '직무 미정'}
          </strong>
        </div>

        <button type="button" className="room-exit-btn" onClick={handleExit}>
          EXIT
        </button>
      </header>

      <main className="room-layout interview-layout-v2 reverse-layout-v2">
        <aside className="room-attack-panel reverse-control-panel">
          <div className="panel-header">
            <span className="panel-chip">MODE SELECT</span>
            <div className="panel-title">역면접 기능 선택</div>
            <p>준비 화면에서 선택한 기업/서류를 기준으로, 면접방 안에서 원하는 기능을 자유롭게 전환합니다.</p>
          </div>

          <div className="mode-switch-list">
            {Object.entries(MODE_OPTIONS).map(([key, option]) => (
              <button
                key={key}
                type="button"
                className={`room-mode-card ${activeMode === key ? 'active' : ''} ${key}`}
                onClick={() => handleChangeMode(key)}
              >
                <span>{option.chip}</span>
                <strong>{option.title}</strong>
                <p>{option.description}</p>
              </button>
            ))}
          </div>

          <div className="interview-progress-box reverse-info-box">
            <span>현재 기업/직무</span>
            <strong>{company.name || '기업 미정'}</strong>
            <p>{company.position || '직무 미정'}</p>
          </div>

          <div className="source-mini-panel">
            <strong>선택한 서류/경험</strong>
            <div className="source-mini-list">
              {displaySources.length === 0 ? (
                <p>선택된 자료가 없습니다.</p>
              ) : (
                displaySources.map((source, index) => (
                  <article key={`${source.type}-${source.id || index}`}>
                    <span>{SOURCE_META[source.type] || '자료'}</span>
                    <b>{source.title || `선택 자료 ${index + 1}`}</b>
                  </article>
                ))
              )}
            </div>
          </div>

          {summary && (
            <div className="analysis-box">
              <strong>세션 요약</strong>
              <p>{summary}</p>
            </div>
          )}
        </aside>

        <section className="room-sim-display reverse-sim-display">
          <div className="sim-chat-history reverse-chat-history">
            {messages.map(renderMessage)}
            {isSubmitting && (
              <div className="msg-wrap ai">
                <div className="ai-avatar-icon">🤖</div>
                <div className="ai-bubble-wrap">
                  <span className="ai-name">AI THINKING</span>
                  <div className="defense-loading">
                    <span className="defense-dot" />
                    <span className="defense-dot" />
                    <span className="defense-dot" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {errorMessage && <div className="room-error-box">{errorMessage}</div>}

          <div className="answer-compose reverse-compose">
            <div className="current-question-mini">
              <span>{currentMode.chip}</span>
              <strong>{currentMode.title}</strong>
              <p>{currentMode.description}</p>
            </div>

            {activeMode === 'free' ? (
              <div className="free-practice-compose">
                <section className={`free-question-panel ${isFreeQuestionOpen ? 'open' : 'collapsed'}`}>
                  <button
                    type="button"
                    className="free-question-toggle"
                    onClick={() => setIsFreeQuestionOpen((prev) => !prev)}
                    aria-expanded={isFreeQuestionOpen}
                  >
                    <div>
                      <span>면접 질문</span>
                      <strong>{freeQuestion.trim() || '질문을 직접 입력하거나 AI 질문 생성을 눌러주세요.'}</strong>
                    </div>
                    <b aria-hidden="true">{isFreeQuestionOpen ? '접기 ⌄' : '펼치기 ⌃'}</b>
                  </button>

                  {isFreeQuestionOpen && (
                    <label className="free-question-field">
                      <textarea
                        value={freeQuestion}
                        onChange={(e) => setFreeQuestion(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="직접 질문을 입력하거나 AI 질문 생성을 눌러주세요."
                        rows={3}
                      />
                    </label>
                  )}
                </section>

                <label>
                  <span>내 답변</span>
                  <textarea
                    value={freeAnswer}
                    onChange={(e) => setFreeAnswer(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="질문에 대한 내 답변을 작성하면 AI가 0~100점으로 평가합니다."
                    rows={5}
                  />
                </label>

                <div className="answer-actions">
                  <button
                    type="button"
                    className="return-core-btn"
                    onClick={handleGenerateFreeQuestion}
                    disabled={isGeneratingQuestion || isSubmitting}
                  >
                    {isGeneratingQuestion ? '질문 생성 중...' : 'AI 질문 생성'}
                  </button>
                  <button
                    type="button"
                    className="submit-answer-btn"
                    onClick={handleFreeEvaluate}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? '평가 중...' : '답변 평가하기'}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className={`reverse-suggestion-box ${activeMode} ${isSuggestionOpen ? 'open' : 'collapsed'}`}>
                  <button
                    type="button"
                    className="reverse-suggestion-toggle"
                    onClick={() => setIsSuggestionOpen((prev) => !prev)}
                    aria-expanded={isSuggestionOpen}
                  >
                    <div>
                      <strong>{activeMode === 'weakness' ? '기업 맞춤 약점 질문' : '기업 맞춤 강점 질문'}</strong>
                      <p>
                        {isLoadingSuggestions
                          ? '질문을 생성하는 중입니다.'
                          : isSuggestionOpen
                            ? (suggestionBasis || '기업/직무/선택 서류를 바탕으로 실제 면접관이 할 법한 질문을 추천합니다.')
                            : `${suggestedReverseQuestions.length || 0}개 추천 질문이 있습니다.`}
                      </p>
                    </div>
                    <span className="suggestion-toggle-right">
                      {isLoadingSuggestions ? '생성 중' : isSuggestionOpen ? '접기' : '펼치기'}
                      <b aria-hidden="true">{isSuggestionOpen ? '⌄' : '⌃'}</b>
                    </span>
                  </button>

                  <div className="reverse-suggestion-panel" aria-hidden={!isSuggestionOpen}>
                    <div className="reverse-suggestion-list">
                      {suggestedReverseQuestions.map((suggestion, index) => (
                        <button
                          key={suggestion.id || `${activeMode}-suggestion-${index}`}
                          type="button"
                          onClick={() => handleApplySuggestion(suggestion)}
                          disabled={isSubmitting || isLoadingSuggestions}
                        >
                          <span className={`suggestion-pressure ${suggestion.pressureLevel || activeMode}`}>
                            {activeMode === 'weakness'
                              ? (suggestion.pressureLevel === 'medium' ? '중간 압박' : '압박 질문')
                              : '강점 확인'}
                          </span>
                          <b>{suggestion.question}</b>
                          {(suggestion.targetPoint || suggestion.companyFit || suggestion.intent) && (
                            <small>
                              {suggestion.targetPoint && `포인트: ${suggestion.targetPoint}`}
                              {suggestion.targetPoint && (suggestion.companyFit || suggestion.intent) ? ' · ' : ''}
                              {suggestion.companyFit || suggestion.intent}
                            </small>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <textarea
                  value={reverseQuestion}
                  onChange={(e) => setReverseQuestion(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={currentMode.placeholder}
                  rows={4}
                />
                <div className="answer-actions">
                  <button
                    type="button"
                    className="return-core-btn"
                    onClick={() => setReverseQuestion('')}
                    disabled={isSubmitting}
                  >
                    질문 초기화
                  </button>
                  <button
                    type="button"
                    className="submit-answer-btn"
                    onClick={handleReverseSubmit}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'AI 답변 생성 중...' : currentMode.submitLabel}
                  </button>
                </div>
              </>
            )}

            <small className="compose-tip">Ctrl + Enter로 빠르게 실행할 수 있습니다.</small>
          </div>
        </section>
      </main>
    </div>
  );
}
