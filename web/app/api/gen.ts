import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import type { ActionFunctionArgs } from "react-router";
import { data } from "react-router";
import { z } from "zod";

// Base Fabric.js 7.0 오브젝트 스키마 (without icons)
const baseFabricObjectSchema = z.object({
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
    .default("Malgun Gothic")
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
  // Image 객체용 필드 (optional)
  src: z
    .string()
    .default("")
    .describe(
      "Image source URL (for Image type). Leave empty for placeholder images."
    ),
  crossOrigin: z
    .string()
    .default("")
    .describe(
      "CORS setting for images (for Image type). Use 'anonymous' for generated images, empty string otherwise."
    ),
  data: z
    .object({
      imagePrompt: z
        .string()
        .default("")
        .describe(
          "Detailed prompt for image generation (for placeholder images)"
        ),
      isPlaceholder: z
        .boolean()
        .default(false)
        .describe("True if image needs to be generated client-side"),
    })
    .default({
      imagePrompt: "",
      isPlaceholder: false,
    })
    .describe("Image data for placeholder images"),
  // Line 객체용 좌표 (optional)
  x1: z
    .number()
    .nullable()
    .default(null)
    .describe("Line start X coordinate (for Line type)"),
  x2: z
    .number()
    .nullable()
    .default(null)
    .describe("Line end X coordinate (for Line type)"),
  y1: z
    .number()
    .nullable()
    .default(null)
    .describe("Line start Y coordinate (for Line type)"),
  y2: z
    .number()
    .nullable()
    .default(null)
    .describe("Line end Y coordinate (for Line type)"),
});

// Extended schema with icon support
const fabricObjectSchemaWithIcons = baseFabricObjectSchema.extend({
  data: z
    .object({
      imagePrompt: z
        .string()
        .default("")
        .describe(
          "Detailed prompt for image generation (for placeholder images)"
        ),
      isPlaceholder: z
        .boolean()
        .default(false)
        .describe("True if image needs to be generated client-side"),
      iconName: z
        .enum([
          "lightning",
          "checkmark",
          "target",
          "settings",
          "shield",
          "lock",
          "chart",
          "users",
          "rocket",
          "calendar",
          "clock",
        ])
        .nullable()
        .default(null)
        .describe("Icon name for SVG icons"),
      iconColor: z
        .string()
        .default("#000000")
        .describe("Fill color for the icon (hex format)"),
      isIcon: z
        .boolean()
        .default(false)
        .describe("True if this is an SVG icon to be rendered client-side"),
    })
    .default({
      imagePrompt: "",
      isPlaceholder: false,
      iconName: null,
      iconColor: "#000000",
      isIcon: false,
    })
    .describe("Image data for placeholder images or icons"),
});

