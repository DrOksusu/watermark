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

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export const logoService = {
  // 모든 로고 조회
  getAll: async (): Promise<ApiResponse<ServerLogo[]>> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/logo/all`);
      return await response.json();
    } catch (error) {
      console.error('Error fetching logos:', error);
      return { success: false, error: '서버 연결 실패' };
    }
  },

  // 활성 로고 조회
  getActive: async (): Promise<ApiResponse<ServerLogo | null>> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/logo`);
      return await response.json();
    } catch (error) {
      console.error('Error fetching active logo:', error);
      return { success: false, error: '서버 연결 실패' };
    }
  },

  // 로고 업로드
  upload: async (file: File, name?: string): Promise<ApiResponse<ServerLogo>> => {
    try {
      const formData = new FormData();
      formData.append('logo', file);
      if (name) {
        formData.append('name', name);
      }

      const response = await fetch(`${API_BASE_URL}/api/logo/upload`, {
        method: 'POST',
        body: formData,
      });
      return await response.json();
    } catch (error) {
      console.error('Error uploading logo:', error);
      return { success: false, error: '로고 업로드 실패' };
    }
  },

  // 로고 활성화
  activate: async (id: string): Promise<ApiResponse<ServerLogo>> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/logo/${id}/activate`, {
        method: 'PUT',
      });
      return await response.json();
    } catch (error) {
      console.error('Error activating logo:', error);
      return { success: false, error: '로고 활성화 실패' };
    }
  },

  // 로고 삭제
  delete: async (id: string): Promise<ApiResponse<void>> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/logo/${id}`, {
        method: 'DELETE',
      });
      return await response.json();
    } catch (error) {
      console.error('Error deleting logo:', error);
      return { success: false, error: '로고 삭제 실패' };
    }
  },

  // 로고 URL 생성 (상대 경로를 절대 경로로 변환)
  getLogoUrl: (logo: ServerLogo): string => {
    if (logo.url.startsWith('http')) {
      return logo.url;
    }
    return `${API_BASE_URL}${logo.url}`;
  },
};

export default logoService;
