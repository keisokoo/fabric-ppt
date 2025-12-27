import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("api/gen", "api/gen.ts"),
  route("api/plan", "api/plan.ts"),
  route("api/generate-image", "api/generate-image.ts"),
  route("api/generate-icon", "api/generate-icon.ts"),
] satisfies RouteConfig;
