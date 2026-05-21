import dotenv from 'dotenv';
import OpenAI from 'openai';

dotenv.config();

const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com',
});

function safeJsonParse(content = '{}', fallback = {}) {
  const cleaned = String(content || '{}')
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch (error) {
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');

    if (firstBrace >= 0 && lastBrace > firstBrace) {
      try {
        return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
      } catch (_) {
        return fallback;
      }
    }

    return fallback;
  }
}

function compactText(value = '', maxLength = 7000) {
  const text = String(value || '').trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trim()}...`;
}

function normalizeCompany(company = {}) {
  return {
    name: String(company.name || '').trim(),
    position: String(company.position || company.targetJob || '').trim(),
    jobDescription: String(company.jobDescription || company.jd || '').trim(),
    jobPostingUrl: String(company.jobPostingUrl || company.url || '').trim(),
    requiredSkills: Array.isArray(company.requiredSkills)
      ? company.requiredSkills.filter(Boolean)
      : [],
  };
}

function normalizeExperiences(experiences = []) {
  if (!Array.isArray(experiences)) return [];

  return experiences
    .filter(Boolean)
    .map((item, index) => ({
      id: String(item.id || item._id || `exp-${index + 1}`),
      type: item.type || 'experience',
      title: String(item.title || item.name || `경험 ${index + 1}`).trim(),
      sourceTitle: String(item.sourceTitle || item.type || '').trim(),
      content: compactText(
        item.content ||
          item.summary ||
          item.description ||
          item.text ||
          JSON.stringify(item, null, 2),
        5000,
      ),
    }))
    .filter((item) => item.title || item.content);
}

function buildCompanyBlock(company = {}) {
  const normalized = normalizeCompany(company);
  return [
    normalized.name && `기업명: ${normalized.name}`,
    normalized.position && `지원 직무: ${normalized.position}`,
    normalized.jobPostingUrl && `채용공고 URL: ${normalized.jobPostingUrl}`,
    normalized.requiredSkills.length && `요구 역량/기술: ${normalized.requiredSkills.join(', ')}`,
    normalized.jobDescription && `채용공고/기업 특징:\n${compactText(normalized.jobDescription, 3000)}`,
  ]
    .filter(Boolean)
    .join('\n');
}

function buildExperienceBlock(experiences = []) {
  const normalized = normalizeExperiences(experiences);
  if (!normalized.length) return '(선택된 경험 없음)';

  return normalized
    .map((item, index) => {
      return [
        `경험 ${index + 1}`,
        `출처: ${item.type}`,
        `제목: ${item.title}`,
        `내용:\n${compactText(item.content, 5000)}`,
      ].join('\n');
    })
    .join('\n\n---\n\n');
}

function fallbackQuestions(mode = 'weakness') {
  if (mode === 'strength') {
    return [
      {
        id: 'q1',
        question: '선택한 경험에서 본인이 가장 자신 있게 설명할 수 있는 성과는 무엇인가요?',
        intent: '지원자의 핵심 강점과 직무 연결성을 확인하기 위한 질문입니다.',
        focus: '강점',
        difficulty: 'normal',
      },
      {
        id: 'q2',
        question: '그 성과를 만들기 위해 본인이 직접 한 행동과 의사결정은 무엇이었나요?',
        intent: '성과가 우연이 아니라 지원자의 주도적 행동에서 나왔는지 확인합니다.',
        focus: '역할/행동',
        difficulty: 'normal',
      },
      {
        id: 'q3',
        question: '이 경험이 지원한 기업과 직무에서 어떻게 재현될 수 있다고 생각하나요?',
        intent: '경험을 지원 직무의 실질적 역량으로 연결하는지 확인합니다.',
        focus: '직무 적합성',
        difficulty: 'normal',
      },
    ];
  }

  return [
    {
      id: 'q1',
      question: '선택한 경험에서 본인의 역할이 구체적으로 무엇이었는지 설명해 주세요.',
      intent: '경험 속 실제 기여도와 역할의 명확성을 검증하기 위한 질문입니다.',
      focus: '역할 모호성',
      difficulty: 'pressure',
    },
    {
      id: 'q2',
      question: '그 경험에서 가장 어려웠던 문제와 본인이 직접 해결한 방법은 무엇인가요?',
      intent: '문제 해결 과정이 구체적인지 확인합니다.',
      focus: '문제 해결 과정',
      difficulty: 'pressure',
    },
    {
      id: 'q3',
      question: '결과를 객관적으로 증명할 수 있는 근거나 수치가 있나요?',
      intent: '성과의 구체성과 검증 가능성을 확인합니다.',
      focus: '성과 근거 부족',
      difficulty: 'pressure',
    },
  ];
}

export async function generateInterviewQuestions({ mode = 'weakness', company, selectedExperiences }) {
  const safeMode = mode === 'strength' ? 'strength' : 'weakness';
  const modeLabel = safeMode === 'strength' ? '강점 어필 면접' : '약점 분석 압박 면접';

  const system = `
