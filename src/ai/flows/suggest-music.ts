'use server';

/**
 * @fileOverview Suggests background music based on the video content.
 *
 * - suggestMusic - A function that suggests background music.
 * - SuggestMusicInput - The input type for the suggestMusic function.
 * - SuggestMusicOutput - The return type for the suggestMusic function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestMusicInputSchema = z.object({
  videoDescription: z.string().describe('Description of the video content.'),
});
export type SuggestMusicInput = z.infer<typeof SuggestMusicInputSchema>;

const SuggestMusicOutputSchema = z.object({
  musicSuggestion: z.string().describe('Suggested background music for the video.'),
  reason: z.string().describe('Reasoning behind the music suggestion.'),
});
export type SuggestMusicOutput = z.infer<typeof SuggestMusicOutputSchema>;

export async function suggestMusic(input: SuggestMusicInput): Promise<SuggestMusicOutput> {
  return suggestMusicFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestMusicPrompt',
  input: {schema: SuggestMusicInputSchema},
  output: {schema: SuggestMusicOutputSchema},
  prompt: `You are an AI music expert. You will suggest background music for a video based on its content.

Video Description: {{{videoDescription}}}

Suggest background music and the reason why it fits the video.`,
});

const suggestMusicFlow = ai.defineFlow(
  {
    name: 'suggestMusicFlow',
    inputSchema: SuggestMusicInputSchema,
    outputSchema: SuggestMusicOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
