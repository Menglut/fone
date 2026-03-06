// 맨 위 import 부분에 useLocation 추가
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom'; 
import axios from 'axios';
import '../css/PortfolioEditor.css'; 

const API_BASE = "http://localhost:5000";

const PortfolioEditor = () => {
  const nav = useNavigate();
  const location = useLocation(); // 💡 라우터 상태(신호)를 받기 위해 추가

  const [currentStep, setCurrentStep] = useState('edit');

  const [data, setData] = useState({
    profile: { name: '', jobTitle: '', email: '', intro: '' },
    projects: [{ id: crypto.randomUUID(), title: '', period: '', description: '', techStack: '' }]
  });

  const [aiPrompt, setAiPrompt] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // 💡 [추가된 핵심 코드] 화면이 열릴 때 내 데이터 불러오기 & 화면 전환
  useEffect(() => {
    // 1. MyPage에서 '수정/미리보기' 버튼으로 넘어왔다면 바로 미리보기 화면으로 세팅
    if (location.state?.goToPreview) {
      setCurrentStep('preview');
    }

    // 2. DB에서 저장된 내 포트폴리오 데이터 불러오기
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      const userId = user.id || user._id || user.email;

      axios.get(`${API_BASE}/api/portfolio/${userId}`)
        .then(res => {
          if (res.data.success && res.data.data) {
            // DB에 있던 데이터로 에디터 입력창 채우기
            setData(res.data.data.content);
          }
        })
        .catch(err => console.log("저장된 포트폴리오가 없습니다."));
    }
  }, [location]);

  // ----------------------------------------------------
  // ✨ 스크롤 이벤트 핸들러 (디자인 요구사항)
  // ----------------------------------------------------
  useEffect(() => {
    const handleScroll = () => {
      const shouldBeScrolled = window.scrollY > 10;
      setIsScrolled(prev => prev !== shouldBeScrolled ? shouldBeScrolled : prev);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // ----------------------------------------------------
  // ✨ 입력 조건 확인 (가독성 향상)
  // ----------------------------------------------------
  const canNextStep = useMemo(() => {
    // 최소한 이름과 직무, 이메일은 입력해야 미리보기로 넘어가게 설정
    return data.profile.name.trim().length > 1 && 
           data.profile.jobTitle.trim().length > 1 &&
           data.profile.email.trim().includes('@');
  }, [data.profile]);

  // ----------------------------------------------------
  // ✨ AI 포트폴리오 생성 요청 함수 (기존 로직 유지)
  // ----------------------------------------------------
  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) {
      alert("경험 내용을 입력해주세요!");
      return;
    }

    setIsAiLoading(true);

    try {
      const response = await axios.post(`${API_BASE}/api/generate/portfolio`, {
        userPrompt: aiPrompt
      });

      if (response.data.success) {
        const aiData = response.data.data;

        setData(prev => ({
          ...prev,
          profile: {
            ...prev.profile,
            ...aiData.profile // AI가 제안한 프로필 정보
          },
          projects: [
            ...aiData.projects.map(p => ({ ...p, id: crypto.randomUUID() })), // ID 새로 부여
            ...prev.projects // 기존 프로젝트는 뒤로
          ]
        }));

        alert("✨ AI가 포트폴리오 초안을 작성했습니다!");
        setAiPrompt(""); // 입력창 초기화
      }
    } catch (error) {
      console.error("AI Error:", error);
      alert("AI 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setIsAiLoading(false);
    }
  };
  // ----------------------------------------------------

  // 기존 핸들러들
  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setData((prev) => ({
      ...prev,
      profile: { ...prev.profile, [name]: value }
    }));
  };

  const handleProjectChange = (index, e) => {
    const { name, value } = e.target;
    const newProjects = [...data.projects];
    newProjects[index][name] = value;
    setData((prev) => ({ ...prev, projects: newProjects }));
  };

  const addProject = () => {
    setData((prev) => ({
      ...prev,
      projects: [...prev.projects, { id: crypto.randomUUID(), title: '', period: '', description: '', techStack: '' }]
    }));
  };

  const removeProject = (index) => {
    // 마지막 하나는 삭제 못하게
    if(data.projects.length <= 1) return;
    const newProjects = data.projects.filter((_, i) => i !== index);
    setData((prev) => ({ ...prev, projects: newProjects }));
  };

  // PortfolioEditor.js 내부의 handleSave 함수
const handleSave = async () => {
  try {
    // 💡 MyPage와 동일한 방식으로 유저 정보를 꺼내옵니다.
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      alert("로그인이 필요합니다!");
      return;
    }
    const user = JSON.parse(storedUser);
    const userId = user.id || user._id || user.email; // MyPage와 기준 통일

    const response = await axios.post('http://localhost:5000/api/portfolio', {
      userId: userId, // 💡 여기에 실제 아이디가 꽂혀야 합니다!
      title: `${data.profile.name}의 포트폴리오`,
      content: data
    });

    if (response.data.success) {
      alert('✅ 저장되었습니다!');
    }
  } catch (error) {
    console.error('Save Error:', error);
    alert('❌ 저장 실패');
  }
};

  return (
    <div className="rwPage">
      
      {/* ----------------------------------------------------
          ✨ 로딩 화면 (Clean F1 Style) 
      ---------------------------------------------------- */}
      {isAiLoading && (
          <div className="rwLoading" role="status" aria-live="polite" aria-busy="true">
            <div className="rwLoadingCard">
              <div className="rwLoadingTrack">
                <div className="rwCar" aria-hidden="true">
                  <div className="carWing front" />
                  <div className="carBody" />
                  <div className="carCockpit" />
                  <div className="carWing rear" />
                  <span className="rwWheel w1" />
                  <span className="rwWheel w2" />
                </div>
              </div>
              <div className="rwLoadingText">
                ANALYZING DATA<span className="rwDots"></span>
                <span className="rwLoadingSub">AI가 커리어 데이터를 분석하여 포트폴리오를 작성 중입니다.</span>
              </div>
            </div>
          </div>
        )}

      {/* ----------------------------------------------------
          ✨ 헤더 (Dark Theme)
      ---------------------------------------------------- */}
      <header className={`rwTop ${isScrolled ? "scrolled" : ""}`}>
        <div className="rwTopInner">
          <div className="nav-logo-btn" onClick={() => (window.location.href = "/")}>
            <div className="logo-symbol">
              <span>F1</span>
            </div>
            <div className="logo-text-group">
              <span className="logo-title">F1ND YOUR WAY</span>
            </div>
          </div>
          {currentStep === 'preview' && (
            <div className="preview-nav-btns">
                <button className="rwBtn secondary short" onClick={() => setCurrentStep('edit')}>⬅️ 다시 수정</button>
                <button className="rwBtn primary short" onClick={handleSave}>💾 저장하기</button>
            </div>
          )}
        </div>
      </header>

      <main className="rwWrap">
        
        {/* Intro Section */}
        <section className="rwIntro">
          <div className="rwChip">
            {currentStep === 'edit' ? "PHASE 01 : DATA INPUT" : "PHASE 02 : PREVIEW & SAVE"}
          </div>
          <h1 className="rwTitle">
            합격을 위한 <span className="rwAccent">커리어 데이터</span> 세팅
          </h1>
          <p className="rwDesc">
            {currentStep === 'edit' 
              ? "AI 자동 완성 또는 직접 입력을 통해 커리어 데이터를 구성해주세요."
              : "작성된 데이터를 기반으로 생성된 포트폴리오 초안입니다. 최종 저장하세요."
            }
          </p>
        </section>

        {/* ----------------------------------------------------
            [STEP 1] 작성 화면 (currentStep === 'edit')
        ---------------------------------------------------- */}
        {currentStep === 'edit' && (
          <section className="rwInputArea">

            {/* 좌우 배치를 위한 Row 컨테이너 */}
            <div className="rwInputRow">

              {/* A. AI 입력 카드시퀀스 */}
              <div className="rwCard rwCardAI">
                <div className="rwCardHead">
                  <div>
                    <div className="rwCardTitle"><span>🤖 AI AUTO-GENERATE</span></div>
                    <div className="rwCardSub">개발 경험을 자유롭게 적어주세요. AI가 변환해줍니다.</div>
                  </div>
                </div>
                <textarea
                  className="rwTextarea"
                  placeholder={`예시: 나 홍길동이고 백엔드 개발자야.`}
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  disabled={isAiLoading}
                />
                <button 
                    className="rwBtn primary full" 
                    onClick={handleAiGenerate} 
                    disabled={isAiLoading || !aiPrompt.trim()}
                    style={{marginTop: '15px'}}
                >
                  {isAiLoading ? "ANALYZING..." : "✨ AI로 포트폴리오 구성"}
                </button>
              </div>

              {/* B. 기본 정보 입력 카드 */}
              <div className="rwCard">
                <div className="rwCardHead">
                  <div>
                    <div className="rwCardTitle"><span>1. BASIC INFO</span></div>
                    <div className="rwCardSub">기본 정보를 입력해주세요.</div>
                  </div>
                </div>
                
                <div className="input-group-rw">
                    <label>이름</label>
                    <input type="text" className="rwInputText" name="name" value={data.profile.name} onChange={handleProfileChange} placeholder="예: 홍길동" />
                </div>
                <div className="input-group-rw">
                    <label>직무 (Job Title)</label>
                    <input type="text" className="rwInputText" name="jobTitle" value={data.profile.jobTitle} onChange={handleProfileChange} placeholder="예: Backend Developer" />
                </div>
                <div className="input-group-rw">
                    <label>이메일</label>
                    <input type="email" className="rwInputText" name="email" value={data.profile.email} onChange={handleProfileChange} placeholder="example@email.com" />
                </div>
                <div className="input-group-rw">
                    <label>한줄 소개</label>
                    <textarea className="rwTextarea short" name="intro" value={data.profile.intro} onChange={handleProfileChange} placeholder="나를 표현하는 문장을 적어주세요." rows={3} />
                </div>
              </div>

            </div>
            {/* Row 컨테이너 끝 */}

            {/* ----------------------------------------------------
                C. 프로젝트 경험 카드 (동적 생성)
            ---------------------------------------------------- */}
            <div className="rwProjectsList" style={{marginTop: '30px'}}>
                {data.projects.map((project, index) => (
                    <div key={project.id} className="rwCard rwProjectItemCard" style={{marginBottom: '20px'}}>
                        <div className="rwCardHead">
                            <div>
                                <div className="rwCardTitle"><span>2-{index+1}. PROJECT EXPERIENCE</span></div>
                                <div className="rwCardSub">프로젝트 내용을 상세히 작성하세요.</div>
                            </div>
                            {data.projects.length > 1 && (
                                <button className="rwBtn secondary short btn-remove-rw" onClick={() => removeProject(index)}>삭제</button>
                            )}
                        </div>

                        <div className="rwCardBodyGrid">
                            <div className="input-group-rw">
                                <label>프로젝트명</label>
                                <input type="text" className="rwInputText" name="title" value={project.title} onChange={(e) => handleProjectChange(index, e)} placeholder="예: 소셜 네트워크 앱 개발" />
                            </div>
                            <div className="input-group-rw">
                                <label>진행 기간</label>
                                <input type="text" className="rwInputText" name="period" value={project.period} onChange={(e) => handleProjectChange(index, e)} placeholder="예: 2025.08 - 2026.01" />
                            </div>
                            <div className="input-group-rw fullWidth">
                                <label>기술 스택</label>
                                <input type="text" className="rwInputText" name="techStack" value={project.techStack} onChange={(e) => handleProjectChange(index, e)} placeholder="React, Node.js, MongoDB (쉼표로 구분)" />
                            </div>
                            <div className="input-group-rw fullWidth">
                                <label>상세 설명</label>
                                <textarea className="rwTextarea" name="description" value={project.description} onChange={(e) => handleProjectChange(index, e)} placeholder="어떤 문제를 해결했나요? 구체적인 성과를 적어주세요." rows={4} />
                            </div>
                        </div>
                    </div>
                ))}

                <button className="rwBtn secondary full" onClick={addProject} style={{borderStyle: 'dashed', background: 'transparent', color: '#888'}}>+ 프로젝트 추가하기</button>
            </div>

            {/* Action Button */}
            <div className="rwActionArea" style={{marginTop: '50px'}}>
              <button className="rwBtn primary fullLarge" onClick={() => setCurrentStep('preview')} disabled={!canNextStep}>
                NEXT : 포트폴리오 미리보기 ➡️
              </button>
              <div className="rwBottomHint">
                {canNextStep
                  ? "준비가 완료되었습니다. 포트폴리오 구성을 확인하세요."
                  : "기본 정보(이름, 직무, 이메일)를 모두 입력해야 미리보기 단계로 진행할 수 있습니다."}
              </div>
            </div>

          </section>
        )}

        {/* ----------------------------------------------------
            [STEP 2] 결과 미리보기 화면 (currentStep === 'preview')
        ---------------------------------------------------- */}
        {currentStep === 'preview' && (
          <section className="rwPreviewArea">
            
            {/* 실제 포트폴리오 결과물 (A4 paper style - 기존 css 활용) */}
            <div className="a4-paper-container">
              <div className="a4-paper">
                <header className="preview-header">
                  <h1 className="preview-name">{data.profile.name || "이름을 입력하세요"}</h1>
                  <div className="preview-job">{data.profile.jobTitle || "직무 정보 없음"}</div>
                  {data.profile.email && <div className="preview-email">📧 {data.profile.email}</div>}
                  <p className="preview-intro">{data.profile.intro || "자기소개가 없습니다."}</p>
                </header>

                {data.projects.length > 0 && (
                  <section>
                    <div className="preview-section-title">PROJECTS</div>
                    {data.projects.map((project) => (
                      <div key={project.id} className="preview-project-item">
                        <div className="preview-project-title">
                          {project.title || "프로젝트명"}
                          <span className="preview-project-period">{project.period}</span>
                        </div>
                        {project.techStack && (
                          <div className="preview-tags">
                            {project.techStack.split(',').map((tag, i) => (
                              tag.trim() && <span key={i}>{tag.trim()}</span>
                            ))}
                          </div>
                        )}
                        <p className="preview-project-desc">
                          {project.description || "프로젝트 설명이 여기에 표시됩니다."}
                        </p>
                      </div>
                    ))}
                  </section>
                )}
              </div>
            </div>

            {/* 하단 Action Button (저장) */}
            <div className="rwActionArea" style={{marginTop: '50px'}}>
                <button className="rwBtn primary fullLarge" onClick={handleSave}>
                    💾 포트폴리오 최종 저장하기
                </button>
            </div>
          </section>
        )}

        {/* Footer (Dark Theme) */}
        <footer className="rwFooter">
          <div className="rwFooterInner">
            <div className="rwFootLeft">
              <span style={{fontFamily: 'Rajdhani', fontWeight: 700}}>F1ND YOUR WAY</span>
              <span style={{margin: '0 10px'}}>|</span>
              <span>ENGINEERED FOR SUCCESS</span>
            </div>
            <div className="rwFootRight">
              © {new Date().getFullYear()} KIM'S PADDOCK
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default PortfolioEditor;