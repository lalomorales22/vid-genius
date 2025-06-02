'use server';
/**
 * @fileOverview This file defines a Genkit flow for editing a video based on AI prompts.
 *
 * - editVideoWithAI - A function that takes a video and a prompt, and returns an edited video.
 * - EditVideoWithAIInput - The input type for the editVideoWithAI function.
 * - EditVideoWithAIOutput - The return type for the editVideoWithAI function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const EditVideoWithAIInputSchema = z.object({
  videoDataUri: z
    .string()
    .describe(
      "A video file as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  prompt: z.string().describe('The prompt to use to edit the video.'),
});
export type EditVideoWithAIInput = z.infer<typeof EditVideoWithAIInputSchema>;

const EditVideoWithAIOutputSchema = z.object({
  editedVideoDataUri: z
    .string()
    .describe(
      "The edited video file as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type EditVideoWithAIOutput = z.infer<typeof EditVideoWithAIOutputSchema>;

export async function editVideoWithAI(input: EditVideoWithAIInput): Promise<EditVideoWithAIOutput> {
  return editVideoWithAIFlow(input);
}

const prompt = ai.definePrompt({
  name: 'editVideoWithAIPrompt',
  input: {schema: EditVideoWithAIInputSchema},
  output: {schema: EditVideoWithAIOutputSchema},
  prompt: `You are an AI video editor. The user will provide a video and a prompt. Your job is to edit the video according to the prompt.

Video: {{media url=videoDataUri}}
Prompt: {{{prompt}}}

Output the edited video as a data URI.

IMPORTANT: You must respond with a data URI.
`,
});

const editVideoWithAIFlow = ai.defineFlow(
  {
    name: 'editVideoWithAIFlow',
    inputSchema: EditVideoWithAIInputSchema,
    outputSchema: EditVideoWithAIOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
