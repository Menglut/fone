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
  const [followUpQuestions, setFollowUpQuestions] = useState([]); // 백엔드에서 받아올 꼬리 질문 목록
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [interviewAnswers, setInterviewAnswers] = useState([]);
  
  // 📄 결과물 상태
  const [resultText, setResultText] = useState("");

  const isInitialized = useRef(false);

  // 1️⃣ 초기 인사말 (Step 1)
  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;
    setMessages([
      { id: 'start', sender: 'SYSTEM', text: "✨ AI 자기소개서 컨설팅에 오신 것을 환영합니다." },
      { id: Date.now(), sender: 'AI', expert: CONSULTANT, text: "안녕하세요! 지원자님의 맞춤형 자기소개서를 작성해 드릴게요. 가장 먼저, 지원하시려는 기업의 [채용 공고]나 [자소서 문항]을 채팅창에 복사해서 붙여넣어 주시겠어요?" }
    ]);
  }, []);

  // 스크롤 자동 하단 이동
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAiThinking]);

  const handleInputChange = (e) => {
    setUserInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  // 🗣️ 대화 전송 및 Step 제어 로직
  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!userInput.trim() || isAiThinking) return;

    const currentInput = userInput;
    setMessages(prev => [...prev, { id: Date.now(), sender: 'user', text: currentInput }]);
    setUserInput("");
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setIsAiThinking(true);

    try {
      // 💡 Step 1: 채용 공고 입력받기
      if (currentStep === 1) {
        setJobPost(currentInput);
        setCurrentStep(2);
        setTimeout(() => {
          setMessages(prev => [...prev, { id: Date.now(), sender: 'AI', expert: CONSULTANT, text: "확인했습니다! 다음으로, 이 직무와 관련된 지원자님의 [핵심 경험]이나 [어필하고 싶은 이력]을 형식에 얽매이지 말고 편하게 말씀해 주세요. (키워드 나열도 좋습니다!)" }]);
          setIsAiThinking(false);
        }, 800);
      } 
      // 💡 Step 2: 기본 경험 입력받기 & 꼬리 질문 생성 요청
      else if (currentStep === 2) {
        setBaseExperience(currentInput);
        
        // 백엔드 API 호출: generateFollowupQuestions (llm.js 연동)
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
      // 💡 Step 3: 꼬리 질문 핑퐁
      else if (currentStep === 3) {
        // 유저의 답변 저장
        const currentQ = followUpQuestions[currentQuestionIdx];
        setInterviewAnswers(prev => [...prev, { category: currentQ.category, question: currentQ.text, answer: currentInput }]);

        const nextIdx = currentQuestionIdx + 1;
        // 꼬리 질문(최대 3개로 제한)이 더 남았다면 다음 질문 던지기
        if (nextIdx < Math.min(followUpQuestions.length, 3)) {
          setCurrentQuestionIdx(nextIdx);
          setTimeout(() => {
            setMessages(prev => [...prev, { id: Date.now(), sender: 'AI', expert: CONSULTANT, text: `좋습니다. 다음 질문입니다.\n\n${followUpQuestions[nextIdx].text}` }]);
            setIsAiThinking(false);
          }, 600);
        } else {
          // 질문이 끝났다면 자소서 생성 단계(Step 4)로 이동
          setCurrentStep(4);
          setMessages(prev => [...prev, { id: Date.now(), sender: 'AI', expert: CONSULTANT, text: "충분한 정보가 모였습니다! 지금부터 우측 캔버스에 지원자님만의 에세이를 작성해 보겠습니다. 잠시만 기다려주세요..." }]);
          
          // 백엔드 API 호출: generateCoverLetter (llm.js 연동)
          const resumeData = { experience: baseExperience, interviewAnswers: [...interviewAnswers, { category: currentQ.category, answer: currentInput }] };
          
          const finalRes = await axios.post(`${API_BASE}/api/generate/cover-letter`, {
            resume: resumeData,
            jobPost: jobPost,
            options: { tone: "전문적이고 설득력 있는", length: "1000자", type: "자유형" }
          });

          if (finalRes.data) {
            setResultText(finalRes.data.content || finalRes.data);
            setMessages(prev => [...prev, { id: Date.now(), sender: 'SYSTEM', text: "✨ 자기소개서 생성이 완료되었습니다. 우측에서 직접 수정하거나 복사할 수 있습니다." }]);
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
    <div className="room-container modern-theme">
      {/* 🌟 헤더 */}
      <header className="room-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 32px' }}>
        <div className="room-logo-btn" onClick={() => navigate('/')}>
                  <img 
                    src={mainLogo} 
                    alt="F1ND YOUR WAY 로고" 
                    className="builder-logo-img" 
                  />
                </div>
        
        <div className="modern-step-indicator dark-header-compat">
           <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1e293b' }}>✨ AI 자기소개서 컨설팅</span>
        </div>

        <button className="room-exit-btn" onClick={() => navigate('/mypage')} style={{ backgroundColor: '#111', color: '#fff' }}>
          SAVE & EXIT
        </button>
      </header>

      <main className="modern-layout">
        {/* 🌟 좌측 패널: 채팅 인터페이스 */}
        <section className="modern-chat-section" style={{ width: '50%', borderRight: '1px solid #e2e8f0', background: '#fff' }}>
          <div className="modern-chat-history" style={{ padding: '30px 40px' }}>
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
            <div ref={messagesEndRef} style={{ height: '140px' }} /> 
          </div>

          {/* 하단 플로팅 입력창 */}
          {currentStep < 4 && (
            <div className="floating-input-wrapper">
              <form className="floating-input-box" onSubmit={handleSendMessage} style={{ background: 'rgba(248, 250, 252, 0.95)' }}>
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

        {/* 🌟 우측 섹션: A4 용지 뷰어 및 에디터 */}
        <section className="modern-chat-section" style={{ width: '50%', backgroundColor: '#f1f5f9', padding: '40px 20px', alignItems: 'center', overflowY: 'auto' }}>
          
          <div className="a4-paper-container" style={{ width: '100%', maxWidth: '800px', margin: '0 auto', position: 'relative' }}>
            <div style={{ 
              backgroundColor: '#fff', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', 
              borderRadius: '8px', border: '1px solid #cbd5e1', padding: '60px',
              minHeight: '800px', display: 'flex', flexDirection: 'column'
            }}>
              
              {currentStep === 4 && isAiThinking ? (
                // 로딩 화면
                <div style={{ margin: 'auto', textAlign: 'center', color: '#64748b' }}>
                  <div className="pulse-dot" style={{ width: '24px', height: '24px', backgroundColor: '#db2777', margin: '0 auto 20px' }}></div>
                  <h3 style={{ fontSize: '1.2rem', color: '#1e293b', marginBottom: '8px' }}>대화 내용을 바탕으로 에세이를 작성 중입니다...</h3>
                  <p>이 작업은 약 10~20초 정도 소요될 수 있습니다.</p>
                </div>
              ) : resultText ? (
                // 완성된 결과물 에디터
                <>
                  <h2 style={{ fontSize: '1.4rem', color: '#0f172a', marginBottom: '20px', paddingBottom: '10px', borderBottom: '2px solid #e2e8f0' }}>
                    자기소개서 초안
                  </h2>
                  <textarea 
                    value={resultText}
                    onChange={(e) => setResultText(e.target.value)}
                    style={{ 
                      flex: 1, width: '100%', fontSize: '1.05rem', lineHeight: '2.0', 
                      color: '#334155', border: 'none', resize: 'none', outline: 'none',
                      fontFamily: 'inherit'
                    }}
                  />
                </>
              ) : (
                // 대기 화면 (Step 1~3)
                <div style={{ margin: 'auto', textAlign: 'center', color: '#cbd5e1' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '15px' }}>📝</div>
                  <h2 style={{ fontSize: '1.2rem', fontWeight: '600' }}>좌측에서 컨설턴트와의 대화를 진행해 주세요.</h2>
                  <p style={{ fontSize: '0.9rem', marginTop: '10px' }}>정보가 모두 수집되면 이곳에 자기소개서가 완성됩니다.</p>
                </div>
              )}
            </div>
          </div>

          {/* 결과물 복사 툴바 */}
          {resultText && !isAiThinking && (
            <div className="floating-input-wrapper" style={{ bottom: '40px' }}>
              <div style={{ display: 'flex', gap: '10px', background: 'rgba(255, 255, 255, 0.95)', padding: '10px', borderRadius: '999px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
                <button className="glass-chip" onClick={() => navigator.clipboard.writeText(resultText)} style={{ border: 'none', background: '#1e293b', color: '#fff' }}>
                  📋 전체 복사
                </button>
              </div>
            </div>
          )}

        </section>
      </main>
    </div>
  );
}