너는 한국어 IT/개발 직무 면접관이자 취업 코치다.
사용자가 선택한 기업, 직무, 경험을 바탕으로 ${modeLabel} 질문 3개를 만든다.

[공통 규칙]
- 반드시 질문은 3개만 만든다.
- 질문은 실제 면접에서 사용할 수 있는 자연스러운 한국어 한 문장으로 만든다.
- 사용자가 제공하지 않은 기술, 성과, 회사 경험을 지어내지 않는다.
- 기업/직무 정보가 있으면 질문 의도에 반영한다.
- 각 질문에는 intent, focus, difficulty를 함께 제공한다.

[약점 분석 모드]
- 경험에서 역할이 모호한 부분, 수치가 부족한 부분, 문제 해결 과정이 약한 부분, 직무 연결이 약한 부분을 찾아 날카롭게 질문한다.

[강점 어필 모드]
- 경험에서 강점, 성과, 기술적 의사결정, 직무 적합성을 찾고 사용자가 잘 어필할 수 있게 질문한다.

반드시 JSON 객체만 반환한다.
{
  "mode": "weakness 또는 strength",
  "summary": "질문 생성 기준 요약",
  "questions": [
    {
      "id": "q1",
      "question": "질문",
      "intent": "질문 의도",
      "focus": "검증 포인트",
      "difficulty": "normal 또는 pressure"
    }
  ]
}
`.trim();

  const user = `
[모드]
${safeMode}

[기업/직무]
${buildCompanyBlock(company) || '(기업 정보 없음)'}

[선택 경험]
${buildExperienceBlock(selectedExperiences)}
`.trim();

  try {
    const resp = await client.chat.completions.create({
      model: 'deepseek-chat',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: safeMode === 'weakness' ? 0.25 : 0.22,
    });

    const parsed = safeJsonParse(resp.choices[0]?.message?.content || '{}', {});
    const questions = Array.isArray(parsed.questions) ? parsed.questions : [];
    const normalizedQuestions = questions
      .filter((q) => q?.question)
      .slice(0, 3)
      .map((q, index) => ({
        id: q.id || `q${index + 1}`,
        question: String(q.question || '').trim(),
        intent: String(q.intent || '').trim(),
        focus: String(q.focus || '').trim(),
        difficulty: q.difficulty === 'pressure' ? 'pressure' : 'normal',
      }));

    return {
      mode: safeMode,
      summary: parsed.summary || `${modeLabel} 질문을 생성했습니다.`,
      questions: normalizedQuestions.length === 3 ? normalizedQuestions : fallbackQuestions(safeMode),
    };
  } catch (error) {
    console.error('면접 질문 생성 실패:', error);
    return {
      mode: safeMode,
      summary: 'AI 질문 생성에 실패해 기본 질문을 반환했습니다.',
      questions: fallbackQuestions(safeMode),
    };
  }
}

export async function generateFreePracticeQuestion({ company, selectedExperiences, userPrompt, previousQuestions = [], chatContext = [], randomSeed = '' }) {
  const system = `
너는 한국어 IT/개발 직무 면접 연습 코치다.
사용자가 선택한 기업/직무/경험을 바탕으로 자유 면접 연습용 질문 1개를 만든다.

[가장 중요한 규칙]
- 질문은 1개만 만든다.
- 이전에 생성된 질문과 같은 의미의 질문을 반복하지 않는다.
- 표현만 바꾼 중복 질문도 금지한다.
- 질문은 실제 기업 면접관이 물을 법한 구체적인 질문이어야 한다.
- 기업/직무/채용공고 정보가 있으면 해당 기업의 요구 역량과 연결한다.
- 선택 경험이 있으면 경험의 역할, 문제 해결, 성과, 협업, 기술 선택, 실패/개선 중 하나를 구체적으로 파고든다.
- 사용자가 직접 원하는 질문 주제를 입력했다면 그 의도를 반영하되, 이전 질문과 겹치지 않게 다른 각도로 만든다.
- 제공되지 않은 프로젝트, 기술, 수치, 회사 정보를 지어내지 않는다.

[질문 다양화 기준]
아래 관점 중 이전 질문과 겹치지 않는 관점을 우선 선택한다.
1. 직무 적합성
2. 기술 선택 이유
3. 문제 해결 과정
4. 성과와 검증 근거
5. 협업/갈등 해결
6. 실패 경험과 개선
7. 기업 공고 요구사항과의 연결
8. 입사 후 기여 가능성