export const action = async (args: ActionFunctionArgs) => {
  try {
    const formData = await args.request.formData();
    const prompt = formData.get("prompt") as string;
    const slideNumber = formData.get("slideNumber") as string;
    const useIcons = formData.get("useIcons") === "true";
    const background = formData.get("background") as string | null;
    const colorPaletteStr = formData.get("colorPalette") as string | null;

    if (!prompt) {
      return data({ error: "Prompt is required" }, { status: 400 });
    }

    // Parse color palette if provided
    let colorPalette = null;
    if (colorPaletteStr) {
      try {
        colorPalette = JSON.parse(colorPaletteStr);
      } catch (e) {
        console.error("Failed to parse color palette:", e);
      }
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Select schema based on useIcons flag
    const fabricObjectSchema = useIcons
      ? fabricObjectSchemaWithIcons
      : baseFabricObjectSchema;

    // Schema varies based on whether background is provided
    const fabricSlideSchema = background
      ? z.object({
          objects: z
            .array(fabricObjectSchema)
            .describe("Array of Fabric.js objects on the canvas"),
        })
      : z.object({
          objects: z
            .array(fabricObjectSchema)
            .describe("Array of Fabric.js objects on the canvas"),
          background: z
            .string()
            .describe("Background color (hex with alpha: #RRGGBBAA or #RRGGBB)"),
        });

    const iconSection = useIcons
      ? `
Icon Library:
Available icons (choose iconName from these):
- lightning - activation, energy, power
- checkmark - success, completion, validation
- target - goals, targeting, focus
- settings - configuration, customization
- shield - security, protection
- lock - privacy, authentication
- chart - analytics, data, metrics
- users - team, collaboration, people
- rocket - growth, launch, startup
- calendar - schedule, timeline, dates
- clock - time, duration, deadline

When using icons:
- Use icons SPARINGLY - only when they genuinely add value
- Maximum 1-2 icons per slide
- type: "Image"
- src: "" (empty string)
- Size guidelines:
  - Small accents: 32-48px (width/height)
  - Medium emphasis: 48-64px
  - Large focal point: 64-96px (rarely needed)
- data: {
    isIcon: true,
    iconName: "lightning" (choose from above),
    iconColor: "#FF6B00" (hex color to match your design)
  }
- Icons load instantly and render in any color you specify
`
      : `
IMPORTANT: SVG Icon library is NOT available. Use alternative icon solutions:

1. UNICODE ICON CHARACTERS (Preferred method):
   - Use Textbox with Unicode emoji/symbols: ⚡ ✓ ⭐ ⚙️ 🔒 📊 👥 🚀 📅 ⏰ ▶ ● ■ ▲ ★ ♦ ✕ ✔
   - fontSize: 32-72 (larger than normal text)
   - Example: { type: "Textbox", text: "⚡", fontSize: 48, fill: "#FF6B00", ... }
   - Benefits: Instant rendering, any color, crisp at any size

2. FABRIC PATH OBJECTS (For custom shapes):
   - type: "Path"
   - path: "M 0 0 L 100 100 L 0 100 Z" (SVG path syntax)
   - Use simple geometric paths for custom icons
   - Example arrow: "M 0 50 L 80 50 L 60 30 M 80 50 L 60 70"
   - Can create: arrows, stars, checkmarks, etc.

3. GEOMETRIC COMBINATIONS:
   - Combine Rect, Circle, Line for icon-like shapes
   - Example checkmark: Two rotated thin Rect objects

DO NOT:
- Do NOT use Image type for icons (image generation AI cannot create clean icons)
- Do NOT request image generation for small decorative elements
- Placeholder images should ONLY be for large photos/illustrations

Use icons SPARINGLY - maximum 1-2 per slide, only when they add value.
`;

    const systemPrompt = `You are a professional presentation slide designer that creates slides in Fabric.js 7.0 JSON format.

Your role:
- Design visually appealing and professional presentation slides
- Use the 1280x720 canvas size effectively
- Apply design principles: hierarchy, contrast, alignment, spacing
- Choose appropriate colors, fonts, and layouts for the content
- Create slides that are clear, readable, and visually balanced
- Use images when appropriate to enhance visual communication

CRITICAL - Content & Readability Guidelines:
- LESS IS MORE: Keep text minimal and focused on key points only
- Maximum 3-5 bullet points per slide (prefer 3)
- Each bullet point should be SHORT (5-10 words max)
- Use whitespace generously - don't try to fill every space
- Prioritize clarity over completeness
- Remove unnecessary details - only include essential information

Technical guidelines for Fabric.js 7.0:
- Use Fabric.js version "7.0.0"
- Object types (capitalize first letter): Textbox, Rect, Circle, Image, Line, etc.
- IMPORTANT: Default origin is 'center' in v7. Objects are positioned by their CENTER point.
  - Set originX/originY explicitly if you need different behavior
  - For top-left positioning: originX: "left", originY: "top"
- Position elements with left/top coordinates (0-1280 for x, 0-720 for y)
- Textbox for all text content (titles, body text, bullet points)
- Rect and Circle for decorative elements and backgrounds
- Typography: SMALLER SIZES for better readability
  - Title: 36-48 (not larger!)
  - Body text: 18-24 (not 24-36!)
  - Small text: 14-16
- Use fontFamily: "Malgun Gothic" (default for Korean), "Arial", "Helvetica" for English
- Colors in hex format with optional alpha: #RRGGBB or #RRGGBBAA
- Gradient opacity is NOT supported - use alpha in color strings instead
${
  colorPalette
    ? `
CRITICAL - USE ONLY THESE COLORS (strictly enforced):
Background: ${colorPalette.background}
Text Colors:
  - Primary body text: ${colorPalette.textPrimary} (use for all paragraphs, bullet points, descriptions)
  - Secondary text: ${colorPalette.textSecondary} (use for captions, subtitles, less important text)
Accent Colors:
  - Primary accent: ${colorPalette.accent} (use for slide titles, headings, key highlights)
  - Light accent: ${colorPalette.accentLight} (use for subtle emphasis, icons, decorative elements)
Borders & Dividers:
  - Border color: ${colorPalette.border} (use for boxes, dividers, underlines)

COLOR USAGE RULES (mandatory):
1. ALL body text MUST use textPrimary (${colorPalette.textPrimary})
2. ALL slide titles MUST use accent (${colorPalette.accent})
3. Subtitles/captions MUST use textSecondary (${colorPalette.textSecondary})
4. Borders/boxes MUST use border (${colorPalette.border})
5. Icons/decorations can use accentLight (${colorPalette.accentLight}) or accent
6. DO NOT invent new colors - use ONLY the colors listed above
7. NO exceptions - this palette is professionally designed for optimal contrast and harmony`
    : background
    ? `- IMPORTANT: Background color is FIXED at ${background}. Design the entire color scheme around this:
  - Choose text and object colors that provide excellent contrast with ${background}
  - Ensure readability with sufficient contrast ratio (WCAG AA: 4.5:1 for normal text, 3:1 for large text)
  - Create a cohesive color palette that complements ${background}
  - For dark backgrounds: use light/white text
  - For light backgrounds: use dark text
  - Select accent colors that harmonize with the background`
    : `- IMPORTANT: You have FULL CONTROL over the color scheme. Choose a background color and design accordingly:
  - Select any background color that fits the presentation theme and mood
  - Design a cohesive color palette with the background as the foundation
  - Ensure all text and objects have excellent contrast with your chosen background
  - Maintain WCAG AA contrast ratios (4.5:1 for normal text, 3:1 for large text)
  - Consider the presentation context when choosing colors`
}
${iconSection}
Image guidelines:
- Use Image objects when visuals would enhance the message
- DO NOT use the image_generation tool - it's too slow
- Instead, create placeholder Image objects with:
  - type: "Image"
  - src: "" (empty string)
  - data: { imagePrompt: "detailed description", isPlaceholder: true }
- Write detailed, specific imagePrompt describing the desired image
- Position images thoughtfully within the layout
- Consider image dimensions and aspect ratios
- Balance text and images for effective communication

Design patterns:
- Title slides: Centered title (36-42px), optional short subtitle (18-20px), minimal decoration, optional hero image
- Content slides: Clear title at top (32-38px), body content in SHORT bullet points (18-22px)
- Use visual hierarchy with size, weight, and positioning
- Add subtle decorative elements (shapes, lines) to enhance visual interest
- Maintain generous margins and padding (80-120px from edges for more breathing room)
- Leave empty space - it's OK to have areas with no content`;

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
      reasoning: {
        effort: "none",
      },
      text: {
        format: zodTextFormat(fabricSlideSchema, "slide"),
      },
      // tools: [{ type: "web_search" }],
    });

    const fabricJson = response.output_parsed;

    if (!fabricJson) {
      throw new Error("Failed to parse slide data");
    }

    // Add version and background to the AI-generated objects
    const completeSlide = {
      version: "7.0.0",
      objects: fabricJson.objects,
      background: background || (fabricJson as any).background || "#ffffff",
    };

    return data({
      success: true,
      slide: completeSlide,
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
