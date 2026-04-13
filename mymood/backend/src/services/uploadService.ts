import { cloudinaryService } from './cloudinaryService';

export const uploadService = {
  async uploadImage(filePath: string) {
    console.log('☁️ Uploading image to Cloudinary...');
    const imageUrl = await cloudinaryService.uploadImage(filePath, 'mymood_covers');
    console.log(`✅ Image uploaded: ${imageUrl}`);
    return imageUrl;
  },
};