[반환 규칙]
- 반드시 JSON 객체만 반환한다.
{
  "question": "질문",
  "intent": "질문 의도",
  "questionType": "직무 적합성/기술 선택/문제 해결/성과 검증/협업/실패 개선/기업 적합성/입사 후 기여 중 하나",
  "evaluationFocus": ["평가 기준1", "평가 기준2"]
}
`.trim();

  const safePreviousQuestions = Array.isArray(previousQuestions)
    ? previousQuestions.filter(Boolean).slice(-10)
    : [];

  const safeChatContext = Array.isArray(chatContext)
    ? chatContext.slice(-10)
    : [];

  const user = `
[사용자 요청]
${userPrompt || '(자유 연습 질문 생성)'}

[반드시 피해야 할 이전 질문 목록]
${safePreviousQuestions.length ? safePreviousQuestions.map((q, idx) => `${idx + 1}. ${q}`).join('\n') : '(이전 질문 없음)'}

[최근 대화 맥락]
${safeChatContext.length ? JSON.stringify(safeChatContext, null, 2) : '(없음)'}

[다양화 시드]
${randomSeed || Date.now()}

[기업/직무]
${buildCompanyBlock(company) || '(기업 정보 없음)'}

[선택 경험]
${buildExperienceBlock(selectedExperiences)}
`.trim();

  try {
    const resp = await client.chat.completions.create({
      model: 'deepseek-chat',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.72,
      presence_penalty: 0.45,
      frequency_penalty: 0.35,
    });

    const parsed = safeJsonParse(resp.choices[0]?.message?.content || '{}', {});
    return {
      question:
        parsed.question ||
        '지원한 직무와 관련해 본인이 가장 자신 있게 설명할 수 있는 경험을 말해 주세요.',
      intent: parsed.intent || '직무 관련 경험의 구체성과 적합성을 확인하기 위한 질문입니다.',
      questionType: parsed.questionType || '직무 적합성',
      evaluationFocus: Array.isArray(parsed.evaluationFocus)
        ? parsed.evaluationFocus.filter(Boolean)
        : ['질문 의도 파악', '경험의 구체성', '직무 연관성', '논리적 구성'],
    };
  } catch (error) {
    console.error('자유 연습 질문 생성 실패:', error);
    return {
      question: '지원한 직무와 관련해 본인이 가장 자신 있게 설명할 수 있는 경험을 말해 주세요.',
      intent: '직무 관련 경험의 구체성과 적합성을 확인하기 위한 질문입니다.',
      questionType: '직무 적합성',
      evaluationFocus: ['질문 의도 파악', '경험의 구체성', '직무 연관성', '논리적 구성'],
    };
  }
}

export async function evaluateInterviewAnswer({
  mode = 'free',
  company,
  selectedExperiences,
  question,
  answer,
  chatContext = [],
}) {
  const safeMode = ['weakness', 'strength', 'free'].includes(mode) ? mode : 'free';

  const system = `
너는 한국어 면접 답변 평가관이다.
사용자의 면접 답변을 0~100점으로 평가하고, 좋았던 점과 부족한 점, 개선 답변 예시를 제공한다.

[평가 기준 - 총 100점]
- 질문 의도 파악(intent): 20점
- 경험의 구체성(specificity): 25점
- 지원 기업/직무 연관성(jobFit): 20점
- 논리적 구성(structure): 15점
- 성과와 배운 점(result): 10점
- 표현력(expression): 10점

[모드별 기준]
- weakness: 약점 질문이므로 모호한 답변, 근거 부족, 회피성 답변을 엄격히 평가한다.
- strength: 강점 질문이므로 강점을 직무와 연결하고 성과를 설득력 있게 말했는지 평가한다.
- free: 자유 연습이므로 사용자의 답변이 어떤 수준의 면접 답변인지 점수화하고 개선 방향을 알려준다.

[규칙]
- 사용자가 말하지 않은 경험/성과/수치를 개선 답변에 새로 만들어 넣지 않는다.
- 개선 답변에 확인되지 않은 부분은 [직접 작성: ...] 형태로 남긴다.
- followUpQuestion은 답변을 더 깊게 검증할 수 있는 꼬리질문 1개만 작성한다.
- 반드시 JSON 객체만 반환한다.
- scoreBreakdown은 반드시 위 6개 영문 key(intent, specificity, jobFit, structure, result, expression)를 모두 포함한다.
- score는 scoreBreakdown 6개 항목의 합계로 계산한다.
- 점수 key를 한국어로 반환하지 말고 반드시 영문 key로 반환한다.
{
  "score": 0,
  "level": "부족/보통/좋음/우수",
  "scoreBreakdown": {
    "intent": 0,
    "specificity": 0,
    "jobFit": 0,
    "structure": 0,
    "result": 0,
    "expression": 0
  },
  "goodPoints": ["좋았던 점"],
  "weakPoints": ["부족한 점"],
  "advice": ["개선 방향"],
  "improvedAnswer": "개선 답변 예시",
  "followUpQuestion": "꼬리질문"
}
`.trim();

  const user = `
