import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("api/gen", "api/gen.ts"),
  route("api/plan-stream", "api/plan-stream.ts"),
  route("api/color-palette", "api/color-palette.ts"),
  route("api/generate-image", "api/generate-image.ts"),
  route("api/generate-icon", "api/generate-icon.ts"),
] satisfies RouteConfig;
