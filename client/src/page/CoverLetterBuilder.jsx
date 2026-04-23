import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../css/BuilderPage.css';
import mainLogo from '../assets/logo.png';

const API_BASE = process.env.REACT_APP_API_BASE;

// AI 컨설턴트 페르소나
const CONSULTANT = { name: "AI 컨설턴트", icon: "👩‍💼", color: "#db2777" };

export default function CoverLetterBuilder() {
  const navigate = useNavigate();
  
  // 💬 대화 및 진행 상태 관리
  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState("");
  const [isAiThinking, setIsAiThinking] = useState(false);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // 📝 자소서 생성용 데이터 상태
  const [currentStep, setCurrentStep] = useState(1);
  const [jobPost, setJobPost] = useState("");
  const [baseExperience, setBaseExperience] = useState("");
  const [followUpQuestions, setFollowUpQuestions] = useState([]); 
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [interviewAnswers, setInterviewAnswers] = useState([]);
  
  // 📄 결과물 상태
  const [resultText, setResultText] = useState("");
  const isInitialized = useRef(false);

  const resultTextareaRef = useRef(null);

  // ✨ 수정된 높이 계산 로직: 렌더링 타이밍 문제를 잡기 위해 setTimeout 적용
  useEffect(() => {
    if (resultTextareaRef.current) {
      setTimeout(() => {
        if (resultTextareaRef.current) {
          resultTextareaRef.current.style.height = 'auto'; 
          resultTextareaRef.current.style.height = `${resultTextareaRef.current.scrollHeight}px`;
        }
      }, 0);
    }
  }, [resultText]);

  const handleSaveAndExit = async () => {
    // 1. 만들어진 자기소개서가 없으면 그냥 대시보드로 나갑니다.
    if (!resultText) {
      return navigate('/mypage');
    }

    // ✨ 2. 추가된 부분: 사용자에게 저장할 제목을 물어봅니다.
    const customTitle = window.prompt(
      "저장할 자기소개서의 제목을 입력해주세요.", 
      "AI 자기소개서 초안" // 입력창에 미리 적혀있을 기본값
    );

    // ✨ 3. 사용자가 팝업창에서 '취소'를 누르면 저장을 중단하고 화면에 남습니다.
    if (customTitle === null) {
      return; 
    }

    // ✨ 4. 실수로 제목을 다 지우고 '확인'을 눌렀을 경우를 대비한 안전 장치
    const finalTitle = customTitle.trim() === "" ? "이름 없는 자기소개서" : customTitle;

    try {
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      const userId = user ? (user.id || user._id || user.email) : 'guest';

      // 5. 백엔드로 데이터 전송
      await axios.post(`${API_BASE}/api/resume`, {
        userId,
        title: finalTitle, // ✨ 고정된 이름 대신, 방금 정한 제목(finalTitle)을 보냅니다!
        content: resultText
      });

      alert(`[${finalTitle}] (이)가 성공적으로 저장되었습니다!`);
      navigate('/mypage');
    } catch (error) {
      console.error('저장 실패:', error);
      alert('저장 중 오류가 발생했습니다. 글이 날아가지 않게 본문을 직접 복사해 두시기 바랍니다.');
    }
  };

  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;
    setMessages([
      { id: 'start', sender: 'SYSTEM', text: "✨ AI 자기소개서 컨설팅에 오신 것을 환영합니다." },
      { id: Date.now(), sender: 'AI', expert: CONSULTANT, text: "안녕하세요! 지원자님의 맞춤형 자기소개서를 작성해 드릴게요. 가장 먼저, 지원하시려는 기업의 [채용 공고]나 [자소서 문항]을 채팅창에 복사해서 붙여넣어 주시겠어요?" }
    ]);
  }, []);

  useEffect(() => {
      if (!isAiThinking && currentStep < 4 && textareaRef.current) {
        textareaRef.current.focus();
      }
    }, [isAiThinking, currentStep]);

  const handleInputChange = (e) => {
    setUserInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!userInput.trim() || isAiThinking) return;

    const currentInput = userInput;
    setMessages(prev => [...prev, { id: Date.now(), sender: 'user', text: currentInput }]);
    setUserInput("");
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setIsAiThinking(true);

    try {
      if (currentStep === 1) {
        setJobPost(currentInput);
        setCurrentStep(2);
        setTimeout(() => {
          setMessages(prev => [...prev, { id: Date.now(), sender: 'AI', expert: CONSULTANT, text: "확인했습니다! 다음으로, 이 직무와 관련된 지원자님의 [핵심 경험]이나 [어필하고 싶은 이력]을 형식에 얽매이지 말고 편하게 말씀해 주세요. (키워드 나열도 좋습니다!)" }]);
          setIsAiThinking(false);
        }, 800);
      } 
      else if (currentStep === 2) {
        setBaseExperience(currentInput);
        
        const res = await axios.post(`${API_BASE}/api/generate/followup`, {
          experienceText: currentInput,
          companyQuestion: jobPost
        });

        if (res.data && res.data.questions) {
          const questions = res.data.questions;
          setFollowUpQuestions(questions);
          setCurrentStep(3);
          
          setMessages(prev => [...prev, 
            { id: Date.now(), sender: 'SYSTEM', text: "경험 분석을 바탕으로 꼬리 질문을 시작합니다." },
            { id: Date.now() + 1, sender: 'AI', expert: CONSULTANT, text: `조금 더 구체적인 내용을 위해 몇 가지 질문을 드릴게요. 첫 번째 질문입니다.\n\n${questions[0].text}` }
          ]);
        }
        setIsAiThinking(false);
      }
      else if (currentStep === 3) {
        const currentQ = followUpQuestions[currentQuestionIdx];
        setInterviewAnswers(prev => [...prev, { category: currentQ.category, question: currentQ.text, answer: currentInput }]);

        const nextIdx = currentQuestionIdx + 1;
        if (nextIdx < Math.min(followUpQuestions.length, 3)) {
          setCurrentQuestionIdx(nextIdx);
          setTimeout(() => {
            setMessages(prev => [...prev, { id: Date.now(), sender: 'AI', expert: CONSULTANT, text: `좋습니다. 다음 질문입니다.\n\n${followUpQuestions[nextIdx].text}` }]);
            setIsAiThinking(false);
          }, 600);
        } else {
          setCurrentStep(4);
          setMessages(prev => [...prev, { id: Date.now(), sender: 'AI', expert: CONSULTANT, text: "충분한 정보가 모였습니다! 지금부터 우측 캔버스에 지원자님만의 에세이를 작성해 보겠습니다. 잠시만 기다려주세요..." }]);
          
          const resumeData = { experience: baseExperience, interviewAnswers: [...interviewAnswers, { category: currentQ.category, answer: currentInput }] };
          
          const finalRes = await axios.post(`${API_BASE}/api/generate/cover-letter`, {
            resume: resumeData,
            jobPost: jobPost,
            options: { tone: "전문적이고 설득력 있는", length: "1000자", type: "자유형" }
          });

          if (finalRes.data) {
            setResultText(finalRes.data.content || finalRes.data);
            setMessages(prev => [...prev, { id: Date.now(), sender: 'SYSTEM', text: "✨ 자기소개서 생성이 완료되었습니다. 우측에서 직접 수정할 수 있습니다." }]);
          }
          setIsAiThinking(false);
        }
      }
    } catch (error) {
      console.error("AI 챗 통신 오류:", error);
      setMessages(prev => [...prev, { id: Date.now(), sender: 'SYSTEM', text: "서버와의 통신 중 오류가 발생했습니다." }]);
      setIsAiThinking(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    // ✨ 메인 컨테이너에 화면 꽉 차게(100vh) 설정하고 외부 스크롤을 막습니다(overflow: hidden).
    <div className="room-container modern-theme" style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      
      {/* 🌟 헤더 (고정 영역) */}
      <header className="room-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 32px', flexShrink: 0 }}>
        <div className="room-logo-btn" onClick={() => navigate('/')}>
          <img 
            src={mainLogo} 
            alt="F1ND YOUR WAY 로고" 
            className="builder-logo-img" 
          />
        </div>

        <button className="room-exit-btn" onClick={handleSaveAndExit} style={{ backgroundColor: '#111', color: '#fff' }}>
          SAVE & EXIT
        </button>
      </header>

      {/* ✨ 메인 레이아웃: 좌/우 패널이 남은 높이를 꽉 채우도록 수정 */}
      <main className="modern-layout" style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        
        {/* 🌟 좌측 패널: 채팅 인터페이스 */}
        <section className="modern-chat-section" style={{ width: '50%', height: '100%', borderRight: '1px solid #e2e8f0', background: '#fff', display: 'flex', flexDirection: 'column' }}>
          
          {/* 채팅 내역 영역 (flex: 1 로 남은 공간 모두 차지) */}
          <div className="modern-chat-history" style={{ padding: '30px 40px', overflowY: 'auto', flex: 1 }}>
            {messages.map((msg) => (
              <div key={msg.id} className={`chat-row ${msg.sender === 'user' ? 'row-user' : 'row-ai'}`}>
                {msg.sender !== 'user' && msg.sender !== 'SYSTEM' && msg.expert && (
                  <div className="expert-avatar" style={{ background: msg.expert.color }}>{msg.expert.icon}</div>
                )}
                <div className="chat-content" style={{ maxWidth: '85%' }}>
                  {msg.expert && msg.sender !== 'user' && <span className="expert-name" style={{ color: msg.expert.color }}>{msg.expert.name}</span>}
                  <div className={`chat-bubble ${msg.sender === 'user' ? 'bubble-user' : (msg.sender === 'SYSTEM' ? 'bubble-system' : 'bubble-ai')}`} style={{ whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
                    {msg.text}
                  </div>
                </div>
              </div>
            ))}
            {isAiThinking && (
              <div className="chat-row row-ai">
                <div className="chat-bubble bubble-ai typing-indicator"><span></span><span></span><span></span></div>
              </div>
            )}
            <div ref={messagesEndRef} style={{ height: '40px' }} /> 
          </div>

          {/* ✨ 수정된 입력창 영역: absolute(띄우기) 대신 flex-shrink: 0 으로 바닥에 고정 */}
          {currentStep < 4 && (
            <div style={{ padding: '20px 40px', borderTop: '1px solid #e2e8f0', background: '#fff', flexShrink: 0 }}>
              <form className="floating-input-box" onSubmit={handleSendMessage} style={{ background: '#f8fafc', margin: 0, width: '100%' }}>
                <textarea 
                  ref={textareaRef}
                  value={userInput} 
                  onChange={handleInputChange} 
                  onKeyDown={handleKeyDown}
                  placeholder={currentStep === 1 ? "채용 공고 내용을 붙여넣어 주세요..." : "편하게 답변을 입력하세요... (Shift + Enter로 줄바꿈)"}
                  disabled={isAiThinking}
                  rows={1}
                />
                <button type="button" className="send-circle-btn" disabled={isAiThinking || !userInput.trim()} onClick={handleSendMessage}>↑</button>
              </form>
            </div>
          )}
        </section>

        {/* 🌟 우측 섹션: A4 용지 뷰어 (이 영역만 자체 스크롤) */}
        <section className="modern-chat-section" style={{ width: '50%', height: '100%', backgroundColor: '#f1f5f9', padding: '40px 20px', overflowY: 'auto' }}>
          
          <div className="a4-paper-container" style={{ width: '100%', maxWidth: '800px', margin: '0 auto', position: 'relative' }}>
            <div style={{ 
              backgroundColor: '#fff', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', 
              borderRadius: '8px', border: '1px solid #cbd5e1', 
              padding: '60px 60px 100px 60px',
              minHeight: '800px', display: 'flex', flexDirection: 'column'
            }}>
              
              {currentStep === 4 && isAiThinking ? (
                <div style={{ margin: 'auto', textAlign: 'center', color: '#64748b' }}>
                  <div className="pulse-dot" style={{ width: '24px', height: '24px', backgroundColor: '#db2777', margin: '0 auto 20px' }}></div>
                  <h3 style={{ fontSize: '1.2rem', color: '#1e293b', marginBottom: '8px' }}>대화 내용을 바탕으로 에세이를 작성 중입니다...</h3>
                  <p>이 작업은 약 10~20초 정도 소요될 수 있습니다.</p>
                </div>
              ) : resultText ? (
                <>
                  <h2 style={{ fontSize: '1.4rem', color: '#0f172a', marginBottom: '20px', paddingBottom: '10px', borderBottom: '2px solid #e2e8f0' }}>
                    자기소개서 초안
                  </h2>
                  
                  {/* ✨ flex: 1을 제거하고 높이 자동 계산에만 의존하게 수정 */}
                  <textarea 
                    ref={resultTextareaRef}
                    value={resultText}
                    onChange={(e) => {
                      setResultText(e.target.value);
                      e.target.style.height = 'auto';
                      e.target.style.height = `${e.target.scrollHeight}px`;
                    }}
                    style={{ 
                      width: '100%', minHeight: '500px', fontSize: '1.05rem', lineHeight: '2.0', 
                      color: '#334155', border: 'none', resize: 'none', outline: 'none',
                      fontFamily: 'inherit', overflow: 'hidden'
                    }}
                  />
                </>
              ) : (
                <div style={{ margin: 'auto', textAlign: 'center', color: '#cbd5e1' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '15px' }}>📝</div>
                  <h2 style={{ fontSize: '1.2rem', fontWeight: '600' }}>좌측에서 컨설턴트와의 대화를 진행해 주세요.</h2>
                  <p style={{ fontSize: '0.9rem', marginTop: '10px' }}>정보가 모두 수집되면 이곳에 자기소개서가 완성됩니다.</p>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}