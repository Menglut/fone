// src/page/MyPage.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

import '../css/HomePage.css';
import '../css/MyPage.css';

import mainLogo from '../assets/logo.png';

const API_BASE = process.env.REACT_APP_API_BASE;

export default function MyPage() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [portfolios, setPortfolios] = useState([]);
  const [resumes, setResumes] = useState([]);
  const [experiences, setExperiences] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');

    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      fetchDashboardData(parsedUser);
    } else {
      alert('로그인이 필요한 페이지입니다.');
      navigate('/auth');
    }
  }, [navigate]);

  const fetchDashboardData = async (currentUser) => {
    try {
      const userId = currentUser.id || currentUser._id || currentUser.email;

      try {
        const portRes = await axios.get(`${API_BASE}/api/portfolio/${userId}`);
        if (portRes.data.success && portRes.data.data) {
          setPortfolios(
            Array.isArray(portRes.data.data)
              ? portRes.data.data
              : [portRes.data.data]
          );
        }
      } catch (e) {
        console.log('포트폴리오 없음');
      }

      try {
        const resumeRes = await axios.get(`${API_BASE}/api/resume/${userId}`);
        if (resumeRes.data.success && resumeRes.data.data) {
          setResumes(
            Array.isArray(resumeRes.data.data)
              ? resumeRes.data.data
              : [resumeRes.data.data]
          );
        }
      } catch (e) {
        console.log('자소서 없음');
      }

      try {
        const expRes = await axios.get(`${API_BASE}/api/experience/${userId}`);
        if (expRes.data.success && expRes.data.data) {
          setExperiences(
            Array.isArray(expRes.data.data)
              ? expRes.data.data
              : [expRes.data.data]
          );
        }
      } catch (e) {
        console.log('경험 없음');
      }
    } catch (error) {
      console.log('데이터 로드 오류');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
    alert('성공적으로 로그아웃 되었습니다.');
    navigate('/');
  };

  if (!user) return null;

  return (
    <div className="mp-container">
      {/* 헤더 */}
      <header className="mp-header">
        <div className="mp-header-inner">
          <a href="/" className="mp-logo-btn">
            <img
              src={mainLogo}
              alt="F1ND YOUR WAY 로고"
              className="navbar-logo-img"
            />
          </a>

          <button className="mp-nav-btn" onClick={handleLogout}>
            LOGOUT
          </button>
        </div>
      </header>

      <div className="mp-content-wrapper">
        {/* 상단 히어로 섹션 */}
        <div className="mp-hero-section">
          <div className="mp-hero-text">
            <h1 className="mp-main-title">
              WELCOME BACK,{' '}
              <span className="highlight-text">{user.name}</span>
            </h1>
            <p className="mp-sub-title">
              당신의 커리어 레이싱을 위한 패독(Paddock)에 오신 것을 환영합니다.
            </p>
          </div>

          <div className="mp-stats-container">
            <div className="mp-stat-box">
              <span className="stat-label">EXPERIENCES</span>
              <span className="stat-value">{experiences.length}</span>
            </div>

            <div className="mp-stat-box">
              <span className="stat-label">RESUMES</span>
              <span className="stat-value">{resumes.length}</span>
            </div>

            <div className="mp-stat-box">
              <span className="stat-label">PORTFOLIOS</span>
              <span className="stat-value">{portfolios.length}</span>
            </div>
          </div>
        </div>

        {/* 벤토 그리드 */}
        <div className="mp-bento-grid">
          {/* 1. PROFILE */}
          <div className="bento-card card-profile">
            <h2 className="bento-title">DRIVER PROFILE</h2>

            <div className="profile-info-wrap">
              <div className="profile-avatar">
                {user.name.charAt(0)}
              </div>

              <div className="profile-details">
                <p className="p-name">{user.name}</p>
                <p className="p-email">{user.email}</p>
              </div>
            </div>

            {user.careerProfile && (
              <div className="career-profile-preview">
                <p>
                  <strong>지원 상태</strong>
                  <span>{user.careerProfile.status}</span>
                </p>

                <p>
                  <strong>희망 직무</strong>
                  <span>{user.careerProfile.jobs?.length || 0}개 선택</span>
                </p>
              </div>
            )}

            <button
              className="profile-edit-btn"
              onClick={() => navigate('/profile/edit')}
            >
              커리어 프로필 설정
            </button>
          </div>

          {/* 2. SAVED RESUMES */}
          <div className="bento-card card-resumes">
            <div className="bento-header">
              <h2 className="bento-title">SAVED RESUMES</h2>

              <button
                className="bento-btn-primary"
                onClick={() => navigate('/resume/input')}
              >
                + 새 자기소개서
              </button>
            </div>

            <div className="bento-list scroller">
              {isLoading ? (
                <p className="empty-text">로딩 중...</p>
              ) : resumes.length > 0 ? (
                resumes.map((resume, idx) => (
                  <div key={resume._id || idx} className="bento-list-item">
                    <div className="item-info">
                      <span className="item-icon">✍️</span>

                      <div>
                        <p className="item-title">
                          {resume.title || `자기소개서 ${idx + 1}`}
                        </p>
                        <p className="item-date">
                          {new Date(
                            resume.updatedAt || Date.now()
                          ).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <button
                      className="item-action-btn"
                      onClick={() => navigate(`/resume/edit/${resume._id}`)}
                    >
                      수정 ➔
                    </button>
                  </div>
                ))
              ) : (
                <div className="empty-state">작성된 자기소개서가 없습니다.</div>
              )}
            </div>
          </div>

          {/* 3. EXPERIENCES */}
          <div className="bento-card card-experiences">
            <div className="bento-header">
              <h2 className="bento-title">EXPERIENCES</h2>

              <button
                className="bento-btn-icon"
                onClick={() => navigate('/experience/input')}
                title="새 경험 추가"
              >
                +
              </button>
            </div>

            <p className="bento-desc">자소서와 포트폴리오에 쓰일 소스</p>

            <div className="bento-list scroller">
              {isLoading ? (
                <p className="empty-text">로딩 중...</p>
              ) : experiences.length > 0 ? (
                experiences.map((exp, idx) => (
                  <div key={exp._id || idx} className="bento-list-item compact">
                    <p className="item-title text-truncate">
                      📌 {exp.title || `경험 ${idx + 1}`}
                    </p>

                    <button
                      className="item-action-btn small"
                      onClick={() =>
                        navigate('/experience/input', {
                          state: { expId: exp._id },
                        })
                      }
                    >
                      ➔
                    </button>
                  </div>
                ))
              ) : (
                <div className="empty-state">기록된 경험이 없습니다.</div>
              )}
            </div>
          </div>

          {/* 4. SAVED PORTFOLIOS */}
          <div className="bento-card card-portfolios">
            <div className="bento-header">
              <h2 className="bento-title">SAVED PORTFOLIOS</h2>

              <button
                className="bento-btn-primary"
                onClick={() => navigate('/portfolio')}
              >
                + 새 포트폴리오
              </button>
            </div>

            <div className="bento-list scroller">
              {isLoading ? (
                <p className="empty-text">로딩 중...</p>
              ) : portfolios.length > 0 ? (
                portfolios.map((port, idx) => (
                  <div key={port._id || idx} className="bento-list-item">
                    <div className="item-info">
                      <span className="item-icon">📄</span>

                      <div>
                        <p className="item-title">
                          {port.title || `${user.name}의 포트폴리오 ${idx + 1}`}
                        </p>
                        <p className="item-date">
                          {new Date(
                            port.updatedAt || Date.now()
                          ).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <button
                      className="item-action-btn"
                      onClick={() => navigate(`/portfolio/edit/${port._id}`)}
                    >
                      수정 / 보기 ➔
                    </button>
                  </div>
                ))
              ) : (
                <div className="empty-state">저장된 포트폴리오가 없습니다.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}