[모드]
${safeMode}

[기업/직무]
${buildCompanyBlock(company) || '(기업 정보 없음)'}

[선택 경험]
${buildExperienceBlock(selectedExperiences)}

[현재 질문]
${question || '(질문 없음)'}

[사용자 답변]
${answer || '(답변 없음)'}

[이전 대화]
${Array.isArray(chatContext) ? JSON.stringify(chatContext.slice(-10), null, 2) : '(없음)'}
`.trim();

  try {
    const resp = await client.chat.completions.create({
      model: 'deepseek-chat',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.18,
    });

    const parsed = safeJsonParse(resp.choices[0]?.message?.content || '{}', {});
    const breakdown = parsed.scoreBreakdown || parsed.criteria || parsed.breakdown || {};

    const pickScore = (keys, max) => {
      for (const key of keys) {
        const raw = breakdown?.[key] ?? parsed?.[key];
        const value = typeof raw === 'object' && raw !== null ? Number(raw.score ?? raw.value ?? raw.point) : Number(raw);
        if (Number.isFinite(value)) {
          return Math.max(0, Math.min(max, value));
        }
      }
      return 0;
    };

    const scoreBreakdown = {
      intent: pickScore(['intent', 'questionIntent', 'intentUnderstanding', 'questionUnderstanding', '질문 의도 파악', '질문의도파악'], 20),
      specificity: pickScore(['specificity', 'experienceSpecificity', 'detail', 'details', 'concreteness', '경험의 구체성', '경험구체성'], 25),
      jobFit: pickScore(['jobFit', 'companyFit', 'relevance', 'jobRelevance', 'companyRelevance', '직무/기업 연관성', '직무기업연관성', '지원 기업/직무 연관성'], 20),
      structure: pickScore(['structure', 'logic', 'logicalStructure', 'flow', '논리적 구성', '논리구성'], 15),
      result: pickScore(['result', 'outcome', 'learning', 'resultAndLearning', 'resultLearning', 'lesson', '성과와 배운 점', '성과와배운점', '성과/배운점'], 10),
      expression: pickScore(['expression', 'communication', 'attitude', 'delivery', '표현력', '표현력과 태도', '표현'], 10),
    };

    const breakdownTotal = Object.values(scoreBreakdown).reduce((sum, value) => sum + value, 0);
    const parsedScore = Number(parsed.score ?? parsed.totalScore);
    const score = breakdownTotal > 0
      ? Math.max(0, Math.min(100, Math.round(breakdownTotal)))
      : Math.max(0, Math.min(100, Number.isFinite(parsedScore) ? parsedScore : 0));

    return {
      score,
      level: parsed.level || (score >= 85 ? '우수' : score >= 70 ? '좋음' : score >= 50 ? '보통' : '부족'),
      scoreBreakdown,
      goodPoints: Array.isArray(parsed.goodPoints) ? parsed.goodPoints.filter(Boolean) : [],
      weakPoints: Array.isArray(parsed.weakPoints) ? parsed.weakPoints.filter(Boolean) : [],
      advice: Array.isArray(parsed.advice) ? parsed.advice.filter(Boolean) : [],
      improvedAnswer: String(parsed.improvedAnswer || '').trim(),
      followUpQuestion: String(parsed.followUpQuestion || '').trim(),
    };
  } catch (error) {
    console.error('면접 답변 평가 실패:', error);
    return {
      score: 0,
      level: '평가 실패',
      scoreBreakdown: {
        intent: 0,
        specificity: 0,
        jobFit: 0,
        structure: 0,
        result: 0,
        expression: 0,
      },
      goodPoints: [],
      weakPoints: ['AI 평가 중 오류가 발생했습니다.'],
      advice: ['잠시 후 다시 시도해 주세요.'],
      improvedAnswer: '',
      followUpQuestion: '',
    };
  }
}

export async function analyzeJobPostingText({ url = '', title = '', rawText = '' }) {
  const system = `
너는 한국어 채용공고 분석가다.
사용자가 제공한 채용공고 URL의 텍스트를 분석해서 면접 질문 생성에 사용할 기업/직무 정보를 추출한다.

