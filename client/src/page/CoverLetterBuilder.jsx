import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../css/BuilderPage.css';
import mainLogo from '../assets/logo.png';

const API_BASE = process.env.REACT_APP_API_BASE;

const CONSULTANT = {
  name: 'AI 컨설턴트',
  icon: '✦',
  color: '#db2777',
};

const JOB_SITES = [
  {
    name: '자소설닷컴',
    url: 'https://jasoseol.com/recruit',
    desc: '자기소개서 문항과 채용공고를 함께 확인하기 좋아요.',
  },
  {
    name: '잡코리아',
    url: 'https://www.jobkorea.co.kr/recruit/joblist',
    desc: '직무, 지역, 기업별 채용공고를 폭넓게 확인할 수 있어요.',
  },
  {
    name: '사람인',
    url: 'https://www.saramin.co.kr/zf_user/jobs/list/job-category',
    desc: '신입, 인턴, 경력 공고를 빠르게 찾아볼 수 있어요.',
  },
];


function getLoginUserFromStorage() {
  try {
    const rawUser = localStorage.getItem('user');
    if (!rawUser) return null;

    return JSON.parse(rawUser);
  } catch (error) {
    console.warn('로그인 정보를 불러오지 못했습니다:', error);
    return null;
  }
}

function getUserIdentifier(user) {
  if (!user) return '';

  return user._id || user.id || user.email || user.googleId || '';
}

function getCareerLabel(user) {
  if (!user) return '';

  const careerProfile = user.careerProfile || {};

  return (
    careerProfile.jobDetail ||
    careerProfile.jobCategory ||
    user.jobTitle ||
    user.job ||
    ''
  ).trim();
}

function buildInitialMessage(user) {
  const name = user?.name ? `${user.name}님, ` : '';
  const targetJob = getCareerLabel(user);

  if (targetJob) {
    return `${name}안녕하세요! 저장된 프로필을 확인해보니 ${targetJob} 직무를 준비 중이시네요.\n\n이제 지원하려는 채용공고, 자소서 문항, 또는 공고 URL을 붙여넣어 주세요. 공고를 아직 못 찾았다면 아래 채용 사이트에서 먼저 확인한 뒤 돌아와도 괜찮아요.`;
  }

  return `${name}안녕하세요! 지원 직무와 공고에 맞춘 자기소개서를 함께 만들어볼게요.\n\n먼저 지원하려는 채용공고, 자소서 문항, 또는 공고 URL을 붙여넣어 주세요. 공고를 아직 못 찾았다면 아래 채용 사이트에서 먼저 확인한 뒤 돌아와도 괜찮아요.`;
}

function buildExperiencePrompt(jobPost, user) {
  const targetJob = getCareerLabel(user);
  const hasQuestion = /자소서|자기소개서|문항|질문/.test(jobPost);

  if (targetJob && hasQuestion) {
    return `좋아요. ${targetJob} 직무와 입력해주신 자소서 문항을 기준으로 작성 방향을 잡아볼게요.\n\n이제 이 문항에 연결할 수 있는 핵심 경험을 알려주세요. 프로젝트, 수업, 대외활동, 인턴, 팀플, 아르바이트 경험 모두 괜찮고 키워드 형태로 적어도 됩니다.`;
  }

  if (targetJob) {
    return `좋아요. ${targetJob} 직무에 맞춰 공고 내용을 반영해볼게요.\n\n다음으로 이 직무와 연결할 수 있는 핵심 경험이나 어필하고 싶은 이력을 편하게 적어주세요. 문제 상황, 내가 한 역할, 결과 수치가 있으면 더 좋아요.`;
  }

  return `좋아요. 입력해주신 공고 내용을 기준으로 자기소개서 방향을 잡아볼게요.\n\n다음으로 이 직무와 관련된 핵심 경험이나 어필하고 싶은 이력을 편하게 적어주세요. 문제 상황, 내가 한 역할, 결과 수치가 있으면 더 좋아요.`;
}

function buildInputPlaceholder(currentStep, user) {
  const targetJob = getCareerLabel(user);

  if (currentStep === 1) {
    return targetJob
      ? `${targetJob} 관련 채용공고, 자소서 문항, 공고 URL을 붙여넣어 주세요.`
      : '지원할 채용공고, 자소서 문항, 공고 URL을 붙여넣어 주세요.';
  }

  if (currentStep === 2) {
    return '관련 경험을 자유롭게 적어주세요. 예: 프로젝트명, 역할, 문제, 해결 과정, 결과';
  }

  return '질문에 대한 답변을 입력해주세요.';
}


function buildAcceptedJobPostMessage(analyzeData, normalizedJobPost, user) {
  const experiencePrompt = buildExperiencePrompt(normalizedJobPost, user);
  const serverMessage = String(analyzeData?.message || '').trim();
  const alreadyAsksExperience = /핵심\s*경험|관련\s*경험|경험을|경험이나|알려주세요|적어주세요/.test(serverMessage);

  if (analyzeData?.needsMoreDetail) {
    return `공고 링크에서 확인 가능한 기본 정보는 가져왔어요. 사이트 접근 제한 때문에 일부 상세 항목은 부족할 수 있지만, 현재 확인된 정보로 먼저 방향을 잡아볼게요.

${experiencePrompt}`;
  }

  if (serverMessage && !alreadyAsksExperience) {
    return `${serverMessage}

${experiencePrompt}`;
  }

  return serverMessage || experiencePrompt;
}

