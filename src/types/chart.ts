// Chart-IMG API関連の型定義
export interface ChartSnapshotRequest {
  symbol: string;
  interval: string;
  width: number;
  height: number;
  theme: string;
}

export interface ChartSnapshotOptions {
  symbol?: string;
  interval?: string;
  width?: number;
  height?: number;
  theme?: "light" | "dark";
}

export interface ChartAPIResponse {
  success: boolean;
  data?: {
    fileName: string;
    publicUrl: string;
    symbol: string;
    interval: string;
    width: number;
    height: number;
    theme: string;
    uploadedAt: string;
    size: number;
    etag: string;
  };
  error?: string;
}

export interface ImageInfo {
  fileName: string;
  size: number;
  uploadedAt: string;
  publicUrl: string;
}

export interface ImageListResponse {
  success: boolean;
  data?: {
    images: ImageInfo[];
    count: number;
    hasMore: boolean;
    nextCursor?: string;
  };
  error?: string;
}