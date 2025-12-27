import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import type { ActionFunctionArgs } from "react-router";
import { data } from "react-router";
import { z } from "zod";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Individual slide plan schema
const slidePlanSchema = z.object({
  slideNumber: z.number().describe("Slide number (starting from 1)"),
  title: z.string().describe("Brief title for this slide (5-10 words)"),
  prompt: z
    .string()
    .describe(
      "Detailed prompt for gen.ts to generate this slide. Include specific content, layout suggestions, and visual requirements. Be very specific about what text, images, and design elements should be included."
    ),
  purpose: z
    .string()
    .describe(
      "Purpose of this slide in the presentation (e.g., introduction, main point, supporting data, conclusion)"
    ),
});

// Presentation plan schema
const presentationPlanSchema = z.object({
  totalSlides: z
    .number()
    .describe("Total number of slides in the presentation"),
  theme: z
    .string()
    .describe(
      "Overall theme/topic of the presentation (one sentence summary)"
    ),
  slides: z
    .array(slidePlanSchema)
    .describe("Array of individual slide plans with detailed prompts"),
});

export const action = async (args: ActionFunctionArgs) => {
  try {
    const formData = await args.request.formData();
    const topic = formData.get("topic") as string;
    const slideCount = parseInt(formData.get("slideCount") as string, 10);

    if (!topic || !topic.trim()) {
      return data({ error: "Topic is required" }, { status: 400 });
    }

    if (!slideCount || slideCount < 1 || slideCount > 20) {
      return data(
        { error: "Slide count must be between 1 and 20" },
        { status: 400 }
      );
    }

    console.log(
      `Planning presentation: "${topic}" with ${slideCount} slides`
    );

    const systemPrompt = `You are an expert presentation planner and content strategist.

Your role:
- Analyze the user's topic and create a well-structured presentation outline
- Plan each slide with specific, detailed content
- Use web search to gather accurate, up-to-date information when needed
- Create diverse slide types: title slides, content slides, data/statistics slides, conclusion slides
- Ensure logical flow and coherent narrative throughout the presentation
- Write detailed prompts that the slide generator can use to create professional slides

Guidelines for slide planning:
- First slide should be a title/introduction slide
- Last slide should be a conclusion/summary slide
- Middle slides should develop the topic logically
- Include specific data, facts, or examples when relevant
- Vary slide types for visual interest
- Each prompt should be 2-4 sentences with specific instructions

Prompt writing best practices:
- Be specific about slide type (title, content, data visualization, etc.)
- Mention key text content that should appear
- Suggest visual elements (charts, images, icons, shapes)
- Indicate color scheme or mood if relevant
- Specify layout preferences (centered, left-aligned, multi-column, etc.)

Example good prompt:
"Create a content slide titled 'Market Growth Trends'. Include three bullet points: 1) Global market increased 23% in 2024, 2) Asia-Pacific leads with 45% market share, 3) Projected 30% growth by 2026. Add a bar chart placeholder showing year-over-year growth. Use professional blue color scheme with data visualization emphasis."`;

    // Generate presentation plan
    const response = await openai.responses.parse({
      model: "gpt-5.2",
      input: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: `Create a detailed presentation plan for the following topic:

Topic: ${topic}
Number of slides: ${slideCount}

For each slide, write a specific, detailed prompt that includes:
1. What type of slide it is (title, content, data, conclusion, etc.)
2. Specific text content that should appear
3. Visual elements to include (images, charts, shapes, icons)
4. Layout and design suggestions

Use web search if you need current data, statistics, or factual information about this topic.

Generate a complete presentation plan with ${slideCount} well-structured slides.`,
        },
      ],
      text: {
        format: zodTextFormat(presentationPlanSchema, "presentation_plan"),
      },
      tools: [{ type: "web_search" }],
    });

    const plan = response.output_parsed;

    if (!plan || !plan.slides || plan.slides.length === 0) {
      throw new Error("Failed to generate presentation plan");
    }

    console.log(`✅ Generated plan for ${plan.slides.length} slides`);
    console.log(`Theme: ${plan.theme}`);

    return data({
      success: true,
      plan: plan,
    });
  } catch (error) {
    console.error("Error planning presentation:", error);
    return data(
      {
        error: "Failed to plan presentation",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
};
