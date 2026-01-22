import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ResumeFlowProvider } from "./context/ResumeFlowContext";

import ResumeInput from "./page/ResumeInput";
import ResumeInterview from "./page/ResumeInterview";
import ResumeResult from "./page/ResumeResult";

export default function App() {
  return (
    <ResumeFlowProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/resume/input" replace />} />
          <Route path="/resume/input" element={<ResumeInput />} />
          <Route path="/resume/interview" element={<ResumeInterview />} />
          <Route path="/resume/result" element={<ResumeResult />} />
        </Routes>
      </BrowserRouter>
    </ResumeFlowProvider>
  );
}
