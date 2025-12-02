import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { ImageFile } from '@/types';

interface ImageStore {
  images: ImageFile[];
  selectedImageId: string | null;
  addImages: (files: File[]) => Promise<void>;
  removeImage: (id: string) => void;
  selectImage: (id: string) => void;
  clearImages: () => void;
}

const loadImage = (file: File): Promise<{ width: number; height: number; url: string }> => {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.width, height: img.height, url });
    };
    img.src = url;
  });
};

export const useImageStore = create<ImageStore>((set, get) => ({
  images: [],
  selectedImageId: null,

  addImages: async (files: File[]) => {
    const newImages: ImageFile[] = [];

    for (const file of files) {
      const { width, height, url } = await loadImage(file);
      newImages.push({
        id: uuidv4(),
        file,
        name: file.name,
        url,
        width,
        height,
      });
    }

    set((state) => {
      const updatedImages = [...state.images, ...newImages];
      return {
        images: updatedImages,
        selectedImageId: state.selectedImageId || (updatedImages.length > 0 ? updatedImages[0].id : null),
      };
    });
  },

  removeImage: (id: string) => {
    set((state) => {
      const filteredImages = state.images.filter((img) => img.id !== id);
      const removedImage = state.images.find((img) => img.id === id);

      if (removedImage) {
        URL.revokeObjectURL(removedImage.url);
      }

      let newSelectedId = state.selectedImageId;
      if (state.selectedImageId === id) {
        newSelectedId = filteredImages.length > 0 ? filteredImages[0].id : null;
      }

      return {
        images: filteredImages,
        selectedImageId: newSelectedId,
      };
    });
  },

  selectImage: (id: string) => {
    set({ selectedImageId: id });
  },

  clearImages: () => {
    const { images } = get();
    images.forEach((img) => URL.revokeObjectURL(img.url));
    set({ images: [], selectedImageId: null });
  },
}));
