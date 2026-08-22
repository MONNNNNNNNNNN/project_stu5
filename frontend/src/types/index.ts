export interface User {
  id: string;
  email: string;
  fullName: string;
  phoneNumber: string | null;
  role: 'PARENT' | 'EDUCATOR' | 'ADMIN';
  avatarUrl: string | null;
  isVerified: boolean;
  createdAt: string;
}

export interface Child {
  id: string;
  fullName: string;
  nickname: string | null;
  sex: 'MALE' | 'FEMALE';
  dateOfBirth: string;
  avatarUrl: string | null;
  createdAt: string;
}

/** Stable keys for the BMI weight-status tiers, so the UI colours on a value rather than prose. */
export type NutritionalStatusKey =
  | 'UNDERWEIGHT'
  | 'HEALTHY'
  | 'OVERWEIGHT'
  | 'OBESITY'
  | 'SEVERE_OBESITY';

export interface GrowthGuidance {
  message: string;
  flagged: boolean;
  nutritionalStatus: string | null;
  nutritionalStatusKey: NutritionalStatusKey | null;
  /** BMI as a percentage of the 95th percentile — the severity figure above P95. */
  bmiPctOfP95: number | null;
}

export interface GrowthRecord {
  id: string;
  childId: string;
  measuredAt: string;
  heightCm: string | null;
  weightKg: string | null;
  bmi: string | null;
  heightPercentile: string | null;
  weightPercentile: string | null;
  bmiPercentile: string | null;
  heightSds: string | null;
  weightSds: string | null;
  bmiSds: string | null;
  bmiPctOfP95: string | null;
  note: string | null;
  createdAt: string;
  guidance?: GrowthGuidance;
}

export interface GrowthChartPoint {
  date: string;
  heightCm: number | null;
  weightKg: number | null;
  bmi: number | null;
  heightPercentile: number | null;
  weightPercentile: number | null;
  bmiPercentile: number | null;
  bmiPctOfP95: number | null;
}

export interface ReferenceCurvePoint {
  ageMonths: number;
  p3: number;
  p50: number;
  p97: number;
  /** BMI charts only: the obesity line and CDC's severe-obesity line. */
  p95?: number;
  p120ofP95?: number;
}

export interface GrowthStatistics {
  latest: GrowthRecord | null;
  heightDeltaCm: number | null;
  weightDeltaKg: number | null;
  since: string | null;
}

export interface PubertyScreening {
  id: string;
  childId: string;
  answers: Record<string, unknown>;
  notes: string | null;
  assessedAt: string;
}

/**
 * A next step the app is suggesting, from reading growth, puberty and bone age together.
 * Always dismissible in spirit — nothing here blocks the parent from doing something else.
 */
export interface Suggestion {
  kind: 'PUBERTY_SCREENING' | 'BONE_AGE_UPLOAD' | 'BONE_AGE_REFERRAL' | 'PUBERTY_FOLLOW_UP';
  severity: 'info' | 'warning';
  title: string;
  body: string;
  actionLabel: string;
  actionHref: string;
}

export interface BoneAgePrediction {
  id: string;
  childId: string;
  imageUrl: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  predictedAgeMonths: number | null;
  modelVersion: string | null;
  /** Why a FAILED prediction failed — "unreadable image" needs a different response from the
   *  parent than "the model is offline". */
  failureReason: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface BoneAgeModelStatus {
  ready: boolean;
  modelVersion: string;
  /** Mean absolute error in months on the held-out test set. */
  maeMonths: number;
  /** Share of test predictions within a year. Shown with the MAE so the margin is not read
   *  as a hard bound — at 0.731, roughly one estimate in four is out by over 12 months. */
  accuracyWithin12Months: number;
  calibration: 'provisional' | 'confirmed';
  detail: string | null;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
}

export interface Article {
  id: string;
  categoryId: string;
  category: Category;
  title: string;
  slug: string;
  summary: string;
  contentMd: string;
  coverImageUrl: string | null;
  tag: string | null;
  publishedAt: string | null;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}
