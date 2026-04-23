import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import mermaid from 'mermaid';
import mainLogo from '../assets/logo.png';

import '../css/BuilderPage.css';
import '../css/PortfolioEditor.css';

const API_BASE = process.env.REACT_APP_API_BASE;

const THEMES = {
  modern: {
    bg: '#f1f5f9', paperBg: '#ffffff', text: '#1e293b', textSub: '#64748b',
    accent: '#1e40af', border: '#e2e8f0', shadow: '0 20px 50px rgba(0,0,0,0.1)',
    tagBg: '#1e40af', tagText: '#ffffff', mermaidTheme: 'default'
  },
  dark: {
    bg: '#0a0a0a', paperBg: '#141414', text: '#f3f4f6', textSub: '#9ca3af',
    accent: '#e10600', border: '#2a2a2a', shadow: '0 20px 50px rgba(225,6,0,0.15)',
    tagBg: '#e10600', tagText: '#ffffff', mermaidTheme: 'dark'
  },
  minimal: {
    bg: '#ffffff', paperBg: '#ffffff', text: '#000000', textSub: '#555555',
    accent: '#000000', border: '#000000', shadow: 'none',
    tagBg: '#000000', tagText: '#ffffff', mermaidTheme: 'neutral'
  }
};

const MermaidViewer = ({ code, themeMode }) => {
  const ref = useRef(null);
  useEffect(() => {
    if (code && ref.current) {
      const cleanCode = code.replace(/```mermaid\n?/gi, '').replace(/```\n?/g, '').trim();
      try {
        mermaid.initialize({
          startOnLoad: false,
          theme: themeMode,
          flowchart: { useMaxWidth: true, htmlLabels: true }
        });
        mermaid.render(`mermaid-res-${Math.random().toString(36).substr(2, 9)}`, cleanCode)
          .then((result) => {
            if (ref.current) {
              ref.current.innerHTML = result.svg;
              const svgEl = ref.current.querySelector('svg');
              if (svgEl) {
                svgEl.style.width = '100%';
                svgEl.style.height = '100%';
                svgEl.style.maxHeight = '100%';
              }
            }
          })
          .catch((e) => console.error("Mermaid Render Error", e));
      } catch (error) {
        if (ref.current) ref.current.innerHTML = "<p>다이어그램 생성 불가</p>";
      }
    }
  }, [code, themeMode]);
  return <div ref={ref} style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }} />;
};