[규칙]
- 텍스트에 없는 기업명, 직무명, 기술스택을 지어내지 않는다.
- 기업명이나 직무가 불명확하면 빈 문자열로 둔다.
- jobDescription은 면접 질문 생성에 바로 쓸 수 있게 핵심 요구사항, 주요 업무, 우대사항, 기술스택을 한국어로 압축한다.
- 반드시 JSON 객체만 반환한다.
{
  "company": {
    "name": "기업명",
    "position": "지원 직무",
    "jobDescription": "채용공고 요약",
    "requiredSkills": ["요구 기술 또는 역량"]
  },
  "summary": "공고 분석 요약"
}
`.trim();

  const user = `
[URL]
${url || '(없음)'}

[페이지 제목]
${title || '(없음)'}

[채용공고 텍스트]
${compactText(rawText, 9000)}
`.trim();

  try {
    const resp = await client.chat.completions.create({
      model: 'deepseek-chat',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.12,
    });

    const parsed = safeJsonParse(resp.choices[0]?.message?.content || '{}', {});
    const company = parsed.company || {};
    const requiredSkills = Array.isArray(company.requiredSkills)
      ? company.requiredSkills.filter(Boolean).slice(0, 12)
      : [];

    return {
      company: {
        name: String(company.name || '').trim(),
        position: String(company.position || '').trim(),
        jobDescription: String(company.jobDescription || parsed.summary || '').trim(),
        requiredSkills,
      },
      summary: String(parsed.summary || company.jobDescription || '').trim(),
    };
  } catch (error) {
    console.error('채용공고 텍스트 분석 실패:', error);
    return {
      company: {
        name: '',
        position: '',
        jobDescription: compactText(rawText, 1800),
        requiredSkills: [],
      },
      summary: compactText(rawText, 1200),
    };
  }
}



function normalizeSuggestionItem(item = {}, index = 0, mode = 'weakness') {
  const fallbackQuestion = mode === 'strength'
    ? '이 경험이 우리 회사의 지원 직무와 어떻게 연결된다고 생각하나요?'
    : '이 경험에서 본인이 직접 수행한 범위가 어디까지인지 구체적으로 설명해 주세요.';

  return {
    id: String(item.id || `suggestion-${index + 1}`),
    question: String(item.question || fallbackQuestion).trim(),
    intent: String(item.intent || '').trim(),
    targetPoint: String(item.targetPoint || item.focus || '').trim(),
    companyFit: String(item.companyFit || '').trim(),
    pressureLevel: String(item.pressureLevel || (mode === 'weakness' ? 'high' : 'normal')).trim(),
  };
}

function fallbackReverseSuggestions(mode = 'weakness', company = {}, selectedExperiences = []) {
  const normalizedCompany = normalizeCompany(company);
  const companyName = normalizedCompany.name || '지원 기업';
  const position = normalizedCompany.position || '지원 직무';
  const jd = compactText(normalizedCompany.jobDescription || '', 500);
  const firstExp = normalizeExperiences(selectedExperiences)[0] || {};
  const expTitle = firstExp.title || '선택한 경험';

  if (mode === 'strength') {
    return [
      {
        id: 's1',
        question: `${companyName}의 ${position} 직무에서 ${expTitle} 경험을 가장 강한 근거로 제시한다면, 어떤 문제 해결 역량을 보여준 사례라고 설명하시겠습니까?`,
        intent: '선택 경험을 기업/직무 요구 역량과 직접 연결해 말할 수 있는지 확인합니다.',
        targetPoint: '직무 적합성·문제 해결력',
        companyFit: jd ? `공고에서 보이는 요구 역량과 경험의 연결성 확인: ${jd}` : `${companyName} ${position}에 맞는 경험 재현 가능성 확인`,
        pressureLevel: 'normal',
      },
      {
        id: 's2',
        question: `${expTitle}에서 본인이 직접 내린 기술적 의사결정이나 개선 판단은 무엇이었고, 그 판단이 결과에 어떤 영향을 줬나요?`,
        intent: '성과가 단순 참여가 아니라 본인의 판단과 실행에서 나왔는지 검증합니다.',
        targetPoint: '기술 판단·주도성',
        companyFit: `${position} 직무에서 필요한 실무 판단력을 확인합니다.`,
        pressureLevel: 'normal',
      },
      {
        id: 's3',
        question: `${companyName}에 입사한 뒤 비슷한 상황을 맡는다면, 이 경험을 바탕으로 어떤 방식으로 더 빠르게 성과를 낼 수 있습니까?`,
        intent: '과거 경험을 입사 후 기여 가능성으로 확장할 수 있는지 확인합니다.',
        targetPoint: '입사 후 기여도',
        companyFit: `${companyName} 맞춤 기여 가능성 확인`,
        pressureLevel: 'normal',
      },
      {
        id: 's4',
        question: `${expTitle}에서 협업이나 커뮤니케이션 측면에서 본인의 강점이 드러난 순간이 있다면 구체적으로 설명해 주세요.`,
        intent: '기술 외 협업 역량을 실제 경험으로 설명할 수 있는지 확인합니다.',
        targetPoint: '협업·커뮤니케이션',
        companyFit: `${position} 직무의 팀 기반 업무 적합성 확인`,
        pressureLevel: 'normal',
      },
      {
        id: 's5',
        question: `이 경험을 다른 지원자와 차별화되는 강점으로 말한다면, 면접관이 기억해야 할 한 가지 포인트는 무엇입니까?`,
        intent: '핵심 강점을 짧고 선명하게 정리할 수 있는지 확인합니다.',
        targetPoint: '차별화 포인트',
        companyFit: `${companyName} 면접에서 기억에 남는 메시지 확인`,
        pressureLevel: 'normal',
      },
    ];
  }

  return [
    {
      id: 's1',
      question: `${companyName}의 ${position} 직무 기준으로 보면 ${expTitle} 경험에서 본인의 직접 기여 범위가 모호해 보입니다. 정확히 어떤 부분을 본인이 책임졌나요?`,
      intent: '서류에서 역할과 기여 범위가 명확한지 압박 검증합니다.',
      targetPoint: '역할 모호성',
      companyFit: jd ? `공고 요구사항 대비 실제 수행 범위 확인: ${jd}` : `${position} 실무 수행 가능성 확인`,
      pressureLevel: 'high',
    },
    {
      id: 's2',
      question: `${expTitle}의 결과가 좋아 보이지만 객관적인 수치나 검증 근거가 부족합니다. 성과를 어떻게 증명할 수 있나요?`,
      intent: '성과가 주장에 그치지 않고 근거로 입증되는지 확인합니다.',
      targetPoint: '성과 근거 부족',
      companyFit: `${companyName} 면접관 관점의 검증 가능성 확인`,
      pressureLevel: 'high',
    },
    {
      id: 's3',
      question: `해당 경험에서 사용한 기술이나 방식이 ${companyName}의 ${position} 업무에도 적합하다고 볼 근거가 있나요? 단순히 써봤다는 수준은 아닌가요?`,
      intent: '기술 사용 경험이 지원 기업의 실무 맥락과 연결되는지 압박합니다.',
      targetPoint: '기업/직무 연결 약함',
      companyFit: `${companyName} ${position} 요구 역량과 선택 경험의 적합성 확인`,
      pressureLevel: 'high',
    },
    {
      id: 's4',
      question: `${expTitle}에서 가장 어려웠던 문제를 해결했다고 했는데, 본인이 직접 해결한 과정과 팀의 도움을 받은 부분을 구분해서 설명해 주세요.`,
      intent: '문제 해결 과정에서 개인 기여와 팀 기여를 분리해 검증합니다.',
      targetPoint: '개인 기여 검증',
      companyFit: `${position} 실무에서 독립적으로 문제를 해결할 수 있는지 확인`,
      pressureLevel: 'high',
    },
    {
      id: 's5',
      question: `만약 ${companyName} 면접관이 이 경험에서 가장 약한 부분 하나를 지적한다면 무엇이라고 생각하고, 어떻게 보완하겠습니까?`,
      intent: '자기 객관화와 보완 계획이 있는지 확인합니다.',
      targetPoint: '자기 객관화·보완 계획',
      companyFit: `${companyName} 입사 후 성장 가능성 확인`,
      pressureLevel: 'medium',
    },
  ];
}

export async function generateReverseQuestionSuggestions({ mode = 'weakness', company, selectedExperiences }) {
  const safeMode = mode === 'strength' ? 'strength' : 'weakness';
  const modeLabel = safeMode === 'strength' ? '강점 역면접' : '약점 역면접';

  const system = `
