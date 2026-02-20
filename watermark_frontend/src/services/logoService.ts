import { api } from '@/lib/api';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// 백엔드 Logo 모델과 일치하는 타입
export interface ServerLogo {
  id: string;
  name: string;
  filename: string;
  url: string;
  width: number;
  height: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export const logoService = {
  // 모든 로고 조회
  getAll: () => api.get<ServerLogo[]>('/api/logo/all'),

  // 활성 로고 조회
  getActive: () => api.get<ServerLogo | null>('/api/logo'),

  // 로고 업로드
  upload: (file: File, name?: string) => {
    const formData = new FormData();
    formData.append('logo', file);
    if (name) {
      formData.append('name', name);
    }
    return api.upload<ServerLogo>('/api/logo/upload', formData);
  },

  // 로고 활성화
  activate: (id: string) => api.put<ServerLogo>(`/api/logo/${id}/activate`, {}),

  // 로고 삭제
  delete: (id: string) => api.delete<void>(`/api/logo/${id}`),

  // 로고 URL 생성 (상대 경로를 절대 경로로 변환)
  getLogoUrl: (logo: ServerLogo): string => {
    if (logo.url.startsWith('http')) {
      return logo.url;
    }
    return `${API_BASE_URL}${logo.url}`;
  },

  // 로고 파일 프록시 URL (S3 CORS 우회용, 인증 불필요)
  getLogoFileUrl: (logoId: string): string => {
    return `${API_BASE_URL}/api/logo/${logoId}/file`;
  },
};

export default logoService;
