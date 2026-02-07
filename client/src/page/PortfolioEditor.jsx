import React, { useState } from 'react';
import axios from 'axios';
import '../css/PortfolioEditor.css'; 

const PortfolioEditor = () => {
  // 1. 상태 관리: 프로필 + 프로젝트 리스트 (구조화된 데이터)
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

  // 2-1. 프로필 입력 핸들러
  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setData((prev) => ({
      ...prev,
      profile: { ...prev.profile, [name]: value }
    }));
  };

  // 2-2. 프로젝트 입력 핸들러 (배열 내 특정 항목 수정)
  const handleProjectChange = (index, e) => {
    const { name, value } = e.target;
    const newProjects = [...data.projects];
    newProjects[index][name] = value;
    setData((prev) => ({ ...prev, projects: newProjects }));
  };

  // 2-3. 프로젝트 추가/삭제 기능
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

  // 3. 저장 기능 (백엔드 전송)
  const handleSave = async () => {
    try {
      if (!data.profile.name) {
        alert("이름은 필수입니다!");
        return;
      }

      const response = await axios.post('http://localhost:5000/api/portfolio', {
        userId: 'test_user_001', 
        title: `${data.profile.name}의 포트폴리오`, // 제목 자동 생성
        content: data // 🔥 전체 데이터 객체를 통째로 저장
      });

      if (response.data.success) {
        alert('✅ 포트폴리오가 저장되었습니다!');
        console.log('Saved:', response.data);
      }
    } catch (error) {
      console.error('Save Error:', error);
      alert('❌ 저장 실패: 서버 상태를 확인해주세요.');
    }
  };

  return (
    <div className="editor-container">
      {/* 👈 왼쪽: 에디터 패널 */}
      <div className="editor-panel">
        <h2 style={{ marginBottom: '20px' }}>📝 포트폴리오 에디터</h2>

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
              <label>기술 스택 (쉼표로 구분)</label>
              <input name="techStack" value={project.techStack} onChange={(e) => handleProjectChange(index, e)} placeholder="React, Node.js, MongoDB" />
            </div>
            <div className="input-group">
              <label>상세 설명</label>
              <textarea name="description" value={project.description} onChange={(e) => handleProjectChange(index, e)} placeholder="어떤 문제를 해결했나요?" rows={4} />
            </div>
          </div>
        ))}
        
        <button className="btn-add" onClick={addProject}>+ 프로젝트 추가하기</button>

        {/* 저장 버튼 */}
        <button className="btn-save" onClick={handleSave}>💾 저장하기</button>
      </div>

      {/* 👉 오른쪽: 미리보기 패널 (A4 용지 뷰) */}
      <div className="preview-panel">
        <div className="a4-paper">
          {/* Header */}
          <header className="preview-header">
            <h1 className="preview-name">{data.profile.name || "이름을 입력하세요"}</h1>
            <div className="preview-job">{data.profile.jobTitle || "직무 정보 없음"}</div>
            {data.profile.email && <div style={{color:'#888', fontSize:'14px', marginTop:'5px'}}>📧 {data.profile.email}</div>}
            <p className="preview-intro">{data.profile.intro || "자기소개가 없습니다."}</p>
          </header>

          {/* Body: Projects */}
          {data.projects.length > 0 && (
            <section>
              <div className="preview-section-title">PROJECTS</div>
              {data.projects.map((project) => (
                <div key={project.id} className="preview-project-item">
                  <div className="preview-project-title">
                    {project.title || "프로젝트명"}
                    <span className="preview-project-period">{project.period}</span>
                  </div>
                  
                  {/* 기술 스택 태그 처리 */}
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