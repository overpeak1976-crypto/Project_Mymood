import { searchRepository } from '../repositories/searchRepository';
import { aiService } from './aiService';

export const searchService = {
  async hybridSearch(query: string) {
    if (!query?.trim()) return { results: [], total: 0 };

    // Run standard text search and AI embedding in parallel for speed
    const [textResults, queryEmbedding] = await Promise.all([
      searchRepository.textSearch(query, 20),
      // Optimize prompt first, then generate embedding — fall back to [] on fail
      (async () => {
        const optimizedPrompt = await aiService.optimizeSearchPrompt(query);
        return aiService.generateEmbedding(optimizedPrompt);
      })().catch((err) => {
        console.error("AI Context processing failed:", err);
        return [] as number[];
      }),
    ]);

    // Build a Set of IDs from text results so we can tag dupes
    const textIds = new Set(textResults.map((s: any) => s.id));

    // Tag all text results as standard match
    const tagged: any[] = textResults.map((s: any) => ({
      ...s,
      match_type: 'standard',
    }));

    // Run vector search if we got an embedding
    if (queryEmbedding.length > 0) {
      const vectorResults = await searchRepository.vectorSearch(queryEmbedding, 0.5, 10);

      for (const row of vectorResults) {
        // Each row from match_songs has: song_id, title, artist, similarity + song fields
        if (!textIds.has(row.song_id ?? row.id)) {
          tagged.push({
            id: row.song_id ?? row.id,
            title: row.title,
            artist: row.artist,
            genre: row.genre ?? null,
            cover_image_url: row.cover_image_url ?? null,
            audio_file_url: row.audio_file_url ?? null,
            duration_seconds: row.duration_seconds ?? null,
            play_count: row.play_count ?? 0,
            similarity: row.similarity,
            match_type: 'ai_vibe',
          });
        }
      }
    }

    return { results: tagged, total: tagged.length };
  },
};
