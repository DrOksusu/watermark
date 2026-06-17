'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { Stage, Layer, Image as KonvaImage, Text, Rect, Arrow, Ellipse, Transformer } from 'react-konva';
import { KonvaEventObject } from 'konva/lib/Node';
import Konva from 'konva';
import { useImageStore } from '@/stores/useImageStore';
import { useLogoStore } from '@/stores/useLogoStore';
import { useDateStore } from '@/stores/useDateStore';
import { useAnnotationStore } from '@/stores/useAnnotationStore';
import { useCropStore } from '@/stores/useCropStore';
import { Annotation, Position } from '@/types';
import { Group } from 'react-konva';

interface ImageCanvasProps {
  stageRef: React.RefObject<Konva.Stage | null>;
}

// 선택 가능한 요소 타입
type SelectedElementType = 'none' | 'logo' | 'dateText' | 'annotation';

export default function ImageCanvas({ stageRef }: ImageCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const cropTransformerRef = useRef<Konva.Transformer>(null);
  const cropRectRef = useRef<Konva.Rect>(null);
  const dateTextRef = useRef<Konva.Text>(null);
  const logoRef = useRef<Konva.Image>(null);

  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });
  const [mainImage, setMainImage] = useState<HTMLImageElement | null>(null);
  const [logoImage, setLogoImage] = useState<HTMLImageElement | null>(null);
  const [scale, setScale] = useState(1);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<Position | null>(null);
  const [tempAnnotation, setTempAnnotation] = useState<Partial<Annotation> | null>(null);
  const [selectedElement, setSelectedElement] = useState<SelectedElementType>('none');

  const { images, selectedImageId } = useImageStore();
  const { logo, position: logoPosition, scale: logoScale, opacity: logoOpacity, setPosition: setLogoPosition, setScale: setLogoScale } = useLogoStore();
  const { text: dateText, position: datePosition, font, scale: dateScale, opacity: dateOpacity, width: dateWidth, setPosition: setDatePosition, setScale: setDateScale, setWidth: setDateWidth } = useDateStore();
  const {
    selectedTool,
    toolSettings,
    selectedAnnotationId,
    addAnnotation,
    updateAnnotation,
    removeAnnotation,
    getAnnotations,
    setSelectedAnnotation,
    setTool,
  } = useAnnotationStore();
  const {
    isEditing: cropIsEditing,
    editingImageId: cropEditingImageId,
    draft: cropDraft,
    updateDraft: updateCropDraft,
    replaceDraft: replaceCropDraft,
  } = useCropStore();

  const selectedImage = images.find((img) => img.id === selectedImageId);
  // 크롭 적용 상태 판단: 편집 중이면 원본 전체 표시, 아니면 selectedImage.crop 사용
  const activeCrop = cropIsEditing ? null : selectedImage?.crop ?? null;
  // 크롭 적용 시 유효 이미지 너비/높이 (로고·날짜 위치/크기 계산 기준 = "최종 출력 이미지" 크기)
  const effectiveW = mainImage
    ? activeCrop
      ? activeCrop.width * mainImage.width
      : mainImage.width
    : 0;
  const effectiveH = mainImage
    ? activeCrop
      ? activeCrop.height * mainImage.height
      : mainImage.height
    : 0;
  const templateImage = images[0]; // 첫 번째 이미지가 템플릿
  const annotations = selectedImageId ? getAnnotations(selectedImageId) : [];

  // Load main image
  useEffect(() => {
    if (selectedImage) {
      const img = new window.Image();
      img.src = selectedImage.url;
      img.onload = () => setMainImage(img);
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMainImage(null);
    }
  }, [selectedImage]);

  // Load logo image - logo가 변경될 때 로드
  const logoUrl = logo?.url || null;
  useEffect(() => {
    if (logoUrl) {
      console.log('Loading logo image from URL:', logoUrl);
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        console.log('Logo image loaded successfully:', img.width, 'x', img.height);
        setLogoImage(img);
      };
      img.onerror = (e) => {
        console.error('Failed to load logo image:', e);
        setLogoImage(null);
      };
      img.src = logoUrl;
    } else {
      console.log('No logo to load, clearing logo image');
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLogoImage(null);
    }
  }, [logoUrl]);

  // Calculate scale and container size
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current && mainImage) {
        const container = containerRef.current;
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;

        // 크롭이 적용된 상태면 크롭 영역 크기로 스케일 계산
        const effectiveW = activeCrop
          ? activeCrop.width * mainImage.width
          : mainImage.width;
        const effectiveH = activeCrop
          ? activeCrop.height * mainImage.height
          : mainImage.height;

        const scaleX = containerWidth / effectiveW;
        const scaleY = containerHeight / effectiveH;
        const newScale = Math.min(scaleX, scaleY);

        setScale(newScale);
        setContainerSize({
          width: effectiveW * newScale,
          height: effectiveH * newScale,
        });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [mainImage, activeCrop]);

  // Update transformer based on selected element
  useEffect(() => {
    if (!transformerRef.current) return;

    let nodeToTransform: Konva.Node | null = null;

    if (selectedElement === 'dateText' && dateTextRef.current) {
      nodeToTransform = dateTextRef.current;
    } else if (selectedElement === 'logo' && logoRef.current) {
      nodeToTransform = logoRef.current;
    } else if (selectedElement === 'annotation' && selectedAnnotationId) {
      const stage = stageRef.current;
      if (stage) {
        nodeToTransform = stage.findOne(`#${selectedAnnotationId}`) || null;
      }
    }

    if (nodeToTransform) {
      transformerRef.current.nodes([nodeToTransform]);
    } else {
      transformerRef.current.nodes([]);
    }
    transformerRef.current.getLayer()?.batchDraw();
  }, [selectedElement, selectedAnnotationId, stageRef]);

  // Update crop transformer — 현재 선택된 이미지가 편집 대상일 때만 활성
  const cropEditingActive =
    cropIsEditing && cropEditingImageId === selectedImageId && cropDraft !== null;

  useEffect(() => {
    if (!cropTransformerRef.current || !cropRectRef.current) return;

    if (cropEditingActive) {
      cropTransformerRef.current.nodes([cropRectRef.current]);
    } else {
      cropTransformerRef.current.nodes([]);
    }
    cropTransformerRef.current.getLayer()?.batchDraw();
  }, [cropEditingActive]);

  const handleStageMouseDown = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      const clickedOnEmpty = e.target === e.target.getStage();

      if (clickedOnEmpty) {
        setSelectedAnnotation(null);
        setSelectedElement('none');
      }

      if (selectedTool && selectedImageId) {
        const stage = e.target.getStage();
        if (!stage) return;

        const pos = stage.getPointerPosition();
        if (!pos) return;

        if (!mainImage) return;
        const cropOffsetX = activeCrop ? activeCrop.x * mainImage.width : 0;
        const cropOffsetY = activeCrop ? activeCrop.y * mainImage.height : 0;
        const adjustedPos = {
          x: pos.x / scale + cropOffsetX,
          y: pos.y / scale + cropOffsetY,
        };
        setIsDrawing(true);
        setDrawStart(adjustedPos);

        if (selectedTool === 'text') {
          const text = prompt('텍스트를 입력하세요:');
          if (text) {
            // 생성 시점의 toolSettings.fontSize를 annotation에 고정 저장
            // (이후 도구 fontSize가 바뀌어도 기존 텍스트는 자기 크기 유지)
            addAnnotation(selectedImageId, {
              type: 'text',
              position: adjustedPos,
              size: { width: 100, height: toolSettings.fontSize },
              style: {
                color: toolSettings.color,
                thickness: toolSettings.thickness,
                lineStyle: 'solid',
                borderRadius: 0,
              },
              text,
              fontSize: toolSettings.fontSize,
            });
            setTool(null); // 도구 사용 후 자동 해제
          }
          setIsDrawing(false);
          setDrawStart(null);
        }
      }
    },
    [selectedTool, selectedImageId, scale, toolSettings, addAnnotation, setSelectedAnnotation, setTool, mainImage, activeCrop]
  );

  const handleStageMouseMove = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      if (!isDrawing || !drawStart || !selectedTool || selectedTool === 'text') return;

      const stage = e.target.getStage();
      if (!stage) return;

      const pos = stage.getPointerPosition();
      if (!pos) return;

      if (!mainImage) return;
      const cropOffsetX = activeCrop ? activeCrop.x * mainImage.width : 0;
      const cropOffsetY = activeCrop ? activeCrop.y * mainImage.height : 0;
      const adjustedPos = {
        x: pos.x / scale + cropOffsetX,
        y: pos.y / scale + cropOffsetY,
      };

      if (selectedTool === 'arrow') {
        setTempAnnotation({
          type: 'arrow',
          position: drawStart,
          points: [0, 0, adjustedPos.x - drawStart.x, adjustedPos.y - drawStart.y],
          style: {
            color: toolSettings.color,
            thickness: toolSettings.thickness,
            lineStyle: 'solid',
            borderRadius: 0,
          },
        });
      } else {
        const width = adjustedPos.x - drawStart.x;
        const height = adjustedPos.y - drawStart.y;
        setTempAnnotation({
          type: selectedTool,
          position: {
            x: width >= 0 ? drawStart.x : adjustedPos.x,
            y: height >= 0 ? drawStart.y : adjustedPos.y,
          },
          size: { width: Math.abs(width), height: Math.abs(height) },
          style: {
            color: toolSettings.color,
            thickness: toolSettings.thickness,
            lineStyle: (selectedTool === 'dashed-box' || selectedTool === 'dashed-circle') ? 'dashed' : 'solid',
            borderRadius: toolSettings.borderRadius,
          },
        });
      }
    },
    [isDrawing, drawStart, selectedTool, scale, toolSettings, mainImage, activeCrop]
  );

  const handleStageMouseUp = useCallback(() => {
    if (!isDrawing || !drawStart || !selectedTool || !selectedImageId || selectedTool === 'text') {
      setIsDrawing(false);
      setDrawStart(null);
      setTempAnnotation(null);
      return;
    }

    if (tempAnnotation) {
      addAnnotation(selectedImageId, tempAnnotation as Omit<Annotation, 'id'>);
      setTool(null); // 도구 사용 후 자동 해제
    }

    setIsDrawing(false);
    setDrawStart(null);
    setTempAnnotation(null);
  }, [isDrawing, drawStart, selectedTool, selectedImageId, tempAnnotation, addAnnotation, setTool]);

  const handleLogoDragEnd = useCallback(
    (e: KonvaEventObject<DragEvent>) => {
      if (!mainImage || effectiveW === 0 || effectiveH === 0) {
        console.warn('handleLogoDragEnd: mainImage/effective size invalid');
        return;
      }
      // logoPosition은 "최종 출력 이미지" 내 0-1 비율로 저장
      const newX = e.target.x() / (effectiveW * scale);
      const newY = e.target.y() / (effectiveH * scale);
      console.log('handleLogoDragEnd:', {
        rawX: e.target.x(),
        rawY: e.target.y(),
        scale,
        effectiveW,
        effectiveH,
        normalizedX: newX,
        normalizedY: newY,
      });
      setLogoPosition({ x: newX, y: newY });
    },
    [scale, mainImage, setLogoPosition, effectiveW, effectiveH]
  );

  const handleDateDragEnd = useCallback(
    (e: KonvaEventObject<DragEvent>) => {
      if (!mainImage || effectiveW === 0 || effectiveH === 0) {
        console.warn('handleDateDragEnd: mainImage/effective size invalid');
        return;
      }
      // datePosition은 "최종 출력 이미지" 내 0-1 비율로 저장
      const newX = e.target.x() / (effectiveW * scale);
      const newY = e.target.y() / (effectiveH * scale);
      console.log('handleDateDragEnd:', {
        rawX: e.target.x(),
        rawY: e.target.y(),
        scale,
        effectiveW,
        effectiveH,
        normalizedX: newX,
        normalizedY: newY,
      });
      setDatePosition({ x: newX, y: newY });
    },
    [scale, mainImage, setDatePosition, effectiveW, effectiveH]
  );

  // 텍스트 크기 변환 완료 핸들러
  const handleDateTransformEnd = useCallback(
    (e: KonvaEventObject<Event>) => {
      if (!mainImage || effectiveW === 0 || effectiveH === 0) return;

      const node = e.target as Konva.Text;
      const scaleX = node.scaleX();
      const scaleY = node.scaleY();

      // 너비 계산 ("최종 출력 이미지" 너비 대비 비율)
      const currentWidth = node.width() * scaleX;
      const newWidth = currentWidth / scale / effectiveW;

      // 위치도 업데이트 (최종 이미지 내 0-1 비율로 저장)
      const newX = node.x() / (effectiveW * scale);
      const newY = node.y() / (effectiveH * scale);

      // scaleX와 scaleY가 거의 같으면 모서리 핸들 (비율 유지 크기 조절)
      // 다르면 좌우 핸들 (너비만 조절)
      const isProportionalScale = Math.abs(scaleX - scaleY) < 0.01;

      if (isProportionalScale) {
        // 모서리 핸들: 폰트 크기 변경
        const newDateScale = dateScale * scaleY;
        console.log('handleDateTransformEnd (proportional):', {
          scaleX,
          scaleY,
          oldDateScale: dateScale,
          newDateScale,
          newWidth,
        });
        setDateScale(newDateScale);
        setDateWidth(null); // 너비 자동
      } else {
        // 좌우 핸들: 너비만 변경 (줄바꿈용)
        console.log('handleDateTransformEnd (width only):', {
          scaleX,
          scaleY,
          newWidth,
        });
        setDateWidth(newWidth);
      }

      // 노드의 scale을 1로 리셋하고 실제 width 설정
      node.scaleX(1);
      node.scaleY(1);
      node.width(currentWidth);

      setDatePosition({ x: newX, y: newY });
    },
    [mainImage, scale, dateScale, setDateScale, setDateWidth, setDatePosition, effectiveW, effectiveH]
  );

  // 로고 크기 변환 완료 핸들러
  const handleLogoTransformEnd = useCallback(
    (e: KonvaEventObject<Event>) => {
      if (!mainImage || effectiveW === 0 || effectiveH === 0) return;

      const node = e.target as Konva.Image;
      const scaleX = node.scaleX();

      // 현재 logoScale에 scaleX를 곱해서 새로운 logoScale 계산
      // (logoScale은 "최종 이미지 너비 대비 로고 너비 비율"이므로 스케일값만 곱하면 됨)
      const newLogoScale = logoScale * scaleX;

      // 노드의 scale을 1로 리셋
      node.scaleX(1);
      node.scaleY(1);

      // 위치 업데이트 (최종 이미지 내 0-1 비율로 저장)
      const newX = node.x() / (effectiveW * scale);
      const newY = node.y() / (effectiveH * scale);

      console.log('handleLogoTransformEnd:', {
        scaleX,
        oldLogoScale: logoScale,
        newLogoScale,
        newX,
        newY,
      });

      setLogoScale(newLogoScale);
      setLogoPosition({ x: newX, y: newY });
    },
    [mainImage, scale, logoScale, setLogoScale, setLogoPosition, effectiveW, effectiveH]
  );

  const handleAnnotationDragEnd = useCallback(
    (annotationId: string, e: KonvaEventObject<DragEvent>) => {
      if (!selectedImageId || !mainImage) return;
      const cropOffsetX = activeCrop ? activeCrop.x * mainImage.width : 0;
      const cropOffsetY = activeCrop ? activeCrop.y * mainImage.height : 0;
      updateAnnotation(selectedImageId, annotationId, {
        position: {
          x: e.target.x() / scale + cropOffsetX,
          y: e.target.y() / scale + cropOffsetY,
        },
      });
    },
    [selectedImageId, scale, updateAnnotation, mainImage, activeCrop]
  );

  // 텍스트 annotation 더블클릭 — 내용 수정 prompt
  const handleAnnotationDblClick = useCallback(
    (annotation: Annotation) => {
      if (!selectedImageId || annotation.type !== 'text') return;
      const next = prompt('텍스트 수정:', annotation.text ?? '');
      if (next === null) return; // 취소
      updateAnnotation(selectedImageId, annotation.id, { text: next });
    },
    [selectedImageId, updateAnnotation],
  );

  // 텍스트 annotation 크기 변환 완료 — fontSize 갱신, scale 리셋
  const handleTextAnnotationTransformEnd = useCallback(
    (annotation: Annotation, e: KonvaEventObject<Event>) => {
      if (!selectedImageId) return;
      const node = e.target as Konva.Text;
      const scaleY = node.scaleY();
      const baseFontSize = annotation.fontSize ?? toolSettings.fontSize;
      const newFontSize = Math.max(4, Math.round(baseFontSize * scaleY));
      // 노드 scale 리셋(다음 변환에서 누적 안 되도록)
      node.scaleX(1);
      node.scaleY(1);
      updateAnnotation(selectedImageId, annotation.id, {
        fontSize: newFontSize,
        size: { width: annotation.size.width, height: newFontSize },
      });
    },
    [selectedImageId, toolSettings.fontSize, updateAnnotation],
  );

  const renderAnnotation = (annotation: Annotation) => {
    if (!mainImage) return null;
    const { id, type, position, size, style, text, points } = annotation;
    // 주석 좌표를 표시 좌표로 변환 (크롭 적용 고려)
    // annotation.position은 원본 이미지 픽셀 기준 좌상단
    const cropOffsetX = activeCrop ? activeCrop.x * mainImage.width : 0;
    const cropOffsetY = activeCrop ? activeCrop.y * mainImage.height : 0;
    const displayPosX = (position.x - cropOffsetX) * scale;
    const displayPosY = (position.y - cropOffsetY) * scale;

    // annotation 클릭 시 selectedAnnotation + selectedElement 둘 다 set 해야
    // Transformer가 해당 노드에 바인딩됨 (텍스트 크기 조정 가능)
    const selectAnnotation = () => {
      setSelectedAnnotation(id);
      setSelectedElement('annotation');
    };

    const commonProps = {
      id,
      x: displayPosX,
      y: displayPosY,
      draggable: !selectedTool,
      onClick: selectAnnotation,
      onTap: selectAnnotation,
      onDragEnd: (e: KonvaEventObject<DragEvent>) => handleAnnotationDragEnd(id, e),
    };

    if (type === 'arrow' && points) {
      return (
        <Arrow
          key={id}
          {...commonProps}
          points={points.map((p) => p * scale)}
          stroke={style.color}
          strokeWidth={style.thickness}
          fill={style.color}
          pointerLength={10}
          pointerWidth={10}
        />
      );
    }

    if (type === 'text' && text) {
      // annotation.fontSize 우선 사용 (없으면 도구 설정값 fallback). 이전 데이터 호환.
      const effectiveFontSize = annotation.fontSize ?? toolSettings.fontSize;
      return (
        <Text
          key={id}
          {...commonProps}
          text={text}
          fontSize={effectiveFontSize * scale}
          fill={style.color}
          onDblClick={() => handleAnnotationDblClick(annotation)}
          onDblTap={() => handleAnnotationDblClick(annotation)}
          onTransformEnd={(e) => handleTextAnnotationTransformEnd(annotation, e)}
        />
      );
    }

    if (type === 'box' || type === 'dashed-box') {
      return (
        <Rect
          key={id}
          {...commonProps}
          width={size.width * scale}
          height={size.height * scale}
          stroke={style.color}
          strokeWidth={style.thickness}
          cornerRadius={style.borderRadius}
          dash={type === 'dashed-box' ? [10, 5] : undefined}
        />
      );
    }

    if (type === 'dashed-circle') {
      // Ellipse는 (x,y)가 중심점이라 그대로 두면 drag 종료 시 위치 의미 충돌(=튕김 버그).
      // Group으로 감싸 (x,y) 의미를 좌상단으로 통일하고, 내부 Ellipse는 Group 로컬 좌표에서 중심에 배치.
      return (
        <Group key={id} {...commonProps}>
          <Ellipse
            x={(size.width / 2) * scale}
            y={(size.height / 2) * scale}
            radiusX={(size.width / 2) * scale}
            radiusY={(size.height / 2) * scale}
            stroke={style.color}
            strokeWidth={style.thickness}
            dash={[10, 5]}
          />
        </Group>
      );
    }

    return null;
  };

  const renderTempAnnotation = () => {
    if (!tempAnnotation || !mainImage) return null;

    const { type, position, size, style, points } = tempAnnotation;
    if (!position) return null;

    const cropOffsetX = activeCrop ? activeCrop.x * mainImage.width : 0;
    const cropOffsetY = activeCrop ? activeCrop.y * mainImage.height : 0;
    const tempDisplayX = (position.x - cropOffsetX) * scale;
    const tempDisplayY = (position.y - cropOffsetY) * scale;

    if (type === 'arrow' && points && position) {
      return (
        <Arrow
          x={tempDisplayX}
          y={tempDisplayY}
          points={points.map((p) => p * scale)}
          stroke={style?.color || '#FF0000'}
          strokeWidth={style?.thickness || 2}
          fill={style?.color || '#FF0000'}
          pointerLength={10}
          pointerWidth={10}
        />
      );
    }

    if ((type === 'box' || type === 'dashed-box') && position && size) {
      return (
        <Rect
          x={tempDisplayX}
          y={tempDisplayY}
          width={size.width * scale}
          height={size.height * scale}
          stroke={style?.color || '#FF0000'}
          strokeWidth={style?.thickness || 2}
          cornerRadius={style?.borderRadius || 0}
          dash={type === 'dashed-box' ? [10, 5] : undefined}
        />
      );
    }

    if (type === 'dashed-circle' && position && size) {
      return (
        <Ellipse
          x={tempDisplayX + (size.width / 2) * scale}
          y={tempDisplayY + (size.height / 2) * scale}
          radiusX={(size.width / 2) * scale}
          radiusY={(size.height / 2) * scale}
          stroke={style?.color || '#FF0000'}
          strokeWidth={style?.thickness || 2}
          dash={[10, 5]}
        />
      );
    }

    return null;
  };

  if (!mainImage) {
    return (
      <div
        ref={containerRef}
        className="w-full h-full flex items-center justify-center bg-muted/30"
      >
        <p className="text-muted-foreground">이미지를 선택하세요</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-full flex items-center justify-center bg-muted/30 overflow-hidden"
    >
      <Stage
        ref={stageRef}
        width={containerSize.width}
        height={containerSize.height}
        onMouseDown={handleStageMouseDown}
        onMouseMove={handleStageMouseMove}
        onMouseUp={handleStageMouseUp}
        style={{ cursor: selectedTool ? 'crosshair' : 'default' }}
      >
        <Layer>
          {/* Main Image — activeCrop 있으면 음수 오프셋으로 이동해 Stage에서 자동 클리핑 */}
          <KonvaImage
            image={mainImage}
            x={activeCrop ? -activeCrop.x * mainImage.width * scale : 0}
            y={activeCrop ? -activeCrop.y * mainImage.height * scale : 0}
            width={mainImage.width * scale}
            height={mainImage.height * scale}
          />

          {/* Logo - logoPosition은 "최종 출력 이미지" 기준 0-1 비율 */}
          {logoImage && mainImage && (() => {
            // 로고 가로세로 비율 유지
            const logoAspectRatio = logoImage.height / logoImage.width;
            // 로고 너비 = 유효 이미지 너비 * logoScale (크롭 적용 시 크롭 너비 기준)
            const logoWidth = effectiveW * logoScale * scale;
            const logoHeight = logoWidth * logoAspectRatio;
            // logoPosition은 최종 이미지(=Stage) 내 0-1 비율
            const logoX = logoPosition.x * effectiveW * scale;
            const logoY = logoPosition.y * effectiveH * scale;

            console.log('Rendering logo:', {
              logoImage: !!logoImage,
              logoWidth,
              logoHeight,
              logoX,
              logoY,
              logoOpacity,
              logoScale,
              effectiveW,
              effectiveH,
              scale,
              logoPosition,
            });

            return (
              <KonvaImage
                ref={logoRef}
                image={logoImage}
                x={logoX}
                y={logoY}
                width={logoWidth}
                height={logoHeight}
                opacity={logoOpacity}
                draggable={!selectedTool}
                onClick={() => setSelectedElement('logo')}
                onTap={() => setSelectedElement('logo')}
                onDragEnd={handleLogoDragEnd}
                onTransformEnd={handleLogoTransformEnd}
              />
            );
          })()}

          {/* Date Text - 5글자(22.03) 기준으로 폰트 크기 계산 (dateScale=1.0 이면 5글자가 이미지 너비를 채움) */}
          {dateText && (
            <Text
              ref={dateTextRef}
              text={dateText}
              x={datePosition.x * effectiveW * scale}
              y={datePosition.y * effectiveH * scale}
              fontSize={(effectiveW * dateScale / 3) * scale}
              fontFamily={font.family}
              fill={font.color}
              opacity={dateOpacity}
              width={dateWidth ? dateWidth * effectiveW * scale : undefined}
              wrap="char"
              draggable={!selectedTool}
              onClick={() => setSelectedElement('dateText')}
              onTap={() => setSelectedElement('dateText')}
              onDragEnd={handleDateDragEnd}
              onTransform={(e) => {
                // 드래그 중 실시간으로 너비 업데이트 (줄바꿈 적용)
                const node = e.target as Konva.Text;
                const scaleX = node.scaleX();
                const scaleY = node.scaleY();

                // 좌우 핸들인 경우 (scaleX와 scaleY가 다름)
                if (Math.abs(scaleX - scaleY) > 0.01) {
                  const newWidth = node.width() * scaleX;
                  node.width(newWidth);
                  node.scaleX(1);
                  node.scaleY(1);
                }
              }}
              onTransformEnd={handleDateTransformEnd}
            />
          )}

          {/* Annotations */}
          {annotations.map(renderAnnotation)}

          {/* Temporary Annotation while drawing */}
          {renderTempAnnotation()}

          {/* Crop Overlay (편집 모드에서만 표시) */}
          {cropEditingActive && cropDraft && mainImage && (
            <Group>
              {/* 어두운 영역 (크롭 영역 바깥) */}
              <Rect
                x={0}
                y={0}
                width={mainImage.width * scale}
                height={cropDraft.y * mainImage.height * scale}
                fill="rgba(0, 0, 0, 0.5)"
                listening={false}
              />
              <Rect
                x={0}
                y={(cropDraft.y + cropDraft.height) * mainImage.height * scale}
                width={mainImage.width * scale}
                height={(1 - cropDraft.y - cropDraft.height) * mainImage.height * scale}
                fill="rgba(0, 0, 0, 0.5)"
                listening={false}
              />
              <Rect
                x={0}
                y={cropDraft.y * mainImage.height * scale}
                width={cropDraft.x * mainImage.width * scale}
                height={cropDraft.height * mainImage.height * scale}
                fill="rgba(0, 0, 0, 0.5)"
                listening={false}
              />
              <Rect
                x={(cropDraft.x + cropDraft.width) * mainImage.width * scale}
                y={cropDraft.y * mainImage.height * scale}
                width={(1 - cropDraft.x - cropDraft.width) * mainImage.width * scale}
                height={cropDraft.height * mainImage.height * scale}
                fill="rgba(0, 0, 0, 0.5)"
                listening={false}
              />
              {/* 크롭 영역 테두리 */}
              <Rect
                ref={cropRectRef}
                id="crop-rect"
                x={cropDraft.x * mainImage.width * scale}
                y={cropDraft.y * mainImage.height * scale}
                width={cropDraft.width * mainImage.width * scale}
                height={cropDraft.height * mainImage.height * scale}
                stroke="#ffffff"
                strokeWidth={2}
                dash={[5, 5]}
                draggable
                onDragEnd={(e) => {
                  if (!cropDraft) return;
                  const newX = Math.max(
                    0,
                    Math.min(1 - cropDraft.width, e.target.x() / scale / mainImage.width),
                  );
                  const newY = Math.max(
                    0,
                    Math.min(1 - cropDraft.height, e.target.y() / scale / mainImage.height),
                  );
                  updateCropDraft({ x: newX, y: newY });
                }}
                onTransformEnd={(e) => {
                  if (!cropDraft) return;
                  const node = e.target;
                  const scaleX = node.scaleX();
                  const scaleY = node.scaleY();

                  node.scaleX(1);
                  node.scaleY(1);

                  const newX = Math.max(0, node.x() / scale / mainImage.width);
                  const newY = Math.max(0, node.y() / scale / mainImage.height);
                  const newWidth = Math.min(
                    1 - newX,
                    (node.width() * scaleX) / scale / mainImage.width,
                  );
                  const newHeight = Math.min(
                    1 - newY,
                    (node.height() * scaleY) / scale / mainImage.height,
                  );

                  replaceCropDraft({
                    ...cropDraft,
                    x: newX,
                    y: newY,
                    width: newWidth,
                    height: newHeight,
                  });
                }}
              />
              {/* Crop Transformer — 비율 잠금 동적 */}
              <Transformer
                ref={cropTransformerRef}
                rotateEnabled={false}
                keepRatio={cropDraft.aspectRatio !== 'free'}
                enabledAnchors={
                  cropDraft.aspectRatio === 'free'
                    ? ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'middle-left', 'middle-right', 'top-center', 'bottom-center']
                    : ['top-left', 'top-right', 'bottom-left', 'bottom-right']
                }
                boundBoxFunc={(oldBox, newBox) => {
                  if (newBox.width < 20 || newBox.height < 20) {
                    return oldBox;
                  }
                  return newBox;
                }}
              />
            </Group>
          )}

          {/* Transformer for selected element (text, logo, annotation) */}
          <Transformer
            ref={transformerRef}
            boundBoxFunc={(oldBox, newBox) => {
              // 최소 크기 제한
              if (newBox.width < 10 || newBox.height < 10) {
                return oldBox;
              }
              return newBox;
            }}
            enabledAnchors={
              selectedElement === 'dateText'
                ? ['middle-left', 'middle-right', 'top-left', 'top-right', 'bottom-left', 'bottom-right']
                : ['top-left', 'top-right', 'bottom-left', 'bottom-right']
            }
            rotateEnabled={false}
            keepRatio={selectedElement !== 'dateText'}
          />
        </Layer>
      </Stage>
    </div>
  );
}
