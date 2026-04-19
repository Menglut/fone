// src/page/AuthPage.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import '../css/AuthPage.css';
import axios from 'axios';
import mainLogo from '../assets/logo.png';

export default function AuthPage() {
  const navigate = useNavigate();
  // true면 로그인 화면, false면 회원가입 화면
  const [isLogin, setIsLogin] = useState(true);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
      e.preventDefault();

      try {
        if (isLogin) {
          // [로그인 로직]
          const res = await axios.post('http://localhost:5000/api/auth/login', {
            email: formData.email,
            password: formData.password
          });

          if (res.data.success) {
            localStorage.setItem('user', JSON.stringify(res.data.data));
            alert(`🏁 환영합니다, ${res.data.data.name} 드라이버님!`);
            navigate('/');
          }

        } else {
          // [회원가입 로직]
          const res = await axios.post('http://localhost:5000/api/auth/register', {
            name: formData.name,
            email: formData.email,
            password: formData.password
          });

          if (res.data.success) {
            alert('가입이 완료되었습니다! 이제 엔진에 시동을 걸어주세요(로그인).');
            setIsLogin(true); // 회원가입 성공 시 로그인 폼으로 화면 전환
            setFormData({ ...formData, password: '' }); // 비밀번호 칸 비우기
          }
        }
      } catch (error) {
        // 서버에서 보낸 에러 메시지 띄우기
        const errorMsg = error.response?.data?.message || "요청 처리 중 문제가 발생했습니다.";
        alert(`❌ ${errorMsg}`);
      }
    };

  return (
    <div className="auth-container">
      <div className="auth-card">

        {/* 헤더 및 로고 (클릭 시 메인으로) */}
        <div className="auth-header" onClick={() => navigate('/')}>
          {/* ✨ 2. 기존 h1 태그를 지우고 이미지 태그로 교체 */}
          <img 
            src={mainLogo} 
            alt="F1ND YOUR WAY 로고" 
            className="auth-logo-img" 
          />
        </div>
        <p className="auth-subtitle">
          {isLogin ? '엔진에 시동을 걸어주세요' : '새로운 드라이버로 등록하세요'}
        </p>

        {/* 일반 이메일 폼 */}
        <form className="auth-form" onSubmit={handleSubmit}>
          {!isLogin && (
            <div className="auth-input-group">
              <label>Name</label>
              <input type="text" name="name" className="auth-input" placeholder="홍길동" value={formData.name} onChange={handleChange} required />
            </div>
          )}
          <div className="auth-input-group">
            <label>Email</label>
            <input type="email" name="email" className="auth-input" placeholder="driver@naver.com" value={formData.email} onChange={handleChange} required />
          </div>
          <div className="auth-input-group">
            <label>Password</label>
            <input type="password" name="password" className="auth-input" placeholder="••••••••" value={formData.password} onChange={handleChange} required />
          </div>
          <button type="submit" className="auth-btn">
            {isLogin ? 'LOGIN' : 'SIGN UP'}
          </button>
        </form>

        <div className="auth-divider">OR</div>

        {/* 구글 로그인 연동 버튼 */}
        <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
          <GoogleLogin
            onSuccess={async (credentialResponse) => {
              try {
                // 백엔드로 토큰 전송
                const res = await axios.post('http://localhost:5000/api/auth/google', {
                  token: credentialResponse.credential
                });

                if (res.data.success) {
                  // ✨ 핵심: 브라우저 로컬 스토리지에 유저 정보 저장 (새로고침해도 유지됨)
                  localStorage.setItem('user', JSON.stringify(res.data.data));

                  alert(`🏁 환영합니다, ${res.data.data.name} 드라이버님!`);
                  navigate('/');
                }
              } catch (error) {
                console.error("서버 로그인 에러:", error);
                alert("로그인 처리 중 문제가 발생했습니다.");
              }
            }}
            onError={() => {
              console.log("❌ 구글 로그인 창 닫힘 또는 에러");
            }}
            theme="filled_black"
            shape="rectangular"
            // width="100%" 대신 폼 너비에 맞춰 픽셀을 고정하거나 아예 빼버리는 게 깔끔해!
            width="340"
          />
        </div>

        {/* 화면 전환 토글 */}
        <div className="auth-toggle">
          {isLogin ? '아직 드라이버 등록을 안 하셨나요?' : '이미 등록된 드라이버이신가요?'}
          <span onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? 'SIGN UP' : 'LOGIN'}
          </span>
        </div>

      </div>
    </div>
  );
}