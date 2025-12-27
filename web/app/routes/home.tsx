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
import { sample } from "./sample";

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

export interface SlideCanvasRef {
  getCanvasJSON: () => any;
}

export default function Home() {
  const slideCanvasRefs = useRef<Map<string, SlideCanvasRef>>(new Map());
  const [slides, setSlides] = useState<Slide[]>([sample]);
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

      // 새 슬라이드 추가
      setSlides((prev) => [
        ...prev,
        {
          id: ulid(),
          fabricJson: result.slide,
          prompt: prompt,
        },
      ]);

      setPrompt(""); // 입력창 초기화
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
      // 각 캔버스에서 현재 편집된 JSON 가져오기
      const currentSlides = slides.map((slide) => {
        const canvasRef = slideCanvasRefs.current.get(slide.id);
        if (canvasRef) {
          // 캔버스에서 현재 상태를 JSON으로 추출
          return canvasRef.getCanvasJSON();
        }
        // 캔버스 ref가 없으면 원본 JSON 사용
        return slide.fabricJson;
      });
      console.log(currentSlides);

      const response = await fetch("http://localhost:8731/convert", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          slides: currentSlides,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate PowerPoint");
      }

      // 파일 다운로드
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `presentation-${new Date().getTime()}.pptx`;
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
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="mx-auto" style={{ maxWidth: "1400px" }}>
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Fabric PPT Generator</h1>
          {slides.length > 0 && (
            <button
              onClick={handleDownloadPPT}
              disabled={isDownloading}
              className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
            >
              {isDownloading ? "다운로드 중..." : "PPT 다운로드"}
            </button>
          )}
        </div>

        {/* 입력 폼 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">
            슬라이드 생성 #{slides.length + 1}
          </h2>

          <Form onSubmit={handleGenerateSlide} className="space-y-4">
            <div>
              <label
                htmlFor="prompt"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                슬라이드 내용
              </label>
              <div className="flex gap-4">
                <textarea
                  id="prompt"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="예: 타이틀 슬라이드 - '2025 사업 계획'"
                  className="flex-1 h-24 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={isLoading || !prompt.trim()}
                  className="px-6 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
                >
                  {isLoading ? "생성 중..." : "생성"}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <div className="border-t border-gray-200 pt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">
                프롬프트 예시
              </h3>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() =>
                    setPrompt(
                      "타이틀 슬라이드: 'AI 기반 스마트 팩토리 솔루션' - 부제: 제조업의 미래를 여는 기술"
                    )
                  }
                  className="w-full text-left px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded border border-gray-200"
                  disabled={isLoading}
                >
                  <span className="font-medium text-gray-900">슬라이드 1:</span>{" "}
                  타이틀 슬라이드 - AI 기반 스마트 팩토리 솔루션
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setPrompt(
                      "주요 기능 소개 슬라이드: 1) 실시간 생산 모니터링, 2) 예측 유지보수 시스템, 3) 자동 품질 검사, 4) 에너지 최적화"
                    )
                  }
                  className="w-full text-left px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded border border-gray-200"
                  disabled={isLoading}
                >
                  <span className="font-medium text-gray-900">슬라이드 2:</span>{" "}
                  주요 기능 4가지 소개
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setPrompt(
                      "도입 효과 슬라이드: 생산성 35% 향상, 불량률 60% 감소, 에너지 비용 25% 절감, ROI 18개월 - 그래프와 함께 표현"
                    )
                  }
                  className="w-full text-left px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded border border-gray-200"
                  disabled={isLoading}
                >
                  <span className="font-medium text-gray-900">슬라이드 3:</span>{" "}
                  도입 효과 및 성과 지표
                </button>
              </div>
            </div>
          </Form>
        </div>

        {/* 슬라이드 목록 */}
        <div className="space-y-6">
          {slides.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <p className="text-gray-500 mb-4">
                아직 생성된 슬라이드가 없습니다.
              </p>
              <p className="text-sm text-gray-400">
                위의 입력창에 슬라이드 내용을 작성하고 생성 버튼을 눌러주세요.
              </p>
            </div>
          ) : (
            slides.map((slide, index) => (
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
            ))
          )}
        </div>
      </div>
    </div>
  );
}

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

  // 부모 컴포넌트에서 호출할 수 있는 메서드 노출
  useImperativeHandle(ref, () => ({
    getCanvasJSON: () => {
      if (fabricCanvasRef.current) {
        return fabricCanvasRef.current.toJSON();
      }
      return fabricJson;
    },
  }));

  // 이미지 placeholder를 실제 이미지로 변환
  const generatePlaceholderImages = async (canvas: Canvas, jsonData: any) => {
    const objects = jsonData.objects || [];
    const placeholderImages = objects.filter(
      (obj: any) =>
        obj.type === "Image" && obj.data?.isPlaceholder && obj.data?.imagePrompt
    );

    console.log("Found placeholder images:", placeholderImages.length);

    if (placeholderImages.length === 0) {
      return; // placeholder 이미지가 없으면 바로 리턴
    }

    // setIsGeneratingImages(true);
    // setImageGenerationStatus(
    //   `이미지 생성 중... (0/${placeholderImages.length})`
    // );

    for (let i = 0; i < placeholderImages.length; i++) {
      const placeholderObj = placeholderImages[i];
      try {
        // Find the object index in the original objects array
        const objectIndex = objects.indexOf(placeholderObj);

        console.log(
          `Generating image ${i + 1}:`,
          placeholderObj.data.imagePrompt
        );

        // setImageGenerationStatus(
        //   `이미지 생성 중... (${i + 1}/${placeholderImages.length})`
        // );

        // 이미지 생성 API 호출
        const formData = new FormData();
        formData.append("prompt", placeholderObj.data.imagePrompt);
        formData.append("slideId", slideId);
        formData.append("objectIndex", objectIndex.toString());

        // Calculate target dimensions from placeholder
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
        console.log(
          "Image generated:",
          result.url,
          result.cached ? "(cached)" : "(new)"
        );

        // 캔버스에서 해당 객체 찾아서 src 업데이트
        const canvasObjects = canvas.getObjects();
        const targetIndex = objects.indexOf(placeholderObj);

        console.log(
          "Target index:",
          targetIndex,
          "Canvas objects:",
          canvasObjects.length
        );

        if (targetIndex >= 0 && targetIndex < canvasObjects.length) {
          const fabricObj = canvasObjects[targetIndex] as any;

          console.log("Fabric object type:", fabricObj.type);

          // Fabric.js Image 객체는 setSrc로 이미지 변경
          if (fabricObj.type === "image" && fabricObj.setSrc) {
            console.log("Setting image src to:", result.url);

            // Use absolute URL to avoid 404 issues
            // Add timestamp to prevent caching issues
            const imageUrl = result.url.startsWith("http")
              ? result.url
              : `${window.location.origin}${result.url}`;

            const imageUrlWithCache = `${imageUrl}?t=${Date.now()}`;

            console.log("Absolute image URL:", imageUrlWithCache);

            await new Promise<void>((resolve, reject) => {
              fabricObj.setSrc(
                imageUrlWithCache,
                (img: any) => {
                  console.log(
                    "Image loaded successfully:",
                    img?.width,
                    "x",
                    img?.height
                  );
                  fabricObj.setCoords();
                  canvas.renderAll();
                  resolve();
                },
                { crossOrigin: "anonymous" },
                (err: any) => {
                  console.error("Image load error:", err);
                  reject(err);
                }
              );
            });
          } else {
            console.warn(
              "Object is not an image or setSrc not available:",
              fabricObj
            );
          }
        } else {
          console.warn("Target index out of bounds");
        }

        // JSON 데이터도 업데이트 (다운로드용)
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
    setImageGenerationStatus("");
    canvas.renderAll();
  };

  useEffect(() => {
    if (!canvasRef.current) return;

    // 1. 초기화 (이미 있으면 삭제 후 재생성)
    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.dispose();
    }

    const initCanvas = async () => {
      const canvas = new Canvas(canvasRef.current!, {
        width: 1280,
        height: 720,
        backgroundColor: "#ffffff",
      });
      fabricCanvasRef.current = canvas;

      try {
        // 2. loadFromJSON을 비동기로 처리 (v6/v7 핵심)
        // 만약 fabricJson이 문자열이 아니라 객체라면 그대로 넣으면 됨
        await canvas.loadFromJSON(fabricJson);

        // 3. 로드 완료 후 명시적 렌더링
        canvas.renderAll();
        // 캔버스 요소가 제대로 활성화되도록 강제 업데이트
        canvas.requestRenderAll();

        // 4. placeholder 이미지가 있으면 생성
        await generatePlaceholderImages(canvas, fabricJson);
      } catch (error) {
        console.error("Fabric JSON Load Error:", error);
      }
    };

    initCanvas();

    return () => {
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.dispose();
        fabricCanvasRef.current = null;
      }
    };
  }, [fabricJson]); // JSON 데이터가 바뀔 때마다 다시 그리도록 설정

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">슬라이드 #{slideNumber}</h3>
        <p className="text-sm text-gray-500 line-clamp-1">{prompt}</p>
      </div>
      <div className="border border-gray-300 rounded overflow-hidden flex justify-center bg-gray-100 relative">
        <canvas ref={canvasRef} />
        {isGeneratingImages && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white px-6 py-3 rounded-lg shadow-lg">
              <p className="text-sm font-medium text-gray-700">
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
