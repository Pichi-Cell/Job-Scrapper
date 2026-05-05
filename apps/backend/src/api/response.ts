export interface ApiResponse<T> {
  data: T;
  error: string | null;
}

export function ok<T>(data: T): ApiResponse<T> {
  return {
    data,
    error: null,
  };
}

export function fail(message: string): ApiResponse<[]> {
  return {
    data: [],
    error: message,
  };
}

