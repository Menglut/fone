import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import '../css/BuilderPage.css';
import axios from 'axios';

const API_BASE = "http://localhost:5000";

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

  const [currentStep, setCurrentStep] = useState(1);
  const [projects, setProjects] = useState([{
    title: "", hardSkills: "", problemSolving: "", impact: "", architectureCode: "", chartData: ""
  }]);
  const [currentIdx, setCurrentIdx] = useState(0); 

  // 현재 포커스할 전문가 상태 관리 (좌측 폼 하이라이트용)
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
      const chatContext = messages
        .filter(m => m.id !== 'start')
        .slice(-6)
        .map(m => ({ sender: m.sender === 'user' ? '지원자' : m.expert?.name, text: m.text }));

      const res = await axios.post(`${API_BASE}/api/builder/chat`, {
        userInfo, chatContext, currentProjectData: projects[currentIdx], userInput: text, currentStep 
      });

      if (res.data.success) {
        const aiData = res.data.data;
        const speakerExpert = EXPERTS[aiData.speaker] || EXPERTS.SYSTEM;
        
        setMessages(prev => [...prev, { id: Date.now(), sender: aiData.speaker, expert: speakerExpert, text: aiData.message }]);
        
        // AI의 응답을 분석하여 활성화된 전문가 업데이트 (좌측 폼 반짝임 효과 유지)
        setActiveExpert(aiData.speaker);

        if (aiData.suggestions && aiData.suggestions.length > 0) setSuggestedReplies(aiData.suggestions);
        if (aiData.currentStep) setCurrentStep(aiData.currentStep);
        if (aiData.extractedData) {
          setProjects(prev => {
            const newProjects = [...prev];
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
    setProjects(prev => [...prev, { title: "", hardSkills: "", problemSolving: "", impact: "", architectureCode: "", chartData: "" }]);
    setCurrentIdx(prev => prev + 1);
    setCurrentStep(1); 
    setSuggestedReplies([]);
    
    // 초기화
    setActiveExpert('SYSTEM');
    setMessages(prev => [...prev, { id: Date.now(), sender: 'SYSTEM', expert: EXPERTS.SYSTEM, text: "새로운 캔버스가 준비되었습니다. 어떤 경험인가요?" }]);
  };

  const handleGoToResult = () => {
    navigate('/builder/result', { state: { portfolioData: projects } });
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
        <div className="room-logo-btn" onClick={() => navigate('/')}>
          <div className="room-logo-symbol"><span>F1</span></div>
          <div className="room-logo-title">F1ND YOUR WAY</div>
        </div>
        
        <div className="modern-step-indicator dark-header-compat">
          {stepNames.map((name, idx) => (
            <React.Fragment key={name}>
              <div className={`step-dot ${currentStep === idx + 1 ? 'active' : ''} ${currentStep > idx + 1 ? 'completed' : ''}`}>
                {currentStep > idx + 1 ? '✓' : idx + 1}
              </div>
              {idx < 3 && <div className={`step-line ${currentStep > idx + 1 ? 'active-line' : ''}`}></div>}
            </React.Fragment>
          ))}
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
                  <label>하드 스킬 (도구/기술)</label>
                  <textarea value={proj.hardSkills} onChange={(e) => handleInlineEdit('hardSkills', e.target.value)} placeholder="ex) React, Figma, GA4..." />
                </div>
                
                <div className={`draft-input-group ${activeExpert === 'STRATEGY' ? 'active-glow' : ''}`} style={{ '--accent': EXPERTS.STRATEGY.color }}>
                  <label>문제 해결 전략</label>
                  <textarea value={proj.problemSolving} onChange={(e) => handleInlineEdit('problemSolving', e.target.value)} placeholder="어떤 문제를 어떻게 해결했나요?" />
                </div>
                
                <div className={`draft-input-group ${activeExpert === 'HR' ? 'active-glow' : ''}`} style={{ '--accent': EXPERTS.HR.color }}>
                  <label>핵심 성과</label>
                  <textarea value={proj.impact} onChange={(e) => handleInlineEdit('impact', e.target.value)} placeholder="숫자로 표현할 수 있는 성과가 있다면 더 좋습니다." />
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