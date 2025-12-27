import { access, constants, mkdir, writeFile } from "fs/promises";
import OpenAI from "openai";
import { join } from "path";
import type { ActionFunctionArgs } from "react-router";
import { data } from "react-router";
import sharp from "sharp";

export const action = async (args: ActionFunctionArgs) => {
  try {
    const formData = await args.request.formData();
    const prompt = formData.get("prompt") as string;
    const slideId = formData.get("slideId") as string;
    const objectIndex = formData.get("objectIndex") as string;
    const targetWidth = formData.get("targetWidth") as string;
    const targetHeight = formData.get("targetHeight") as string;

    if (!prompt) {
      return data({ error: "Prompt is required" }, { status: 400 });
    }

    if (!slideId || !objectIndex) {
      return data(
        { error: "slideId and objectIndex are required" },
        { status: 400 }
      );
    }

    if (!targetWidth || !targetHeight) {
      return data(
        { error: "targetWidth and targetHeight are required" },
        { status: 400 }
      );
    }

    // Create upload directory if it doesn't exist
    const uploadDir = join(process.cwd(), "public", "upload", "images");
    await mkdir(uploadDir, { recursive: true });

    // Generate filename based on slideId and objectIndex
    const filename = `${slideId}_${objectIndex}.png`;
    const filepath = join(uploadDir, filename);
    const publicUrl = `/upload/images/${filename}`;

    // Check if image already exists
    try {
      await access(filepath, constants.F_OK);
      console.log(`Image already exists: ${filename}`);
      return data({
        success: true,
        url: publicUrl,
        filename,
        cached: true,
      });
    } catch {
      // File doesn't exist, continue with generation
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Parse target dimensions
    const width = Math.round(parseFloat(targetWidth));
    const height = Math.round(parseFloat(targetHeight));

    console.log(`Generating image with target size: ${width}x${height}`);

    // Generate image using DALL-E
    const response = await openai.images.generate({
      model: "gpt-image-1.5",
      prompt: prompt,
      n: 1,
    });

    const b64Image = response.data?.[0]?.b64_json;
    if (!b64Image) {
      throw new Error("No image data received");
    }

    // Convert base64 to buffer
    const imageBuffer = Buffer.from(b64Image, "base64");

    // Resize image to target dimensions using sharp (cover mode)
    const resizedBuffer = await sharp(imageBuffer)
      .resize(width, height, {
        fit: "cover", // Cover the entire area, may crop
        position: "center",
      })
      .png()
      .toBuffer();

    console.log(`Image resized to ${width}x${height}`);

    // Save resized image to disk
    await writeFile(filepath, resizedBuffer);

    // Return public URL path
    return data({
      success: true,
      url: publicUrl,
      filename,
      cached: false,
    });
  } catch (error) {
    console.error("Error generating image:", error);
    return data(
      {
        error: "Failed to generate image",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
};
