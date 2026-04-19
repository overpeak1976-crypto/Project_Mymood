import { songRepository } from '../repositories/songRepository';
import { aiService } from './aiService';
import { audioService } from './audioService';
import { cloudinaryService } from './cloudinaryService';
import fs from 'fs';

export const songService = {
  async getAllSongs() {
    return songRepository.getAllSongs();
  },

  async getPopularSongs(limit: number = 10) {
    return songRepository.getPopularSongs(limit);
  },

  async getMyUploads(userId: string) {
    return songRepository.findMyUploads(userId);
  },
  
  async getFriendsUploads(userId: string) {
    return songRepository.findFriendsUploads(userId);
  },

  async getMyTopSongs(userId: string) {
    return songRepository.findMyTopSongs(userId);
  },

  async uploadSong(
    userId: string,
    title: string,
    artist: string,
    albumName: string | null,
    audioFilePath: string,
    coverImageFilePath: string,
    durationSeconds: number,
    isPublic: boolean = true,
  ) {
    console.log(`🎵 Processing song: ${title} - ${artist}`);

    // 1. Manage artist
    let artistRecord = await songRepository.findArtistByName(artist);
    let finalArtistId: string | null = null;

    if (artistRecord) {
      finalArtistId = artistRecord.id;
      console.log('Found existing artist.');
    } else {
      console.log('Creating new artist profile...');
      const newArtist = await songRepository.createArtist(artist);
      finalArtistId = newArtist.id;
    }

    // 2. Analyze audio first (uses the same file as upload)
    console.log('--- Analyzing audio and uploading to Cloudinary ---');
    const audioStats = await audioService.analyzeAudio(audioFilePath);

    // 3. Upload files to Cloudinary in parallel (safe now — analysis is done)
    const [coverImageUrl, finalAudioUrl] = await Promise.all([
      cloudinaryService.uploadImage(coverImageFilePath, 'mymood_covers'),
      cloudinaryService.uploadAudio(audioFilePath, 'mymood_audio'),
    ]);

    if (!finalAudioUrl) throw new Error('Audio upload failed: no URL returned');
    if (!coverImageUrl) throw new Error('Cover image upload failed: no URL returned');
    console.log(`✅ Audio uploaded: ${finalAudioUrl}`);

    // 3. Manage album
    let finalAlbumId: string | null = null;
    if (albumName && finalArtistId) {
      const existingAlbum = await songRepository.findAlbumByTitleAndArtist(albumName, finalArtistId);
      if (existingAlbum) {
        finalAlbumId = existingAlbum.id;
      } else {
        const newAlbum = await songRepository.createAlbum(albumName, finalArtistId, coverImageUrl);
        finalAlbumId = newAlbum.id;
      }
    }

    // 4. AI analysis
    console.log('--- 🤖 Gemini is analyzing the song ---');
    const aiAnalysis = await aiService.generateSuperContext(
      title, artist,
      audioStats.bpm, audioStats.key, audioStats.scale,
      audioStats.energy, audioStats.danceability,
    );
    console.log('Genre:', aiAnalysis.genre);

    // 5. Save song to DB
    console.log('💾 Saving song to database...');
    const savedSong = await songRepository.createSong({
      title,
      artist,
      artist_id: finalArtistId,
      album_id: finalAlbumId,
      uploaded_by: userId,
      audio_file_url: finalAudioUrl,
      cover_image_url: coverImageUrl,
      bpm: audioStats.bpm,
      danceability: audioStats.danceability,
      music_key: audioStats.key,
      music_scale: audioStats.scale,
      energy: audioStats.energy,
      duration_seconds: durationSeconds,
      genre: aiAnalysis.genre,
      is_public: isPublic,
    });

    // 6. Generate and save vector
    const embedding = await aiService.generateEmbedding(aiAnalysis.superContext);
    await songRepository.createSongVector(savedSong.id, aiAnalysis.superContext, embedding);

    return savedSong;
  },

  async searchSongsByAI(prompt: string) {
    if (!prompt) throw new Error('กรุณาใส่คำค้นหา (prompt)');
    console.log(`User searched: "${prompt}"`);

    const optimizedPrompt = await aiService.optimizeSearchPrompt(prompt);
    console.log(`🧠 Gemini interpreted: "${optimizedPrompt}"`);

    const queryVector = await aiService.generateEmbedding(optimizedPrompt);
    const songs = await songRepository.searchSongsByVector(queryVector, 0.1, 5);

    return songs;
  },

  async reanalyzeSong(id: string) {
    const song = await songRepository.findSongById(id);
    if (!song) throw new Error('ไม่พบข้อมูลเพลง');

    console.log(`🤖 Admin triggered re-analyze for: ${song.title}`);
    const aiAnalysis = await aiService.generateSuperContext(
      song.title, song.artist,
      song.bpm ?? 0, song.music_key ?? '', song.music_scale ?? '',
      song.energy ?? 0, song.danceability ?? 0,
    );

    await songRepository.updateSongGenre(id, aiAnalysis.genre);

    const embedding = await aiService.generateEmbedding(aiAnalysis.superContext);
    const existingVector = await songRepository.findSongVector(id);

    if (existingVector) {
      await songRepository.updateSongVector(id, aiAnalysis.superContext, embedding);
    } else {
      await songRepository.createSongVector(id, aiAnalysis.superContext, embedding);
    }

    return { genre: aiAnalysis.genre };
  },

  // Cleanup temp files after upload attempt
  cleanupTempFiles(files: { [fieldname: string]: Express.Multer.File[] } | undefined) {
    if (!files) return;
    ['audio', 'cover_image'].forEach((field) => {
      if (files[field]?.[0]?.path && fs.existsSync(files[field][0].path)) {
        fs.unlinkSync(files[field][0].path);
      }
    });
  },
};
