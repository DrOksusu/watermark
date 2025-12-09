'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { Stage, Layer, Image as KonvaImage, Text, Rect, Arrow, Line, Transformer } from 'react-konva';
import { KonvaEventObject } from 'konva/lib/Node';
import Konva from 'konva';
import { useImageStore } from '@/stores/useImageStore';
import { useLogoStore } from '@/stores/useLogoStore';
import { useDateStore } from '@/stores/useDateStore';
import { useAnnotationStore } from '@/stores/useAnnotationStore';
import { Annotation, Position } from '@/types';

interface ImageCanvasProps {
  stageRef: React.RefObject<Konva.Stage | null>;
}

// 선택 가능한 요소 타입
type SelectedElementType = 'none' | 'logo' | 'dateText' | 'annotation';

export default function ImageCanvas({ stageRef }: ImageCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
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

  const selectedImage = images.find((img) => img.id === selectedImageId);
  const templateImage = images[0]; // 첫 번째 이미지가 템플릿
  const annotations = selectedImageId ? getAnnotations(selectedImageId) : [];

  // Load main image
  useEffect(() => {
    if (selectedImage) {
      const img = new window.Image();
      img.src = selectedImage.url;
      img.onload = () => setMainImage(img);
    } else {
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

        const scaleX = containerWidth / mainImage.width;
        const scaleY = containerHeight / mainImage.height;
        // 작은 이미지도 확대하여 캔버스 영역에 맞춤 (모든 이미지가 비슷한 크기로 표시)
        const newScale = Math.min(scaleX, scaleY);

        setScale(newScale);
        setContainerSize({
          width: mainImage.width * newScale,
          height: mainImage.height * newScale,
        });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [mainImage]);

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
        nodeToTransform = stage.findOne(`#${selectedAnnotationId}`);
      }
    }

    if (nodeToTransform) {
      transformerRef.current.nodes([nodeToTransform]);
    } else {
      transformerRef.current.nodes([]);
    }
    transformerRef.current.getLayer()?.batchDraw();
  }, [selectedElement, selectedAnnotationId, stageRef]);

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

        const adjustedPos = { x: pos.x / scale, y: pos.y / scale };
        setIsDrawing(true);
        setDrawStart(adjustedPos);

        if (selectedTool === 'text') {
          const text = prompt('텍스트를 입력하세요:');
          if (text) {
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
            });
            setTool(null); // 도구 사용 후 자동 해제
          }
          setIsDrawing(false);
          setDrawStart(null);
        }
      }
    },
    [selectedTool, selectedImageId, scale, toolSettings, addAnnotation, setSelectedAnnotation, setTool]
  );

  const handleStageMouseMove = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      if (!isDrawing || !drawStart || !selectedTool || selectedTool === 'text') return;

      const stage = e.target.getStage();
      if (!stage) return;

      const pos = stage.getPointerPosition();
      if (!pos) return;

      const adjustedPos = { x: pos.x / scale, y: pos.y / scale };

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
            lineStyle: selectedTool === 'dashed-box' ? 'dashed' : 'solid',
            borderRadius: toolSettings.borderRadius,
          },
        });
      }
    },
    [isDrawing, drawStart, selectedTool, scale, toolSettings]
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
      if (!mainImage) {
        console.warn('handleLogoDragEnd: mainImage is null');
        return;
      }
      // 비율(0~1)로 변환하여 저장
      const newX = e.target.x() / scale / mainImage.width;
      const newY = e.target.y() / scale / mainImage.height;
      console.log('handleLogoDragEnd:', {
        rawX: e.target.x(),
        rawY: e.target.y(),
        scale,
        mainImageWidth: mainImage.width,
        mainImageHeight: mainImage.height,
        normalizedX: newX,
        normalizedY: newY,
      });
      setLogoPosition({ x: newX, y: newY });
    },
    [scale, mainImage, setLogoPosition]
  );

  const handleDateDragEnd = useCallback(
    (e: KonvaEventObject<DragEvent>) => {
      if (!mainImage) {
        console.warn('handleDateDragEnd: mainImage is null');
        return;
      }
      // 비율(0~1)로 변환하여 저장
      const newX = e.target.x() / scale / mainImage.width;
      const newY = e.target.y() / scale / mainImage.height;
      console.log('handleDateDragEnd:', {
        rawX: e.target.x(),
        rawY: e.target.y(),
        scale,
        mainImageWidth: mainImage.width,
        mainImageHeight: mainImage.height,
        normalizedX: newX,
        normalizedY: newY,
      });
      setDatePosition({ x: newX, y: newY });
    },
    [scale, mainImage, setDatePosition]
  );

  // 텍스트 크기 변환 완료 핸들러
  const handleDateTransformEnd = useCallback(
    (e: KonvaEventObject<Event>) => {
      if (!mainImage) return;

      const node = e.target as Konva.Text;
      const scaleX = node.scaleX();
      const scaleY = node.scaleY();

      // 너비 계산 (이미지 너비 대비 비율)
      const currentWidth = node.width() * scaleX;
      const newWidth = currentWidth / scale / mainImage.width;

      // 위치도 업데이트
      const newX = node.x() / scale / mainImage.width;
      const newY = node.y() / scale / mainImage.height;

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
    [mainImage, scale, dateScale, setDateScale, setDateWidth, setDatePosition]
  );

  // 로고 크기 변환 완료 핸들러
  const handleLogoTransformEnd = useCallback(
    (e: KonvaEventObject<Event>) => {
      if (!mainImage) return;

      const node = e.target as Konva.Image;
      const scaleX = node.scaleX();

      // 현재 logoScale에 scaleX를 곱해서 새로운 logoScale 계산
      const newLogoScale = logoScale * scaleX;

      // 노드의 scale을 1로 리셋
      node.scaleX(1);
      node.scaleY(1);

      // 위치도 업데이트
      const newX = node.x() / scale / mainImage.width;
      const newY = node.y() / scale / mainImage.height;

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
    [mainImage, scale, logoScale, setLogoScale, setLogoPosition]
  );

  const handleAnnotationDragEnd = useCallback(
    (annotationId: string, e: KonvaEventObject<DragEvent>) => {
      if (!selectedImageId) return;
      updateAnnotation(selectedImageId, annotationId, {
        position: {
          x: e.target.x() / scale,
          y: e.target.y() / scale,
        },
      });
    },
    [selectedImageId, scale, updateAnnotation]
  );

  const renderAnnotation = (annotation: Annotation) => {
    const { id, type, position, size, style, text, points } = annotation;
    const isSelected = selectedAnnotationId === id;

    const commonProps = {
      id,
      x: position.x * scale,
      y: position.y * scale,
      draggable: !selectedTool,
      onClick: () => setSelectedAnnotation(id),
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
      return (
        <Text
          key={id}
          {...commonProps}
          text={text}
          fontSize={toolSettings.fontSize * scale}
          fill={style.color}
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

    return null;
  };

  const renderTempAnnotation = () => {
    if (!tempAnnotation) return null;

    const { type, position, size, style, points } = tempAnnotation;

    if (type === 'arrow' && points && position) {
      return (
        <Arrow
          x={position.x * scale}
          y={position.y * scale}
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
          x={position.x * scale}
          y={position.y * scale}
          width={size.width * scale}
          height={size.height * scale}
          stroke={style?.color || '#FF0000'}
          strokeWidth={style?.thickness || 2}
          cornerRadius={style?.borderRadius || 0}
          dash={type === 'dashed-box' ? [10, 5] : undefined}
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
          {/* Main Image */}
          <KonvaImage
            image={mainImage}
            width={mainImage.width * scale}
            height={mainImage.height * scale}
          />

          {/* Logo - 이미지 너비 기준으로 크기 설정 (logoScale=1.0 이면 이미지 너비와 동일) */}
          {logoImage && mainImage && (() => {
            // 로고 가로세로 비율 유지
            const logoAspectRatio = logoImage.height / logoImage.width;
            // 로고 너비 = 이미지 너비 * logoScale (100% = 이미지 너비와 동일)
            const logoWidth = mainImage.width * logoScale * scale;
            const logoHeight = logoWidth * logoAspectRatio;
            const logoX = logoPosition.x * mainImage.width * scale;
            const logoY = logoPosition.y * mainImage.height * scale;

            console.log('Rendering logo:', {
              logoImage: !!logoImage,
              logoWidth,
              logoHeight,
              logoX,
              logoY,
              logoOpacity,
              logoScale,
              mainImageWidth: mainImage.width,
              scale,
              logoPosition, // 원본 위치 값 확인
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
              x={datePosition.x * mainImage.width * scale}
              y={datePosition.y * mainImage.height * scale}
              fontSize={(mainImage.width * dateScale / 3) * scale}
              fontFamily={font.family}
              fill={font.color}
              opacity={dateOpacity}
              width={dateWidth ? dateWidth * mainImage.width * scale : undefined}
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
