import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import '../css/BuilderPage.css';
import axios from 'axios';

const API_BASE = "http://localhost:5000";

// ✨ 1. 모든 직군 범용 전문가 페르소나로 변경
const EXPERTS = {
  EXPERT: { id: 'EXPERT', name: "실무 책임자", icon: "💼", color: "#2563eb", role: "직무 하드 스킬 검증" },
  STRATEGY: { id: 'STRATEGY', name: "기획 책임자", icon: "🎯", color: "#db2777", role: "전략 및 문제해결 검증" },
  HR: { id: 'HR', name: "인사팀장", icon: "🤝", color: "#f59e0b", role: "성과 및 협업 역량 검증" },
  SYSTEM: { id: 'SYSTEM', name: "시스템", icon: "⚙️", color: "#64748b" }
};

export default function BuilderPage() {
  const navigate = useNavigate();
  
  // 상태 관리
  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState("");
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [suggestedReplies, setSuggestedReplies] = useState([]); // ✨ 추천 답변 상태 추가
  const messagesEndRef = useRef(null);

  const [projects, setProjects] = useState([{
    title: "",
    hardSkills: "",
    problemSolving: "",
    impact: ""
  }]);
  const [currentIdx, setCurrentIdx] = useState(0); 

  // 현재 로그인한 유저 정보 가져오기
  const getUserInfo = () => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : { name: "지원자" }; // 기본값 설정
  };

  const isInitialized = useRef(false);

  // ✨ 2. 방 입장 시 사전 정보 연동 (Context Seeding)
  useEffect(() => {
    if (isInitialized.current) return; // 이미 초기화되었다면 막기
    isInitialized.current = true;      // 자물쇠 잠그기

    const startDiscussion = async () => {
      // 시스템 안내 메시지 먼저 띄우기
      setMessages([
        { 
          id: 'start', sender: 'SYSTEM', expert: EXPERTS.SYSTEM,
          text: "전문가 단톡방에 입장하셨습니다. 여러분의 직무에 맞춰 실무진, 기획자, 인사팀장이 질문을 드릴 예정입니다." 
        }
      ]);

      // 백엔드에 빈 메시지를 보내서 AI가 먼저 질문을 시작하도록 유도
      await sendMessageToAI("", true);
    };

    startDiscussion();
    // eslint-disable-next-line
  }, []);

  // 스크롤 하단 고정
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAiThinking, suggestedReplies]);

  // ✨ 3. 진짜 AI 통신 로직 (추천 가이드 & 데이터 자동 업데이트 포함)
  const sendMessageToAI = async (text, isInitial = false) => {
    if (!text.trim() && !isInitial) return;
    if (isAiThinking) return;

    const userInfo = getUserInfo();

    // 유저가 보낸 메시지 화면에 추가 (초기 통신이 아닐 때만)
    if (!isInitial) {
      setMessages(prev => [...prev, { id: Date.now(), sender: 'user', text }]);
      setUserInput("");
      setSuggestedReplies([]); // 전송 후 추천 버튼 숨기기
    }

    setIsAiThinking(true);

    try {
      // 맥락 유지를 위해 최근 6개 대화만 추려서 전송
      const chatContext = messages
        .filter(m => m.id !== 'start') // 시스템 첫 인사는 제외
        .slice(-6)
        .map(m => ({ sender: m.sender === 'user' ? '지원자' : m.expert?.name, text: m.text }));

      // 💡 백엔드 AI 통신!
      const res = await axios.post(`${API_BASE}/api/builder/chat`, {
        userInfo,
        chatContext,
        currentProjectData: projects[currentIdx],
        userInput: text
      });

      if (res.data.success) {
        const aiData = res.data.data;

        // 1) AI 메시지 추가
        const speakerExpert = EXPERTS[aiData.speaker] || EXPERTS.SYSTEM;
        setMessages(prev => [...prev, { 
          id: Date.now(), 
          sender: aiData.speaker, 
          expert: speakerExpert, 
          text: aiData.message 
        }]);

        // 2) 가이드 칩(추천 답변) 세팅
        if (aiData.suggestions && aiData.suggestions.length > 0) {
          setSuggestedReplies(aiData.suggestions);
        }

        // 3) 포트폴리오 데이터 실시간 병합
        if (aiData.extractedData) {
          setProjects(prev => {
            const newProjects = [...prev];
            const current = newProjects[currentIdx];
            newProjects[currentIdx] = {
              title: aiData.extractedData.title || current.title,
              hardSkills: aiData.extractedData.hardSkills || current.hardSkills,
              problemSolving: aiData.extractedData.problemSolving || current.problemSolving,
              impact: aiData.extractedData.impact || current.impact
            };
            return newProjects;
          });
        }
      }
    } catch (error) {
      console.error("AI 챗 통신 오류:", error);
      alert("전문가들과 통신 중 오류가 발생했습니다.");
    } finally {
      setIsAiThinking(false);
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    sendMessageToAI(userInput);
  };

  // 🚀 다른 프로젝트 추가 (수동 추가 기능)
  const handleAddNewProject = () => {
    if (!window.confirm("현재 프로젝트 작성을 마치고 새로운 경험을 추가하시겠습니까?")) return;
    setProjects(prev => [...prev, { title: "", hardSkills: "", problemSolving: "", impact: "" }]);
    setCurrentIdx(prev => prev + 1);
    setSuggestedReplies([]);
    
    setMessages(prev => [...prev, { 
      id: Date.now(), sender: 'SYSTEM', expert: EXPERTS.SYSTEM, 
      text: "✨ 새로운 프로젝트/경험 작성을 시작합니다. 이 경험의 핵심 목표는 무엇이었나요?" 
    }]);
  };

  // 🚀 결과물 들고 Result 페이지로 이동 + 대화 기록 DB 저장 통합!
  const handleGoToResult = async () => {
    if (!projects[0].title && !projects[0].hardSkills) {
      alert("최소한의 경험 내용을 작성해 주세요!");
      return;
    }
    
    if (!window.confirm("대화를 종료하시겠습니까?\n(작성된 포트폴리오와 전문가들과의 대화 기록이 내 대시보드에 저장됩니다.)")) return;

    // 1. 유저 정보 가져오기
    const user = getUserInfo();
    const userId = user?.id || user?._id || user?.email || 'guest';

    try {
      // 2. 시스템의 첫 인사말('start')을 제외한 실제 대화 내용만 추출
      const historyToSave = messages
        .filter(m => m.id !== 'start')
        .map(m => ({
          sender: m.sender,
          text: m.text
        }));

      // 3. ✨ 백엔드에 포트폴리오와 대화 기록 전체 저장 요청
      await axios.post(`${API_BASE}/api/builder/save`, {
        userId: userId,
        title: `AI 포트폴리오 빌더 작성 기록 (${new Date().toLocaleDateString()})`,
        chatHistory: historyToSave,
        portfolioData: projects
      });
      
      console.log("대화 기록 및 포트폴리오 저장 성공!");

    } catch (error) {
      console.error("기록 저장 실패:", error);
      // 저장이 실패하더라도 유저가 작성한 결과물은 볼 수 있도록 일단 아래 코드로 넘어갑니다.
    } finally {
      // 4. 결과 페이지로 데이터 들고 이동
      navigate('/interview/result', { 
        state: { portfolioData: projects } 
      });
    }
  };

  // 💡 텍스트 직접 수정 핸들러
  const handleInlineEdit = (field, value) => {
    setProjects(prev => {
      const newProjects = [...prev];
      newProjects[currentIdx][field] = value;
      return newProjects;
    });
  };

  return (
    <div className="room-container">
      <header className="room-header">
        <div className="room-logo-btn" onClick={() => navigate('/')}>
          <div className="room-logo-symbol"><span>F1</span></div>
          <div className="room-logo-title">F1ND YOUR WAY</div>
        </div>
        <button className="room-exit-btn" onClick={handleGoToResult} style={{ backgroundColor: '#111' }}>
          FINISH & VIEW RESULT
        </button>
      </header>

      <main className="room-layout">
        
        {/* 🔵 좌측: 실시간 포트폴리오 프리뷰 (직접 수정 가능) */}
        <aside className="room-attack-panel">
          <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span className="panel-chip" style={{ color: EXPERTS.EXPERT.color }}>LIVE DRAFTING...</span>
              <h2 className="panel-title">포트폴리오 초안</h2>
            </div>
            <button onClick={handleAddNewProject} style={{ padding: '6px 12px', background: '#e2e8f0', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
              + 새 경험 추가
            </button>
          </div>
          
          <div className="question-list-scroller" style={{ padding: '25px' }}>
            {projects.map((proj, idx) => (
              <div key={idx} style={{ marginBottom: '40px', borderBottom: idx !== projects.length - 1 ? '2px dashed #e2e8f0' : 'none', paddingBottom: '20px', opacity: currentIdx === idx ? 1 : 0.5 }}>
                <h3 style={{ fontSize: '1.2rem', color: '#0f172a', marginBottom: '15px', fontFamily: 'Oswald, sans-serif' }}>
                  🚩 EXPERIENCE {idx + 1} {currentIdx === idx && "(작성 중)"}
                </h3>
                
                {/* ✨ 4. 직접 수정(Inline Edit) 가능한 textarea들 */}
                <div className="draft-section">
                  <h4 style={{ color: EXPERTS.EXPERT.color }}>[프로젝트 / 경험 이름]</h4>
                  <textarea className="inline-edit-textarea" value={proj.title} onChange={(e) => handleInlineEdit('title', e.target.value)} placeholder="대화를 나누면 자동으로 채워집니다." rows={1} />
                </div>
                
                <div className="draft-section" style={{ marginTop: '15px' }}>
                  <h4 style={{ color: EXPERTS.EXPERT.color }}>[직무 하드스킬 및 도구]</h4>
                  <textarea className="inline-edit-textarea" value={proj.hardSkills} onChange={(e) => handleInlineEdit('hardSkills', e.target.value)} placeholder="어떤 툴과 기술을 사용했나요?" />
                </div>
                
                <div className="draft-section" style={{ marginTop: '15px' }}>
                  <h4 style={{ color: EXPERTS.STRATEGY.color }}>[전략 및 문제 해결]</h4>
                  <textarea className="inline-edit-textarea" value={proj.problemSolving} onChange={(e) => handleInlineEdit('problemSolving', e.target.value)} placeholder="어떤 전략으로 문제를 돌파했나요?" />
                </div>
                
                <div className="draft-section" style={{ marginTop: '15px' }}>
                  <h4 style={{ color: EXPERTS.HR.color }}>[핵심 성과]</h4>
                  <textarea className="inline-edit-textarea" value={proj.impact} onChange={(e) => handleInlineEdit('impact', e.target.value)} placeholder="정량적/정성적 성과를 기록해주세요." />
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* 💬 우측: 전문가 단톡방 */}
        <section className="room-sim-display">
          <div className="sim-chat-history">
            {messages.map((msg) => (
              <div key={msg.id} className={`msg-wrap ${msg.sender === 'user' ? 'user' : (msg.sender === 'SYSTEM' ? 'system' : 'ai')}`}>
                {msg.sender !== 'user' && msg.sender !== 'SYSTEM' && msg.expert && (
                  <div className="ai-avatar-icon" style={{ borderColor: msg.expert.color }}>
                    {msg.expert.icon}
                  </div>
                )}
                <div className={msg.sender === 'user' ? 'msg-wrap user' : (msg.sender === 'SYSTEM' ? 'msg-wrap system' : 'ai-bubble-wrap')}>
                  {msg.expert && msg.sender !== 'user' && <span className="ai-name" style={{ color: msg.expert.color, fontSize: '0.8rem', marginBottom: '4px', display: 'block' }}>{msg.expert.name}</span>}
                  <div className={msg.sender === 'user' ? 'user-bubble' : (msg.sender === 'SYSTEM' ? 'system-bubble' : 'ai-bubble')}>
                    {msg.text}
                  </div>
                </div>
              </div>
            ))}
            
            {isAiThinking && (
              <div className="defense-loading">
                <span className="defense-dot"></span><span className="defense-dot"></span><span className="defense-dot"></span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* ✨ 5. 추천 답변 (가이드 칩) 영역 */}
          {suggestedReplies.length > 0 && !isAiThinking && (
            <div className="quick-replies-container">
              <span style={{ fontSize: '0.8rem', color: '#64748b', marginRight: '10px', display: 'flex', alignItems: 'center' }}>💡 추천 답변:</span>
              {suggestedReplies.map((reply, idx) => (
                <button 
                  key={idx} 
                  className="quick-reply-btn" 
                  onClick={() => setUserInput(reply)} 
                >
                  {reply}
                </button>
              ))}
            </div>
          )}

          <form className="chat-input-area" onSubmit={handleSendMessage} style={{ borderTop: suggestedReplies.length > 0 ? 'none' : '1px solid #e2e8f0' }}>
            <input 
              type="text" 
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="전문가들의 질문에 답변하세요..."
              disabled={isAiThinking}
              autoFocus
            />
            <button type="submit" className="room-exit-btn" style={{ background: '#E10600', borderColor: '#E10600' }} disabled={isAiThinking || !userInput.trim()}>SEND</button>
          </form>
        </section>
        
      </main>
    </div>
  );
}