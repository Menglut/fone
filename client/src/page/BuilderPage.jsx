import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import '../css/BuilderPage.css';
import axios from 'axios';
import mainLogo from '../assets/logo.png';

const API_BASE = process.env.REACT_APP_API_BASE;

const EXPERTS = {
  EXPERT: { id: 'EXPERT', name: "실무 책임자", icon: "💼", color: "#2563eb", role: "직무 하드 스킬 검증" },
  STRATEGY: { id: 'STRATEGY', name: "기획 책임자", icon: "🎯", color: "#db2777", role: "전략 및 문제해결 검증" },
  HR: { id: 'HR', name: "인사팀장", icon: "🤝", color: "#f59e0b", role: "성과 및 협업 역량 검증" },
  SYSTEM: { id: 'SYSTEM', name: "시스템", icon: "✨", color: "#64748b" }
};

export default function BuilderPage() {
  const navigate = useNavigate();
  
  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState("");
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [suggestedReplies, setSuggestedReplies] = useState([]);
  
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const [projects, setProjects] = useState([{
    title: "", techStack: "", why: "", how: "", then: "", architectureCode: "", chartData: ""
  }]);
  const [currentIdx, setCurrentIdx] = useState(0); 
  const [activeExpert, setActiveExpert] = useState('SYSTEM');

  const getUserInfo = () => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : { name: "지원자" };
  };

  const isInitialized = useRef(false);

  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    const startDiscussion = async () => {
      setMessages([
        { id: 'start', sender: 'SYSTEM', expert: EXPERTS.SYSTEM, text: "환영합니다. 첫 번째 경험에 대해 편하게 이야기해주세요." }
      ]);
      await sendMessageToAI("", true);
    };
    startDiscussion();
    // eslint-disable-next-line
  }, []);

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
      setUserInput("");
      setSuggestedReplies([]); 
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
    }

    setIsAiThinking(true);

    try {
      // ✨ 핵심: 다른 경험탭을 누르면 맥락이 섞이지 않도록 최근 메시지만 필터링
      const chatContext = messages
        .filter(m => m.id !== 'start')
        .slice(-6)
        .map(m => ({ sender: m.sender === 'user' ? '지원자' : m.expert?.name, text: m.text }));

      const res = await axios.post(`${API_BASE}/api/builder/chat`, {
        // currentStep 삭제됨
        userInfo, chatContext, currentProjectData: projects[currentIdx], userInput: text 
      });

      if (res.data.success) {
        const aiData = res.data.data;
        
        // ✨ 배열로 온 전문가들의 메시지를 순차적으로 화면에 뿌려줌 (진짜 톡방처럼 0.8초 간격)
        if (aiData.chats && aiData.chats.length > 0) {
          for (let i = 0; i < aiData.chats.length; i++) {
            const chat = aiData.chats[i];
            const speakerExpert = EXPERTS[chat.speaker] || EXPERTS.SYSTEM;
            
            setTimeout(() => {
              setMessages(prev => [...prev, { id: Date.now() + i, sender: chat.speaker, expert: speakerExpert, text: chat.message }]);
              setActiveExpert(chat.speaker); // 폼 하이라이트 변경
            }, i * 800); // 0.8초 딜레이
          }
        }

        if (aiData.suggestions) setSuggestedReplies(aiData.suggestions);
        
        if (aiData.extractedData) {
          setProjects(prev => {
            const newProjects = [...prev];
            // 내용이 비어있지 않은 것만 업데이트
            newProjects[currentIdx] = { ...newProjects[currentIdx], ...aiData.extractedData };
            return newProjects;
          });
        }
      }
    } catch (error) {
      console.error("AI 챗 통신 오류:", error);
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
    if (!window.confirm("현재 내용을 갈무리하고 새로운 경험을 추가할까요?")) return;
    
    setProjects(prev => [...prev, { title: "", techStack: "", why: "", how: "", then: "", architectureCode: "", chartData: "" }]);
    setCurrentIdx(prev => prev + 1);
    setSuggestedReplies([]);
    setActiveExpert('SYSTEM');
    
    // ✨ 핵심: 새 경험 추가 시 채팅방 내역을 싹 비우고 새 주제로 시작
    setMessages([
      { id: Date.now(), sender: 'SYSTEM', expert: EXPERTS.SYSTEM, text: "✨ 새로운 캔버스가 준비되었습니다. 이번에는 어떤 경험에 대해 이야기해볼까요?" }
    ]);
  };

  const handleGoToResult = () => {
    navigate('/portfolio/result', { state: { portfolioData: projects } });
  };

  const handleInlineEdit = (field, value) => {
    setProjects(prev => {
      const newProjects = [...prev];
      newProjects[currentIdx][field] = value;
      return newProjects;
    });
  };

  const stepNames = ['Basic', 'Problem', 'Solution', 'Result'];

  return (
    <div className="room-container modern-theme">
      <header className="room-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 32px' }}>
        {/* ✨ 2. 로고 영역 교체 */}
        <div className="room-logo-btn" onClick={() => navigate('/')}>
          <img 
            src={mainLogo} 
            alt="F1ND YOUR WAY 로고" 
            className="builder-logo-img" 
          />
        </div>
        
        {/* ✨ 4. 기존 1,2,3,4 단계(Step) 프로그레스 바 영역 아예 삭제 (단톡방 컨셉이므로 불필요) */}
        <div className="modern-step-indicator dark-header-compat" style={{ color: '#fff', fontSize: '0.9rem' }}>
          {/* 단계 대신 현재 작성 중인 프로젝트 인덱스 표시 */}
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
                
                {/* ✨ 4. 새로 추가됨: why (문제/배경) */}
                <div className={`draft-input-group ${activeExpert === 'STRATEGY' ? 'active-glow' : ''}`} style={{ '--accent': EXPERTS.STRATEGY.color }}>
                  <label>배경 및 문제점</label>
                  <textarea value={proj.why} onChange={(e) => handleInlineEdit('why', e.target.value)} placeholder="어떤 상황이나 문제가 있었나요?" />
                </div>
                
                {/* ✨ 5. 변수명 변경: problemSolving -> how */}
                <div className={`draft-input-group ${activeExpert === 'STRATEGY' ? 'active-glow' : ''}`} style={{ '--accent': EXPERTS.STRATEGY.color }}>
                  <label>해결 전략</label>
                  <textarea value={proj.how} onChange={(e) => handleInlineEdit('how', e.target.value)} placeholder="문제를 어떻게 해결했나요?" />
                </div>
                
                {/* ✨ 6. 변수명 변경: impact -> then */}
                <div className={`draft-input-group ${activeExpert === 'HR' ? 'active-glow' : ''}`} style={{ '--accent': EXPERTS.HR.color }}>
                  <label>핵심 성과</label>
                  <textarea value={proj.then} onChange={(e) => handleInlineEdit('then', e.target.value)} placeholder="숫자로 표현할 수 있는 성과가 있다면 더 좋습니다." />
                </div>
              </div>
            ))}
          </div>
        </aside>

        <section className="modern-chat-section">
          {/* ✨ 상단 배너 및 여백 삭제됨 */}
          <div className="modern-chat-history">
            {messages.map((msg) => (
              <div key={msg.id} className={`chat-row ${msg.sender === 'user' ? 'row-user' : 'row-ai'}`}>
                {msg.sender !== 'user' && msg.sender !== 'SYSTEM' && msg.expert && (
                  <div className="expert-avatar" style={{ background: msg.expert.color }}>{msg.expert.icon}</div>
                )}
                <div className="chat-content">
                  {msg.expert && msg.sender !== 'user' && <span className="expert-name" style={{ color: msg.expert.color }}>{msg.expert.name}</span>}
                  <div className={`chat-bubble ${msg.sender === 'user' ? 'bubble-user' : (msg.sender === 'SYSTEM' ? 'bubble-system' : 'bubble-ai')}`} style={{ whiteSpace: 'pre-wrap' }}>
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
            {/* ✨ 수정: 길어진 추천 답변 박스 높이에 맞춰 하단 여백 대폭 증가 */}
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