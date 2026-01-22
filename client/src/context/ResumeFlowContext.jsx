import { createContext, useContext, useMemo, useState } from "react";

const ResumeFlowContext = createContext(null);

export function ResumeFlowProvider({ children }) {
  const [resume, setResume] = useState("");
  const [jobPost, setJobPost] = useState("");

  const [followupQs, setFollowupQs] = useState([]); // [{id, category, text}]
  const [followupAns, setFollowupAns] = useState({}); // { [id]: answer }

  const [preview, setPreview] = useState("");

  // interview 진행 상태
  const [qIndex, setQIndex] = useState(0);
  const [skipped, setSkipped] = useState(new Set()); // Set<questionId>

  const resetAll = () => {
    setResume("");
    setJobPost("");
    setFollowupQs([]);
    setFollowupAns({});
    setPreview("");
    setQIndex(0);
    setSkipped(new Set());
  };

  const value = useMemo(
    () => ({
      resume,
      setResume,
      jobPost,
      setJobPost,
      followupQs,
      setFollowupQs,
      followupAns,
      setFollowupAns,
      preview,
      setPreview,
      qIndex,
      setQIndex,
      skipped,
      setSkipped,
      resetAll,
    }),
    [resume, jobPost, followupQs, followupAns, preview, qIndex, skipped]
  );

  return (
    <ResumeFlowContext.Provider value={value}>
      {children}
    </ResumeFlowContext.Provider>
  );
}

export function useResumeFlow() {
  const ctx = useContext(ResumeFlowContext);
  if (!ctx) throw new Error("useResumeFlow must be used within ResumeFlowProvider");
  return ctx;
}
