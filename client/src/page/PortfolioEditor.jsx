import React, { useState } from 'react';
import axios from 'axios';
import '../css/PortfolioEditor.css'; 

const PortfolioEditor = () => {
  // 1. 데이터 상태 관리
  const [data, setData] = useState({
    profile: {
      name: '',
      jobTitle: '',
      email: '',
      intro: ''
    },
    projects: [
      { id: Date.now(), title: '', period: '', description: '', techStack: '' }
    ]
  });

  // ✨ [추가] AI 관련 상태
  const [aiPrompt, setAiPrompt] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);

  // ----------------------------------------------------
  // ✨ [추가] AI 포트폴리오 생성 요청 함수
  // ----------------------------------------------------
  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) {
      alert("경험 내용을 입력해주세요!");
      return;
    }

    setIsAiLoading(true);

    try {
      // 1. 백엔드로 프롬프트 전송
      const response = await axios.post('http://localhost:5000/api/generate/portfolio', {
        userPrompt: aiPrompt
      });

      if (response.data.success) {
        const aiData = response.data.data;

        // 2. AI가 준 데이터로 상태 업데이트 (기존 데이터 덮어쓰기 or 병합)
        setData(prev => ({
          ...prev,
          profile: {
            ...prev.profile,
            ...aiData.profile // AI가 제안한 프로필 정보
          },
          projects: [
            ...aiData.projects.map(p => ({ ...p, id: Date.now() + Math.random() })), // ID 새로 부여
            ...prev.projects // 기존 프로젝트는 뒤로 밀거나 삭제 가능
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
      projects: [...prev.projects, { id: Date.now(), title: '', period: '', description: '', techStack: '' }]
    }));
  };

  const removeProject = (index) => {
    const newProjects = data.projects.filter((_, i) => i !== index);
    setData((prev) => ({ ...prev, projects: newProjects }));
  };

  const handleSave = async () => {
    try {
      if (!data.profile.name) {
        alert("이름은 필수입니다!");
        return;
      }
      const response = await axios.post('http://localhost:5000/api/portfolio', {
        userId: 'test_user_001',
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
    <div className="editor-container">
      {/* 👈 왼쪽: 에디터 패널 */}
      <div className="editor-panel">

        {/* ✨ [추가] AI 입력 섹션 (가장 상단에 배치) */}
        <div style={{ background: '#f0f4ff', padding: '20px', borderRadius: '12px', marginBottom: '30px', border: '1px solid #dbeafe' }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', color: '#1e40af' }}>🤖 AI 자동 완성</h3>
          <p style={{ fontSize: '13px', color: '#666', marginBottom: '10px' }}>
            개발 경험을 줄글로 대충 적어주세요. AI가 포트폴리오 형식으로 변환해줍니다.
          </p>
          <textarea
            placeholder="예시: 나 홍길동이고 백엔드 개발자야. 'Way'라는 데이트 앱을 Node.js랑 MongoDB로 만들었고, 실시간 채팅 기능을 구현해서 사용자 1000명 모았어."
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            style={{ width: '100%', height: '100px', padding: '10px', borderRadius: '8px', border: '1px solid #ccc', resize: 'vertical' }}
            disabled={isAiLoading}
          />
          <button
            onClick={handleAiGenerate}
            disabled={isAiLoading}
            style={{
              width: '100%',
              marginTop: '10px',
              padding: '12px',
              background: isAiLoading ? '#9ca3af' : 'linear-gradient(90deg, #4f46e5, #7c3aed)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: isAiLoading ? 'not-allowed' : 'pointer',
              fontWeight: 'bold'
            }}
          >
            {isAiLoading ? "AI가 분석 중입니다... ⏳" : "✨ AI로 포트폴리오 생성하기"}
          </button>
        </div>
        {/* ✨ AI 섹션 끝 */}


        <h2 style={{ marginBottom: '20px' }}>📝 직접 수정하기</h2>

        {/* --- 프로필 섹션 --- */}
        <div className="section-title">기본 정보</div>
        <div className="input-group">
          <label>이름</label>
          <input name="name" value={data.profile.name} onChange={handleProfileChange} placeholder="예: 홍길동" />
        </div>
        <div className="input-group">
          <label>직무 (Job Title)</label>
          <input name="jobTitle" value={data.profile.jobTitle} onChange={handleProfileChange} placeholder="예: Backend Developer" />
        </div>
        <div className="input-group">
          <label>이메일</label>
          <input name="email" value={data.profile.email} onChange={handleProfileChange} placeholder="example@email.com" />
        </div>
        <div className="input-group">
          <label>한줄 소개</label>
          <textarea name="intro" value={data.profile.intro} onChange={handleProfileChange} placeholder="나를 표현하는 문장을 적어주세요." rows={3} />
        </div>

        {/* --- 프로젝트 섹션 --- */}
        <div className="section-title">프로젝트 경험</div>
        {data.projects.map((project, index) => (
          <div key={project.id} className="project-item">
            <button className="btn-remove" onClick={() => removeProject(index)}>삭제</button>

            <div className="input-group">
              <label>프로젝트명</label>
              <input name="title" value={project.title} onChange={(e) => handleProjectChange(index, e)} placeholder="예: 소셜 네트워크 앱 개발" />
            </div>
            <div className="input-group">
              <label>진행 기간</label>
              <input name="period" value={project.period} onChange={(e) => handleProjectChange(index, e)} placeholder="예: 2025.08 - 2026.01" />
            </div>
            <div className="input-group">
              <label>기술 스택</label>
              <input name="techStack" value={project.techStack} onChange={(e) => handleProjectChange(index, e)} placeholder="React, Node.js, MongoDB" />
            </div>
            <div className="input-group">
              <label>상세 설명</label>
              <textarea name="description" value={project.description} onChange={(e) => handleProjectChange(index, e)} placeholder="어떤 문제를 해결했나요?" rows={4} />
            </div>
          </div>
        ))}

        <button className="btn-add" onClick={addProject}>+ 프로젝트 추가하기</button>

        <button className="btn-save" onClick={handleSave}>💾 저장하기</button>
      </div>

      {/* 👉 오른쪽: 미리보기 패널 */}
      <div className="preview-panel">
        <div className="a4-paper">
          <header className="preview-header">
            <h1 className="preview-name">{data.profile.name || "이름을 입력하세요"}</h1>
            <div className="preview-job">{data.profile.jobTitle || "직무 정보 없음"}</div>
            {data.profile.email && <div style={{color:'#888', fontSize:'14px', marginTop:'5px'}}>📧 {data.profile.email}</div>}
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
    </div>
  );
};

export default PortfolioEditor;