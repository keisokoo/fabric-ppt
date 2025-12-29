import { Canvas } from "fabric";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Form } from "react-router";
import { ulid } from "ulid";
import type { Route } from "./+types/home";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Fabric PPT" },
    { name: "description", content: "Fabric PPT" },
  ];
}

interface Slide {
  id: string;
  fabricJson: any;
  prompt: string;
}

interface SlidePlan {
  slideNumber: number;
  title: string;
  content: string;
  slideType: string;
}

interface PresentationPlan {
  totalSlides: number;
  theme: string;
  slides: SlidePlan[];
  background?: string;
  useIcons?: boolean;
}

export interface SlideCanvasRef {
  getCanvasJSON: () => any;
}

type Phase = "plan" | "edit-plan" | "management";

export default function Home() {
  const [phase, setPhase] = useState<Phase>("plan");
  const [plan, setPlan] = useState<PresentationPlan | null>(null);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);

  const handleGenerateAllSlides = async (planToGenerate: PresentationPlan) => {
    setIsGenerating(true);
    setGenerationProgress(0);
    setPhase("management");

    try {
      // Generate color palette if background is specified
      let colorPalette = null;
      if (planToGenerate.background) {
        const paletteFormData = new FormData();
        paletteFormData.append("background", planToGenerate.background);

        const paletteResponse = await fetch("/api/color-palette", {
          method: "POST",
          body: paletteFormData,
        });

        if (paletteResponse.ok) {
          const paletteResult = await paletteResponse.json();
          colorPalette = paletteResult.palette;
        }
      }

      for (let i = 0; i < planToGenerate.slides.length; i++) {
        const slidePlan = planToGenerate.slides[i];

        const formData = new FormData();
        const fullPrompt = `${slidePlan.title}: ${slidePlan.content}`;
        formData.append("prompt", fullPrompt);
        formData.append("slideNumber", slidePlan.slideNumber.toString());

        // Add design settings from plan
        if (planToGenerate.background) {
          formData.append("background", planToGenerate.background);
        }
        if (planToGenerate.useIcons !== undefined) {
          formData.append("useIcons", planToGenerate.useIcons.toString());
        }
        // Add color palette if generated
        if (colorPalette) {
          formData.append("colorPalette", JSON.stringify(colorPalette));
        }

        const response = await fetch("/api/gen", {
          method: "POST",
          body: formData,
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            `Slide ${slidePlan.slideNumber} failed: ${result.error}`
          );
        }

        setSlides((prev) => [
          ...prev,
          {
            id: ulid(),
            fabricJson: result.slide,
            prompt: fullPrompt,
          },
        ]);

        setGenerationProgress(((i + 1) / planToGenerate.slides.length) * 100);
      }
    } catch (err) {
      console.error("Slide generation error:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8 text-center">
          AI PowerPoint Generator
        </h1>

        {phase === "plan" && (
          <PlanPhase
            onPlanGenerated={(generatedPlan) => {
              setPlan(generatedPlan);
              setPhase("edit-plan");
            }}
          />
        )}

        {phase === "edit-plan" && plan && (
          <EditPlanPhase
            plan={plan}
            onPlanUpdated={setPlan}
            onGenerateSlides={() => handleGenerateAllSlides(plan)}
          />
        )}

        {phase === "management" && (
          <ManagementPhase
            slides={slides}
            onSlidesUpdated={setSlides}
            onBack={() => {
              setPhase("plan");
              setSlides([]);
              setPlan(null);
            }}
            isGenerating={isGenerating}
            generationProgress={generationProgress}
            totalSlidesToGenerate={plan?.slides.length || 0}
          />
        )}
      </div>
    </div>
  );
}

// Phase 1: Plan Generation
function PlanPhase({
  onPlanGenerated,
}: {
  onPlanGenerated: (plan: PresentationPlan) => void;
}) {
  const [topic, setTopic] = useState("");
  const [slideCount, setSlideCount] = useState(1);
  const [useCustomBackground, setUseCustomBackground] = useState(false);
  const [background, setBackground] = useState("#ffffff");
  const [useIcons, setUseIcons] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [partialPlan, setPartialPlan] = useState<PresentationPlan | null>(null);

  const handleGeneratePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    setIsLoading(true);
    setError(null);
    setPartialPlan(null);

    try {
      const formData = new FormData();
      formData.append("topic", topic);
      formData.append("slideCount", slideCount.toString());

      const response = await fetch("/api/plan-stream", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to generate plan");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = "";

      if (!reader) {
        throw new Error("No response body");
      }

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        accumulatedText += chunk;

        // Try to parse the accumulated JSON using jsonrepair
        try {
          const { jsonrepair } = await import("jsonrepair");
          const repairedJson = jsonrepair(accumulatedText);
          const parsed = JSON.parse(repairedJson);

          // Update the partial plan as we receive more data
          if (parsed && typeof parsed === "object") {
            setPartialPlan(parsed as PresentationPlan);
          }
        } catch {
          // Ignore parse errors - we'll try again with the next chunk
        }
      }

      // Final parse
      try {
        const { jsonrepair } = await import("jsonrepair");
        const repairedJson = jsonrepair(accumulatedText);
        const finalPlan = JSON.parse(repairedJson);

        if (!finalPlan || !finalPlan.slides || finalPlan.slides.length === 0) {
          throw new Error("Failed to generate presentation plan");
        }

        // Add design settings to the plan
        onPlanGenerated({
          ...finalPlan,
          background: useCustomBackground ? background : undefined,
          useIcons,
        });
      } catch (err) {
        throw new Error("Failed to parse final plan");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-gray-800 rounded-lg p-8 shadow-xl">
        <h2 className="text-2xl font-bold mb-6">1단계: 프레젠테이션 계획</h2>

        <form onSubmit={handleGeneratePlan} className="space-y-6">
          <div>
            <label htmlFor="topic" className="block text-sm font-medium mb-2">
              주제
            </label>
            <input
              id="topic"
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="예: 2025년 마케팅 전략"
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
              disabled={isLoading}
            />
          </div>

          <div>
            <label
              htmlFor="slideCount"
              className="block text-sm font-medium mb-2"
            >
              슬라이드 수: {slideCount}
            </label>
            <input
              id="slideCount"
              type="range"
              min="1"
              max="20"
              value={slideCount}
              onChange={(e) => setSlideCount(parseInt(e.target.value))}
              className="w-full"
              disabled={isLoading}
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>1</span>
              <span>20</span>
            </div>
          </div>

          <div className="border-t border-gray-700 pt-6">
            <h3 className="text-lg font-semibold mb-4">디자인 설정</h3>

            <div className="space-y-4">
              <div>
                <label className="flex items-center gap-3 cursor-pointer mb-3">
                  <input
                    type="checkbox"
                    checked={useCustomBackground}
                    onChange={(e) => setUseCustomBackground(e.target.checked)}
                    className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-2 focus:ring-blue-500"
                    disabled={isLoading}
                  />
                  <div>
                    <span className="text-sm font-medium">
                      배경색 직접 지정
                    </span>
                    <p className="text-xs text-gray-400">
                      꺼두면 AI가 주제에 맞는 배경색을 자동으로 선택합니다
                    </p>
                  </div>
                </label>

                {useCustomBackground && (
                  <div className="ml-8">
                    <div className="flex gap-3 items-center">
                      <input
                        id="background"
                        type="color"
                        value={background}
                        onChange={(e) => setBackground(e.target.value)}
                        className="w-16 h-10 rounded cursor-pointer bg-gray-700 border border-gray-600"
                        disabled={isLoading}
                      />
                      <input
                        type="text"
                        value={background}
                        onChange={(e) => setBackground(e.target.value)}
                        placeholder="#ffffff"
                        className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white font-mono text-sm"
                        disabled={isLoading}
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      전체 슬라이드에 적용될 배경색입니다. AI가 이 색상에 맞춰
                      컬러 테마를 구성합니다.
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useIcons}
                    onChange={(e) => setUseIcons(e.target.checked)}
                    className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-2 focus:ring-blue-500"
                    disabled={isLoading}
                  />
                  <div>
                    <span className="text-sm font-medium">아이콘 사용</span>
                    <p className="text-xs text-gray-400">
                      슬라이드에 SVG 아이콘을 추가할 수 있습니다 (최대
                      1-2개/슬라이드)
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-900/50 border border-red-700 rounded-lg p-4 text-red-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !topic.trim()}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            {isLoading ? "계획 생성 중..." : "슬라이드 계획 생성"}
          </button>
        </form>

        {isLoading && partialPlan && (
          <div className="mt-6 bg-gray-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">
              생성 중... ({partialPlan.slides?.length || 0}개 슬라이드)
            </h3>
            {partialPlan.theme && (
              <p className="text-sm text-gray-300 mb-4">
                <strong>주제:</strong> {partialPlan.theme}
              </p>
            )}
            {partialPlan.slides && partialPlan.slides.length > 0 && (
              <div className="space-y-3">
                {partialPlan.slides.map((slide, index) => (
                  <div
                    key={index}
                    className="bg-gray-600 rounded p-3 animate-pulse"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-gray-400">
                        슬라이드 {slide.slideNumber}
                      </span>
                      <span className="text-xs text-gray-500 px-2 py-0.5 bg-gray-500 rounded">
                        {slide.slideType}
                      </span>
                    </div>
                    <p className="font-medium text-sm">{slide.title}</p>
                    <p className="text-xs text-gray-300 mt-1">
                      {slide.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Phase 2: Edit Plan and Generate Slides
function EditPlanPhase({
  plan,
  onPlanUpdated,
  onGenerateSlides,
}: {
  plan: PresentationPlan;
  onPlanUpdated: (plan: PresentationPlan) => void;
  onGenerateSlides: () => void;
}) {
  const handleUpdateSlide = (
    index: number,
    field: keyof SlidePlan,
    value: string
  ) => {
    const updatedSlides = [...plan.slides];
    updatedSlides[index] = { ...updatedSlides[index], [field]: value };
    onPlanUpdated({ ...plan, slides: updatedSlides });
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-gray-800 rounded-lg p-8 shadow-xl mb-6">
        <h2 className="text-2xl font-bold mb-4">2단계: 슬라이드 계획 편집</h2>
        <p className="text-gray-300 mb-2">
          <strong>주제:</strong> {plan.theme}
        </p>

        {/* Display design settings */}
        <div className="flex gap-4 mb-4">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <span>배경색:</span>
            {plan.background ? (
              <>
                <div
                  className="w-6 h-6 rounded border border-gray-600"
                  style={{ backgroundColor: plan.background }}
                />
                <span className="font-mono text-xs">{plan.background}</span>
              </>
            ) : (
              <span className="text-xs italic">AI 자동 선택</span>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <span>아이콘:</span>
            <span className="font-medium">
              {plan.useIcons ? "사용함" : "사용 안 함"}
            </span>
          </div>
        </div>

        <p className="text-gray-400 text-sm mb-6">
          각 슬라이드의 내용을 수정할 수 있습니다. 준비가 되면 "모든 슬라이드
          생성" 버튼을 클릭하세요.
        </p>

        <div className="space-y-4 mb-6">
          {plan.slides.map((slide, index) => (
            <div
              key={index}
              className="bg-gray-700 rounded-lg p-6 border border-gray-600"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">
                  슬라이드 {slide.slideNumber}
                </h3>
                <span className="text-xs text-gray-400 px-3 py-1 bg-gray-600 rounded-full">
                  {slide.slideType}
                </span>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">제목</label>
                  <input
                    type="text"
                    value={slide.title}
                    onChange={(e) =>
                      handleUpdateSlide(index, "title", e.target.value)
                    }
                    className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    내용 설명
                  </label>
                  <textarea
                    value={slide.content}
                    onChange={(e) =>
                      handleUpdateSlide(index, "content", e.target.value)
                    }
                    rows={3}
                    className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-white resize-none"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={onGenerateSlides}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
        >
          모든 슬라이드 생성 ({plan.slides.length}장)
        </button>
      </div>
    </div>
  );
}

// Phase 3: Management (existing functionality)
function ManagementPhase({
  slides,
  onSlidesUpdated,
  onBack,
  isGenerating,
  generationProgress,
  totalSlidesToGenerate,
}: {
  slides: Slide[];
  onSlidesUpdated: (slides: Slide[]) => void;
  onBack: () => void;
  isGenerating?: boolean;
  generationProgress?: number;
  totalSlidesToGenerate?: number;
}) {
  const slideCanvasRefs = useRef<Map<string, SlideCanvasRef>>(new Map());
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateSlide = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("prompt", prompt);
      formData.append("slideNumber", (slides.length + 1).toString());

      const response = await fetch("/api/gen", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to generate slide");
      }

      onSlidesUpdated([
        ...slides,
        {
          id: ulid(),
          fabricJson: result.slide,
          prompt: prompt,
        },
      ]);

      setPrompt("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadPPT = async () => {
    if (slides.length === 0) {
      setError("다운로드할 슬라이드가 없습니다.");
      return;
    }

    setIsDownloading(true);
    setError(null);

    try {
      const currentSlides = slides.map((slide) => {
        const canvasRef = slideCanvasRefs.current.get(slide.id);
        if (canvasRef) {
          return canvasRef.getCanvasJSON();
        }
        return slide.fabricJson;
      });

      const response = await fetch("http://localhost:8731/convert", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ slides: currentSlides }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to convert to PPT");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "presentation.pptx";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div>
      <div className="mb-8 flex justify-between items-center">
        <button
          onClick={onBack}
          className="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
        >
          ← 새 프레젠테이션 시작
        </button>

        <h2 className="text-2xl font-bold">
          3단계: 슬라이드 관리 ({slides.length}장)
        </h2>

        <button
          onClick={handleDownloadPPT}
          disabled={isDownloading || slides.length === 0}
          className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-2 px-6 rounded-lg transition-colors"
        >
          {isDownloading ? "다운로드 중..." : "PPT 다운로드"}
        </button>
      </div>

      {isGenerating && (
        <div className="bg-gray-800 rounded-lg p-6 shadow-xl mb-8">
          <h3 className="text-xl font-bold mb-4">슬라이드 생성 중...</h3>
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-2">
              <span>
                생성됨: {slides.length} / {totalSlidesToGenerate}
              </span>
              <span>{Math.round(generationProgress || 0)}%</span>
            </div>
            <div className="w-full bg-gray-600 rounded-full h-3">
              <div
                className="bg-green-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${generationProgress || 0}%` }}
              />
            </div>
          </div>
          <p className="text-sm text-gray-400">
            생성된 슬라이드는 실시간으로 아래에 표시됩니다.
          </p>
        </div>
      )}

      {!isGenerating && (
        <div className="bg-gray-800 rounded-lg p-6 shadow-xl mb-8">
          <h3 className="text-xl font-bold mb-4">슬라이드 추가</h3>
          <Form onSubmit={handleGenerateSlide} className="flex gap-4">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="추가 슬라이드 내용 입력..."
              className="flex-1 px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !prompt.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              {isLoading ? "생성 중..." : "슬라이드 추가"}
            </button>
          </Form>

          {error && (
            <div className="mt-4 bg-red-900/50 border border-red-700 rounded-lg p-4 text-red-200">
              {error}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col gap-8">
        {slides.length === 0 && !isGenerating ? (
          <div className="text-center py-12 text-gray-400">
            생성된 슬라이드가 없습니다.
          </div>
        ) : (
          <>
            {slides.map((slide, index) => (
              <SlideCanvas
                key={slide.id}
                ref={(ref) => {
                  if (ref) {
                    slideCanvasRefs.current.set(slide.id, ref);
                  } else {
                    slideCanvasRefs.current.delete(slide.id);
                  }
                }}
                slideId={slide.id}
                slideNumber={index + 1}
                fabricJson={slide.fabricJson}
                prompt={slide.prompt}
              />
            ))}
            {isGenerating && (
              <div className="bg-gray-800 rounded-lg p-4 shadow-lg w-fit mx-auto">
                <div className="mb-2 flex justify-between items-center">
                  <h3 className="text-lg font-semibold">
                    슬라이드 {slides.length + 1}
                  </h3>
                </div>
                <div
                  className="relative bg-gray-700 rounded overflow-hidden animate-pulse"
                  style={{ width: "1280px", height: "720px" }}
                >
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500 mx-auto mb-4"></div>
                      <p className="text-gray-300 font-semibold text-lg">
                        슬라이드 생성 중...
                      </p>
                      <p className="text-gray-400 text-sm mt-2">
                        AI가 디자인을 만들고 있습니다
                      </p>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-2">1280 x 720px</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// SlideCanvas component (unchanged from original)
const SlideCanvas = forwardRef<
  SlideCanvasRef,
  {
    slideId: string;
    slideNumber: number;
    fabricJson: any;
    prompt: string;
  }
>(({ slideId, slideNumber, fabricJson, prompt }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<Canvas | null>(null);
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);
  const [imageGenerationStatus, setImageGenerationStatus] =
    useState<string>("");

  useImperativeHandle(ref, () => ({
    getCanvasJSON: () => {
      if (fabricCanvasRef.current) {
        return fabricCanvasRef.current.toJSON();
      }
      return fabricJson;
    },
  }));

  const generatePlaceholderImages = async (canvas: Canvas, jsonData: any) => {
    const objects = jsonData.objects || [];
    const placeholderImages = objects.filter(
      (obj: any) =>
        obj.type === "Image" && obj.data?.isPlaceholder && obj.data?.imagePrompt
    );
    const iconImages = objects.filter(
      (obj: any) =>
        obj.type === "Image" && obj.data?.isIcon && obj.data?.iconName
    );

    if (placeholderImages.length === 0 && iconImages.length === 0) {
      return;
    }

    setIsGeneratingImages(true);
    const totalItems = iconImages.length + placeholderImages.length;
    setImageGenerationStatus(`이미지 생성 중... (0/${totalItems})`);

    let currentIndex = 0;

    // First, generate icons
    for (let i = 0; i < iconImages.length; i++) {
      const iconObj = iconImages[i];
      try {
        const objectIndex = objects.indexOf(iconObj);

        currentIndex++;
        setImageGenerationStatus(
          `아이콘 생성 중... (${currentIndex}/${totalItems})`
        );

        const formData = new FormData();
        formData.append("iconName", iconObj.data.iconName);
        formData.append("iconColor", iconObj.data.iconColor || "#000000");
        formData.append("slideId", slideId);
        formData.append("objectIndex", objectIndex.toString());

        const targetWidth = iconObj.width * iconObj.scaleX;
        const targetHeight = iconObj.height * iconObj.scaleY;
        formData.append("targetWidth", targetWidth.toString());
        formData.append("targetHeight", targetHeight.toString());

        const response = await fetch("/api/generate-icon", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error("Failed to generate icon");
        }

        const result = await response.json();

        const canvasObjects = canvas.getObjects();
        const targetIndex = objects.indexOf(iconObj);

        if (targetIndex >= 0 && targetIndex < canvasObjects.length) {
          const fabricObj = canvasObjects[targetIndex] as any;

          if (fabricObj.type === "image") {
            const imageUrl = result.url.startsWith("http")
              ? result.url
              : `${window.location.origin}${result.url}`;

            const { FabricImage } = await import("fabric");
            let newImg;
            let retries = 3;

            while (retries > 0) {
              try {
                const cacheBustUrl = `${imageUrl}?t=${Date.now()}`;
                newImg = await FabricImage.fromURL(cacheBustUrl, {
                  crossOrigin: "anonymous",
                });
                break;
              } catch (error) {
                retries--;
                if (retries > 0) {
                  await new Promise((resolve) => setTimeout(resolve, 200));
                } else {
                  throw error;
                }
              }
            }

            if (newImg) {
              newImg.set({
                left: fabricObj.left,
                top: fabricObj.top,
                scaleX: fabricObj.scaleX,
                scaleY: fabricObj.scaleY,
                angle: fabricObj.angle,
                originX: fabricObj.originX,
                originY: fabricObj.originY,
              });

              canvas.remove(fabricObj);
              canvas.insertAt(targetIndex, newImg);
              canvas.renderAll();
              canvas.requestRenderAll();
            }
          }
        }
      } catch (error) {
        console.error(`Failed to generate icon ${i + 1}:`, error);
      }
    }

    // Then, generate placeholder images
    for (let i = 0; i < placeholderImages.length; i++) {
      const placeholderObj = placeholderImages[i];
      try {
        const objectIndex = objects.indexOf(placeholderObj);

        currentIndex++;
        setImageGenerationStatus(
          `이미지 생성 중... (${currentIndex}/${totalItems})`
        );

        const formData = new FormData();
        formData.append("prompt", placeholderObj.data.imagePrompt);
        formData.append("slideId", slideId);
        formData.append("objectIndex", objectIndex.toString());

        const targetWidth = placeholderObj.width * placeholderObj.scaleX;
        const targetHeight = placeholderObj.height * placeholderObj.scaleY;
        formData.append("targetWidth", targetWidth.toString());
        formData.append("targetHeight", targetHeight.toString());

        const response = await fetch("/api/generate-image", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error("Failed to generate image");
        }

        const result = await response.json();

        const canvasObjects = canvas.getObjects();
        const targetIndex = objects.indexOf(placeholderObj);
        if (targetIndex >= 0 && targetIndex < canvasObjects.length) {
          const fabricObj = canvasObjects[targetIndex] as any;

          if (fabricObj.type === "image") {
            const imageUrl = result.url.startsWith("http")
              ? result.url
              : `${window.location.origin}${result.url}`;

            const { FabricImage } = await import("fabric");
            let newImg;
            let retries = 3;

            while (retries > 0) {
              try {
                const cacheBustUrl = `${imageUrl}?t=${Date.now()}`;
                newImg = await FabricImage.fromURL(cacheBustUrl, {
                  crossOrigin: "anonymous",
                });
                break;
              } catch (error) {
                retries--;
                if (retries > 0) {
                  await new Promise((resolve) => setTimeout(resolve, 200));
                } else {
                  console.error(
                    "Failed to load image after all retries:",
                    error
                  );
                  throw error;
                }
              }
            }

            if (!newImg) {
              throw new Error("Failed to create image object");
            }

            newImg.set({
              left: fabricObj.left,
              top: fabricObj.top,
              originX: fabricObj.originX,
              originY: fabricObj.originY,
              scaleX: fabricObj.scaleX,
              scaleY: fabricObj.scaleY,
              angle: fabricObj.angle,
              opacity: fabricObj.opacity,
            });

            const allObjects = canvas.getObjects();
            canvas.remove(fabricObj);

            canvas.clear();
            allObjects.forEach((obj, idx) => {
              if (idx === targetIndex) {
                canvas.add(newImg);
              } else if (obj !== fabricObj) {
                canvas.add(obj);
              }
            });

            canvas.renderAll();
          } else {
            console.warn("Object is not an image:", fabricObj);
          }
        } else {
          console.warn("Target index out of bounds");
        }

        placeholderObj.src = result.url;
        placeholderObj.data.isPlaceholder = false;
      } catch (error) {
        console.error("Failed to generate image:", error);
        setImageGenerationStatus(
          `이미지 생성 실패 (${i + 1}/${placeholderImages.length})`
        );
      }
    }

    setIsGeneratingImages(false);
    setImageGenerationStatus("이미지 생성 완료");
    setTimeout(() => setImageGenerationStatus(""), 2000);
  };

  useEffect(() => {
    if (!canvasRef.current) return;

    const initCanvas = async () => {
      const canvas = new Canvas(canvasRef.current!, {
        width: 1280,
        height: 720,
        backgroundColor: fabricJson.background || "#ffffff",
      });

      fabricCanvasRef.current = canvas;

      await canvas.loadFromJSON(fabricJson);
      canvas.renderAll();
      canvas.requestRenderAll();

      await generatePlaceholderImages(canvas, fabricJson);
    };

    initCanvas();

    return () => {
      fabricCanvasRef.current?.dispose();
    };
  }, [fabricJson, slideId]);

  return (
    <div className="bg-gray-800 rounded-lg p-4 shadow-lg w-fit mx-auto">
      <div className="mb-2 flex justify-between items-center">
        <h3 className="text-lg font-semibold">슬라이드 {slideNumber}</h3>
      </div>
      <div
        className="relative bg-white rounded overflow-hidden"
        style={{ width: "1280px", height: "720px" }}
      >
        <canvas ref={canvasRef} />
        {isGeneratingImages && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="bg-gray-900 rounded-lg p-6 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
              <p className="text-white font-semibold">
                {imageGenerationStatus}
              </p>
            </div>
          </div>
        )}
      </div>
      <p className="text-xs text-gray-400 mt-2">1280 x 720px</p>
    </div>
  );
});