function JobSiteHelp({ compact = false }) {
  return (
    <div className={compact ? 'job-help-card compact' : 'job-help-card'}>
      <strong>채용공고를 아직 못 찾았다면</strong>
      <p>아래 사이트에서 지원할 공고를 확인한 뒤, 공고 내용이나 자소서 문항을 복사해서 붙여넣어 주세요.</p>

      <div className="job-help-links">
        {JOB_SITES.map((site) => (
          <a key={site.name} href={site.url} target="_blank" rel="noreferrer">
            <span>{site.name}</span>
            <small>{site.desc}</small>
          </a>
        ))}
      </div>
    </div>
  );
}

function normalizeSummaryValue(value, fallback = '확인 중') {
  if (Array.isArray(value)) return value.filter(Boolean).join(', ') || fallback;
  return value ? String(value).trim() : fallback;
}

function getSummaryList(value) {
  if (Array.isArray(value)) return value.filter(Boolean).slice(0, 4);
  if (!value) return [];
  return String(value)
    .split(/[|,\r\nㆍ·•\-]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 4);
}

function JobPostSummary({ summary, sourceUrls = [] }) {
  if (!summary) return null;

  const jobDetails = getSummaryList(summary.jobDetails || summary.keyDuties || summary.duties);
  const requiredQualifications = getSummaryList(
    summary.requiredQualifications || summary.requiredRequirements || summary.requirements
  );
  const preferredQualifications = getSummaryList(
    summary.preferredQualifications || summary.preferredRequirements || summary.preferred
  );
  const questions = getSummaryList(summary.coverLetterQuestions || summary.questions);
  const sources = summary.sourceUrls || sourceUrls || [];

  return (
    <div className="job-summary-card">
      <div className="job-summary-top">
        <span>공고 요약</span>
        <strong>{normalizeSummaryValue(summary.positionTitle || summary.jobTitle || summary.title, '직무명 확인 중')}</strong>
      </div>

      <div className="job-summary-grid">
        <div className="job-summary-item">
          <span>회사</span>
          <strong>{normalizeSummaryValue(summary.companyName || summary.company, '회사명 확인 중')}</strong>
        </div>
        <div className="job-summary-item">
          <span>고용 형태</span>
          <strong>{normalizeSummaryValue(summary.employmentType || summary.type, '미확인')}</strong>
        </div>
      </div>

      {summary.summaryText && <p className="job-summary-desc">{summary.summaryText}</p>}

      {!!jobDetails.length && (
        <div className="job-summary-list">
          <span>직무 상세 / 주요 업무</span>
          <ul>{jobDetails.map((item) => <li key={item}>{item}</li>)}</ul>
        </div>
      )}

      {!!requiredQualifications.length && (
        <div className="job-summary-list">
          <span>지원 자격 / 필수 요건</span>
          <ul>{requiredQualifications.map((item) => <li key={item}>{item}</li>)}</ul>
        </div>
      )}

      {!!preferredQualifications.length && (
        <div className="job-summary-list">
          <span>우대 자격 / 우대 사항</span>
          <ul>{preferredQualifications.map((item) => <li key={item}>{item}</li>)}</ul>
        </div>
      )}

      {!!questions.length && (
        <div className="job-summary-list">
          <span>자소서 문항</span>
          <ul>{questions.map((item) => <li key={item}>{item}</li>)}</ul>
        </div>
      )}

      {!!sources.length && (
        <div className="job-summary-source">
          {sources.slice(0, 2).map((url) => (
            <a key={url} href={url} target="_blank" rel="noreferrer">원본 공고 보기</a>
          ))}
        </div>
      )}
    </div>
  );
}

const MIN_USABLE_ANSWERS = 4;
const MIN_FOLLOWUP_TURNS_BEFORE_GENERATE = 5;
const MAX_FOLLOWUP_TURNS = 10;

