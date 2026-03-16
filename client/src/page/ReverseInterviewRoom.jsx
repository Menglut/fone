import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import '../css/ReverseInterviewRoom.css';

export default function ReverseInterviewRoom() {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Prep 화면에서 넘겨받은 3개의 핵심 질문 데이터
  const { targetId, targetType, initialAttacks = [] } = location.state || {};

  const [coreQuestions, setCoreQuestions] = useState([]); // 초기 3개 질문 보관용
  const [currentQuestions, setCurrentQuestions] = useState([]); // 화면 좌측에 보여줄 질문 리스트 (핵심 or 꼬리질문)
  const [isFollowUpMode, setIsFollowUpMode] = useState(false); // 현재 꼬리 질문 모드인지 여부
  
  const [messages, setMessages] = useState([]);
  const [isAiDefending, setIsAiDefending] = useState(false);
  const messagesEndRef = useRef(null);

  // 1. 방 입장 시 초기 세팅
  useEffect(() => {
    if (!initialAttacks || initialAttacks.length === 0) {
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
  }, [initialAttacks, navigate]);

  // 스크롤 하단 고정
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAiDefending]);

  // 2. 질문 던지기 (핵심 질문 or 꼬리 질문 공통)
  const handleAskQuestion = (questionObj) => {
    if (isAiDefending) return;

    // 만약 핵심 질문을 던진 거라면 사용 처리
    if (!isFollowUpMode) {
      setCoreQuestions(prev => prev.map(q => q.id === questionObj.id ? { ...q, isUsed: true } : q));
    }

    // 면접관(유저)의 질문을 채팅창에 추가
    setMessages(prev => [...prev, { id: `msg-user-${Date.now()}`, sender: 'user', text: questionObj.question }]);
    
    // AI가 답변을 생각하는 동안 다른 질문을 못 누르게 리스트를 임시로 비움
    setCurrentQuestions([]);
    setIsAiDefending(true);

    // 💡 AI 방어 및 꼬리 질문 생성 임시 목업 (추후 백엔드 연결 부위)
    setTimeout(() => {
      let isStuttering = false;
      let mockDefense = "";
      let newFollowUps = [];

      // 목업 로직: 질문에 '비용', '단점', '실패' 등의 단어가 들어가면 AI가 서류에 없어서 버벅거림
      if (questionObj.question.includes('비용') || questionObj.question.includes('단점') || questionObj.question.includes('부작용')) {
        isStuttering = true;
        mockDefense = "어... 그 부분은... 솔직히 말씀드리면 현재 제출된 서류상에는 해당 단점이나 비용에 대한 구체적인 대비책이 적혀있지 않습니다... 당시에 성과를 내는 데 집중하다 보니 놓친 것 같습니다. 죄송합니다.";
        
        // 당황했을 때의 꼬리 질문
        newFollowUps = [
          { id: `follow-1-${Date.now()}`, type: "FOLLOW-UP", question: "서류에 적혀있지 않다면, 실제로는 비용 계산을 전혀 안 하고 프로젝트를 진행했다는 뜻인가요?" },
          { id: `follow-2-${Date.now()}`, type: "FOLLOW-UP", question: "그렇다면 지금 이 자리에서 그 기술의 치명적인 단점 1가지와 해결책을 구두로 설명해 보시겠어요?" }
        ];
      } else {
        // 일반적인 방어 성공 시
        isStuttering = false;
        mockDefense = "네, 그 질문에 답변드리겠습니다. 제 이력서 두 번째 프로젝트를 보시면 아시겠지만, 저는 해당 문제를 A라는 기술을 도입하여 해결했습니다. 이 과정에서 유저 이탈률을 20% 감소시키는 성과를 거두었습니다.";
        
        // 방어 성공 시 꼬리 질문
        newFollowUps = [
          { id: `follow-1-${Date.now()}`, type: "FOLLOW-UP", question: "이탈률 20% 감소가 오직 그 기술 덕분이라고 확신할 수 있는 데이터적 근거가 있습니까?" },
          { id: `follow-2-${Date.now()}`, type: "FOLLOW-UP", question: "만약 A 기술이 아니라 B 기술을 썼다면 결과가 어떻게 달랐을까요?" }
        ];
      }

      // AI 답변 채팅창 추가
      setMessages(prev => [...prev, { id: `msg-ai-${Date.now()}`, sender: 'ai', text: mockDefense, isStuttering }]);
      
      // 꼬리 질문 리스트로 업데이트
      setCurrentQuestions(newFollowUps);
      setIsFollowUpMode(true);
      setIsAiDefending(false);

    }, 2500); // 2.5초 대기
  };

  // 3. 다른 핵심 질문으로 돌아가기 기능
  const handleReturnToCore = () => {
    setCurrentQuestions(coreQuestions);
    setIsFollowUpMode(false);
  };

  return (
    <div className="room-container">
      {/* 🏁 헤더 */}
      <header className="room-header">
        <div className="room-logo-btn" onClick={() => navigate('/')}>
          <div className="room-logo-symbol"><span>F1</span></div>
          <div className="room-logo-title">F1ND YOUR WAY</div>
        </div>
        <button 
          className="room-exit-btn"
          onClick={() => {
            if(window.confirm("모의 면접을 종료하시겠습니까? (버벅거렸던 질문들을 중심으로 이력서를 수정해보세요!)")) {
              navigate('/mypage');
            }
          }}
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