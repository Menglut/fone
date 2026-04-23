import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import html2pdf from 'html2pdf.js';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import mermaid from 'mermaid';
import mainLogo from '../assets/logo.png';

import '../css/BuilderPage.css'; 
import '../css/PortfolioEditor.css'; 

const API_BASE = process.env.REACT_APP_API_BASE;

const MermaidViewer = ({ code }) => {
  const ref = useRef(null);
  useEffect(() => {
    if (code && ref.current) {
      const cleanCode = code.replace(/```mermaid\n?/gi, '').replace(/```\n?/g, '').trim();
      try {
        mermaid.initialize({ startOnLoad: false, theme: 'default' });
        mermaid.render(`mermaid-res-${Math.random().toString(36).substr(2, 9)}`, cleanCode)
          .then((result) => { if(ref.current) ref.current.innerHTML = result.svg; })
          .catch((e) => console.error("Mermaid Render Error", e));
      } catch (error) {
        if(ref.current) ref.current.innerHTML = "<p>다이어그램 생성 불가</p>";
      }
    }
  }, [code]);
  return <div ref={ref} className="mermaid-wrapper" />;
};

export default function PortfolioEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const printRef = useRef(null);

  const [isLoading, setIsLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [projects, setProjects] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);

  // ✨ 추가 1: AI 어시스턴트 상태 관리
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatLogs, setChatLogs] = useState([
    { sender: 'SYSTEM', text: '포트폴리오 수정 중 막히는 부분이 있다면 언제든 물어보세요!' }
  ]);

  const userStr = localStorage.getItem('user');
  const userInfo = userStr ? JSON.parse(userStr) : { name: "지원자", email: "" };

  useEffect(() => {
    const fetchPortfolio = async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/portfolio/detail/${id}`);
        if (res.data.success) {
          const doc = res.data.data;
          setTitle(doc.title || "나의 포트폴리오");
          
          let rawData = doc.content || doc.portfolioData;
          if (typeof rawData === 'string') {
            try { rawData = JSON.parse(rawData); } catch(e) { rawData = {}; }
          }

          let extractedProjects = [];
          if (rawData && !Array.isArray(rawData) && Array.isArray(rawData.projects)) {
            extractedProjects = rawContentExtraction(rawData.projects);
          } else if (Array.isArray(rawData)) {
            extractedProjects = rawContentExtraction(rawData);
          }

          setProjects(extractedProjects);
        }
      } catch (error) {
        console.error("데이터 로드 실패:", error);
        alert("데이터를 불러오지 못했습니다.");
      } finally {
        setIsLoading(false);
      }
    };

    const rawContentExtraction = (projectArray) => {
      return projectArray.map(proj => {
        if (proj.troubleshootings && proj.troubleshootings.length > 0) {
          const first = proj.troubleshootings[0];
          return {
            ...proj,
            why: first.why || proj.why || "",
            how: first.how || proj.how || "",
            then: first.then || proj.then || "",
            architectureCode: first.architectureCode || proj.architectureCode || "",
            chartData: first.chartData || proj.chartData || []
          };
        }
        return proj;
      });
    };

    fetchPortfolio();
  }, [id, navigate]);

  const handleInlineEdit = (field, value) => {
    setProjects(prev => {
      const newProjects = [...prev];
      newProjects[currentIdx] = { ...newProjects[currentIdx], [field]: value };
      return newProjects;
    });
  };

  const handleSaveChanges = async () => {
    try {
      await axios.post(`${API_BASE}/api/portfolio`, {
        userId: userInfo.id || userInfo._id || userInfo.email,
        portfolioId: id,
        title: title,
        content: projects 
      });
      alert('성공적으로 수정되었습니다! 🎉');
      navigate('/mypage');
    } catch (error) {
      alert('저장에 실패했습니다.');
    }
  };

  // ✨ 추가 3: PDF 다운로드 옵션 강화 (잘림 현상 방지)
  const handleDownloadPdf = () => {
    const element = printRef.current;
    const opt = {
      margin: [10, 10, 10, 10], // 상, 좌, 하, 우 여백 확보
      filename: `${title}_F1ND.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2, 
        useCORS: true,
        windowWidth: 800 // 캡처 시 가로 너비를 A4 비율에 맞춰 고정 (잘림 방지 핵심)
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] } // 컴포넌트 중간 잘림 방지
    };
    html2pdf().set(opt).from(element).save();
  };

  // 대화창 임시 전송 로직
  const handleSendChat = (e) => {
    e.preventDefault();
    if(!chatInput.trim()) return;
    setChatLogs([...chatLogs, { sender: 'USER', text: chatInput }]);
    setChatInput("");
    // 추후 이 부분에 axios.post 로 AI 답변을 받아오는 로직을 연결하시면 됩니다.
  };

  if (isLoading) return <div style={{textAlign: 'center', marginTop: '100px'}}>변환 중...</div>;

  return (
    <div className="room-container modern-theme" style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
      
      <header className="room-header" style={{ 
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
        padding: '16px 32px', flexShrink: 0, position: 'relative' 
      }}>
        <div className="room-logo-btn" onClick={() => navigate('/')}>
          <img src={mainLogo} alt="로고" className="builder-logo-img" />
        </div>
        
        <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', zIndex: 10 }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <span style={{ position: 'absolute', left: '16px', fontSize: '14px' }}>📝</span>
            <input 
              type="text" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              className="title-pill-input"
              style={{ 
                background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.1)', 
                borderRadius: '999px', color: '#fff', textAlign: 'center', fontSize: '0.95rem',
                width: '320px', padding: '8px 40px', outline: 'none'
              }}
              placeholder="제목 입력"
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button className="room-exit-btn" onClick={handleDownloadPdf} style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: '#fff' }}>📄 PDF</button>
          <button className="room-exit-btn" onClick={handleSaveChanges} style={{ backgroundColor: '#fff', color: '#111' }}>💾 SAVE</button>
        </div>
      </header>

      <main className="modern-layout" style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <aside className="modern-draft-panel" style={{ width: '40%', height: '100%', overflowY: 'auto', borderRight: '1px solid #e2e8f0' }}>
          <div className="draft-header">
            <span className="draft-badge">Edit Mode</span>
            <h2 className="draft-title">내용 수정하기</h2>
          </div>
          
          <div className="draft-scroller">
            {projects.map((proj, idx) => (
              <div key={idx} className={`exp-card ${currentIdx === idx ? 'active-card' : ''}`} onClick={() => setCurrentIdx(idx)} style={{ cursor: 'pointer' }}>
                <h3 className="exp-card-title">Project {idx + 1} {currentIdx === idx && <span className="pulse-dot"></span>}</h3>
                
                {currentIdx === idx && (
                  <div style={{ marginTop: '15px' }}>
                    <div className="draft-input-group active-glow"><label>제목</label><textarea value={proj.title} onChange={(e) => handleInlineEdit('title', e.target.value)} rows={1} /></div>
                    <div className="draft-input-group active-glow" style={{'--accent': '#2563eb'}}><label>기술 스택</label><textarea value={proj.techStack} onChange={(e) => handleInlineEdit('techStack', e.target.value)} /></div>
                    <div className="draft-input-group active-glow" style={{'--accent': '#db2777'}}><label>배경</label><textarea value={proj.why} onChange={(e) => handleInlineEdit('why', e.target.value)} rows={3} /></div>
                    <div className="draft-input-group active-glow" style={{'--accent': '#db2777'}}><label>전략</label><textarea value={proj.how} onChange={(e) => handleInlineEdit('how', e.target.value)} rows={3} /></div>
                    <div className="draft-input-group active-glow" style={{'--accent': '#f59e0b'}}><label>성과</label><textarea value={proj.then} onChange={(e) => handleInlineEdit('then', e.target.value)} rows={3} /></div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </aside>

        <section className="modern-chat-section" style={{ width: '60%', height: '100%', backgroundColor: '#f1f5f9', padding: '40px 20px', overflowY: 'auto' }}>
          <div className="a4-paper-container" style={{ width: '100%', maxWidth: '800px', margin: '0 auto' }}>
            <div className="a4-paper" ref={printRef} style={{ backgroundColor: '#fff', padding: '60px', borderRadius: '8px', boxShadow: '0 20px 50px rgba(0,0,0,0.1)' }}>
              
              <header className="preview-header" style={{ borderBottom: '2px solid #1e40af', paddingBottom: '20px', marginBottom: '30px' }}>
                <h1 style={{ fontSize: '2.2rem', fontWeight: '800', color: '#0f172a' }}>{userInfo.name || '지원자'}</h1>
                <div style={{ color: '#1e40af', fontWeight: '600', marginTop: '5px' }}>AI 역량 추출 포트폴리오</div>
              </header>

              {projects.map((project, idx) => {
                
                // ✨ 추가 2: 차트 데이터 강력 정제 로직 (에러 방지)
                let safeChartData = [];
                try {
                  let rawChart = project.chartData;
                  if (typeof rawChart === 'string' && rawChart.trim() !== '') {
                    rawChart = JSON.parse(rawChart);
                  }
                  // 데이터가 배열이고, name과 value 값을 온전히 가진 객체만 필터링 (최대 5개)
                  if (Array.isArray(rawChart)) {
                    safeChartData = rawChart
                      .filter(item => item && typeof item.name === 'string' && item.value !== undefined)
                      .slice(0, 5); 
                  }
                } catch(e) {
                  console.error("차트 데이터 변환 오류:", e);
                }

                return (
                  <section key={idx} style={{ marginBottom: '50px' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '15px' }}><span style={{ color: '#1e40af' }}>0{idx + 1}.</span> {project.title}</h2>
                    <div style={{ marginBottom: '20px' }}>
                      {project.techStack?.split(',').map((tag, i) => tag.trim() && (
                        <span key={i} style={{ background: '#1e40af', color: '#fff', padding: '4px 10px', borderRadius: '4px', fontSize: '0.85rem', marginRight: '8px', display: 'inline-block' }}>#{tag.trim()}</span>
                      ))}
                    </div>

                    <div style={{ borderLeft: '4px solid #e2e8f0', paddingLeft: '20px' }}>
                      {project.architectureCode && <div style={{ marginBottom: '20px', border: '1px solid #e2e8f0', padding: '15px', borderRadius: '8px' }}><MermaidViewer code={project.architectureCode} /></div>}
                      
                      {/* 필터링된 안전한 데이터만 그래프에 렌더링 */}
                      {safeChartData.length > 0 && (
                        <div style={{ height: '200px', marginBottom: '20px' }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={safeChartData}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                              <XAxis dataKey="name" fontSize={12}/>
                              <Tooltip/>
                              <Area type="monotone" dataKey="value" stroke="#1e40af" fill="#1e40af" fillOpacity={0.1}/>
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      )}

                      <div style={{ lineHeight: '1.8', fontSize: '1rem' }}>
                        <p><strong>배경:</strong> {project.why}</p>
                        <p><strong>전략:</strong> {project.how}</p>
                        <p style={{ fontWeight: 'bold', color: '#1e40af' }}><strong>성과:</strong> {project.then}</p>
                      </div>
                    </div>
                  </section>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      {/* ✨ 추가 1: 플로팅 AI 어시스턴트 창 */}
      <div style={{ position: 'fixed', bottom: '30px', right: '30px', zIndex: 999 }}>
        {isAssistantOpen ? (
          <div style={{ width: '350px', height: '450px', backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
            <div style={{ padding: '15px', backgroundColor: '#1e40af', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 'bold' }}>🤖 전문가 어시스턴트</span>
              <button onClick={() => setIsAssistantOpen(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer' }}>✖</button>
            </div>
            
            <div style={{ flex: 1, padding: '15px', overflowY: 'auto', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {chatLogs.map((chat, i) => (
                <div key={i} style={{ alignSelf: chat.sender === 'USER' ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '4px', textAlign: chat.sender === 'USER' ? 'right' : 'left' }}>{chat.sender}</div>
                  <div style={{ padding: '10px 14px', borderRadius: '12px', backgroundColor: chat.sender === 'USER' ? '#2563eb' : '#e2e8f0', color: chat.sender === 'USER' ? '#fff' : '#1e293b', fontSize: '0.9rem', lineHeight: '1.4' }}>
                    {chat.text}
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={handleSendChat} style={{ display: 'flex', borderTop: '1px solid #e2e8f0', padding: '10px', backgroundColor: '#fff' }}>
              <input 
                type="text" 
                value={chatInput} 
                onChange={(e) => setChatInput(e.target.value)} 
                placeholder="도움이 필요하신가요?" 
                style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '20px', padding: '8px 15px', outline: 'none' }}
              />
              <button type="submit" style={{ marginLeft: '8px', backgroundColor: '#1e40af', color: '#fff', border: 'none', borderRadius: '50%', width: '35px', height: '35px', cursor: 'pointer' }}>↑</button>
            </form>
          </div>
        ) : (
          <button 
            onClick={() => setIsAssistantOpen(true)}
            style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: '#1e40af', color: '#fff', border: 'none', boxShadow: '0 4px 15px rgba(30, 64, 175, 0.4)', fontSize: '1.5rem', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
          >
            💬
          </button>
        )}
      </div>

    </div>
  );
}