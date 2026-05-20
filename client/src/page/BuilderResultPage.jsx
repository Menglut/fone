import React, { useEffect, useMemo, useRef, useState } from 'react';
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

const JOB_POST_KEYWORDS = [
  '채용',
  '공고',
  '모집',
  '담당업무',
  '주요업무',
  '자격요건',
  '우대사항',
  '지원자격',
  '직무',
  '포지션',
  '자소서',
  '자기소개서',
  '문항',
  '신입',
  '경력',
  '인턴',
  '회사',
  '기업',
];

const NO_JOB_POST_PHRASES = [
  '못 찾',
  '못찾',
  '없어',
  '모르',
  '아직',
  '공고 없음',
  '찾아줘',
  '어디서',
];

function getStoredUser() {
  try {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  } catch (error) {
    return null;
  }
}

function getCareerLabel(user) {
  const career = user?.careerProfile || {};
  return career.jobDetail || career.jobCategory || user?.jobTitle || '';
}

function looksLikeJobPosting(text) {
  const normalized = text.replace(/\s+/g, ' ').trim();

  if (normalized.length >= 180) return true;

  const matchedKeywordCount = JOB_POST_KEYWORDS.filter((keyword) =>
    normalized.includes(keyword)
  ).length;

  if (normalized.startsWith('http') && matchedKeywordCount >= 1) return true;

  return normalized.length >= 45 && matchedKeywordCount >= 2;
}

function isJobPostMissingMessage(text) {
  const normalized = text.replace(/\s+/g, '').trim();
  return NO_JOB_POST_PHRASES.some((phrase) => normalized.includes(phrase.replace(/\s+/g, '')));
}

