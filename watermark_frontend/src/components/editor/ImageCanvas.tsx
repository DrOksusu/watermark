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

export default function ImageCanvas({ stageRef }: ImageCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const transformerRef = useRef<Konva.Transformer>(null);

  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });
  const [mainImage, setMainImage] = useState<HTMLImageElement | null>(null);
  const [logoImage, setLogoImage] = useState<HTMLImageElement | null>(null);
  const [scale, setScale] = useState(1);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<Position | null>(null);
  const [tempAnnotation, setTempAnnotation] = useState<Partial<Annotation> | null>(null);

  const { images, selectedImageId } = useImageStore();
  const { logo, position: logoPosition, scale: logoScale, opacity: logoOpacity, setPosition: setLogoPosition } = useLogoStore();
  const { text: dateText, position: datePosition, font, setPosition: setDatePosition } = useDateStore();
  const {
    selectedTool,
    toolSettings,
    selectedAnnotationId,
    addAnnotation,
    updateAnnotation,
    removeAnnotation,
    getAnnotations,
    setSelectedAnnotation,
  } = useAnnotationStore();

  const selectedImage = images.find((img) => img.id === selectedImageId);
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

  // Load logo image
  useEffect(() => {
    if (logo) {
      const img = new window.Image();
      img.src = logo.url;
      img.onload = () => setLogoImage(img);
    } else {
      setLogoImage(null);
    }
  }, [logo]);

  // Calculate scale and container size
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current && mainImage) {
        const container = containerRef.current;
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;

        const scaleX = containerWidth / mainImage.width;
        const scaleY = containerHeight / mainImage.height;
        const newScale = Math.min(scaleX, scaleY, 1);

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

  // Update transformer
  useEffect(() => {
    if (transformerRef.current && selectedAnnotationId) {
      const stage = stageRef.current;
      if (stage) {
        const selectedNode = stage.findOne(`#${selectedAnnotationId}`);
        if (selectedNode) {
          transformerRef.current.nodes([selectedNode]);
          transformerRef.current.getLayer()?.batchDraw();
        }
      }
    }
  }, [selectedAnnotationId, stageRef]);

  const handleStageMouseDown = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      const clickedOnEmpty = e.target === e.target.getStage();

      if (clickedOnEmpty) {
        setSelectedAnnotation(null);
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
          }
          setIsDrawing(false);
          setDrawStart(null);
        }
      }
    },
    [selectedTool, selectedImageId, scale, toolSettings, addAnnotation, setSelectedAnnotation]
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
    }

    setIsDrawing(false);
    setDrawStart(null);
    setTempAnnotation(null);
  }, [isDrawing, drawStart, selectedTool, selectedImageId, tempAnnotation, addAnnotation]);

  const handleLogoDragEnd = useCallback(
    (e: KonvaEventObject<DragEvent>) => {
      setLogoPosition({
        x: e.target.x() / scale,
        y: e.target.y() / scale,
      });
    },
    [scale, setLogoPosition]
  );

  const handleDateDragEnd = useCallback(
    (e: KonvaEventObject<DragEvent>) => {
      setDatePosition({
        x: e.target.x() / scale,
        y: e.target.y() / scale,
      });
    },
    [scale, setDatePosition]
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

          {/* Logo */}
          {logoImage && (
            <KonvaImage
              image={logoImage}
              x={logoPosition.x * scale}
              y={logoPosition.y * scale}
              width={logoImage.width * logoScale * scale}
              height={logoImage.height * logoScale * scale}
              opacity={logoOpacity}
              draggable={!selectedTool}
              onDragEnd={handleLogoDragEnd}
            />
          )}

          {/* Date Text */}
          {dateText && (
            <Text
              text={dateText}
              x={datePosition.x * scale}
              y={datePosition.y * scale}
              fontSize={font.size * scale}
              fontFamily={font.family}
              fill={font.color}
              draggable={!selectedTool}
              onDragEnd={handleDateDragEnd}
            />
          )}

          {/* Annotations */}
          {annotations.map(renderAnnotation)}

          {/* Temporary Annotation while drawing */}
          {renderTempAnnotation()}

          {/* Transformer for selected annotation */}
          <Transformer ref={transformerRef} />
        </Layer>
      </Stage>
    </div>
  );
}
