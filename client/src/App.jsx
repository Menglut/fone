import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ResumeFlowProvider } from "./context/ResumeFlowContext";

import HomePage from "./page/HomePage"; // ✅ HomePage.jsx가 src/HomePage.jsx에 있을 때
import ResumeInput from "./page/ResumeInput";
import ResumeInterview from "./page/ResumeInterview";
import ResumeResult from "./page/ResumeResult";

export default function App() {
  return (
    <ResumeFlowProvider>
      <BrowserRouter>
        <Routes>
          {/* ✅ 메인화면 */}
          <Route path="/" element={<HomePage />} />

          {/* ✅ 자소서 흐름 */}
          <Route path="/resume" element={<Navigate to="/resume/input" replace />} />
          <Route path="/resume/input" element={<ResumeInput />} />
          <Route path="/resume/interview" element={<ResumeInterview />} />
          <Route path="/resume/result" element={<ResumeResult />} />

          {/* ✅ 잘못된 주소는 메인으로 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ResumeFlowProvider>
  );
}