너는 실제 한국 IT/개발 직무 면접관처럼 질문을 설계하는 면접 질문 디렉터다.
사용자가 선택한 기업/직무/채용공고/서류를 바탕으로 ${modeLabel}에서 사용자가 AI 지원자에게 던질 추천 질문을 만든다.

[핵심]
- 사용자는 면접관이고, AI가 지원자 역할을 한다.
- 추천 질문은 사용자가 클릭해서 바로 AI 지원자에게 던질 수 있어야 한다.
- 질문은 실제 기업 면접관이 할 법한 질문이어야 하며, 기업명/직무/공고 요구사항/선택 경험을 가능한 한 직접 반영한다.
- 제공되지 않은 프로젝트, 기술, 수치, 회사 정보를 지어내지 않는다.
- 너무 일반적인 질문 금지: "강점은 무엇인가요?", "어려웠던 점은?"처럼 추상적인 문장은 피한다.
- 질문 5개를 만든다.

[약점 역면접]
- 서류에서 역할이 모호한 부분, 성과 근거가 약한 부분, 기술 선택 이유가 빈약한 부분, 기업/직무 연결이 약한 부분, 팀 기여와 개인 기여가 섞인 부분을 찌른다.
- 면접관이 의심할 만한 표현으로 날카롭게 묻는다.

