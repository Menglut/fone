import dotenv from 'dotenv';
import OpenAI from 'openai';

dotenv.config();

const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com',
});

export async function generateCoverLetter({ resume, jobPost, options }) {
  const system = `
너는 한국어 자기소개서 코치이자 편집자다.
과장/허위 절대 금지, 지원자의 실제 경험을 기반으로 정량지표 중심으로 작성해라.
문장 길이는 15~28자로 유지하고, 중복 표현을 줄여라.
  `.trim();

  // ✅ 추가: 답변 블록 만들기
  const interviewAnswers = resume?.interviewAnswers || [];
  const answersBlock =
    Array.isArray(interviewAnswers) && interviewAnswers.length > 0
      ? interviewAnswers
          .map((a) => `- (${a.category || 'etc'}) ${a.answer || ''}`)
          .join('\n')
      : '(없음)';

  // ✅ resume에 interviewAnswers가 너무 길게 들어가면 JSON이 지저분해질 수 있어서 제거한 복사본도 추천
  const resumeForJson = { ...resume };
  delete resumeForJson.interviewAnswers;

  const user = `
[지원자 이력]
${JSON.stringify(resumeForJson, null, 2)}

[추가 질문 답변(경험 보강 정보)]
${answersBlock}

[채용 공고/회사 질문]
${jobPost}

[옵션] 톤:${options?.tone || '담백'}, 분량:${options?.length || '1500자'}, 유형:${options?.type || '자유형'}

위 정보를 바탕으로 한국어 자기소개서를 작성해줘.
  `.trim();

  const resp = await client.chat.completions.create({
    model: 'deepseek-chat',
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    temperature: 0.4,
  });

  return resp.choices[0]?.message?.content?.trim() || '';
}

/**
 * ✅ 추가 질문 생성
 * - 경험 + 회사 질문 기반으로 "빈칸을 채우는 질문" 5개 고정 생성
 * - JSON만 출력하도록 강하게 유도
 */
export async function generateFollowupQuestions({ experienceText, companyQuestion }) {
  const system = `
너는 한국어 자기소개서 컨설턴트다.
목표: 아래 '회사 질문'에 답하기 위해, 사용자의 '경험'에서 부족한 정보를 채우는 "추가 질문 5개"를 만든다.

규칙:
- 질문은 5개 고정
- 각 질문은 한 문장, 답하기 쉽게 구체적으로
- category는 아래 중 하나만 사용: role, problem, action, metric, reflection
- 출력은 반드시 JSON만 출력 (설명/서론/코드블록 금지)
- JSON 스키마:
{"questions":[{"id":"q1","category":"role","text":"..."}, ...]}
  `.trim();

  const user = `
[회사 질문]
${companyQuestion}

[사용자 경험]
${experienceText}
  `.trim();

  const resp = await client.chat.completions.create({
    model: 'deepseek-chat',
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    temperature: 0.2,
  });

  const raw = resp.choices[0]?.message?.content?.trim() || '';

  // ✅ 모델이 앞뒤로 텍스트를 섞을 수 있어서 JSON 부분만 안전 추출
  const jsonText = extractJsonObject(raw);

  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch (e) {
    throw new Error(`followup_questions_json_parse_failed: ${raw}`);
  }

  const qs = parsed?.questions;
  if (!Array.isArray(qs) || qs.length !== 5) {
    throw new Error(`followup_questions_invalid_shape: ${jsonText}`);
  }

  // 최소 필드 검증/정리
  return qs.map((q, idx) => ({
    id: typeof q.id === 'string' ? q.id : `q${idx + 1}`,
    category: q.category,
    text: q.text,
  }));
}

/**
 * ✅ 포트폴리오 생성 (추가된 기능)
 * - 사용자 입력(userPrompt)을 받아서, 미리 정의된 JSON 구조로 변환
 */
export async function generatePortfolioJson({ userPrompt }) {
  const system = `
    너는 IT 포트폴리오 전문 컨설턴트다.
    사용자의 거친(Rough) 입력을 바탕으로, 깔끔하고 전문적인 포트폴리오 데이터를 생성해라.

    [필수 규칙]
    1. 과장하지 말고 사용자가 입력한 내용을 기반으로 '있어 보이게' 다듬어라.
    2. 기술 스택이 명시되지 않았으면 문맥을 보고 추론해서 채워라.
    3. **무조건 아래 JSON 형식으로만 응답해라.** (설명, 마크다운 코드블록 절대 금지)

    [JSON 출력 양식]
    {
      "profile": {
        "name": "입력 없으면 빈칸",
        "jobTitle": "직무 (예: Backend Developer)",
        "email": "입력 없으면 빈칸",
        "intro": "3~4문장의 매력적인 자기소개 (강점 중심)"
      },
      "projects": [
        {
          "title": "프로젝트명",
          "period": "기간 (예: 2024.01 - 2024.06)",
          "techStack": "사용 기술 (쉼표로 구분)",
          "description": "상세 설명 (문제 해결 -> 과정 -> 성과 순으로 3문장 이상 작성)"
        }
      ]
    }
  `.trim();

  const user = `[사용자 입력 데이터]\n${userPrompt}`;

  try {
    const resp = await client.chat.completions.create({
      model: 'deepseek-chat', // 사용 중인 모델
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.3, // 창의성보다는 형식을 지키도록 낮게 설정
    });

    const content = resp.choices[0]?.message?.content?.trim() || '';

    // 혹시 모를 마크다운(```json ... ```) 제거 로직
    const jsonStr = content.replace(/^```json/, '').replace(/```$/, '').trim();

    return JSON.parse(jsonStr); // 객체로 변환해서 반환
  } catch (error) {
    console.error('DeepSeek API Error:', error);
    throw new Error('AI 포트폴리오 생성 실패');
  }
}

function extractJsonObject(text) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return text;
  return text.slice(start, end + 1);
}