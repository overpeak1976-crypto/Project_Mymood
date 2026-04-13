import { playlistRepository } from '../repositories/playlistRepository';
import { songRepository } from '../repositories/songRepository';
import { aiService } from './aiService';

export const aiPlaylistService = {
  async generatePlaylist(prompt: string, limit: number = 5, excludeIds: string[] = []) {
    if (!prompt) throw new Error('Prompt is required');
    console.log(`🎧 Generating playlist for: "${prompt}"`);

    // 1. Optimize prompt with Gemini
    const optimizedPrompt = await aiService.optimizeSearchPrompt(prompt);

    // 2. Generate embedding
    const queryEmbedding = await aiService.generateEmbedding(optimizedPrompt);

    // 3. Vector search against DB
    const matchedSongs = await songRepository.searchSongsByVectorWithExclude(queryEmbedding, 0.1, limit, excludeIds);

    if (!matchedSongs || matchedSongs.length === 0) {
      return { playlist_name: null, ai_prompt_used: prompt, total_songs: 0, songs: [] };
    }

    // 4. Generate playlist metadata
    const metadata = await aiService.generatePlaylistMetadata(prompt, matchedSongs);

    console.log(`✅ Playlist name: ${metadata.title}`);

    return {
      title: metadata.title,
      description: metadata.description,
      ai_prompt_used: prompt,
      total_songs: matchedSongs.length,
      songs: matchedSongs,
    };
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
};
