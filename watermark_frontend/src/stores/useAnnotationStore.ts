import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { Annotation, AnnotationType, ToolSettings, Position, Size } from '@/types';

interface AnnotationStore {
  annotations: Record<string, Annotation[]>; // imageId -> annotations
  selectedTool: AnnotationType | null;
  selectedAnnotationId: string | null;
  toolSettings: ToolSettings;

  addAnnotation: (imageId: string, annotation: Omit<Annotation, 'id'>) => void;
  updateAnnotation: (imageId: string, annotationId: string, updates: Partial<Annotation>) => void;
  removeAnnotation: (imageId: string, annotationId: string) => void;
  getAnnotations: (imageId: string) => Annotation[];
  clearAnnotations: (imageId: string) => void;

  setTool: (tool: AnnotationType | null) => void;
  setSelectedAnnotation: (id: string | null) => void;
  setToolSettings: (settings: Partial<ToolSettings>) => void;
}

export const useAnnotationStore = create<AnnotationStore>((set, get) => ({
  annotations: {},
  selectedTool: null,
  selectedAnnotationId: null,
  toolSettings: {
    color: '#FF0000',
    thickness: 2,
    lineStyle: 'solid',
    borderRadius: 0,
    fontSize: 16,
  },

  addAnnotation: (imageId: string, annotation: Omit<Annotation, 'id'>) => {
    set((state) => {
      const imageAnnotations = state.annotations[imageId] || [];
      return {
        annotations: {
          ...state.annotations,
          [imageId]: [...imageAnnotations, { ...annotation, id: uuidv4() }],
        },
      };
    });
  },

  updateAnnotation: (imageId: string, annotationId: string, updates: Partial<Annotation>) => {
    set((state) => {
      const imageAnnotations = state.annotations[imageId] || [];
      return {
        annotations: {
          ...state.annotations,
          [imageId]: imageAnnotations.map((a) =>
            a.id === annotationId ? { ...a, ...updates } : a
          ),
        },
      };
    });
  },

  removeAnnotation: (imageId: string, annotationId: string) => {
    set((state) => {
      const imageAnnotations = state.annotations[imageId] || [];
      return {
        annotations: {
          ...state.annotations,
          [imageId]: imageAnnotations.filter((a) => a.id !== annotationId),
        },
        selectedAnnotationId: state.selectedAnnotationId === annotationId ? null : state.selectedAnnotationId,
      };
    });
  },

  getAnnotations: (imageId: string) => {
    return get().annotations[imageId] || [];
  },

  clearAnnotations: (imageId: string) => {
    set((state) => ({
      annotations: {
        ...state.annotations,
        [imageId]: [],
      },
    }));
  },

  setTool: (tool: AnnotationType | null) => {
    set({ selectedTool: tool, selectedAnnotationId: null });
  },

  setSelectedAnnotation: (id: string | null) => {
    set({ selectedAnnotationId: id });
  },

  setToolSettings: (settings: Partial<ToolSettings>) => {
    set((state) => ({
      toolSettings: { ...state.toolSettings, ...settings },
    }));
  },
}));
