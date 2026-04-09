import { CropAspectRatio, CropData } from '@/types';

/**
 * 크롭 박스의 중심점을 유지하면서 새 비율에 맞는 최대 크기로 재계산한다.
 * 결과는 이미지 경계 내로 클램프된다.
 */
export function applyAspectRatio(
  prev: CropData,
  ratio: CropAspectRatio,
  imgW: number,
  imgH: number,
): CropData {
  if (ratio === 'free') {
    return { ...prev, aspectRatio: 'free' };
  }

  const [rw, rh] = ratio.split(':').map(Number);
  const targetRatio = rw / rh; // 폭 / 높이

  // 현재 박스 중심점
  const centerX = prev.x + prev.width / 2;
  const centerY = prev.y + prev.height / 2;

  // 이미지 전체에서 해당 비율로 가능한 최대 크기 (픽셀)
  const maxWpx = Math.min(imgW, imgH * targetRatio);
  const maxHpx = maxWpx / targetRatio;

  // 0-1 비율로 변환
  const w = maxWpx / imgW;
  const h = maxHpx / imgH;

  // 중심 유지 위치
  let x = centerX - w / 2;
  let y = centerY - h / 2;

  // 이미지 경계 클램프
  x = Math.max(0, Math.min(1 - w, x));
  y = Math.max(0, Math.min(1 - h, y));

  return { x, y, width: w, height: h, aspectRatio: ratio };
}

/**
 * 기본 크롭 영역 (이미지의 80% × 80%, 중앙 배치)
 */
export const DEFAULT_CROP_AREA: CropData = {
  x: 0.1,
  y: 0.1,
  width: 0.8,
  height: 0.8,
  aspectRatio: 'free',
};
