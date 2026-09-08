import { diagnosingUnderstandingPool } from './categories/diagnosingUnderstanding.js';
import { explanationsScaffoldingPool } from './categories/explanationsScaffolding.js';
import { questioningChecksPool } from './categories/questioningChecks.js';
import { feedbackPool } from './categories/feedback.js';
import { differentiationPool } from './categories/differentiation.js';
import { engagementConfidencePool } from './categories/engagementConfidence.js';
import { professionalJudgmentPool } from './categories/professionalJudgment.js';

export const questionPool = [
  ...diagnosingUnderstandingPool,
  ...explanationsScaffoldingPool,
  ...questioningChecksPool,
  ...feedbackPool,
  ...differentiationPool,
  ...engagementConfidencePool,
  ...professionalJudgmentPool,
];