[강점 역면접]
- 서류에서 가장 강하게 어필할 수 있는 경험을 기업 요구 역량과 연결해서 묻는다.
- AI 지원자가 좋은 답변을 할 수 있도록 강점이 드러나는 질문으로 만든다.

반드시 JSON 객체만 반환한다.
{
  "mode": "weakness 또는 strength",
  "basis": "질문 생성 기준 요약",
  "suggestions": [
    {
      "id": "s1",
      "question": "추천 질문",
      "intent": "면접관 질문 의도",
      "targetPoint": "검증/어필 포인트",
      "companyFit": "이 기업/직무와 연결되는 이유",
      "pressureLevel": "high 또는 medium 또는 normal"
    }
  ]
}
`.trim();

  const user = `
[모드]
${safeMode}

[기업/직무/공고]
${buildCompanyBlock(company) || '(기업 정보 없음)'}

[선택 서류/경험]
${buildExperienceBlock(selectedExperiences)}
`.trim();

  try {
    const resp = await client.chat.completions.create({
      model: 'deepseek-chat',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: safeMode === 'weakness' ? 0.28 : 0.22,
    });

    const parsed = safeJsonParse(resp.choices[0]?.message?.content || '{}', {});
    const rawSuggestions = Array.isArray(parsed.suggestions) ? parsed.suggestions : [];
    const suggestions = rawSuggestions
      .filter((item) => item?.question)
      .slice(0, 5)
      .map((item, index) => normalizeSuggestionItem(item, index, safeMode));

    return {
      mode: safeMode,
      basis: String(parsed.basis || '').trim(),
      suggestions: suggestions.length ? suggestions : fallbackReverseSuggestions(safeMode, company, selectedExperiences),
    };
  } catch (error) {
    console.error('역면접 추천 질문 생성 실패:', error);
    return {
      mode: safeMode,
      basis: 'AI 추천 질문 생성에 실패해 기업/직무/선택 경험 기반 기본 질문을 반환했습니다.',
      suggestions: fallbackReverseSuggestions(safeMode, company, selectedExperiences),
    };
  }
}

export async function generateReverseInterviewAnswer({
  mode = 'weakness',
  company,
  selectedExperiences,
  interviewerQuestion,
  chatContext = [],
}) {
  const safeMode = mode === 'strength' ? 'strength' : 'weakness';
  const modeLabel = safeMode === 'strength' ? '강점 역면접' : '약점 역면접';

  const system = `
너는 한국어 IT/개발 직무 역면접 시뮬레이터다.
사용자는 면접관이고, 너는 사용자의 서류를 바탕으로 답변하는 AI 지원자다.

[핵심 컨셉]
- 사용자가 질문하면 AI 지원자가 답변한다.
- 이후 그 AI 답변에 대한 피드백을 함께 제공한다.
- 사용자가 제공한 서류/경험/기업 정보 밖의 사실, 성과, 수치를 지어내지 않는다.

[약점 역면접]
- 면접관 질문이 서류의 약점을 찌르는 상황이다.
- AI 지원자는 완벽하게 대답하지 못해도 된다. 근거가 부족한 부분은 망설임, 모호함, [확인 필요]를 드러낸다.
- 단, 과도하게 바보처럼 답하지 말고 실제 면접에서 당황한 지원자처럼 자연스럽게 답한다.
- 피드백은 왜 이 질문이 약점인지, AI 답변이 왜 흔들렸는지, 더 나은 보완 방향을 알려준다.

[강점 역면접]
- 면접관 질문이 서류의 강점 포인트를 확인하는 상황이다.
- AI 지원자는 선택 경험 안에서 근거를 찾아 자신 있게 답한다.
- 피드백은 왜 좋은 답변인지, 어떤 강점이 드러났는지, 더 강하게 말할 방법을 알려준다.

