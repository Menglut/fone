import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import '../css/BuilderPage.css';
import axios from 'axios';
import mainLogo from '../assets/logo.png';

const API_BASE = process.env.REACT_APP_API_BASE;

const EXPERTS = {
  EXPERT: { id: 'EXPERT', name: '실무 책임자', icon: '', color: '#2563eb', role: '직무 하드 스킬 검증' },
  STRATEGY: { id: 'STRATEGY', name: '기획 책임자', icon: '', color: '#db2777', role: '전략 및 문제해결 검증' },
  HR: { id: 'HR', name: '인사팀장', icon: '', color: '#f59e0b', role: '성과 및 협업 역량 검증' },
  SYSTEM: { id: 'SYSTEM', name: '시스템', icon: '✨', color: '#64748b' }
};

const EMPTY_PROJECT = {
  title: '',
  techStack: '',
  why: '',
  how: '',
  then: '',
  architectureCode: '',
  chartData: ''
};

const getStoredUser = () => {
  try {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  } catch (error) {
    return null;
  }
};

const getUserId = (user) => {
  return user?.id || user?._id || user?.email || '';
};

const getCareerStatusLabel = (status) => {
  if (status === 'career') return '경력직';
  if (status === 'rookie') return '신입';
  return '';
};

const buildPortfolioUserInfo = (user) => {
  const careerProfile = user?.careerProfile || {};

  return {
    id: user?.id || user?._id || '',
    _id: user?._id || user?.id || '',
    name: user?.name || '지원자',
    email: user?.email || '',
    intro: user?.intro || '',
    careerStatus: careerProfile.status || '',
    careerStatusLabel: getCareerStatusLabel(careerProfile.status),
    jobCategory: careerProfile.jobCategory || '',
    jobDetail: careerProfile.jobDetail || '',
    targetJob: careerProfile.jobDetail || careerProfile.jobCategory || user?.jobTitle || ''
  };
};

