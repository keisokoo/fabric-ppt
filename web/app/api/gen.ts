import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import type { ActionFunctionArgs } from "react-router";
import { data } from "react-router";
import { z } from "zod";

// Fabric.js 7.0 오브젝트 스키마
const fabricObjectSchema = z.object({
  type: z
    .string()
    .describe(
      "Type of Fabric.js object (Rect, Circle, Textbox, Image, Line, etc.)"
    ),
  left: z.number().describe("X coordinate (0-1280)"),
  top: z.number().describe("Y coordinate (0-720)"),
  originX: z
    .enum(["left", "center", "right"])
    .default("center")
    .describe("Horizontal origin point (default: 'center' in v7)"),
  originY: z
    .enum(["top", "center", "bottom"])
    .default("center")
    .describe("Vertical origin point (default: 'center' in v7)"),
  width: z.number().default(100).describe("Width of the object"),
  height: z.number().default(100).describe("Height of the object"),
  fill: z
    .string()
    .default("#000000")
    .describe("Fill color (hex with alpha: #RRGGBBAA or #RRGGBB)"),
  stroke: z
    .string()
    .default("")
    .describe("Stroke color (hex with alpha: #RRGGBBAA)"),
  strokeWidth: z.number().default(0).describe("Stroke width"),
  text: z.string().default("").describe("Text content (for Textbox type)"),
  fontSize: z.number().default(16).describe("Font size (for text objects)"),
  fontFamily: z
    .string()
    .default("Arial")
    .describe("Font family (for text objects)"),
  fontWeight: z
    .string()
    .default("normal")
    .describe("Font weight (normal, bold, etc.)"),
  textAlign: z
    .string()
    .default("left")
    .describe("Text alignment (left, center, right)"),
  opacity: z.number().default(1).describe("Opacity (0-1)"),
  angle: z.number().default(0).describe("Rotation angle in degrees"),
  scaleX: z
    .number()
    .default(1)
    .describe("Horizontal scale factor (default: 1)"),
  scaleY: z.number().default(1).describe("Vertical scale factor (default: 1)"),
  radius: z.number().default(0).describe("Radius (for Circle type)"),
});

// Fabric.js 7.0 슬라이드 스키마
const fabricSlideSchema = z.object({
  version: z.string().describe("Fabric.js version (use 7.0.0)"),
  objects: z
    .array(fabricObjectSchema)
    .describe("Array of Fabric.js objects on the canvas"),
  background: z
    .string()
    .default("#ffffff")
    .describe("Background color (hex with alpha: #RRGGBBAA or #RRGGBB)"),
});

export const action = async (args: ActionFunctionArgs) => {
  try {
    const formData = await args.request.formData();
    const prompt = formData.get("prompt") as string;
    const slideNumber = formData.get("slideNumber") as string;

    if (!prompt) {
      return data({ error: "Prompt is required" }, { status: 400 });
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const systemPrompt = `You are a professional presentation slide designer that creates slides in Fabric.js 7.0 JSON format.

Your role:
- Design visually appealing and professional presentation slides
- Use the 1280x720 canvas size effectively
- Apply design principles: hierarchy, contrast, alignment, spacing
- Choose appropriate colors, fonts, and layouts for the content
- Create slides that are clear, readable, and visually balanced

Technical guidelines for Fabric.js 7.0:
- Use Fabric.js version "7.0.0"
- Object types (capitalize first letter): Textbox, Rect, Circle, Image, Line, etc.
- IMPORTANT: Default origin is 'center' in v7. Objects are positioned by their CENTER point.
  - Set originX/originY explicitly if you need different behavior
  - For top-left positioning: originX: "left", originY: "top"
- Position elements with left/top coordinates (0-1280 for x, 0-720 for y)
- Textbox for all text content (titles, body text, bullet points)
- Rect and Circle for decorative elements and backgrounds
- Typography: fontSize (title: 48-72, body: 24-36, small: 16-20)
- Use fontFamily like "Arial", "Helvetica", "Georgia", etc.
- Colors in hex format with optional alpha: #RRGGBB or #RRGGBBAA
- Gradient opacity is NOT supported - use alpha in color strings instead

Design patterns:
- Title slides: Large centered title, optional subtitle, minimal decoration
- Content slides: Clear title at top, body content in readable chunks
- Use visual hierarchy with size, weight, and positioning
- Add subtle decorative elements (shapes, lines) to enhance visual interest
- Maintain consistent margins and padding (60-80px from edges)`;

    // 슬라이드 생성 요청
    const response = await openai.responses.parse({
      model: "gpt-5.2",
      input: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: `Create a slide for the following content:

Prompt: ${prompt}
Slide Number: ${slideNumber ? `#${slideNumber}` : "1"}

Generate a complete, well-structured Fabric.js JSON that matches this content.`,
        },
      ],
      text: {
        format: zodTextFormat(fabricSlideSchema, "slide"),
      },
      tools: [{ type: "web_search" }, { type: "image_generation" }],
    });

    const fabricJson = response.output_parsed;

    if (!fabricJson) {
      throw new Error("Failed to parse slide data");
    }

    return data({
      success: true,
      slide: fabricJson,
      slideNumber: slideNumber || 1,
    });
  } catch (error) {
    console.error("Error generating slide:", error);
    return data(
      {
        error: "Failed to generate slide",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
};