function createAnswerId(prefix = 'answer') {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getUsableAnswers(answers = []) {
  return Array.isArray(answers) ? answers.filter((answer) => answer.usable === true) : [];
}

function getRejectedAnswers(answers = []) {
  return Array.isArray(answers) ? answers.filter((answer) => answer.usable !== true) : [];
}

const EVIDENCE_FIELD_LABELS = {
  role: '내가 맡은 역할',
  situation: '프로젝트 배경이나 문제 상황',
  problem: '해결해야 했던 문제',
  action: '직접 실행한 행동이나 구현 기능',
  result: '결과 또는 변화',
  technologies: '사용한 기술과 사용 이유',
  tech: '사용한 기술과 사용 이유',
  metrics: '수치로 설명할 수 있는 성과',
  metric: '수치로 설명할 수 있는 성과',
  learning: '배운 점 또는 다음 개선 방향',
};

function normalizeMissingFields(missingFields = []) {
  const rawFields = Array.isArray(missingFields) ? missingFields : [];
  const labels = rawFields
    .map((field) => {
      const key = String(field || '').trim();
      return EVIDENCE_FIELD_LABELS[key] || key;
    })
    .filter(Boolean);

  return Array.from(new Set(labels));
}

function buildEvidenceChecklist(missingFields = []) {
  const labels = normalizeMissingFields(missingFields);

  if (labels.length) {
    return labels.map((label) => `- ${label}`).join('\n');
  }

  return [
    '- 내가 맡은 역할',
    '- 직접 구현한 기능 또는 실행한 행동',
    '- 어려웠던 점이나 문제 상황',
    '- 결과, 배운 점, 또는 다음 개선 방향',
  ].join('\n');
}

function isWeakEvidenceText(text = '') {
  const value = String(text).trim();

  if (!value) return true;

  return /추후|나중에|아직\s*정리|잘\s*모르|모르겠|없음|없습니다|없는데|없죠|해본\s*적\s*없|경험이\s*없어|계획입니다|학습할\s*계획|관심을\s*가지고|AI가\s*다|ai가\s*다|AI가\s*해|ai가\s*해|제가\s*한\s*건\s*없/i.test(value);
}

function hasStrongEvidence(answer) {
  if (!answer?.usable) return false;
  if (isWeakEvidenceText(answer.answer)) return false;

  const evidence = answer.evidence || {};

  const hasRole = Boolean(evidence.role);
  const hasAction = Boolean(evidence.action);
  const hasSituation = Boolean(evidence.situation);
  const hasResult = Boolean(evidence.result);
  const hasLearning = Boolean(evidence.learning);
  const hasTech = Array.isArray(evidence.technologies) && evidence.technologies.length > 0;
  const hasMetric = Array.isArray(evidence.metrics) && evidence.metrics.length > 0;

  const score = [
    hasRole,
    hasAction,
    hasSituation,
    hasResult,
    hasLearning,
    hasTech,
    hasMetric,
  ].filter(Boolean).length;

  return hasAction && score >= 3;
}

function getStrongUsableAnswers(answers = []) {
  return Array.isArray(answers) ? answers.filter(hasStrongEvidence) : [];
}

function buildInsufficientEvidenceMessage(missingFields = []) {
  return `아직 설득력 있는 자기소개서 초안을 만들기에는 구체적인 근거가 조금 부족해요.

아래 내용 중 비어 있는 부분을 한두 문장씩만 더 채우면, 거짓 없이 훨씬 자연스럽게 작성할 수 있어요.

${buildEvidenceChecklist(missingFields)}

정확한 수치가 없다면 "수치로는 아직 정리하지 못했지만, 어떤 점이 좋아졌는지" 정도로 적어도 괜찮아요.`;
}

function buildNextQuestionMessage(evaluation, usableCount) {
  if (evaluation?.usable) {
    return `좋아요. 자기소개서에 활용할 수 있는 구체적인 경험이 ${usableCount}개 정리됐어요.`;
  }

  return `좋아요. 말씀해주신 내용은 확인했어요. 이제 실제로 해본 경험을 중심으로 조금 더 연결해볼게요.`;
}

function buildLengthStatusLabel(lengthInfo) {
  if (!lengthInfo) {
    return '기준: 공고 제한 없으면 최소 800자';
  }

  if (lengthInfo.maxChars) {
    return `기준: ${Number(lengthInfo.maxChars).toLocaleString()}자 이내`;
  }

  return `기준: 최소 ${Number(lengthInfo.minChars || 800).toLocaleString()}자 / 목표 ${Number(lengthInfo.targetChars || 1000).toLocaleString()}자`;
}

export default function CoverLetterBuilder() {
  const navigate = useNavigate();

  const [loginUser, setLoginUser] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [isProfileLoading, setIsProfileLoading] = useState(true);

  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [isAiThinking, setIsAiThinking] = useState(false);

  const [currentStep, setCurrentStep] = useState(1);
  const [jobPost, setJobPost] = useState('');
  const [baseExperience, setBaseExperience] = useState('');
  const [followUpQuestions, setFollowUpQuestions] = useState([]);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [interviewAnswers, setInterviewAnswers] = useState([]);
  const [improveDrafts, setImproveDrafts] = useState({});
  const [improvingAnswerId, setImprovingAnswerId] = useState('');
  const [inputImproveDraft, setInputImproveDraft] = useState(null);
  const [isImprovingInput, setIsImprovingInput] = useState(false);
  const [suggestedAnswerDraft, setSuggestedAnswerDraft] = useState(null);
  const [isSuggestingAnswer, setIsSuggestingAnswer] = useState(false);

  const [resultText, setResultText] = useState('');
  const [resultLengthInfo, setResultLengthInfo] = useState(null);

  const isInitialized = useRef(false);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const resultTextareaRef = useRef(null);

  useEffect(() => {
    const loadUserProfile = async () => {
      const storedUser = getLoginUserFromStorage();
      setLoginUser(storedUser);

      const userId = getUserIdentifier(storedUser);
      if (!userId) {
        setIsProfileLoading(false);
        return;
      }

      try {
        const res = await axios.get(`${API_BASE}/api/profile/${userId}`);
        const dbUser = res.data?.data;
        setCurrentUser(dbUser || storedUser);
      } catch (error) {
        console.warn('DB 프로필 조회 실패, 로그인 정보로 대체합니다:', error);
        setCurrentUser(storedUser);
      } finally {
        setIsProfileLoading(false);
      }
    };

    loadUserProfile();
  }, []);

  useEffect(() => {
    if (isProfileLoading || isInitialized.current) return;

    isInitialized.current = true;
    setMessages([
      {
        id: 'start',
        sender: 'SYSTEM',
        text: 'AI 자기소개서 컨설팅을 시작합니다.',
      },
      {
        id: Date.now(),
        sender: 'AI',
        expert: CONSULTANT,
        text: buildInitialMessage(currentUser),
        showJobHelp: true,
      },
    ]);
  }, [isProfileLoading, currentUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isAiThinking]);

  useEffect(() => {
    if (!isAiThinking && currentStep < 4 && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isAiThinking, currentStep]);

  useEffect(() => {
    if (!resultTextareaRef.current) return;

    resultTextareaRef.current.style.height = 'auto';
    resultTextareaRef.current.style.height = `${resultTextareaRef.current.scrollHeight}px`;
  }, [resultText]);

  const handleInputChange = (e) => {
    setUserInput(e.target.value);
    setInputImproveDraft(null);
    setSuggestedAnswerDraft(null);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  const addAiMessage = (text, extra = {}) => {
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now() + Math.random(),
        sender: 'AI',
        expert: CONSULTANT,
        text,
        ...extra,
      },
    ]);
  };

  const addSystemMessage = (text) => {
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now() + Math.random(),
        sender: 'SYSTEM',
        text,
      },
    ]);
  };

  const updateAnswerText = (answerId, nextText) => {
    if (!answerId || !nextText) return;

    setMessages((prev) =>
      prev.map((msg) => (msg.answerId === answerId ? { ...msg, text: nextText } : msg))
    );

    if (answerId.startsWith('base-')) {
      setBaseExperience(nextText);
      return;
    }

    setInterviewAnswers((prev) =>
      prev.map((answer) => (answer.answerId === answerId ? { ...answer, answer: nextText } : answer))
    );
  };

  const handleImproveAnswer = async (msg) => {
    if (!msg?.answerId || improvingAnswerId) return;

    setImprovingAnswerId(msg.answerId);

    try {
      const res = await axios.post(`${API_BASE}/api/generate/improve-answer`, {
        jobPost,
        baseExperience,
        question: msg.questionText || '',
        answer: msg.text,
        userProfile: currentUser,
      });

      const data = res.data || {};
      setImproveDrafts((prev) => ({
        ...prev,
        [msg.answerId]: {
          canImprove: data.canImprove !== false,
          improvedAnswer: data.improvedAnswer || '',
          note: data.note || data.message || '원문에 없는 내용은 추가하지 않고 문장만 다듬었습니다.',
        },
      }));
    } catch (error) {
      console.error('답변 다듬기 실패:', error);
      setImproveDrafts((prev) => ({
        ...prev,
        [msg.answerId]: {
          canImprove: false,
          improvedAnswer: '',
          note: '답변 다듬기 중 오류가 발생했습니다.',
        },
      }));
    } finally {
      setImprovingAnswerId('');
    }
  };

