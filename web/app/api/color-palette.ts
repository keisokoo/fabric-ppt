import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import type { ActionFunctionArgs } from "react-router";
import { data } from "react-router";
import { z } from "zod";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Color palette schema
const colorPaletteSchema = z.object({
  background: z.string().describe("Background color (hex format)"),
  textPrimary: z
    .string()
    .describe(
      "Primary text color for body content - must have high contrast with background"
    ),
  textSecondary: z
    .string()
    .describe(
      "Secondary text color for less emphasis - slightly lighter/darker than primary"
    ),
  accent: z
    .string()
    .describe(
      "Primary accent color for titles, important elements - should harmonize with background"
    ),
  accentLight: z
    .string()
    .describe("Lighter accent color for borders, subtle decorations"),
  border: z
    .string()
    .describe(
      "Border color for boxes and dividers - subtle variation of background"
    ),
});

export const action = async (args: ActionFunctionArgs) => {
  try {
    const formData = await args.request.formData();
    const background = formData.get("background") as string;

    if (!background) {
      return data({ error: "Background color is required" }, { status: 400 });
    }

    const systemPrompt = `You are a color palette expert specializing in presentation design.

Your task: Generate a cohesive, professional color palette for PowerPoint slides based on the given background color.

CRITICAL Requirements:
1. CONTRAST: Ensure WCAG AA compliance (4.5:1 for normal text, 3:1 for large text)
2. HARMONY: All colors must work together aesthetically
3. PURPOSE: Each color has a specific role in presentation design
4. READABILITY: Text must be easily readable on the background

Color Roles:
- textPrimary: Main body text (highest contrast with background)
- textSecondary: Subtitles, captions (slightly less contrast, but still readable)
- accent: Headlines, key points, call-to-action elements
- accentLight: Borders, decorative elements, light emphasis
- border: Dividers, box outlines (subtle, not distracting)

Design Principles:
- For LIGHT backgrounds (luminance > 50%): Use dark text, vibrant accents
- For DARK backgrounds (luminance < 50%): Use light text, bright accents
- Accent colors should complement (not clash with) the background
- Avoid pure black (#000000) or pure white (#ffffff) - use near-black/white
- Create visual hierarchy through color weight

Examples of good palettes:
Light mint background (#e0f7f4):
- textPrimary: #1a2e2a (dark teal)
- textSecondary: #4a5e5a
- accent: #00a896 (teal)
- accentLight: #7dd3c0
- border: #c0e8e0

Dark navy background (#1a2332):
- textPrimary: #f0f4f8 (off-white)
- textSecondary: #b8c5d6
- accent: #5b9bd5 (bright blue)
- accentLight: #9dc3e6
- border: #2d3e54`;

    const response = await openai.responses.parse({
      model: "gpt-4.1",
      input: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: `Generate a professional color palette for a PowerPoint presentation with this background color:

Background: ${background}

Analyze the background's luminance and create a harmonious, accessible color palette that works perfectly for presentation slides.`,
        },
      ],
      text: {
        format: zodTextFormat(colorPaletteSchema, "color_palette"),
      },
    });

    const palette = response.output_parsed;

    if (!palette) {
      throw new Error("Failed to generate color palette");
    }

    return data({
      success: true,
      palette,
    });
  } catch (error) {
    console.error("Error generating color palette:", error);
    return data(
      {
        error: "Failed to generate color palette",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
};