[반환 규칙]
- 반드시 JSON 객체만 반환한다.
- aiAnswer는 실제 지원자의 1인칭 답변처럼 작성한다.
- betterAnswer에는 사용자가 참고할 수 있는 개선 답변 예시를 작성하되, 없는 사실은 [직접 작성: ...] 형태로 둔다.

{
  "mode": "weakness 또는 strength",
  "detectedPoint": "질문이 찌른 약점 또는 강점 포인트",
  "aiAnswer": "AI 지원자의 답변",
  "feedback": {
    "summary": "피드백 요약",
    "answerQuality": "당황함/보완 필요/무난함/좋음/매우 좋음 등",
    "goodPoints": ["좋았던 점"],
    "weakPoints": ["부족하거나 흔들린 점"],
    "improvements": ["개선 방향"],
    "betterAnswer": "더 나은 답변 예시",
    "interviewerTip": "면접관 입장에서 이어서 찌르면 좋은 추가 질문 1개"
  }
}
`.trim();

  const user = `
[모드]
${safeMode} (${modeLabel})

[기업/직무]
${buildCompanyBlock(company) || '(기업 정보 없음)'}

[선택 서류/경험]
${buildExperienceBlock(selectedExperiences)}

[면접관 질문]
${interviewerQuestion || '(질문 없음)'}

[최근 대화]
${Array.isArray(chatContext) ? JSON.stringify(chatContext.slice(-8), null, 2) : '(없음)'}
`.trim();

  try {
    const resp = await client.chat.completions.create({
      model: 'deepseek-chat',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: safeMode === 'weakness' ? 0.34 : 0.22,
    });

    const parsed = safeJsonParse(resp.choices[0]?.message?.content || '{}', {});
    const feedback = parsed.feedback || {};

    return {
      mode: safeMode,
      detectedPoint: String(parsed.detectedPoint || '').trim(),
      aiAnswer:
        String(parsed.aiAnswer || '').trim() ||
        (safeMode === 'weakness'
          ? '말씀하신 부분은 제가 서류에서 충분히 구체적으로 설명하지 못한 것 같습니다. 당시 제가 맡았던 역할은 있었지만, 어느 범위까지 직접 기여했는지는 더 명확히 정리할 필요가 있습니다.'
          : '해당 경험은 제가 지원 직무와 연결해서 가장 자신 있게 설명할 수 있는 부분입니다. 특히 문제를 파악하고 개선 방향을 정리한 과정에서 제 강점이 드러났다고 생각합니다.'),
      feedback: {
        summary: String(feedback.summary || parsed.summary || '').trim(),
        answerQuality: String(feedback.answerQuality || (safeMode === 'weakness' ? '보완 필요' : '좋음')).trim(),
        goodPoints: Array.isArray(feedback.goodPoints) ? feedback.goodPoints.filter(Boolean) : [],
        weakPoints: Array.isArray(feedback.weakPoints) ? feedback.weakPoints.filter(Boolean) : [],
        improvements: Array.isArray(feedback.improvements) ? feedback.improvements.filter(Boolean) : [],
        betterAnswer: String(feedback.betterAnswer || '').trim(),
        interviewerTip: String(feedback.interviewerTip || '').trim(),
      },
    };
  } catch (error) {
    console.error('역면접 AI 답변 생성 실패:', error);
    return {
      mode: safeMode,
      detectedPoint: safeMode === 'weakness' ? '서류의 근거 부족 지점' : '서류의 강점 어필 지점',
      aiAnswer:
        safeMode === 'weakness'
          ? '그 부분은 제가 서류에서 충분히 구체적으로 적지 못했습니다. 실제로는 [직접 작성: 구체적인 역할]을 맡았고, 결과는 [직접 작성: 수치 또는 근거]로 설명할 수 있도록 보완해야 할 것 같습니다.'
          : '이 경험은 제가 지원 직무에 필요한 문제 해결력과 실행력을 보여줄 수 있는 사례라고 생각합니다. 특히 [직접 작성: 구체적 행동]을 통해 [직접 작성: 결과]를 만들었다는 점을 강조하고 싶습니다.',
      feedback: {
        summary: 'AI 답변 생성에 실패해 기본 피드백을 반환했습니다.',
        answerQuality: safeMode === 'weakness' ? '보완 필요' : '무난함',
        goodPoints: [],
        weakPoints: safeMode === 'weakness' ? ['구체적인 역할과 성과 근거가 부족합니다.'] : [],
        improvements: ['서류에 있는 경험만 바탕으로 역할, 행동, 결과를 구체화하세요.'],
        betterAnswer: '',
        interviewerTip: '그 경험에서 본인이 직접 한 행동을 한 문장으로 요약하면 무엇인가요?',
      },
    };
  }
}