const limitText = (value, maxLength) => {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trim()}...`;
};

const sanitizeProjectData = (project = {}) => ({
  ...EMPTY_PROJECT,
  ...project,
  title: limitText(project.title, 60),
  techStack: limitText(project.techStack, 120),
  why: limitText(project.why, 230),
  how: limitText(project.how, 260),
  then: limitText(project.then, 180)
});

export default function BuilderPage() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [suggestedReplies, setSuggestedReplies] = useState([]);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const [profileUser, setProfileUser] = useState(() => getStoredUser());
  const [profileReady, setProfileReady] = useState(false);
  const [projects, setProjects] = useState([{ ...EMPTY_PROJECT }]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [activeExpert, setActiveExpert] = useState('SYSTEM');

  const getUserInfo = () => {
    return buildPortfolioUserInfo(profileUser || getStoredUser());
  };

  const isInitialized = useRef(false);

  useEffect(() => {
    let ignore = false;

    const fetchMyProfile = async () => {
      const storedUser = getStoredUser();
      const userId = getUserId(storedUser);

      if (!userId) {
        setProfileReady(true);
        return;
      }

      try {
        const res = await axios.get(`${API_BASE}/api/profile/${encodeURIComponent(userId)}`);

        if (!ignore && res.data?.success && res.data?.data) {
          const freshUser = {
            ...storedUser,
            ...res.data.data
          };

          setProfileUser(freshUser);
          localStorage.setItem('user', JSON.stringify(freshUser));
        }
      } catch (error) {
        console.error('프로필 조회 실패:', error);
      } finally {
        if (!ignore) setProfileReady(true);
      }
    };

    fetchMyProfile();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (!profileReady) return;
    if (isInitialized.current) return;

    isInitialized.current = true;

    const startDiscussion = async () => {
      const userInfo = getUserInfo();
      const targetJobText = userInfo.targetJob ? `${userInfo.targetJob} 직무 기준으로 ` : '';

      setMessages([
        {
          id: 'start',
          sender: 'SYSTEM',
          expert: EXPERTS.SYSTEM,
          text: `환영합니다. ${targetJobText}포트폴리오 제작을 시작합니다. 첫 번째 경험에 대해 편하게 이야기해주세요.`
        }
      ]);

      await sendMessageToAI('', true);
    };

    startDiscussion();
    // eslint-disable-next-line
  }, [profileReady]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAiThinking, suggestedReplies]);

  const handleInputChange = (e) => {
    setUserInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  const sendMessageToAI = async (text, isInitial = false) => {
    if (!text.trim() && !isInitial) return;
    if (isAiThinking) return;

    const userInfo = getUserInfo();

    if (!isInitial) {
      setMessages(prev => [...prev, { id: Date.now(), sender: 'user', text }]);
      setUserInput('');
      setSuggestedReplies([]);
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
    }

    setIsAiThinking(true);

    try {
      const chatContext = messages
        .filter(m => m.id !== 'start')
        .slice(-6)
        .map(m => ({ sender: m.sender === 'user' ? '지원자' : m.expert?.name, text: m.text }));

      const res = await axios.post(`${API_BASE}/api/builder/chat`, {
        userInfo,
        chatContext,
        currentProjectData: projects[currentIdx] || EMPTY_PROJECT,
        userInput: text
      });

      if (res.data.success) {
        const aiData = res.data.data;

        if (aiData.chats && aiData.chats.length > 0) {
          for (let i = 0; i < aiData.chats.length; i++) {
            const chat = aiData.chats[i];
            const speakerExpert = EXPERTS[chat.speaker] || EXPERTS.SYSTEM;

            setTimeout(() => {
              setMessages(prev => [
                ...prev,
                {
                  id: Date.now() + i,
                  sender: chat.speaker,
                  expert: speakerExpert,
                  text: chat.message
                }
              ]);
              setActiveExpert(chat.speaker);
            }, i * 800);
          }
        }

        if (aiData.suggestions) setSuggestedReplies(aiData.suggestions);

        if (aiData.extractedData) {
          setProjects(prev => {
            const newProjects = [...prev];
            newProjects[currentIdx] = sanitizeProjectData({
              ...newProjects[currentIdx],
              ...aiData.extractedData
            });
            return newProjects;
          });
        }
      }
    } catch (error) {
      console.error('AI 챗 통신 오류:', error);
    } finally {
      setIsAiThinking(false);
    }
  };

  const handleSendMessage = (e) => {
    if (e) e.preventDefault();
    sendMessageToAI(userInput);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (userInput.trim() && !isAiThinking) handleSendMessage();
    }
  };

  const handleAddNewProject = () => {
    if (!window.confirm('현재 내용을 갈무리하고 새로운 경험을 추가할까요?')) return;

    setProjects(prev => [...prev, { ...EMPTY_PROJECT }]);
    setCurrentIdx(prev => prev + 1);
    setSuggestedReplies([]);
    setActiveExpert('SYSTEM');
    setMessages([
      {
        id: Date.now(),
        sender: 'SYSTEM',
        expert: EXPERTS.SYSTEM,
        text: '✨ 새로운 캔버스가 준비되었습니다. 이번에는 어떤 경험에 대해 이야기해볼까요?'
      }
    ]);
  };

  const handleGoToResult = () => {
    const cleanedProjects = projects
      .map(sanitizeProjectData)
      .filter(project =>
        project.title ||
        project.techStack ||
        project.why ||
        project.how ||
        project.then ||
        project.architectureCode ||
        project.chartData
      );

    navigate('/portfolio/result', {
      state: {
        portfolioData: cleanedProjects,
        userInfo: getUserInfo()
      }
    });
  };

  const handleInlineEdit = (field, value) => {
    setProjects(prev => {
      const newProjects = [...prev];
      newProjects[currentIdx][field] = value;
      return newProjects;
    });
  };

  return (
    <div className="room-container modern-theme">
      <header className="room-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 32px' }}>
        <div className="room-logo-btn" onClick={() => navigate('/')}>
          <img src={mainLogo} alt="F1ND YOUR WAY 로고" className="builder-logo-img" />
        </div>

        <div className="modern-step-indicator dark-header-compat" style={{ color: '#fff', fontSize: '0.9rem' }}>
          Currently Editing: Project {currentIdx + 1}
        </div>

        <button className="room-exit-btn" onClick={handleGoToResult} style={{ backgroundColor: '#111', color: '#fff' }}>
          FINISH BUILD
        </button>
      </header>

      <main className="modern-layout">
        <aside className="modern-draft-panel">
          <div className="draft-header">
            <div>
              <span className="draft-badge">Live Sync</span>
              <h2 className="draft-title">포트폴리오 초안</h2>
            </div>

            <button className="add-exp-btn" onClick={handleAddNewProject}>+ 새 경험 추가</button>
          </div>

          <div className="draft-scroller">
            {projects.map((proj, idx) => (
              <div key={idx} className={`exp-card ${currentIdx === idx ? 'active-card' : ''}`}>
                <h3 className="exp-card-title">Experience {idx + 1} {currentIdx === idx && <span className="pulse-dot"></span>}</h3>

                <div className={`draft-input-group ${activeExpert === 'SYSTEM' ? 'active-glow' : ''}`} style={{ '--accent': EXPERTS.EXPERT.color }}>
                  <label>프로젝트 명</label>
                  <textarea value={proj.title} onChange={(e) => handleInlineEdit('title', e.target.value)} placeholder="AI가 대화를 분석해 채워줍니다." rows={1} />
                </div>

                <div className={`draft-input-group ${activeExpert === 'EXPERT' ? 'active-glow' : ''}`} style={{ '--accent': EXPERTS.EXPERT.color }}>
                  <label>도구/기술</label>
                  <textarea value={proj.techStack} onChange={(e) => handleInlineEdit('techStack', e.target.value)} placeholder="ex) React, Figma, GA4..." />
                </div>

                <div className={`draft-input-group ${activeExpert === 'STRATEGY' ? 'active-glow' : ''}`} style={{ '--accent': EXPERTS.STRATEGY.color }}>
                  <label>배경 및 문제점</label>
                  <textarea value={proj.why} onChange={(e) => handleInlineEdit('why', e.target.value)} placeholder="어떤 상황이나 문제가 있었나요?" />
                </div>

                <div className={`draft-input-group ${activeExpert === 'STRATEGY' ? 'active-glow' : ''}`} style={{ '--accent': EXPERTS.STRATEGY.color }}>
                  <label>해결 전략</label>
                  <textarea value={proj.how} onChange={(e) => handleInlineEdit('how', e.target.value)} placeholder="문제를 어떻게 해결했나요?" />
                </div>

                <div className={`draft-input-group ${activeExpert === 'HR' ? 'active-glow' : ''}`} style={{ '--accent': EXPERTS.HR.color }}>
                  <label>핵심 성과</label>
                  <textarea value={proj.then} onChange={(e) => handleInlineEdit('then', e.target.value)} placeholder="숫자로 표현할 수 있는 성과가 있다면 더 좋습니다." />
                </div>

                <div className={`draft-input-group ${activeExpert === 'SYSTEM' ? 'active-glow' : ''}`}>
                  <label> 성과 그래프 데이터 (JSON)</label>
                  <textarea
                    value={typeof proj.chartData === 'string' ? proj.chartData : JSON.stringify(proj.chartData)}
                    onChange={(e) => handleInlineEdit('chartData', e.target.value)}
                    placeholder='[{"name":"전","value":10}, {"name":"후","value":50}]'
                  />
                </div>

                <div className={`draft-input-group ${activeExpert === 'SYSTEM' ? 'active-glow' : ''}`}>
                  <label>️ 아키텍처 설계 (Mermaid)</label>
                  <textarea
                    value={proj.architectureCode}
                    onChange={(e) => handleInlineEdit('architectureCode', e.target.value)}
                    placeholder="graph TD..."
                  />
                </div>
              </div>
            ))}
          </div>
        </aside>

        <section className="modern-chat-section">
          <div className="modern-chat-history">
            {messages.map((msg) => (
              <div key={msg.id} className={`chat-row ${msg.sender === 'user' ? 'row-user' : 'row-ai'}`}>
                {/* ✨ 수정 1: msg.sender !== 'SYSTEM' 조건을 빼서 시스템도 아바타(✨)가 정상적으로 나타나게 수정했습니다 */}
                {msg.sender !== 'user' && msg.expert && (
                  <div className="expert-avatar" style={{ background: msg.expert.color }}>{msg.expert.icon}</div>
                )}

                <div className="chat-content">
                  {msg.expert && msg.sender !== 'user' && <span className="expert-name" style={{ color: msg.expert.color }}>{msg.expert.name}</span>}
                  {/* ✨ 수정 2: 'bubble-system'이라는 별도 클래스 대신 확실하게 디자인이 들어간 'bubble-ai'로 통일했습니다 */}
                  <div className={`chat-bubble ${msg.sender === 'user' ? 'bubble-user' : 'bubble-ai'}`} style={{ whiteSpace: 'pre-wrap' }}>
                    {msg.text}
                  </div>
                </div>
              </div>
            ))}

            {isAiThinking && (
              <div className="chat-row row-ai">
                <div className="chat-bubble bubble-ai typing-indicator">
                  <span></span><span></span><span></span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} style={{ height: '280px' }} />
          </div>

          <div className="floating-input-wrapper">
            {suggestedReplies.length > 0 && !isAiThinking && (
              <div className="floating-suggestions">
                {suggestedReplies.map((reply, idx) => (
                  <button key={idx} className="glass-chip" onClick={() => {
                    setUserInput(reply);
                    if (textareaRef.current) {
                      textareaRef.current.style.height = 'auto';
                      setTimeout(() => { textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`; }, 0);
                    }
                  }}>
                    {reply}
                  </button>
                ))}
              </div>
            )}

            <form className="floating-input-box" onSubmit={handleSendMessage}>
              <textarea
                ref={textareaRef}
                value={userInput}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="답변을 입력하세요... (Shift + Enter로 줄바꿈)"
                disabled={isAiThinking}
                rows={1}
              />
              <button type="button" className="send-circle-btn" disabled={isAiThinking || !userInput.trim()} onClick={handleSendMessage}>
                ↑
              </button>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
}
