import { useState } from 'react';

function App() {
  const [resume, setResume] = useState('');
  const [jobPost, setJobPost] = useState('');
  const [preview, setPreview] = useState('');
  const [loading, setLoading] = useState(false);

const generate = async () => {
  setLoading(true);
  try {
    const res = await fetch('http://localhost:5000/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        resume: { experience: resume },
        jobPost,
        options: { tone: '담백', length: '1500자', type: '자유형' },
      }),
    });

    if (!res.ok) {
      // 서버가 에러 JSON을 보냈을 수 있으니까 text/json 둘 다 시도
      let message = `서버 오류 (${res.status})`;
      try {
        const errData = await res.json();
        if (errData?.error) message += `: ${errData.error}`;
      } catch {
        const text = await res.text();
        message += `: ${text}`;
      }
      throw new Error(message);
    }

    const data = await res.json();
    setPreview(data.text || '');
  } catch (e) {
    console.error(e);
    alert('자소서 생성 중 오류가 발생했습니다.\n' + e.message);
  } finally {
    setLoading(false);
  }
};


  const downloadPdf = async () => {
    const res = await fetch('http://localhost:5000/api/pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '자기소개서', content: preview }),
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'coverletter.pdf';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <h1>AI 자소서 생성기</h1>
      <textarea
        placeholder="경험/이력 적기"
        rows={5}
        value={resume}
        onChange={(e) => setResume(e.target.value)}
      />
      <textarea
        placeholder="채용 공고 붙여넣기"
        rows={5}
        value={jobPost}
        onChange={(e) => setJobPost(e.target.value)}
      />
      <button onClick={generate} disabled={loading}>
        {loading ? '생성 중...' : '자소서 생성'}
      </button>

      {preview && (
        <>
          <h3>미리보기</h3>
          <textarea
            rows={15}
            value={preview}
            onChange={(e) => setPreview(e.target.value)}
          />
          <button onClick={downloadPdf}>PDF 다운로드</button>
        </>
      )}
    </div>
  );
}

export default App;
