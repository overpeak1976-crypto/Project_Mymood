import { playlistRepository } from '../repositories/playlistRepository';
import { songRepository } from '../repositories/songRepository';
import { aiService } from './aiService';

export const aiPlaylistService = {
  async generatePlaylist(prompt: string, limit: number = 5, excludeIds: string[] = []) {
    if (!prompt) throw new Error('Prompt is required');
    console.log(`🎧 Step 1: Generating playlist for: "${prompt}"`);

    try {
      // 1. Optimize prompt with Gemini
      console.log(`📝 Step 2: Optimizing prompt with AI...`);
      const optimizedPrompt = await aiService.optimizeSearchPrompt(prompt);
      console.log(`✅ Step 2 Done: "${optimizedPrompt.substring(0, 60)}..."`);

      // 2. Generate embedding
      console.log(`🔢 Step 3: Generating vector embedding...`);
      const queryEmbedding = await aiService.generateEmbedding(optimizedPrompt);
      console.log(`✅ Step 3 Done: Vector has ${queryEmbedding.length} dimensions`);

      // 3. Vector search against DB
      console.log(`🔍 Step 4: Searching database with vector (limit: ${limit}, exclude ${excludeIds.length} songs)...`);
      const matchedSongs = await songRepository.searchSongsByVectorWithExclude(queryEmbedding, 0.1, limit, excludeIds);
      console.log(`✅ Step 4 Done: Found ${matchedSongs?.length || 0} songs`);

      if (!matchedSongs || matchedSongs.length === 0) {
        console.log(`⚠️ No songs found for this mood`);
        return { playlist_name: null, ai_prompt_used: prompt, total_songs: 0, songs: [] };
      }

      // 4. Generate playlist metadata
      console.log(`✨ Step 5: Generating playlist metadata...`);
      const metadata = await aiService.generatePlaylistMetadata(prompt, matchedSongs);
      console.log(`✅ Step 5 Done: "${metadata.title}"`);

      console.log(`✅ All steps completed successfully!`);

      return {
        title: metadata.title,
        description: metadata.description,
        ai_prompt_used: prompt,
        total_songs: matchedSongs.length,
        songs: matchedSongs,
      };
    } catch (error: any) {
      console.error(`❌ Error in generatePlaylist: ${error.message}`);
      console.error(`Stack: ${error.stack}`);
      throw error;
    }
  },

  async savePlaylist(
    userId: string,
    name: string,
    description: string | null,
    coverImageUrl: string | null,
    songIds: string[],
  ) {
    if (!name || !songIds || songIds.length === 0) {
      throw new Error('ข้อมูลไม่ครบ ต้องมีชื่อ Playlist และรายชื่อเพลงครับ');
    }

    console.log(`💾 Saving playlist: "${name}"...`);

    const newPlaylist = await playlistRepository.createPlaylist(
      userId, name, description, coverImageUrl,
    );

    const tracks = songIds.map((song_id, index) => ({
      playlist_id: newPlaylist.id,
      song_id,
      order_index: index + 1,
    }));

    await playlistRepository.insertPlaylistTracks(tracks);

    return newPlaylist;
  },

  async getMyPlaylists(userId: string) {
    return playlistRepository.getMyPlaylists(userId);
  },

  async getTotalSongsCount() {
    return songRepository.getAllSongsCount();
  },
};
