import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios'; // ✨ API 통신을 위해 axios 추가
import '../css/ReverseInterviewRoom.css';
import mainLogo from '../assets/logo.png';

const API_BASE = "http://localhost:5000"; // 💡 백엔드 서버 주소 (환경에 맞게 수정하세요)

export default function ReverseInterviewRoom() {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Prep 화면에서 넘겨받은 데이터 (문서 ID와 초기 3개 핵심 질문)
  const { targetId, targetType, initialAttacks = [] } = location.state || {};

  const [coreQuestions, setCoreQuestions] = useState([]); 
  const [currentQuestions, setCurrentQuestions] = useState([]); 
  const [isFollowUpMode, setIsFollowUpMode] = useState(false); 
  
  const [messages, setMessages] = useState([]);
  const [isAiDefending, setIsAiDefending] = useState(false);
  const messagesEndRef = useRef(null);

  // 현재 로그인한 유저 정보 가져오기 (종료 시 기록 저장을 위함)
  const getUserInfo = () => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  };

  // 1. 방 입장 시 초기 세팅
  useEffect(() => {
    if (!initialAttacks || initialAttacks.length === 0 || !targetId) {
      alert("정상적인 경로가 아닙니다. 스캔을 먼저 진행해주세요.");
      return navigate('/interview/prep');
    }

    const formattedCores = initialAttacks.map((q, idx) => ({ ...q, id: `core-${idx}`, isUsed: false }));
    setCoreQuestions(formattedCores);
    setCurrentQuestions(formattedCores);

    setMessages([
      { 
        id: 'msg-sys-1', sender: 'ai', isStuttering: false,
        text: "시스템 가동 완료. 제 서류(이력서)를 바탕으로 면접을 시작하겠습니다. 좌측에서 질문을 선택해 주세요."
      }
    ]);
  }, [initialAttacks, targetId, navigate]);

  // 스크롤 하단 고정
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAiDefending]);

  // 💡 2. 진짜 AI와 통신하는 질문 던지기 로직
  const handleAskQuestion = async (questionObj) => {
    if (isAiDefending) return;

    // 핵심 질문이면 사용 처리
    if (!isFollowUpMode) {
      setCoreQuestions(prev => prev.map(q => q.id === questionObj.id ? { ...q, isUsed: true } : q));
    }

    // 유저의 질문을 화면에 즉시 표시
    const newUserMsg = { id: `msg-user-${Date.now()}`, sender: 'user', text: questionObj.question };
    setMessages(prev => [...prev, newUserMsg]);
    
    setCurrentQuestions([]); // 질문 중복 클릭 방지를 위해 리스트 비우기
    setIsAiDefending(true);  // AI 로딩 시작

    try {
      // AI가 대화 문맥을 기억할 수 있도록 최근 대화 내역(최대 6개)을 추려서 보냅니다.
      const currentHistory = [...messages, newUserMsg].filter(m => m.id !== 'msg-sys-1'); // 첫 시스템 인사말 제외
      const chatContext = currentHistory.slice(-6).map(m => ({
        sender: m.sender,
        text: m.text
      }));

      // ✨ 백엔드에 AI 답변 및 꼬리 질문 생성 요청!
      const res = await axios.post(`${API_BASE}/api/interview/chat`, {
        docId: targetId,
        currentQuestion: questionObj.question,
        chatContext: chatContext
      });

      if (res.data.success) {
        const aiData = res.data.data; 

        // AI 답변과 ✨모범 답안(modelAnswer)을 채팅창에 추가
        setMessages(prev => [
          ...prev, 
          { 
            id: `msg-ai-${Date.now()}`, 
            sender: 'ai', 
            text: aiData.answer, 
            isStuttering: aiData.isStuttering,
            modelAnswer: aiData.modelAnswer // ✨ 백엔드에서 온 모범 답안 저장
          }
        ]);

        if (aiData.followUps && aiData.followUps.length > 0) {
          const formattedFollowUps = aiData.followUps.map((q, idx) => ({
            id: `follow-${Date.now()}-${idx}`,
            type: q.type || "FOLLOW-UP",
            question: q.question
          }));
          setCurrentQuestions(formattedFollowUps);
          setIsFollowUpMode(true);
        } else {
          setCurrentQuestions(coreQuestions);
          setIsFollowUpMode(false);
        }
      } else {
        throw new Error(res.data.message || "AI 응답 실패");
      }
    } catch (error) {
      console.error("AI 챗 통신 오류:", error);
      alert("AI 면접관과 통신하는 중 문제가 발생했습니다.");
      // 에러 발생 시 핵심 질문 리스트로 복귀
      setCurrentQuestions(coreQuestions);
      setIsFollowUpMode(false);
    } finally {
      setIsAiDefending(false);
    }
  };

  // 3. 다른 핵심 질문으로 돌아가기 기능
  const handleReturnToCore = () => {
    setCurrentQuestions(coreQuestions);
    setIsFollowUpMode(false);
  };

  // 💡 4. 면접 종료 및 기록 저장
  const handleFinishInterview = async () => {
    if (!window.confirm("모의 면접을 종료하고 기록을 저장하시겠습니까?\n(버벅거렸던 질문들을 중심으로 이력서를 수정해보세요!)")) {
      return;
    }

    const user = getUserInfo();
    const userId = user?.id || user?._id || user?.email;

    // 대화를 한 번도 안 했으면 그냥 나가기
    if (messages.length <= 1) {
      return navigate('/mypage');
    }

    try {
      // 시스템 첫 인사말을 제외한 실제 대화 기록만 추출
      const historyToSave = messages
        .filter(m => m.id !== 'msg-sys-1')
        .map(m => ({
          sender: m.sender,
          text: m.text,
          isStuttering: m.isStuttering || false
        }));

      // ✨ 백엔드에 기록 저장 요청
      await axios.post(`${API_BASE}/api/interview/save`, {
        userId: userId,
        docId: targetId,
        title: `역면접 스트레스 테스트 (${new Date().toLocaleDateString()})`,
        chatHistory: historyToSave
      });

      alert("면접 기록이 성공적으로 저장되었습니다. 대시보드에서 확인하세요!");
    } catch (error) {
      console.error("면접 기록 저장 실패:", error);
      alert("기록 저장 중 오류가 발생했지만, 대시보드로 이동합니다.");
    } finally {
      navigate('/mypage'); // 마이페이지(대시보드)로 이동
    }
  };

  return (
    <div className="room-container">
      {/* 🏁 헤더 */}
      <header className="room-header">
        <div className="room-logo-btn" onClick={() => navigate('/')}>
          <img 
            src={mainLogo} 
            alt="F1ND YOUR WAY 로고" 
            className="room-logo-img" 
          />
        </div>
        <button 
          className="room-exit-btn"
          onClick={handleFinishInterview}
        >
          FINISH INTERVIEW
        </button>
      </header>

      {/* 🛠️ 메인 레이아웃 */}
      <main className="room-layout">
        
        {/* 🔴 좌측: 질문 패널 */}
        <aside className="room-attack-panel">
          <div className="panel-header">
            <span className="panel-chip">{isFollowUpMode ? "DYNAMIC FOLLOW-UPS" : "CORE QUESTIONS"}</span>
            <h2 className="panel-title">{isFollowUpMode ? "꼬리 질문 추천" : "핵심 면접 질문"}</h2>
            <p style={{color: '#64748b', fontSize: '0.9rem', marginTop: '5px', lineHeight: '1.5'}}>
              {isFollowUpMode ? "지원자의 답변을 파고드는 꼬리 질문입니다." : "이력서를 기반으로 추출된 핵심 질문입니다."}
            </p>
          </div>

          <div className="question-list-scroller">
            {isAiDefending ? (
              <div style={{ textAlign: 'center', color: '#94a3b8', padding: '40px 0' }}>
                지원자가 답변을 생각하고 있습니다...<br/>답변 완료 후 꼬리 질문이 생성됩니다.
              </div>
            ) : (
              currentQuestions.map((q) => (
                <button 
                  key={q.id} 
                  className={`question-btn ${isFollowUpMode ? 'follow-up' : ''}`}
                  onClick={() => handleAskQuestion(q)}
                  disabled={!isFollowUpMode && q.isUsed}
                >
                  <span className="q-type">[{q.type}] {isFollowUpMode && "꼬리 질문"}</span>
                  <div className="q-text">{q.question}</div>
                </button>
              ))
            )}

            {/* 핵심 질문으로 넘어가기 버튼 (꼬리 질문 모드일 때만 표시) */}
            {isFollowUpMode && !isAiDefending && (
              <button className="return-core-btn" onClick={handleReturnToCore}>
                🔙 다른 핵심 질문으로 넘어가기
              </button>
            )}
          </div>
        </aside>

        {/* 🤖 우측: 시뮬레이션 채팅창 */}
        <section className="room-sim-display">
          <div className="sim-chat-history">
            {messages.map((msg) => (
              <div key={msg.id} className={`msg-wrap ${msg.sender}`}>
                {msg.sender === 'ai' && (
                  <div className="ai-avatar-icon">{msg.isStuttering ? '💦' : '📄'}</div>
                )}
                
                {msg.sender === 'ai' ? (
                  <div className="ai-bubble-wrap">
                    <span className="ai-name">MY RESUME (지원자)</span>
                    <div className={`ai-bubble ${msg.isStuttering ? 'stutter' : ''}`}>
                      {msg.text}
                    </div>
                    
                    {/* ✨ AI가 당황하여 모범 답안이 존재할 경우 가이드 박스 렌더링 */}
                    {msg.modelAnswer && msg.modelAnswer.trim() !== "" && (
                      <div className="model-answer-box">
                        <span className="model-answer-title">💡 면접 컨설팅 가이드</span>
                        {msg.modelAnswer}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="msg-wrap user">
                    <span className="user-tag">INTERVIEWER (나)</span>
                    <div className="user-bubble">{msg.text}</div>
                  </div>
                )}
              </div>
            ))}

            {isAiDefending && (
              <div className="msg-wrap ai">
                <div className="ai-avatar-icon" style={{borderColor: '#cbd5e1'}}>⚙️</div>
                <div className="ai-bubble-wrap">
                  <span className="ai-name">서류를 뒤지며 답변을 찾는 중...</span>
                  <div className="ai-bubble">
                    <div className="defense-loading">
                      <span className="defense-dot"></span><span className="defense-dot"></span><span className="defense-dot"></span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </section>

      </main>
    </div>
  );
}