import { Canvas } from "fabric";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Form } from "react-router";
import type { Route } from "./+types/home";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Fabric PPT" },
    { name: "description", content: "Fabric PPT" },
  ];
}

interface Slide {
  id: number;
  fabricJson: any;
  prompt: string;
}

export interface SlideCanvasRef {
  getCanvasJSON: () => any;
}

export default function Home() {
  const slideCanvasRefs = useRef<Map<number, SlideCanvasRef>>(new Map());
  const [slides, setSlides] = useState<Slide[]>([
    {
      id: 1,
      fabricJson: {
        version: "7.0.0",
        objects: [
          {
            type: "Rect",
            left: 640,
            top: 360,
            originX: "center",
            originY: "center",
            width: 1280,
            height: 720,
            fill: "#0B1020",
            stroke: "#00000000",
            strokeWidth: 0,
            text: "",
            fontSize: 0,
            fontFamily: "Helvetica",
            fontWeight: "normal",
            textAlign: "left",
            opacity: 1,
            angle: 0,
            scaleX: 1,
            scaleY: 1,
            radius: 0,
          },
          {
            type: "Circle",
            left: 1080,
            top: 160,
            originX: "center",
            originY: "center",
            width: 520,
            height: 520,
            fill: "#2D7FF933",
            stroke: "#2D7FFF66",
            strokeWidth: 2,
            text: "",
            fontSize: 0,
            fontFamily: "Helvetica",
            fontWeight: "normal",
            textAlign: "left",
            opacity: 1,
            angle: 0,
            scaleX: 1,
            scaleY: 1,
            radius: 260,
          },
          {
            type: "Circle",
            left: 1120,
            top: 520,
            originX: "center",
            originY: "center",
            width: 360,
            height: 360,
            fill: "#12B3A833",
            stroke: "#12B3A866",
            strokeWidth: 2,
            text: "",
            fontSize: 0,
            fontFamily: "Helvetica",
            fontWeight: "normal",
            textAlign: "left",
            opacity: 0.95,
            angle: 0,
            scaleX: 1,
            scaleY: 1,
            radius: 180,
          },
          {
            type: "Rect",
            left: 86,
            top: 170,
            originX: "left",
            originY: "top",
            width: 8,
            height: 220,
            fill: "#2D7FFF",
            stroke: "#00000000",
            strokeWidth: 0,
            text: "",
            fontSize: 0,
            fontFamily: "Helvetica",
            fontWeight: "normal",
            textAlign: "left",
            opacity: 1,
            angle: 0,
            scaleX: 1,
            scaleY: 1,
            radius: 0,
          },
          {
            type: "Textbox",
            left: 110,
            top: 170,
            originX: "left",
            originY: "top",
            width: 820,
            height: 240,
            fill: "#F3F7FF",
            stroke: "#00000000",
            strokeWidth: 0,
            text: "AI 기반\n스마트 팩토리 솔루션",
            fontSize: 64,
            fontFamily: "Helvetica",
            fontWeight: "bold",
            textAlign: "left",
            opacity: 1,
            angle: 0,
            scaleX: 1,
            scaleY: 1,
            radius: 0,
          },
          {
            type: "Rect",
            left: 110,
            top: 430,
            originX: "left",
            originY: "top",
            width: 740,
            height: 64,
            fill: "#FFFFFF12",
            stroke: "#FFFFFF22",
            strokeWidth: 1,
            text: "",
            fontSize: 0,
            fontFamily: "Helvetica",
            fontWeight: "normal",
            textAlign: "left",
            opacity: 1,
            angle: 0,
            scaleX: 1,
            scaleY: 1,
            radius: 0,
          },
          {
            type: "Textbox",
            left: 134,
            top: 446,
            originX: "left",
            originY: "top",
            width: 700,
            height: 40,
            fill: "#CFE2FF",
            stroke: "#00000000",
            strokeWidth: 0,
            text: "제조업의 미래를 여는 기술",
            fontSize: 30,
            fontFamily: "Helvetica",
            fontWeight: "normal",
            textAlign: "left",
            opacity: 1,
            angle: 0,
            scaleX: 1,
            scaleY: 1,
            radius: 0,
          },
          {
            type: "Rect",
            left: 0,
            top: 636,
            originX: "left",
            originY: "top",
            width: 1280,
            height: 84,
            fill: "#00000026",
            stroke: "#00000000",
            strokeWidth: 0,
            text: "",
            fontSize: 0,
            fontFamily: "Helvetica",
            fontWeight: "normal",
            textAlign: "left",
            opacity: 1,
            angle: 0,
            scaleX: 1,
            scaleY: 1,
            radius: 0,
          },
          {
            type: "Textbox",
            left: 90,
            top: 662,
            originX: "left",
            originY: "top",
            width: 520,
            height: 34,
            fill: "#FFFFFFCC",
            stroke: "#00000000",
            strokeWidth: 0,
            text: "SMART FACTORY • AI • AUTOMATION",
            fontSize: 18,
            fontFamily: "Helvetica",
            fontWeight: "bold",
            textAlign: "left",
            opacity: 1,
            angle: 0,
            scaleX: 1,
            scaleY: 1,
            radius: 0,
          },
          {
            type: "Textbox",
            left: 1190,
            top: 660,
            originX: "right",
            originY: "top",
            width: 140,
            height: 36,
            fill: "#FFFFFFE6",
            stroke: "#00000000",
            strokeWidth: 0,
            text: "#1",
            fontSize: 22,
            fontFamily: "Helvetica",
            fontWeight: "bold",
            textAlign: "right",
            opacity: 1,
            angle: 0,
            scaleX: 1,
            scaleY: 1,
            radius: 0,
          },
          {
            type: "Rect",
            left: 84,
            top: 608,
            originX: "left",
            originY: "top",
            width: 1112,
            height: 2,
            fill: "#2D7FFF66",
            stroke: "#00000000",
            strokeWidth: 0,
            text: "",
            fontSize: 0,
            fontFamily: "Helvetica",
            fontWeight: "normal",
            textAlign: "left",
            opacity: 1,
            angle: 0,
            scaleX: 1,
            scaleY: 1,
            radius: 0,
          },
        ],
        background: "#0B1020",
      },
      prompt: "AI 기반 스마트 팩토리 솔루션",
    },
  ]);
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
          id: Date.now(),
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
    slideNumber: number;
    fabricJson: any;
    prompt: string;
  }
>(({ slideNumber, fabricJson, prompt }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<Canvas | null>(null);

  // 부모 컴포넌트에서 호출할 수 있는 메서드 노출
  useImperativeHandle(ref, () => ({
    getCanvasJSON: () => {
      if (fabricCanvasRef.current) {
        return fabricCanvasRef.current.toJSON();
      }
      return fabricJson;
    },
  }));

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
      <div className="border border-gray-300 rounded overflow-hidden flex justify-center bg-gray-100">
        <canvas ref={canvasRef} />
      </div>
      <p className="text-xs text-gray-400 mt-2">1280 x 720px</p>
    </div>
  );
});