function buildInitialMessage(user) {
  const name = user?.name ? `${user.name}님, ` : '';
  const targetJob = getCareerLabel(user);

  if (targetJob) {
    return `${name}안녕하세요! ${targetJob} 직무에 맞춘 자기소개서를 함께 만들어볼게요.\n\n먼저 지원하려는 채용공고, 자소서 문항, 또는 공고 URL을 붙여넣어 주세요. 공고를 아직 못 찾았다면 아래 채용 사이트에서 공고를 확인한 뒤 돌아와도 괜찮아요.`;
  }

  return `${name}안녕하세요! 지원 직무와 공고에 맞춘 자기소개서를 함께 만들어볼게요.\n\n먼저 지원하려는 채용공고, 자소서 문항, 또는 공고 URL을 붙여넣어 주세요. 공고를 아직 못 찾았다면 아래 채용 사이트에서 공고를 확인한 뒤 돌아와도 괜찮아요.`;
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

export default function CoverLetterBuilder() {
  const navigate = useNavigate();
  const storedUser = useMemo(() => getStoredUser(), []);

  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [isAiThinking, setIsAiThinking] = useState(false);

  const [currentStep, setCurrentStep] = useState(1);
  const [jobPost, setJobPost] = useState('');
  const [baseExperience, setBaseExperience] = useState('');
  const [followUpQuestions, setFollowUpQuestions] = useState([]);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [interviewAnswers, setInterviewAnswers] = useState([]);

  const [resultText, setResultText] = useState('');

  const isInitialized = useRef(false);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const resultTextareaRef = useRef(null);

  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    setMessages([
      {
        id: 'start',
        sender: 'SYSTEM',
        text: '✨ AI 자기소개서 컨설팅을 시작합니다.',
      },
      {
        id: Date.now(),
        sender: 'AI',
        expert: CONSULTANT,
        text: buildInitialMessage(storedUser),
      },
    ]);
  }, [storedUser]);

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

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  const addAiMessage = (text) => {
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now() + Math.random(),
        sender: 'AI',
        expert: CONSULTANT,
        text,
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

  const handleSaveAndExit = async () => {
    if (!resultText.trim()) {
      navigate('/mypage');
      return;
    }

    const customTitle = window.prompt('저장할 자기소개서의 제목을 입력해주세요.', 'AI 자기소개서 초안');
    if (customTitle === null) return;

    const finalTitle = customTitle.trim() === '' ? '이름 없는 자기소개서' : customTitle.trim();

    try {
      const user = getStoredUser();
      const userId = user ? user.id || user._id || user.email : 'guest';

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

    setMessages((prev) => [...prev, { id: Date.now(), sender: 'user', text: currentInput }]);
    setUserInput('');

    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    setIsAiThinking(true);

    try {
      if (currentStep === 1) {
        if (isJobPostMissingMessage(currentInput) || !looksLikeJobPosting(currentInput)) {
          addAiMessage(
            '아직 채용공고 내용이 충분히 확인되지 않았어요.\n\n공고 전문이 아니어도 괜찮으니, 회사명/직무명/자격요건/자소서 문항 중 확인 가능한 내용을 붙여넣어 주세요. 공고를 아직 못 찾았다면 아래 추천 사이트에서 먼저 확인해도 좋아요.'
          );
          setIsAiThinking(false);
          return;
        }

        setJobPost(currentInput);
        setCurrentStep(2);

        setTimeout(() => {
          addAiMessage(buildExperiencePrompt(currentInput, storedUser));
          setIsAiThinking(false);
        }, 600);

        return;
      }

      if (currentStep === 2) {
        setBaseExperience(currentInput);

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
        setCurrentQuestionIdx(0);
        setCurrentStep(3);

        addSystemMessage('경험 분석을 바탕으로 추가 질문을 시작합니다.');
        addAiMessage(`조금 더 구체적인 내용을 위해 몇 가지 질문을 드릴게요.\n\n첫 번째 질문입니다.\n\n${questions[0].text}`);

        setIsAiThinking(false);
        return;
      }

      if (currentStep === 3) {
        const currentQuestion = followUpQuestions[currentQuestionIdx];
        const nextAnswers = [
          ...interviewAnswers,
          {
            category: currentQuestion?.category || 'etc',
            question: currentQuestion?.text || '',
            answer: currentInput,
          },
        ];

        setInterviewAnswers(nextAnswers);

        const nextIdx = currentQuestionIdx + 1;
        const questionLimit = Math.min(followUpQuestions.length, 3);

        if (nextIdx < questionLimit) {
          setCurrentQuestionIdx(nextIdx);

          setTimeout(() => {
            addAiMessage(`좋습니다. 다음 질문입니다.\n\n${followUpQuestions[nextIdx].text}`);
            setIsAiThinking(false);
          }, 500);

          return;
        }

        setCurrentStep(4);
        addAiMessage('충분한 정보가 모였습니다. 지금부터 우측 자기소개서 캔버스에 초안을 작성해볼게요.');

        const finalRes = await axios.post(`${API_BASE}/api/generate/cover-letter`, {
          resume: {
            experience: baseExperience,
            interviewAnswers: nextAnswers,
          },
          jobPost,
          options: {
            tone: '전문적이고 설득력 있는',
            length: '1000자',
            type: '자유형',
          },
        });

        setResultText(finalRes.data?.content || finalRes.data || '');
        addSystemMessage('✨ 자기소개서 생성이 완료되었습니다. 우측에서 바로 수정할 수 있습니다.');
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

  const inputPlaceholder = buildInputPlaceholder(currentStep, storedUser);

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
          <div className="modern-chat-history">
            {messages.map((msg) => (
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

                  {msg.id !== 'start' && currentStep === 1 && msg.sender === 'AI' && (
                    <JobSiteHelp compact />
                  )}
                </div>
              </div>
            ))}

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

          {currentStep === 1 && !isAiThinking && (
            <div className="job-source-panel">
              <JobSiteHelp />
            </div>
          )}

          {currentStep < 4 && (
            <form className="floating-input-wrapper cover-floating-input" onSubmit={handleSendMessage}>
              <div className="floating-input-box">
                <textarea
                  ref={textareaRef}
                  value={userInput}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder={inputPlaceholder}
                  rows={1}
                  disabled={isAiThinking}
                />
                <button
                  type="submit"
                  className="send-circle-btn"
                  disabled={isAiThinking || !userInput.trim()}
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
                    <span>AI COVER LETTER</span>
                    <h2>자기소개서 초안</h2>
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
