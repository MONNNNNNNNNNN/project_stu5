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

export interface GrowthGuidance {
  message: string;
  flagged: boolean;
  nutritionalStatus: string | null;
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
}

export interface ReferenceCurvePoint {
  ageMonths: number;
  p3: number;
  p50: number;
  p97: number;
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

export interface BoneAgePrediction {
  id: string;
  childId: string;
  imageUrl: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  predictedAgeMonths: number | null;
  createdAt: string;
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
