import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import '../css/BuilderPage.css';
import axios from 'axios';

const API_BASE = "http://localhost:5000";

// 1. 전문가 페르소나 설정
const EXPERTS = {
  TECH: { id: 'TECH', name: "CTO (기술)", icon: "💻", color: "#2563eb", role: "기술 스택 및 로직 검증" },
  DESIGN: { id: 'DESIGN', name: "UX 디자이너", icon: "🎨", color: "#db2777", role: "사용자 경험 및 시각화" },
  HR: { id: 'HR', name: "인사팀장", icon: "🤝", color: "#f59e0b", role: "성과 지표 및 협업 역량" }
};

export default function BuilderPage() {
  const navigate = useNavigate();
  
  // 채팅 관련 상태
  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState("");
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [chatStep, setChatStep] = useState(1);
  const messagesEndRef = useRef(null);

  // 💡 여러 개의 프로젝트를 담을 수 있는 배열 상태
  const [projects, setProjects] = useState([{
    title: "",
    techStack: "",
    problemSolving: "",
    impact: ""
  }]);
  
  // 현재 몇 번째 프로젝트에 대해 대화 중인지 기억하는 인덱스
  const [currentIdx, setCurrentIdx] = useState(0); 
  
  // 현재 로그인한 유저 정보 가져오기
  const getUserInfo = () => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  };

  // 초기 입장 메시지
  useEffect(() => {
    setMessages([
      { 
        id: 'start', sender: 'system', 
        text: "전문가 단톡방에 입장하셨습니다. 프로젝트 경험을 말씀해 주시면 저희가 포트폴리오를 완성해 드릴게요!" 
      },
      { 
        id: 'hr-1', sender: 'HR', expert: EXPERTS.HR,
        text: "반갑습니다! 첫 번째로 진행하신 프로젝트 중 가장 애착이 가는 건 무엇인가요? 프로젝트의 핵심 목표도 궁금합니다!" 
      }
    ]);
  }, []);

  // 채팅 자동 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAiThinking]);

  // 💡 전문가 대화 시뮬레이션 및 데이터 업데이트 로직
  const simulateExpertDiscussion = (input) => {
    setIsAiThinking(true);
    
    setTimeout(() => {
      let newMessages = [];

      // 현재 진행 중인 프로젝트 서랍(객체)만 골라서 업데이트하는 헬퍼 함수
      const updateCurrentProject = (updates) => {
        setProjects(prev => {
          const newProjects = [...prev];
          newProjects[currentIdx] = { ...newProjects[currentIdx], ...updates };
          return newProjects;
        });
      };

      // 💬 [1단계] 프로젝트 개요
      if (chatStep === 1) {
        updateCurrentProject({ title: input.length > 15 ? input.substring(0, 15) + "..." : input });
        newMessages = [
          { id: `tech-${Date.now()}`, sender: 'TECH', expert: EXPERTS.TECH, text: `오, 흥미로운 프로젝트군요! 개발자 입장에서 어떤 기술 스택을 사용했고, 데이터 처리는 어떻게 하셨나요?` },
          { id: `design-${Date.now() + 1}`, sender: 'DESIGN', expert: EXPERTS.DESIGN, text: `잠깐만요! 기술도 중요하지만, 그 과정에서 사용자가 가장 불편해했던 지점은 무엇이었나요? 디자인적으로 어떻게 해결하셨는지 궁금해요.` }
        ];
        setChatStep(2);

      // 💬 [2단계] 기술 & UX/UI
      } else if (chatStep === 2) {
        // 실제 구현 시 백엔드 AI 분석 결과가 들어갈 자리입니다.
        updateCurrentProject({
          techStack: input.includes('React') ? 'React, Firebase 기반 데이터 동기화' : '사용 기술 스택 분석 완료',
          problemSolving: '사용자 불편사항 개선 및 직관적 UI 적용'
        });
        newMessages = [
          { id: `tech-${Date.now()}`, sender: 'TECH', expert: EXPERTS.TECH, text: `그렇군요! 상태 동기화 과정에서 렌더링 최적화는 어떻게 고려하셨는지 더 듣고 싶지만...` },
          { id: `hr-${Date.now() + 1}`, sender: 'HR', expert: EXPERTS.HR, text: `두 분 다 진정하시고요. 훌륭한 접근이네요! 그렇다면 그 UI 개편과 기술 도입으로 인해 실제 사용자들이나 동아리원들의 반응(성과)은 어땠나요? 수치화할 수 있는 결과가 있다면 더 좋습니다.` }
        ];
        setChatStep(3);

      // 💬 [3단계] 성과 (1차 완료 및 추가 선택지 제공)
      } else if (chatStep === 3) {
        updateCurrentProject({ impact: "수작업 대비 운영 효율화 달성 및 긍정적 피드백 도출" });
        newMessages = [
          { id: `hr-${Date.now()}`, sender: 'HR', expert: EXPERTS.HR, text: `아주 돋보이는 성과네요! 혹시 이 프로젝트에서 더 어필할 에피소드가 있나요?` },
          { id: `system-${Date.now() + 1}`, sender: 'system', text: `💡 더 어필할 내용이 없다면 "끝", 새로운 프로젝트를 추가하려면 "다른 프로젝트"라고 입력해 주세요.` }
        ];
        setChatStep(4);

      // 💬 [4단계] 분기점 (무한 루프 vs 새 프로젝트 추가 vs 종료)
      } else {
        const isEndingWord = /(없습|없어|끝|마무리|그만|충분)/.test(input);
        const isNewProjectWord = /(다른|새로운|하나 더|추가|다음)/.test(input);

        // 🟢 1. 다른 프로젝트 추가하기
        if (isNewProjectWord) {
          setProjects(prev => [...prev, { title: "", techStack: "", problemSolving: "", impact: "" }]);
          setCurrentIdx(prev => prev + 1);
          setChatStep(1); // 다시 1단계로 리셋!
          
          newMessages = [
            { id: `hr-${Date.now()}`, sender: 'HR', expert: EXPERTS.HR, text: `좋습니다! 포트폴리오가 훨씬 풍성해지겠네요. 두 번째 프로젝트는 어떤 경험인가요? 핵심 목표와 함께 말씀해 주세요!` }
          ];
        
        // 🔴 2. 대화 완전히 종료하기
        } else if (isEndingWord) {
          newMessages = [
            { id: `hr-${Date.now()}`, sender: 'HR', expert: EXPERTS.HR, text: `알겠습니다! 총 ${projects.length}개의 프로젝트가 훌륭하게 정리되었네요. 고생 많으셨습니다!` },
            { id: `system-${Date.now() + 1}`, sender: 'system', text: `💡 대화가 종료되었습니다. 우측 상단의 [FINISH & VIEW RESULT] 버튼을 눌러 결과물을 확인하세요.` }
          ];
          setChatStep(99); // 대화 완전 종료
        
        // 🟡 3. 현재 프로젝트에 대해 계속 이야기하기 (무한 루프)
        } else {
          newMessages = [
            { id: `design-${Date.now()}`, sender: 'DESIGN', expert: EXPERTS.DESIGN, text: `오, 그런 디테일이 숨어있었군요! 포트폴리오에 그 부분도 잘 녹여내겠습니다. 혹시 또 추가할 내용이 있나요? 아니면 "다른 프로젝트"로 넘어갈까요?` }
          ];
        }
      }

      setMessages(prev => [...prev, ...newMessages]);
      setIsAiThinking(false);
    }, 1500);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!userInput.trim() || isAiThinking || chatStep === 99) return; // 99단계(종료)면 입력 방지

    const userMsg = { id: Date.now(), sender: 'user', text: userInput };
    setMessages(prev => [...prev, userMsg]);
    
    simulateExpertDiscussion(userInput);
    setUserInput("");
  };

  // 🚀 완성된 프로젝트 배열(projects)을 들고 결과 페이지로 이동!
  const handleGoToResult = () => {
    if (!projects[0].title) {
      alert("최소한 한 개의 프로젝트 이름은 언급해 주세요!");
      return;
    }
    if (!window.confirm("대화를 종료하고 완성된 결과물을 확인하시겠습니까?")) return;

    navigate('/interview/result', { 
      state: { portfolioData: projects } // 배열을 통째로 넘깁니다!
    });
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
        title: `포트폴리오 빌더 채팅 기록 (${new Date().toLocaleDateString()})`,
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
        
        {/* 🔵 좌측: 실시간 포트폴리오 프리뷰 (배열 매핑) */}
        <aside className="room-attack-panel">
          <div className="panel-header">
            <span className="panel-chip" style={{ color: EXPERTS.TECH.color }}>LIVE DRAFTING...</span>
            <h2 className="panel-title">포트폴리오 초안</h2>
          </div>
          <div className="question-list-scroller" style={{ padding: '25px' }}>
            
            {projects.map((proj, idx) => (
              <div key={idx} style={{ marginBottom: '40px', borderBottom: idx !== projects.length - 1 ? '2px dashed #e2e8f0' : 'none', paddingBottom: '20px' }}>
                <h3 style={{ fontSize: '1.2rem', color: '#0f172a', marginBottom: '15px', fontFamily: 'Oswald, sans-serif' }}>
                  🚩 PROJECT {idx + 1}
                </h3>
                
                <div className="draft-section">
                  <h4 style={{ color: EXPERTS.TECH.color }}>[프로젝트 이름]</h4>
                  <p>{proj.title || "대화가 시작되면 작성됩니다."}</p>
                </div>
                
                <div className="draft-section" style={{ marginTop: '15px' }}>
                  <h4 style={{ color: EXPERTS.TECH.color }}>[개발 및 기술 스택]</h4>
                  <p>{proj.techStack || "질문에 답변해 주세요."}</p>
                </div>
                
                <div className="draft-section" style={{ marginTop: '15px' }}>
                  <h4 style={{ color: EXPERTS.DESIGN.color }}>[UX/UI 해결 방안]</h4>
                  <p>{proj.problemSolving || "질문에 답변해 주세요."}</p>
                </div>
                
                <div className="draft-section" style={{ marginTop: '15px' }}>
                  <h4 style={{ color: EXPERTS.HR.color }}>[핵심 성과]</h4>
                  <p>{proj.impact || "답변을 기다리고 있습니다."}</p>
                </div>
              </div>
            ))}
            
          </div>
        </aside>

        {/* 💬 우측: 전문가 단톡방 */}
        <section className="room-sim-display">
          <div className="sim-chat-history">
            {messages.map((msg) => (
              <div key={msg.id} className={`msg-wrap ${msg.sender === 'user' ? 'user' : (msg.sender === 'system' ? 'system' : 'ai')}`}>
                
                {msg.sender !== 'user' && msg.sender !== 'system' && (
                  <div className="ai-avatar-icon" style={{ borderColor: msg.expert.color }}>
                    {msg.expert.icon}
                  </div>
                )}
                
                <div className={msg.sender === 'user' ? 'msg-wrap user' : (msg.sender === 'system' ? 'msg-wrap system' : 'ai-bubble-wrap')}>
                  {msg.expert && <span className="ai-name" style={{ color: msg.expert.color, fontSize: '0.8rem', marginBottom: '4px', display: 'block' }}>{msg.expert.name}</span>}
                  
                  <div className={msg.sender === 'user' ? 'user-bubble' : (msg.sender === 'system' ? 'system-bubble' : 'ai-bubble')}>
                    {msg.text}
                  </div>
                </div>
              </div>
            ))}
            
            {isAiThinking && (
              <div className="defense-loading">
                <span className="defense-dot"></span>
                <span className="defense-dot"></span>
                <span className="defense-dot"></span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form className="chat-input-area" onSubmit={handleSendMessage}>
            <input 
              type="text" 
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder={chatStep === 99 ? "대화가 종료되었습니다." : "전문가들의 질문에 답변하세요..."}
              disabled={chatStep === 99}
              autoFocus
            />
            <button type="submit" className="room-exit-btn" style={{ background: chatStep === 99 ? '#94a3b8' : '#E10600', borderColor: chatStep === 99 ? '#94a3b8' : '#E10600' }} disabled={chatStep === 99}>SEND</button>
          </form>
        </section>
        
      </main>
    </div>
  );
}