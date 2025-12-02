export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface ImageFile {
  id: string;
  file: File;
  name: string;
  url: string;
  width: number;
  height: number;
}

export interface LogoFile {
  id: string;
  file: File;
  name: string;
  url: string;
  width: number;
  height: number;
}

export interface FontSettings {
  family: string;
  size: number;
  color: string;
}

export interface DateSettings {
  text: string;
  position: Position;
  font: FontSettings;
}

export interface LogoSettings {
  logo: LogoFile | null;
  position: Position;
  scale: number;
  opacity: number;
}

export type AnnotationType = 'box' | 'dashed-box' | 'arrow' | 'text';
export type LineStyle = 'solid' | 'dashed';

export interface AnnotationStyle {
  color: string;
  thickness: number;
  lineStyle: LineStyle;
  borderRadius: number;
}

export interface Annotation {
  id: string;
  type: AnnotationType;
  position: Position;
  size: Size;
  style: AnnotationStyle;
  text?: string;
  points?: number[]; // for arrow
}

export interface ToolSettings {
  color: string;
  thickness: number;
  lineStyle: LineStyle;
  borderRadius: number;
  fontSize: number;
}

export interface ExportSettings {
  folder: string;
  filenamePrefix: string;
  format: 'jpg' | 'png';
  quality: number;
}
