import { useAuthStore } from '@/stores/useAuthStore';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// JSON 응답 파싱 공통 처리
function parseResponse<T>(response: Response, text: string): ApiResponse<T> {
  let data: ApiResponse<T>;
  try {
    data = JSON.parse(text);
  } catch {
    return {
      success: false,
      error: `서버 오류 (${response.status}): JSON 응답이 아닙니다`,
    };
  }

  if (!response.ok) {
    // 401 응답 시 세션 초기화
    if (response.status === 401) {
      useAuthStore.getState().clearSession();
    }
    return {
      success: false,
      error: data.error || 'API 요청 실패',
    };
  }

  return data;
}

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const text = await response.text();
    return parseResponse<T>(response, text);
  } catch (error) {
    console.error('API Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '네트워크 오류',
    };
  }
}

// FormData 업로드 (로고 등 파일 업로드용)
async function uploadFile<T>(
  endpoint: string,
  formData: FormData
): Promise<ApiResponse<T>> {
  try {
    // Content-Type은 설정하지 않음 (브라우저가 FormData boundary 자동 설정)
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });

    const text = await response.text();
    return parseResponse<T>(response, text);
  } catch (error) {
    console.error('API Upload Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '업로드 오류',
    };
  }
}

export const api = {
  get: <T>(endpoint: string) => fetchApi<T>(endpoint, { method: 'GET' }),

  post: <T>(endpoint: string, body: unknown) =>
    fetchApi<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  put: <T>(endpoint: string, body: unknown) =>
    fetchApi<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  delete: <T>(endpoint: string) => fetchApi<T>(endpoint, { method: 'DELETE' }),

  upload: <T>(endpoint: string, formData: FormData) => uploadFile<T>(endpoint, formData),
};

export default api;