const getCurrentInputQuestionText = () => {
  if (currentStep === 2) {
    return '이 직무와 연결할 수 있는 핵심 경험이나 어필하고 싶은 이력을 알려주세요.';
  }

  if (currentStep === 3) {
    return followUpQuestions[currentQuestionIdx]?.text || '';
  }

  return '';
};

const handleImproveCurrentInput = async () => {
  const rawInput = userInput.trim();
  if (!rawInput || isImprovingInput || isAiThinking || isProfileLoading) return;

  setIsImprovingInput(true);

  try {
    const res = await axios.post(`${API_BASE}/api/generate/improve-answer`, {
      jobPost,
      baseExperience,
      question: getCurrentInputQuestionText(),
      answer: rawInput,
      userProfile: currentUser,
    });

    const data = res.data || {};

    setInputImproveDraft({
      canImprove: data.canImprove !== false,
      improvedAnswer: data.improvedAnswer || '',
      note: data.note || data.message || '원문에 없는 내용은 추가하지 않고 문장만 다듬었습니다.',
    });
  } catch (error) {
    console.error('입력 답변 다듬기 실패:', error);

    setInputImproveDraft({
      canImprove: false,
      improvedAnswer: '',
      note: '답변 다듬기 중 오류가 발생했습니다.',
    });
  } finally {
    setIsImprovingInput(false);
  }
};

const handleApplyInputImprove = () => {
  if (!inputImproveDraft?.improvedAnswer) return;

  setUserInput(inputImproveDraft.improvedAnswer);
  setInputImproveDraft(null);

  requestAnimationFrame(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  });
};

const handleDismissInputImprove = () => {
  setInputImproveDraft(null);
};

const handleSuggestCurrentAnswer = async () => {
  if (isSuggestingAnswer || isAiThinking || isProfileLoading || currentStep < 2) return;

  setIsSuggestingAnswer(true);
  setInputImproveDraft(null);

  try {
    const res = await axios.post(`${API_BASE}/api/generate/suggest-answer`, {
      jobPost,
      baseExperience,
      question: getCurrentInputQuestionText(),
      currentInput: userInput.trim(),
      previousAnswers: interviewAnswers,
      userProfile: currentUser,
    });

    const data = res.data || {};

    setSuggestedAnswerDraft({
      suggestedAnswer: data.suggestedAnswer || '',
      checklist: Array.isArray(data.checklist) ? data.checklist : [],
      note: data.note || '빈칸이나 괄호 부분은 본인의 실제 경험으로 바꿔서 사용해 주세요.',
    });
  } catch (error) {
    console.error('추천 답변 생성 실패:', error);

    setSuggestedAnswerDraft({
      suggestedAnswer: '',
      checklist: [],
      note: '추천 답변을 만드는 중 오류가 발생했습니다. 역할, 행동, 결과를 중심으로 직접 작성해 주세요.',
    });
  } finally {
    setIsSuggestingAnswer(false);
  }
};

