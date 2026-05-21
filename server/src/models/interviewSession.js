import mongoose from 'mongoose';

const scoreBreakdownSchema = new mongoose.Schema(
  {
    intent: { type: Number, default: 0 },
    specificity: { type: Number, default: 0 },
    jobFit: { type: Number, default: 0 },
    structure: { type: Number, default: 0 },
    result: { type: Number, default: 0 },
    expression: { type: Number, default: 0 },
  },
  { _id: false },
);

const interviewQuestionSchema = new mongoose.Schema(
  {
    id: { type: String, default: '' },
    question: { type: String, required: true },
    intent: { type: String, default: '' },
    focus: { type: String, default: '' },
    difficulty: { type: String, enum: ['normal', 'pressure'], default: 'normal' },
    answer: { type: String, default: '' },
    score: { type: Number, default: null },
    level: { type: String, default: '' },
    scoreBreakdown: { type: scoreBreakdownSchema, default: () => ({}) },
    goodPoints: { type: [String], default: [] },
    weakPoints: { type: [String], default: [] },
    advice: { type: [String], default: [] },
    improvedAnswer: { type: String, default: '' },
    followUpQuestion: { type: String, default: '' },
  },
  { _id: false },
);

const reverseFeedbackSchema = new mongoose.Schema(
  {
    summary: { type: String, default: '' },
    answerQuality: { type: String, default: '' },
    goodPoints: { type: [String], default: [] },
    weakPoints: { type: [String], default: [] },
    improvements: { type: [String], default: [] },
    betterAnswer: { type: String, default: '' },
    interviewerTip: { type: String, default: '' },
  },
  { _id: false },
);

const reverseTurnSchema = new mongoose.Schema(
  {
    id: { type: String, default: '' },
    mode: { type: String, enum: ['weakness', 'strength'], default: 'weakness' },
    interviewerQuestion: { type: String, default: '' },
    aiAnswer: { type: String, default: '' },
    detectedPoint: { type: String, default: '' },
    feedback: { type: reverseFeedbackSchema, default: () => ({}) },
  },
  { _id: false, timestamps: true },
);

const selectedExperienceSchema = new mongoose.Schema(
  {
    id: { type: String, default: '' },
    type: { type: String, default: 'experience' },
    title: { type: String, default: '' },
    sourceTitle: { type: String, default: '' },
    content: { type: String, default: '' },
  },
  { _id: false },
);

const interviewSessionSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    title: { type: String, default: 'AI 역면접 기록' },
    mode: {
      type: String,
      enum: ['reverse', 'weakness', 'strength', 'free'],
      required: true,
      index: true,
    },
    company: {
      name: { type: String, default: '' },
      position: { type: String, default: '' },
      jobDescription: { type: String, default: '' },
      jobPostingUrl: { type: String, default: '' },
      requiredSkills: { type: [String], default: [] },
    },
    selectedExperiences: { type: [selectedExperienceSchema], default: [] },
    summary: { type: String, default: '' },
    questions: { type: [interviewQuestionSchema], default: [] },
    reverseTurns: { type: [reverseTurnSchema], default: [] },
    totalScore: { type: Number, default: null },
    status: {
      type: String,
      enum: ['prepared', 'in_progress', 'completed'],
      default: 'prepared',
      index: true,
    },
  },
  { timestamps: true },
);

const InterviewSession = mongoose.model('InterviewSession', interviewSessionSchema);

export default InterviewSession;
