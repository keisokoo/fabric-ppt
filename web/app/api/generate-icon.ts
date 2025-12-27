import { writeFile, access, constants } from "fs/promises";
import { join } from "path";
import type { ActionFunctionArgs } from "react-router";
import { data } from "react-router";
import sharp from "sharp";

export const action = async (args: ActionFunctionArgs) => {
  try {
    const formData = await args.request.formData();
    const iconName = formData.get("iconName") as string;
    const iconColor = formData.get("iconColor") as string;
    const slideId = formData.get("slideId") as string;
    const objectIndex = formData.get("objectIndex") as string;
    const targetWidth = parseInt(formData.get("targetWidth") as string, 10);
    const targetHeight = parseInt(formData.get("targetHeight") as string, 10);

    if (!iconName || !iconColor || !slideId || !objectIndex) {
      return data(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    // Read SVG file
    const svgPath = join(
      process.cwd(),
      "public",
      "icons",
      `${iconName}.svg`
    );

    const fs = await import("fs/promises");
    let svgContent = await fs.readFile(svgPath, "utf-8");

    // Replace fill color in SVG
    // Handle both fill="currentColor" and fill="#000000" patterns
    svgContent = svgContent.replace(
      /fill="currentColor"/g,
      `fill="${iconColor}"`
    );
    svgContent = svgContent.replace(
      /fill="#[0-9A-Fa-f]{6}"/g,
      `fill="${iconColor}"`
    );

    // Also handle stroke if present
    svgContent = svgContent.replace(
      /stroke="currentColor"/g,
      `stroke="${iconColor}"`
    );

    // Convert SVG to PNG using sharp
    const pngBuffer = await sharp(Buffer.from(svgContent))
      .resize(targetWidth || 96, targetHeight || 96, {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 }, // Transparent background
      })
      .png()
      .toBuffer();

    // Save PNG file with icon_ prefix
    const outputDir = join(process.cwd(), "public", "upload", "images");
    const filename = `icon_${slideId}_${objectIndex}.png`;
    const filepath = join(outputDir, filename);

    await writeFile(filepath, pngBuffer);

    // Wait a bit for filesystem to sync
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Verify file exists and is readable
    try {
      await access(filepath, constants.R_OK);
      console.log(`Icon saved successfully: ${filename}`);
    } catch (err) {
      console.error(`Failed to verify icon file: ${filepath}`, err);
      throw new Error("Icon file verification failed");
    }

    return data({
      success: true,
      url: `/upload/images/${filename}`,
      iconName,
      iconColor,
    });
  } catch (error) {
    console.error("Error generating icon:", error);
    return data(
      {
        error: "Failed to generate icon",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
};
