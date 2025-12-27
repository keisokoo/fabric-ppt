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
  title: z.string().describe("Slide title (concise, 3-8 words)"),
  content: z
    .string()
    .describe(
      "Brief description of what content this slide should cover. Just the topic/information, not design details. Gen.ts will research and design it."
    ),
  slideType: z
    .enum(["title", "content", "data", "comparison", "conclusion", "other"])
    .describe("Type of slide for content structure"),
});

// Presentation plan schema
const presentationPlanSchema = z.object({
  totalSlides: z
    .number()
    .describe("Total number of slides in the presentation"),
  theme: z
    .string()
    .describe("Overall theme/topic of the presentation (one sentence summary)"),
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

    console.log(`Planning presentation: "${topic}" with ${slideCount} slides`);

    const systemPrompt = `You are an expert presentation planner and content strategist.

Your role:
- Analyze the user's topic and create a well-structured presentation outline
- Plan the content structure and flow of the presentation
- Use web search to understand the topic and identify key points to cover
- Focus on WHAT information each slide should convey, not HOW it looks
- Ensure logical flow and coherent narrative throughout the presentation

IMPORTANT - Content Only, No Design:
- Do NOT specify colors, fonts, layouts, or visual design elements
- Do NOT mention specific images, icons, charts, or decorative elements
- Do NOT give design instructions like "centered", "left-aligned", "blue theme", etc.
- ONLY describe the informational content each slide should contain

Guidelines for slide planning:
- First slide: title/introduction with main topic
- Middle slides: develop the topic logically with key points
- Last slide: conclusion/summary or call-to-action
- Vary slide types: title, content, data, comparison, conclusion
- Keep content descriptions brief (1-2 sentences per slide)

Content description examples:
✅ GOOD: "Overview of AI market growth in 2024-2025 with key statistics"
✅ GOOD: "Three main benefits of the product for enterprise customers"
❌ BAD: "Title centered with blue background and rocket icon on the right"
❌ BAD: "Use bullet points with checkmark icons and gradient colors"

The slide generator (gen.ts) will:
- Research detailed information using web search
- Decide on appropriate visualizations
- Design the layout and visual style
- Add icons, images, and decorative elements`;

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
          content: `Create a presentation content plan for the following topic:

Topic: ${topic}
Number of slides: ${slideCount}

For each slide, provide:
1. slideNumber: The slide number (1 to ${slideCount})
2. title: A concise slide title (3-8 words)
3. content: Brief description of what information this slide should cover (1-2 sentences, content only, NO design details)
4. slideType: Type of slide (title/content/data/comparison/conclusion/other)

Remember:
- Focus ONLY on content structure and information flow
- Do NOT mention any visual design elements
- Keep descriptions brief and factual
- Use web search to understand the topic better if needed

Generate a complete presentation plan with ${slideCount} slides.`,
        },
      ],
      text: {
        format: zodTextFormat(presentationPlanSchema, "presentation_plan"),
      },
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