export default function PortfolioEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [title, setTitle] = useState("");

  const [profile, setProfile] = useState({
    name: '', jobTitle: 'AI 역량 추출 포트폴리오', email: '',
    intro: '해당 문서는 AI 전문가 패널과의 심층 대화를 통해 추출된 핵심 경험 및 트러블슈팅 리포트입니다.'
  });
  const [projects, setProjects] = useState([]);

  const [currentIdx, setCurrentIdx] = useState(-1);
  const [theme, setTheme] = useState('modern');

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
            try { rawData = JSON.parse(rawData); } catch (e) { rawData = {}; }
          }

          if (rawData && rawData.profile) {
            setProfile({
              name: rawData.profile.name || userInfo.name,
              jobTitle: rawData.profile.jobTitle || 'AI 역량 추출 포트폴리오',
              email: rawData.profile.email || userInfo.email,
              intro: rawData.profile.intro || '해당 문서는 AI 전문가 패널과의 심층 대화를 통해 추출된 핵심 경험 및 트러블슈팅 리포트입니다.'
            });
          } else {
            setProfile(prev => ({ ...prev, name: userInfo.name, email: userInfo.email }));
          }

          let extractedProjects = [];
          if (rawData && !Array.isArray(rawData) && Array.isArray(rawData.projects)) {
            extractedProjects = rawContentExtraction(rawData.projects);
          } else if (Array.isArray(rawData)) {
            extractedProjects = rawContentExtraction(rawData);
          }

          setProjects(extractedProjects.length > 0 ? extractedProjects : [getEmptyProject()]);
        }
      } catch (error) {
        console.error("데이터 로드 실패:", error);
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
    // eslint-disable-next-line
  }, [id, navigate]);

  const getEmptyProject = () => ({
    title: "", techStack: "", why: "", how: "", then: "", architectureCode: "", chartData: []
  });

  const handleProfileEdit = (field, value) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const handleInlineEdit = (field, value) => {
    setProjects(prev => {
      const newProjects = [...prev];
      newProjects[currentIdx] = { ...newProjects[currentIdx], [field]: value };
      return newProjects;
    });
  };

  const handleAddProject = () => {
    setProjects(prev => [...prev, getEmptyProject()]);
    setCurrentIdx(projects.length);
  };

  const handleDeleteProject = (index, e) => {
    e.stopPropagation();
    if (window.confirm("이 프로젝트를 삭제하시겠습니까?")) {
      const newProjects = projects.filter((_, i) => i !== index);
      setProjects(newProjects.length > 0 ? newProjects : [getEmptyProject()]);
      setCurrentIdx(-1);
    }
  };

  const handleSaveChanges = async () => {
    try {
      await axios.post(`${API_BASE}/api/portfolio`, {
        userId: userInfo.id || userInfo._id || userInfo.email,
        portfolioId: id,
        title: title,
        content: { profile, projects }
      });
      alert('성공적으로 수정되었습니다!');
      navigate('/mypage');
    } catch (error) {
      alert('저장에 실패했습니다.');
    }
  };

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);

    await new Promise(resolve => setTimeout(resolve, 600));

    try {
      const slides = document.querySelectorAll('#portfolio-content .portfolio-slide');
      if (!slides || slides.length === 0) {
        setIsGeneratingPdf(false);
        return;
      }

      const firstSlide = slides[0];
      const slideRect = firstSlide.getBoundingClientRect();
      const pxWidth = slideRect.width;
      const pxHeight = slideRect.height;

      const pdf = new jsPDF({
        orientation: pxWidth > pxHeight ? 'landscape' : 'portrait',
        unit: 'px',
        format: [pxWidth, pxHeight],
        hotfixes: ['px_scaling']
      });

      for (let i = 0; i < slides.length; i++) {
        const slide = slides[i];

        const canvas = await html2canvas(slide, {
          scale: 2,
          useCORS: true,
          scrollX: 0,
          scrollY: 0,
          width: slideRect.width,
          height: slideRect.height,
          windowWidth: slideRect.width,
          windowHeight: slideRect.height,
          backgroundColor: null
        });

        const imgData = canvas.toDataURL('image/jpeg', 1.0);

        if (i > 0) pdf.addPage([pxWidth, pxHeight]);

        pdf.addImage(imgData, 'JPEG', 0, 0, pxWidth, pxHeight);
      }

      pdf.save(`${title || '포트폴리오'}_F1ND.pdf`);
    } catch (err) {
      console.error('PDF 생성 오류:', err);
      alert('PDF 생성 중 오류가 발생했습니다.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleSendChat = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    setChatLogs([...chatLogs, { sender: 'USER', text: chatInput }]);
    setChatInput("");
  };

  if (isLoading) return <div style={{ textAlign: 'center', marginTop: '100px' }}>변환 중...</div>;
  const currentTheme = THEMES[theme];

  const slideStyle = {
    width: '297mm',
    height: '209mm',
    backgroundColor: currentTheme.paperBg,
    color: currentTheme.text,
    boxShadow: isGeneratingPdf ? 'none' : currentTheme.shadow,
    border: theme === 'minimal' ? '1px solid #000' : 'none',
    padding: '40px 50px',
    marginBottom: isGeneratingPdf ? '0px' : '30px',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    transformOrigin: 'top left',
    zoom: isGeneratingPdf ? '1' : '0.85',
    overflow: 'hidden'
  };

  return (
    <div
      /* ✨ 핵심 수정 1: 최상위 태그에 theme-${theme} 클래스를 주입하여 CSS 변수 연동 */
      className={`room-container theme-${theme}`}
      style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}
    >

      <header
        className="room-header"
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 32px', flexShrink: 0, position: 'relative', borderBottom: '1px solid #e2e8f0' }}
      >
        <div className="room-logo-btn" onClick={() => navigate('/')}>
          <img src={mainLogo} alt="로고" className="builder-logo-img" />
        </div>

        <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', zIndex: 10 }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="title-pill-input"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '999px', color: '#fff', textAlign: 'center', fontSize: '0.95rem', width: '320px', padding: '8px 40px', outline: 'none' }}
              placeholder="제목 입력"
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #cbd5e1', outline: 'none', cursor: 'pointer' }}
          >
            <option value="modern">Modern (Blue)</option>
            <option value="dark">Dark (Red)</option>
            <option value="minimal">Minimal (B&W)</option>
          </select>

          <button
            className="room-exit-btn"
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf}
            style={{
              backgroundColor: isGeneratingPdf ? '#94a3b8' : 'rgba(255,255,255,0.1)',
              color: '#fff',
              cursor: isGeneratingPdf ? 'not-allowed' : 'pointer'
            }}
          >
            {isGeneratingPdf ? '변환중...' : 'PDF'}
          </button>

          <button
            className="room-exit-btn"
            onClick={handleSaveChanges}
            style={{ backgroundColor: '#fff', color: '#111' }}
          >
            SAVE
          </button>
        </div>
      </header>

      <main className="modern-layout" style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        <aside
          className="modern-draft-panel"
          style={{ width: '35%', height: '100%', overflowY: 'auto', borderRight: '1px solid #e2e8f0', zIndex: 10, paddingBottom: '50px' }}
        >
          <div className="draft-header">
            <span className="draft-badge">Edit Mode</span>
            <h2 className="draft-title">내용 수정하기</h2>
          </div>

          <div className="draft-scroller">
            <div
              className={`exp-card ${currentIdx === -1 ? 'active-card' : ''}`}
              onClick={() => setCurrentIdx(-1)}
              style={{ cursor: 'pointer', marginBottom: '15px' }}
            >
              <h3 className="exp-card-title">
                0. 프로필 (기본 정보) {currentIdx === -1 && <span className="pulse-dot"></span>}
              </h3>
              {currentIdx === -1 && (
                <div style={{ marginTop: '15px' }}>
                  <div className="draft-input-group active-glow">
                    <label>이름</label>
                    <textarea value={profile.name} onChange={(e) => handleProfileEdit('name', e.target.value)} rows={1} />
                  </div>
                  <div className="draft-input-group active-glow">
                    <label>서브 타이틀(직무 등)</label>
                    <textarea value={profile.jobTitle} onChange={(e) => handleProfileEdit('jobTitle', e.target.value)} rows={1} />
                  </div>
                  <div className="draft-input-group active-glow">
                    <label>이메일</label>
                    <textarea value={profile.email} onChange={(e) => handleProfileEdit('email', e.target.value)} rows={1} />
                  </div>
                  <div className="draft-input-group active-glow">
                    <label>자기소개 및 요약</label>
                    <textarea value={profile.intro} onChange={(e) => handleProfileEdit('intro', e.target.value)} rows={3} />
                  </div>
                </div>
              )}
            </div>

            {projects.map((proj, idx) => (
              <div
                key={idx}
                className={`exp-card ${currentIdx === idx ? 'active-card' : ''}`}
                onClick={() => setCurrentIdx(idx)}
                style={{ cursor: 'pointer', position: 'relative' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 className="exp-card-title" style={{ margin: 0 }}>
                    Project {idx + 1} {currentIdx === idx && <span className="pulse-dot"></span>}
                  </h3>
                  <button
                    onClick={(e) => handleDeleteProject(idx, e)}
                    style={{ background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 8px', fontSize: '0.75rem', cursor: 'pointer' }}
                  >
                    삭제
                  </button>
                </div>

                {currentIdx === idx && (
                  <div style={{ marginTop: '15px' }}>
                    <div className="draft-input-group active-glow"><label>제목</label><textarea value={proj.title} onChange={(e) => handleInlineEdit('title', e.target.value)} rows={1} /></div>
                    <div className="draft-input-group active-glow"><label>기술 스택</label><textarea value={proj.techStack} onChange={(e) => handleInlineEdit('techStack', e.target.value)} rows={1} /></div>
                    <div className="draft-input-group active-glow"><label>배경</label><textarea value={proj.why} onChange={(e) => handleInlineEdit('why', e.target.value)} rows={3} /></div>
                    <div className="draft-input-group active-glow"><label>전략</label><textarea value={proj.how} onChange={(e) => handleInlineEdit('how', e.target.value)} rows={3} /></div>
                    <div className="draft-input-group active-glow"><label>성과</label><textarea value={proj.then} onChange={(e) => handleInlineEdit('then', e.target.value)} rows={3} /></div>
                    <div className="draft-input-group active-glow"><label>아키텍처 코드 (Mermaid)</label><textarea value={proj.architectureCode} onChange={(e) => handleInlineEdit('architectureCode', e.target.value)} rows={3} placeholder="graph TD..." /></div>
                    <div className="draft-input-group active-glow"><label>차트 데이터 (JSON 배열)</label><textarea value={typeof proj.chartData === 'string' ? proj.chartData : JSON.stringify(proj.chartData)} onChange={(e) => handleInlineEdit('chartData', e.target.value)} rows={3} placeholder='[{"name":"기존","value":10}]' /></div>
                  </div>
                )}
              </div>
            ))}

            <button
              onClick={handleAddProject}
              style={{ width: '100%', padding: '12px', background: '#e2e8f0', border: '1px dashed #94a3b8', borderRadius: '8px', color: '#475569', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' }}
            >
              + 새 경험 추가
            </button>
          </div>
        </aside>

        <section
          className="modern-chat-section"
          style={{ width: '65%', height: '100%', backgroundColor: currentTheme.bg, padding: isGeneratingPdf ? '0' : '40px', overflowY: 'auto', overflowX: 'auto' }}
        >
          <div
            id="portfolio-content"
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 'max-content', margin: '0 auto' }}
          >

            {/* 표지 슬라이드 */}
            <section
              className="portfolio-slide"
              style={{
                ...slideStyle,
                justifyContent: 'center',
                textAlign: 'center',
                border: !isGeneratingPdf && currentIdx === -1
                  ? `3px solid ${currentTheme.accent}`
                  : slideStyle.border
              }}
            >
              <div style={{ borderBottom: `3px solid ${currentTheme.accent}`, paddingBottom: '30px', marginBottom: '30px', display: 'inline-block', width: '80%', margin: '0 auto' }}>
                <h1 style={{ fontSize: '3.5rem', fontWeight: 'bold', marginBottom: '15px' }}>{profile.name}</h1>
                <h2 style={{ color: currentTheme.accent, fontSize: '1.8rem', fontWeight: '600' }}>{profile.jobTitle}</h2>
              </div>
              <div style={{ color: currentTheme.textSub, fontSize: '1.1rem' }}>
                {profile.email && <p style={{ marginBottom: '10px' }}>Email: {profile.email}</p>}
                <p style={{ marginTop: '20px', lineHeight: '1.6', width: '70%', margin: '0 auto', whiteSpace: 'pre-wrap' }}>
                  {profile.intro}
                </p>
              </div>
            </section>

            {/* 프로젝트 슬라이드 */}
            {projects.map((project, idx) => {
              let safeChartData = [];
              try {
                let rawChart = project.chartData;
                if (typeof rawChart === 'string' && rawChart.trim() !== '') rawChart = JSON.parse(rawChart);
                if (Array.isArray(rawChart)) {
                  safeChartData = rawChart.filter(item => item && typeof item.name === 'string' && item.value !== undefined).slice(0, 5);
                }
              } catch (e) {}

              return (
                <section
                  key={idx}
                  className="portfolio-slide"
                  style={{
                    ...slideStyle,
                    border: !isGeneratingPdf && currentIdx === idx
                      ? `3px solid ${currentTheme.accent}`
                      : slideStyle.border
                  }}
                >
                  {/* ✨ 핵심 수정 2: 경계선 아래로 기술 스택 이동 */}
                  <div className="project-header">
                    <h2 className="project-title">
                      <span className="project-title-num">0{idx + 1}.</span>
                      {project.title || '프로젝트 명 미작성'}
                    </h2>
                  </div>

                  {project.techStack && (
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px', paddingLeft: '2px' }}>
                      {project.techStack.split(',').map((tag, i) => tag.trim() && (
                        <span key={i} style={{
                          background: currentTheme.accent,
                          color: '#fff',
                          padding: '4px 12px',
                          borderRadius: '20px',
                          fontSize: '0.8rem',
                          fontWeight: '600'
                        }}>
                          #{tag.trim()}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="project-body">

                    <div className="project-text-area">
                      <div className="text-box red">
                        <div className="text-box-title" style={{ color: currentTheme.accent }}>📌 배경</div>
                        <div className="text-box-content">{project.why || '작성된 배경이 없습니다.'}</div>
                      </div>
                      <div className="text-box green">
                        <div className="text-box-title" style={{ color: currentTheme.accent }}>🚀 전략</div>
                        <div className="text-box-content">{project.how || '작성된 문제해결 전략이 없습니다.'}</div>
                      </div>
                      <div className="text-box orange">
                        <div className="text-box-title" style={{ color: currentTheme.accent }}>🏆 성과</div>
                        <div className="text-box-content bold">{project.then || '작성된 성과가 없습니다.'}</div>
                      </div>
                    </div>

                    {(project.architectureCode || safeChartData.length > 0) && (
                      <div className="project-visual-area">
                        {project.architectureCode && (
                          <div className="visual-box">
                            <MermaidViewer code={project.architectureCode} themeMode={currentTheme.mermaidTheme} />
                          </div>
                        )}
                        {safeChartData.length > 0 && (
                          <div className="chart-box">
                            <h5 style={{ margin: '0 0 10px 10px', color: currentTheme.textSub, fontSize: '0.85rem', fontWeight: 'bold' }}>📈 성과 지표</h5>
                            <div className="chart-container-wrapper">
                              <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={safeChartData} margin={{ top: 10, right: 10, left: 15, bottom: 0 }}>
                                  <defs>
                                    <linearGradient id={`colorValue-${idx}`} x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="5%" stopColor={currentTheme.accent} stopOpacity={0.3} />
                                      <stop offset="95%" stopColor={currentTheme.accent} stopOpacity={0} />
                                    </linearGradient>
                                  </defs>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={currentTheme.border} />
                                  <XAxis dataKey="name" stroke={currentTheme.textSub} fontSize={10} tickLine={false} axisLine={false} />
                                  <YAxis stroke={currentTheme.textSub} fontSize={10} tickLine={false} axisLine={false} width={60} />
                                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: currentTheme.shadow, fontSize: '12px' }} />
                                  <Area isAnimationActive={false} type="monotone" dataKey="value" stroke={currentTheme.accent} strokeWidth={2} fillOpacity={1} fill={`url(#colorValue-${idx})`} />
                                </AreaChart>
                              </ResponsiveContainer>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                  </div>
                </section>
              );
            })}
          </div>
        </section>
      </main>

      {/* 플로팅 어시스턴트 생략 (기존 코드와 완전 동일) */}
      <div style={{ position: 'fixed', bottom: '30px', right: '30px', zIndex: 999 }}>
        {isAssistantOpen ? (
          <div style={{ width: '350px', height: '450px', backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
            <div style={{ padding: '15px', backgroundColor: '#1e40af', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 'bold' }}>전문가 어시스턴트</span>
              <button onClick={() => setIsAssistantOpen(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer' }}>X</button>
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
            style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: '#1e40af', color: '#fff', border: 'none', boxShadow: '0 4px 15px rgba(30,64,175,0.4)', fontSize: '1.5rem', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
          >
            chat
          </button>
        )}
      </div>
    </div>
  );
}