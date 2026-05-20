import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import CareerProfileModal from '../components/CareerProfileModal';
import '../css/ProfileEditor.css';
import mainLogo from '../assets/logo.png';

const API_BASE = process.env.REACT_APP_API_BASE;

const DEFAULT_CAREER_PROFILE = {
  status: 'rookie',
  jobCategory: '',
  jobDetail: '',
};

const STATUS_LABELS = {
  rookie: '루키 / 신입',
  career: '경력 / 이직',
};

const JOB_CATEGORY_LABELS = {
  dev: '개발',
  plan: '기획',
  design: '디자인',
  marketing: '마케팅',
  sales: '영업',
  hr: 'HR',
  finance: '금융',
  manufacturing: '제조',
  etc: '기타',
};

function normalizeCareerProfile(value = {}) {
  return {
    status: value.status || DEFAULT_CAREER_PROFILE.status,
    jobCategory: value.jobCategory || DEFAULT_CAREER_PROFILE.jobCategory,
    jobDetail: value.jobDetail || DEFAULT_CAREER_PROFILE.jobDetail,
  };
}

export default function ProfileEditor() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isCareerSaving, setIsCareerSaving] = useState(false);
  const [isCareerModalOpen, setIsCareerModalOpen] = useState(false);

  const [profile, setProfile] = useState({
    name: '',
    email: '',
    intro: '',
    careerProfile: DEFAULT_CAREER_PROFILE,
  });

  useEffect(() => {
    const fetchProfileData = async () => {
      const user = localStorage.getItem('user');
      if (!user) return navigate('/auth');

      try {
        const userData = JSON.parse(user);
        const userId = userData.id || userData._id || userData.email;

        const res = await axios.get(`${API_BASE}/api/profile/${userId}`);

        if (res.data.success && res.data.data) {
          const fetchedData = res.data.data;

          setProfile({
            name: fetchedData.name || '',
            email: fetchedData.email || '',
            intro: fetchedData.intro || '',
            careerProfile: normalizeCareerProfile(
              fetchedData.careerProfile || userData.careerProfile
            ),
          });
        } else {
          setProfile((prev) => ({
            ...prev,
            name: userData.name || prev.name,
            email: userData.email || prev.email,
            intro: userData.intro || prev.intro,
            careerProfile: normalizeCareerProfile(userData.careerProfile),
          }));
        }
      } catch (err) {
        console.error('기존 프로필 정보를 불러오는데 실패했습니다.', err);
      }
    };

    fetchProfileData();
  }, [navigate]);

  const updateLocalUser = (nextProfile) => {
    try {
      const currentUser = JSON.parse(localStorage.getItem('user')) || {};
      const nextUser = {
        ...currentUser,
        name: nextProfile.name,
        email: nextProfile.email,
        intro: nextProfile.intro,
        careerProfile: nextProfile.careerProfile,
      };

      // 기본 프로필에서 제외한 이전 직무/소셜 링크 값은 로컬 저장값에서도 제거
      delete nextUser.jobTitle;
      delete nextUser.github;
      delete nextUser.blog;
      delete nextUser.linkedin;

      localStorage.setItem('user', JSON.stringify(nextUser));
    } catch (err) {
      console.error('localStorage 사용자 정보 갱신 실패:', err);
    }
  };

  const saveProfilePayload = async (nextProfile) => {
    const user = JSON.parse(localStorage.getItem('user'));
    const userId = user.id || user._id || user.email;

    await axios.post(`${API_BASE}/api/profile`, {
      userId,
      name: nextProfile.name,
      email: nextProfile.email,
      intro: nextProfile.intro,
      careerProfile: nextProfile.careerProfile,
      // 기존에 저장되어 있던 직무/소셜 링크 값이 남지 않도록 비워서 저장
      jobTitle: '',
      github: '',
      blog: '',
      linkedin: '',
    });

    updateLocalUser(nextProfile);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  const handleAiGenerate = async () => {
    if (!profile.intro.trim()) {
      return alert('먼저 다듬고 싶은 내용이나 키워드를 자기소개 칸에 간단히 적어주세요!');
    }

    setIsAiLoading(true);

    const currentText = profile.intro;
    setProfile((prev) => ({ ...prev, intro: '' }));

    try {
      const response = await fetch(`${API_BASE}/api/generate/profile-stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userPrompt: `너는 전문 커리어 컨설턴트야. 아래 내용을 바탕으로 매력적인 자기소개 문장만 한국어로 작성해줘. 다른 설명이나 JSON 형식 없이 오직 결과 문장만 출력해. ${currentText}`,
        }),
      });

      if (!response.body) return;

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const jsonStr = line.replace('data: ', '').trim();
              if (jsonStr === '[DONE]') break;

              const data = JSON.parse(jsonStr);
              const content = data.choices[0]?.delta?.content || '';
              accumulatedText += content;

              setProfile((prev) => ({ ...prev, intro: accumulatedText }));
            } catch (e) {
              // streaming 중간의 빈 줄/깨진 조각은 무시
            }
          }
        }
      }
    } catch (error) {
      console.error('AI Generation Error:', error);
      alert('AI 생성 중 오류가 발생했습니다.');
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleCareerProfileSave = async (careerProfileData) => {
    const normalizedCareerProfile = normalizeCareerProfile(careerProfileData);

    const nextProfile = {
      ...profile,
      careerProfile: normalizedCareerProfile,
    };

    setProfile(nextProfile);
    setIsCareerModalOpen(false);

    setIsCareerSaving(true);
    try {
      await saveProfilePayload(nextProfile);
      alert('커리어 프로필이 저장되었습니다.');
    } catch (error) {
      console.error('Career Profile Save Error:', error);
      alert('커리어 프로필이 화면에는 반영되었지만 서버 저장에 실패했습니다. 다시 저장해주세요.');
    } finally {
      setIsCareerSaving(false);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);

    try {
      await saveProfilePayload(profile);
      alert('성공적으로 저장되었습니다.');
      navigate('/mypage');
    } catch (error) {
      console.error('Profile Save Error:', error);
      alert('저장에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const statusLabel =
    STATUS_LABELS[profile.careerProfile.status] || '아직 선택되지 않음';

  const jobCategoryLabel =
    JOB_CATEGORY_LABELS[profile.careerProfile.jobCategory] || '아직 선택되지 않음';

  const jobDetailLabel = profile.careerProfile.jobDetail || '아직 선택되지 않음';

  return (
    <div className="pe-container">
      <nav className="pe-header">
        <div className="pe-logo-btn" onClick={() => navigate('/')}>
          <img
            src={mainLogo}
            alt="F1ND YOUR WAY 로고"
            className="pe-logo-img"
          />
        </div>

        <button className="pe-back-btn" onClick={() => navigate('/mypage')}>
          대시보드로 돌아가기
        </button>
      </nav>

      <main className="pe-wrapper">
        <header className="pe-title-section">
          <span className="pe-page-kicker">Master Profile</span>
          <h1 className="pe-main-title">Profile Editor</h1>
          <p className="pe-sub-title">
            자기소개서와 포트폴리오에 사용할 기본 정보와 커리어 방향을 정리합니다.
          </p>
        </header>

        <section className="pe-card pe-career-card">
          <div className="pe-card-header pe-card-header-row">
            <div>
              <span className="pe-card-tag">Career Profile</span>
              <h3 className="pe-card-title">커리어 프로필</h3>
              <p className="pe-card-desc">
                지원 상태와 희망 직무는 모달에서 선택해 관리합니다.
              </p>
            </div>

            <button
              type="button"
              className="pe-career-edit-btn"
              onClick={() => setIsCareerModalOpen(true)}
              disabled={isCareerSaving}
            >
              {isCareerSaving ? '저장 중...' : '커리어 프로필 수정'}
            </button>
          </div>

          <div className="pe-career-summary-grid">
            <div className="pe-career-summary-item">
              <span>지원 상태</span>
              <strong>{statusLabel}</strong>
            </div>

            <div className="pe-career-summary-item">
              <span>희망 직군</span>
              <strong>{jobCategoryLabel}</strong>
            </div>

            <div className="pe-career-summary-item">
              <span>세부 직무</span>
              <strong>{jobDetailLabel}</strong>
            </div>
          </div>
        </section>

        <section className="pe-card">
          <div className="pe-card-header">
            <span className="pe-card-tag">Basic Info</span>
            <h3 className="pe-card-title">기본 프로필</h3>
            <p className="pe-card-desc">
              이름, 이메일, 자기소개만 관리합니다.
            </p>
          </div>

          <div className="pe-grid">
            <div className="pe-input-group">
              <label className="pe-label">이름</label>
              <input
                type="text"
                className="pe-input"
                name="name"
                value={profile.name}
                onChange={handleChange}
                placeholder="실명을 입력하세요"
              />
            </div>

            <div className="pe-input-group">
              <label className="pe-label">이메일</label>
              <input
                type="email"
                className="pe-input"
                name="email"
                value={profile.email}
                onChange={handleChange}
                placeholder="example@email.com"
              />
            </div>

            <div className="pe-input-group pe-full">
              <div className="pe-inline-label-row">
                <label className="pe-label">자기 소개</label>

                <button
                  type="button"
                  className="pe-ai-inline-btn"
                  onClick={handleAiGenerate}
                  disabled={isAiLoading}
                >
                  {isAiLoading ? (
                    <>작성 중...</>
                  ) : (
                    <>
                      <span className="pe-sparkle">✨</span>
                      AI 문장 다듬기
                    </>
                  )}
                </button>
              </div>

              <textarea
                className="pe-textarea"
                name="intro"
                value={profile.intro}
                onChange={handleChange}
                disabled={isAiLoading}
                placeholder="핵심 키워드나 경험을 간단히 적고 AI 문장 다듬기 버튼을 눌러보세요."
              />
            </div>
          </div>
        </section>

        <div className="pe-btn-group">
          <button className="pe-save-btn" onClick={handleSave} disabled={isLoading}>
            {isLoading ? '저장 중...' : '프로필 설정 완료 ➔'}
          </button>
        </div>
      </main>

      {isCareerModalOpen && (
        <CareerProfileModal
          initialData={profile.careerProfile}
          onClose={() => setIsCareerModalOpen(false)}
          onSave={handleCareerProfileSave}
        />
      )}
    </div>
  );
}