const handleApplySuggestedAnswer = () => {
  if (!suggestedAnswerDraft?.suggestedAnswer) return;

  setUserInput(suggestedAnswerDraft.suggestedAnswer);
  setSuggestedAnswerDraft(null);
  setInputImproveDraft(null);

  requestAnimationFrame(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
      textareaRef.current.focus();
    }
  });
};

const handleDismissSuggestedAnswer = () => {
  setSuggestedAnswerDraft(null);
};

  const handleApplyImprovedAnswer = (answerId) => {
    const draft = improveDrafts[answerId];
    if (!draft?.improvedAnswer) return;

    updateAnswerText(answerId, draft.improvedAnswer);

    setImproveDrafts((prev) => {
      const next = { ...prev };
      delete next[answerId];
      return next;
    });
  };

  const handleDismissImprovedAnswer = (answerId) => {
    setImproveDrafts((prev) => {
      const next = { ...prev };
      delete next[answerId];
      return next;
    });
  };

  const moveToNextQuestion = (nextQuestion, messagePrefix = '다음 질문입니다.') => {
    const safeQuestion = {
      id: nextQuestion?.id || `dynamic-${Date.now()}`,
      category: nextQuestion?.category || 'action',
      text:
        nextQuestion?.text ||
        '이 경험에서 본인이 직접 맡은 역할, 실행한 행동, 결과를 조금 더 구체적으로 알려주실 수 있을까요?',
    };

    const nextIdx = currentQuestionIdx + 1;

    setFollowUpQuestions((prev) => {
      const copied = [...prev];
      copied[nextIdx] = safeQuestion;
      return copied;
    });
    setCurrentQuestionIdx(nextIdx);
    addAiMessage(`${messagePrefix}\n\n${safeQuestion.text}`);
  };

  const generateCoverLetterFromEvidence = async (answers) => {
    const usableAnswers = getStrongUsableAnswers(answers);
    const rejectedAnswers = Array.isArray(answers) ? answers.filter((answer) => !hasStrongEvidence(answer)) : [];

    if (usableAnswers.length < MIN_USABLE_ANSWERS || answers.length < MIN_FOLLOWUP_TURNS_BEFORE_GENERATE) {
      addAiMessage(
        `${buildInsufficientEvidenceMessage([
          'role',
          'action',
          'situation',
          'result',
          'technologies',
          'learning',
        ])}

현재 바로 사용할 수 있는 구체적인 답변은 ${usableAnswers.length}개예요. 최소 ${MIN_USABLE_ANSWERS}개 정도가 모이면 더 안정적으로 작성할 수 있어요.

입력창의 "추천 답변 가이드" 버튼을 누르면, 어떤 식으로 답하면 좋은지 예시 구조를 바로 만들 수 있어요.`
      );
      return false;
    }

    setCurrentStep(4);
    addAiMessage('확인된 실제 경험 근거만 사용해서 우측 자기소개서 캔버스에 초안을 작성해볼게요.');

    const finalRes = await axios.post(`${API_BASE}/api/generate/cover-letter`, {
      resume: {
        experience: baseExperience,
        interviewAnswers: usableAnswers,
        rejectedAnswers,
      },
      jobPost,
      options: {
        tone: '전문적이고 설득력 있는',
        length: '공고 제한이 없으면 최소 800자, 목표 1000자 내외',
        minChars: 800,
        targetChars: 1000,
        type: '자유형',
        strictEvidenceOnly: true,
      },
    });

    const data = finalRes.data || {};

    if (data.canGenerate === false) {
      setCurrentStep(3);
      const missingFields = data.missingFields || [];
      addAiMessage(`${buildInsufficientEvidenceMessage(missingFields)}

${data.message || ''}`.trim());

      if (data.nextQuestion) {
        moveToNextQuestion(
          {
            id: `missing-${Date.now()}`,
            category: 'action',
            text: data.nextQuestion,
          },
          '부족한 근거를 보완하기 위해 한 가지만 더 여쭤볼게요.'
        );
      }

      return false;
    }

    setResultText(data.content || '');
    setResultLengthInfo(data.lengthInfo || null);
    addSystemMessage('✨ 자기소개서 생성이 완료되었습니다. 우측에서 바로 수정할 수 있습니다.');
    return true;
  };

  const handleSaveAndExit = async () => {
    if (!resultText.trim()) {
      navigate('/mypage');
      return;
    }

    const customTitle = window.prompt('저장할 자기소개서의 제목을 입력해주세요.', 'AI 자기소개서 초안');
    if (customTitle === null) return;

    const finalTitle = customTitle.trim() === '' ? '이름 없는 자기소개서' : customTitle.trim();

    try {
      const userId = getUserIdentifier(currentUser) || getUserIdentifier(loginUser);

      if (!userId) {
        alert('로그인 정보를 확인할 수 없습니다. 다시 로그인 후 저장해주세요.');
        return;
      }

      await axios.post(`${API_BASE}/api/resume`, {
        userId,
        title: finalTitle,
        content: resultText,
      });

      alert(`[${finalTitle}] 자기소개서가 저장되었습니다.`);
      navigate('/mypage');
    } catch (error) {
      console.error('저장 실패:', error);
      alert('저장 중 오류가 발생했습니다. 글이 날아가지 않게 본문을 복사해 두세요.');
    }
  };

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();

    const currentInput = userInput.trim();
    if (!currentInput || isAiThinking) return;

    setInputImproveDraft(null);
    setSuggestedAnswerDraft(null);

    const currentQuestion = currentStep === 3 ? followUpQuestions[currentQuestionIdx] : null;
    const answerId =
      currentStep === 2
        ? createAnswerId('base')
        : currentStep === 3
          ? createAnswerId('followup')
          : null;

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now() + Math.random(),
        sender: 'user',
        text: currentInput,
        canImprove: false,
        answerId,
        questionText: currentStep === 2 ? '기본 경험' : currentQuestion?.text || '',
      },
    ]);
    setUserInput('');

    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    setIsAiThinking(true);

    try {
      if (currentStep === 1) {
        const analyzeRes = await axios.post(`${API_BASE}/api/generate/analyze-job-post`, {
          input: currentInput,
          userProfile: currentUser,
        });

        const analyzeData = analyzeRes.data || {};

        if (!analyzeData.isJobPost) {
          addAiMessage(
            analyzeData.message ||
              `아직 채용공고 내용이 충분히 확인되지 않았어요.

공고 전문이 아니어도 괜찮으니, 회사명/직무명/자격요건/자소서 문항 중 확인 가능한 내용을 붙여넣어 주세요. 공고를 아직 못 찾았다면 아래 추천 사이트에서 먼저 확인해도 좋아요.`,
            { showJobHelp: analyzeData.showJobHelp !== false }
          );
          setIsAiThinking(false);
          return;
        }

        const normalizedJobPost = analyzeData.jobPostText || currentInput;
        const jobSummary = analyzeData.jobSummary || analyzeData.summary || null;

        setJobPost(normalizedJobPost);
        setCurrentStep(2);

        setTimeout(() => {
          addAiMessage(
            buildAcceptedJobPostMessage(analyzeData, normalizedJobPost, currentUser),
            {
              jobSummary,
              sourceUrls: analyzeData.sourceUrls || [],
            }
          );
          setIsAiThinking(false);
        }, 600);

        return;
      }

      if (currentStep === 2) {
        setBaseExperience(currentInput);
        setInterviewAnswers([]);
        setCurrentQuestionIdx(0);

        const res = await axios.post(`${API_BASE}/api/generate/followup`, {
          experienceText: currentInput,
          companyQuestion: jobPost,
        });

        const questions = res.data?.questions || [];

        if (!questions.length) {
          addAiMessage(
            '경험을 분석했지만 추가 질문을 만들지 못했어요. 경험을 조금 더 구체적으로 적어주시면 다시 질문을 만들어볼게요.'
          );
          setIsAiThinking(false);
          return;
        }

        setFollowUpQuestions(questions);
        setCurrentStep(3);

        addSystemMessage('경험 분석을 바탕으로 추가 질문을 시작합니다.');
        addAiMessage(`좋아요. 실제 근거가 충분해질 때까지만 확인할게요.

첫 번째 질문입니다.

${questions[0].text}`);

        setIsAiThinking(false);
        return;
      }

      if (currentStep === 3) {
        const activeQuestion = currentQuestion || {
          id: `dynamic-${Date.now()}`,
          category: 'action',
          text: '이 경험에서 본인이 직접 한 일을 구체적으로 알려주세요.',
        };

        const evalRes = await axios.post(`${API_BASE}/api/generate/evaluate-answer`, {
          jobPost,
          baseExperience,
          question: activeQuestion.text,
          answer: currentInput,
          previousAnswers: interviewAnswers,
          userProfile: currentUser,
          turnCount: interviewAnswers.length + 1,
        });

        const evaluation = evalRes.data || {};
        const answerRecord = {
          answerId,
          category: activeQuestion.category || 'etc',
          question: activeQuestion.text || '',
          answer: currentInput,
          usable: evaluation.usable === true,
          isNegativeAnswer: evaluation.isNegativeAnswer === true,
          reason: evaluation.reason || '',
          evidence: evaluation.evidence || null,
          score: evaluation.score || 0,
        };

        const nextAnswers = [...interviewAnswers, answerRecord];
        setInterviewAnswers(nextAnswers);

        const usableCount = getUsableAnswers(nextAnswers).length;
        const rejectedCount = getRejectedAnswers(nextAnswers).length;
        const strongUsableCount = getStrongUsableAnswers(nextAnswers).length;
        const enoughQuestionTurns = nextAnswers.length >= MIN_FOLLOWUP_TURNS_BEFORE_GENERATE;

        if (
          evaluation.readyToGenerate === true &&
          strongUsableCount >= MIN_USABLE_ANSWERS &&
          enoughQuestionTurns
        ) {
          await generateCoverLetterFromEvidence(nextAnswers);
          setIsAiThinking(false);
          return;
        }

        if (nextAnswers.length >= MAX_FOLLOWUP_TURNS) {
          if (strongUsableCount >= MIN_USABLE_ANSWERS && enoughQuestionTurns) {
            await generateCoverLetterFromEvidence(nextAnswers);
            setIsAiThinking(false);
            return;
          }

          addAiMessage(
            `${buildInsufficientEvidenceMessage(evaluation.missingFields)}

현재 바로 사용할 수 있는 구체적인 답변은 ${strongUsableCount}개예요.
전체 사용 가능 판정은 ${usableCount}개였지만, 자기소개서에 바로 넣기에는 더 구체화가 필요한 답변이 포함되어 있어요.

입력창의 "추천 답변 가이드"를 누르면 이번 질문에 맞는 답변 구조를 바로 확인할 수 있어요.`
          );

          const fallbackQuestion = evaluation.nextQuestion || '실제로 본인이 직접 수행한 경험 중 역할, 행동, 결과가 드러나는 사례를 하나만 더 알려주실 수 있을까요?';
          moveToNextQuestion(
            {
              id: `retry-${Date.now()}`,
              category: 'action',
              text: fallbackQuestion,
            },
            '근거를 보완하기 위한 질문입니다.'
          );
          setIsAiThinking(false);
          return;
        }

        const nextOriginalQuestion = followUpQuestions[currentQuestionIdx + 1];

        const nextQuestionToAsk = {
          id: `dynamic-${Date.now()}`,
          category: activeQuestion.category || nextOriginalQuestion?.category || 'action',
          text:
            evaluation.nextQuestion ||
            nextOriginalQuestion?.text ||
            '이 경험에서 본인이 직접 실행한 행동과 그 결과를 조금 더 구체적으로 알려주세요.',
        };

        if (
          strongUsableCount >= MIN_USABLE_ANSWERS &&
          enoughQuestionTurns &&
          evaluation.usable === true
        ) {
          await generateCoverLetterFromEvidence(nextAnswers);
          setIsAiThinking(false);
          return;
        }

        moveToNextQuestion(
          nextQuestionToAsk,
          buildNextQuestionMessage(evaluation, usableCount)
        );

        setIsAiThinking(false);
      }
    } catch (error) {
      console.error('AI 챗 통신 오류:', error);
      addSystemMessage('서버와의 통신 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
      setIsAiThinking(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const inputPlaceholder = buildInputPlaceholder(currentStep, currentUser);
  const resultCharCount = resultText.replace(/\s/g, '').length;
  const resultCharCountWithSpaces = resultText.length;
  const resultLengthStatusLabel = buildLengthStatusLabel(resultLengthInfo);

  return (
    <div className="room-container modern-theme cover-letter-room">
      <header className="builder-top-header cover-letter-header">
        <button className="room-logo-btn" type="button" onClick={() => navigate('/')}>
          <img src={mainLogo} alt="F1ND YOUR WAY 로고" className="builder-logo-img" />
        </button>

        <div className="cover-step-status">
          <span className={currentStep >= 1 ? 'active' : ''}>공고</span>
          <span className={currentStep >= 2 ? 'active' : ''}>경험</span>
          <span className={currentStep >= 3 ? 'active' : ''}>질문</span>
          <span className={currentStep >= 4 ? 'active' : ''}>완성</span>
        </div>

        <button className="modern-finish-btn" type="button" onClick={handleSaveAndExit}>
          SAVE & EXIT
        </button>
      </header>

      <main className="modern-layout cover-letter-layout">
        <section className="modern-chat-section cover-chat-panel">
          <div className="modern-chat-history cover-chat-history">
            {isProfileLoading ? (
              <div className="chat-row row-system">
                <div className="chat-content">
                  <div className="chat-bubble bubble-system">저장된 프로필을 불러오는 중입니다...</div>
                </div>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`chat-row ${
                    msg.sender === 'user'
                      ? 'row-user'
                      : msg.sender === 'SYSTEM'
                        ? 'row-system'
                        : 'row-ai'
                  }`}
                >
                  {msg.sender !== 'user' && msg.sender !== 'SYSTEM' && msg.expert && (
                    <div className="expert-avatar" style={{ backgroundColor: msg.expert.color }}>
                      {msg.expert.icon}
                    </div>
                  )}

                  <div className="chat-content">
                    {msg.expert && msg.sender !== 'user' && (
                      <span className="expert-name" style={{ color: msg.expert.color }}>
                        {msg.expert.name}
                      </span>
                    )}
                    <div
                      className={`chat-bubble ${
                        msg.sender === 'user'
                          ? 'bubble-user'
                          : msg.sender === 'SYSTEM'
                            ? 'bubble-system'
                            : 'bubble-ai'
                      }`}
                    >
                      {msg.text}
                    </div>

                    {msg.canImprove && (
                      <div className="answer-tool-box">
                        <button
                          type="button"
                          className="answer-tool-btn"
                          onClick={() => handleImproveAnswer(msg)}
                          disabled={Boolean(improvingAnswerId)}
                        >
                          {improvingAnswerId === msg.answerId ? '다듬는 중...' : 'AI로 답변 다듬기'}
                        </button>

                        {improveDrafts[msg.answerId] && (
                          <div className="answer-improve-card">
                            <span>AI 답변 다듬기</span>
                            {improveDrafts[msg.answerId].canImprove && improveDrafts[msg.answerId].improvedAnswer ? (
                              <>
                                <p>{improveDrafts[msg.answerId].improvedAnswer}</p>
                                <small>{improveDrafts[msg.answerId].note}</small>
                                <div className="answer-improve-actions">
                                  <button type="button" onClick={() => handleApplyImprovedAnswer(msg.answerId)}>
                                    적용하기
                                  </button>
                                  <button type="button" onClick={() => handleDismissImprovedAnswer(msg.answerId)}>
                                    원문 유지
                                  </button>
                                </div>
                              </>
                            ) : (
                              <>
                                <p>{improveDrafts[msg.answerId].note}</p>
                                <div className="answer-improve-actions">
                                  <button type="button" onClick={() => handleDismissImprovedAnswer(msg.answerId)}>
                                    확인
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {msg.jobSummary && (
                      <JobPostSummary summary={msg.jobSummary} sourceUrls={msg.sourceUrls} />
                    )}

                    {msg.showJobHelp && <JobSiteHelp compact />}
                  </div>
                </div>
              ))
            )}

            {isAiThinking && (
              <div className="chat-row row-ai">
                <div className="expert-avatar" style={{ backgroundColor: CONSULTANT.color }}>
                  {CONSULTANT.icon}
                </div>
                <div className="chat-content">
                  <span className="expert-name" style={{ color: CONSULTANT.color }}>
                    {CONSULTANT.name}
                  </span>
                  <div className="chat-bubble bubble-ai">
                    <div className="typing-indicator">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {currentStep < 4 && (
            <form className="floating-input-wrapper cover-floating-input" onSubmit={handleSendMessage}>
              {currentStep >= 2 && (
                <div className="input-improve-actions">
                  {userInput.trim() && (
                    <button
                      type="button"
                      className="input-ai-improve-btn"
                      onClick={handleImproveCurrentInput}
                      disabled={isAiThinking || isProfileLoading || isImprovingInput}
                    >
                      {isImprovingInput ? '다듬는 중...' : 'AI로 다듬고 보내기'}
                    </button>
                  )}

                  <button
                    type="button"
                    className="input-ai-improve-btn input-suggest-btn"
                    onClick={handleSuggestCurrentAnswer}
                    disabled={isAiThinking || isProfileLoading || isSuggestingAnswer}
                  >
                    {isSuggestingAnswer ? '추천 생성 중...' : '추천 답변 가이드'}
                  </button>
                </div>
              )}

              {suggestedAnswerDraft && (
                <div className="input-improve-card input-suggest-card">
                  <span>추천 답변 가이드</span>

                  {suggestedAnswerDraft.suggestedAnswer ? (
                    <>
                      <p>{suggestedAnswerDraft.suggestedAnswer}</p>

                      {!!suggestedAnswerDraft.checklist?.length && (
                        <ul className="input-suggest-checklist">
                          {suggestedAnswerDraft.checklist.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      )}

                      <small>{suggestedAnswerDraft.note}</small>

                      <div className="input-improve-card-actions">
                        <button type="button" onClick={handleApplySuggestedAnswer}>
                          입력창에 넣고 수정하기
                        </button>
                        <button type="button" onClick={handleDismissSuggestedAnswer}>
                          닫기
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <p>{suggestedAnswerDraft.note}</p>
                      <div className="input-improve-card-actions">
                        <button type="button" onClick={handleDismissSuggestedAnswer}>
                          닫기
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {inputImproveDraft && (
                <div className="input-improve-card">
                  <span>보내기 전 답변 다듬기</span>

                  {inputImproveDraft.canImprove && inputImproveDraft.improvedAnswer ? (
                    <>
                      <p>{inputImproveDraft.improvedAnswer}</p>
                      <small>{inputImproveDraft.note}</small>

                      <div className="input-improve-card-actions">
                        <button type="button" onClick={handleApplyInputImprove}>
                          이 답변으로 입력창 교체
                        </button>
                        <button type="button" onClick={handleDismissInputImprove}>
                          원문 유지
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <p>{inputImproveDraft.note}</p>
                      <div className="input-improve-card-actions">
                        <button type="button" onClick={handleDismissInputImprove}>
                          닫기
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              <div className="floating-input-box">
                <textarea
                  ref={textareaRef}
                  value={userInput}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder={inputPlaceholder}
                  rows={1}
                  disabled={isAiThinking || isProfileLoading}
                />
                <button
                  type="submit"
                  className="send-circle-btn"
                  disabled={isAiThinking || isProfileLoading || !userInput.trim()}
                >
                  ↑
                </button>
              </div>
            </form>
          )}
        </section>

        <section className="cover-preview-section">
          <div className="cover-preview-scroll">
            <div className="cover-preview-paper">
              {currentStep === 4 && isAiThinking ? (
                <div className="cover-preview-empty">
                  <div className="pulse-dot large"></div>
                  <h3>대화 내용을 바탕으로 자기소개서를 작성 중입니다</h3>
                  <p>잠시 후 이곳에서 초안을 바로 확인하고 수정할 수 있어요.</p>
                </div>
              ) : resultText ? (
                <>
                  <div className="cover-preview-head">
                    <div>
                      <span>AI COVER LETTER</span>
                      <h2>자기소개서 초안</h2>
                    </div>

                    <div className="cover-char-count">
                      <strong>{resultCharCountWithSpaces.toLocaleString()}</strong>
                      <span>자 / 공백 제외 {resultCharCount.toLocaleString()}자</span>
                    </div>
                  </div>

                  <textarea
                    ref={resultTextareaRef}
                    value={resultText}
                    onChange={(e) => {
                      setResultText(e.target.value);
                      e.target.style.height = 'auto';
                      e.target.style.height = `${e.target.scrollHeight}px`;
                    }}
                    className="cover-result-textarea"
                  />
                </>
              ) : (
                <div className="cover-preview-empty">
                  <div className="cover-preview-icon">✍️</div>
                  <h2>우측에서 자기소개서가 완성됩니다</h2>
                  <p>
                    좌측에서 공고와 경험을 입력하면, 수집된 정보를 바탕으로 이 영역 전체에
                    자기소개서 초안이 표시됩니다.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
