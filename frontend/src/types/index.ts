export interface User {
  id: string;
  email: string;
  fullName: string;
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

export interface GrowthRecord {
  id: string;
  childId: string;
  measuredAt: string;
  heightCm: string | null;
  weightKg: string | null;
  bmi: string | null;
  note: string | null;
  createdAt: string;
}

export interface GrowthChartPoint {
  date: string;
  heightCm: number | null;
  weightKg: number | null;
  bmi: number | null;
}

export interface GrowthStatistics {
  latest: GrowthRecord | null;
  heightDeltaCm: number | null;
  weightDeltaKg: number | null;
  since: string | null;
}

export type TannerStage = 'STAGE_1' | 'STAGE_2' | 'STAGE_3' | 'STAGE_4' | 'STAGE_5';

export interface PubertyScreening {
  id: string;
  childId: string;
  tannerStage: TannerStage;
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
