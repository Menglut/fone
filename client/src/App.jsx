import { GoogleOAuthProvider } from '@react-oauth/google';

import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useEffect } from "react"; // ✨ useEffect 추가
import { ResumeFlowProvider } from "./context/ResumeFlowContext";

import HomePage from "./page/HomePage";
import PortfolioEditor from "./page/PortfolioEditor";
import ResumeInput from "./page/ResumeInput";
import ResumeInterview from "./page/ResumeInterview";
import ResumeResult from "./page/ResumeResult";
import AuthPage from "./page/AuthPage";
import MyPage from "./page/MyPage";
import ExperienceEditor from './page/ExperienceEditor';
import ProfileEditor from './page/ProfileEditor';

// ✨ 1. 페이지 이동 시 스크롤을 맨 위로 초기화하는 컴포넌트 추가
function ScrollToTop() {
    const { pathname } = useLocation();

    useEffect(() => {
        window.scrollTo(0, 0); // 경로가 바뀔 때마다 스크롤을 X:0, Y:0 으로 강제 이동
    }, [pathname]);

    return null;
}

export default function App() {
// 임시 클라이언트 ID (나중에 구글 콘솔에서 발급받아 .env에 넣으면 됩니다)
const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;

return(
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <ResumeFlowProvider>
            <BrowserRouter>
                <ScrollToTop /> {/* ✨ 2. BrowserRouter 바로 아래에 ScrollToTop 배치 */}
                    <Routes>
                    {/* 메인화면 */}
                    <Route path="/" element={<HomePage />} />

                    {/* 인증 페이지 라우트*/}
                    <Route path="/auth" element={<AuthPage />} />
                    <Route path="/mypage" element={<MyPage />} />

                    {/* 자소서 흐름 */}
                    <Route path="/resume" element={<Navigate to="/resume/input" replace />} />
                    <Route path="/resume/input" element={<ResumeInput />} />
                    <Route path="/resume/interview" element={<ResumeInterview />} />
                    <Route path="/resume/result" element={<ResumeResult />} />

                    { /* 포트폴리오 흐름 */}
                    <Route path="/portfolio" element={<PortfolioEditor />} />

                    { /* 경험 및 프로필 흐름 */}
                    <Route path="/experience/input" element={<ExperienceEditor />} />
                    <Route path="/profile/edit" element={<ProfileEditor />} />

                    {/* 잘못된 주소는 메인으로 */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </BrowserRouter>
        </ResumeFlowProvider>
    </GoogleOAuthProvider>
    );
}