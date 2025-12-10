"use client";

import { useEffect, useState, useRef } from "react";
import type { ChangeEvent } from "react";
import dynamic from "next/dynamic";
import { Settings, Maximize, Filter, Sliders, Zap, Share2, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
});

type GraphNode = {
  id: string;
  name: string;
  kind?: "entry" | "keyword";
  val?: number;
  fx?: number;
  fy?: number;
};

type GraphLink = {
  source: string;
  target: string;
};

type GraphDataResponse = {
  nodes: GraphNode[];
  links: GraphLink[];
};

export function GraphView({
  onNodeClick,
}: {
  onNodeClick: (id: string) => void;
}) {
  const [data, setData] = useState<{ nodes: GraphNode[]; links: GraphLink[] }>({
    nodes: [],
    links: [],
  });
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fgRef = useRef<any>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [hideLonelyKeywords, setHideLonelyKeywords] = useState(true);
  const [linkDistance, setLinkDistance] = useState(150);
  const [chargeStrength, setChargeStrength] = useState(-400);
  const [showLinkParticles, setShowLinkParticles] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isControlsOpen, setIsControlsOpen] = useState(false);

  const handleToggleLonelyKeywords = () => {
    setIsLoading(true);
    setHideLonelyKeywords((prev) => !prev);
  };

  const handleLonelyCheckboxChange = (event: ChangeEvent<HTMLInputElement>) => {
    setIsLoading(true);
    setHideLonelyKeywords(event.target.checked);
  };

  useEffect(() => {
    let isMounted = true;
    const params = new URLSearchParams({
      hideLonelyKeywords: String(hideLonelyKeywords),
    });

    fetch(`/api/graph?${params.toString()}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Graph request failed with status ${res.status}`);
        }
        return res.json();
      })
      .then((graphData: GraphDataResponse) => {
        if (!isMounted) return;
        const linkCounts: Record<string, number> = {};
        graphData.links.forEach((link) => {
          linkCounts[link.source] = (linkCounts[link.source] || 0) + 1;
          linkCounts[link.target] = (linkCounts[link.target] || 0) + 1;
        });

        let maxLinks = -1;
        let centerId: string | null = null;

        Object.entries(linkCounts).forEach(([id, count]) => {
          if (count > maxLinks) {
            maxLinks = count;
            centerId = id;
          }
        });

        const nodesWithVal = graphData.nodes.map((node: GraphNode) => ({
          ...node,
          val: (linkCounts[node.id] || 0) + 1,
          fx: node.id === centerId ? 0 : undefined,
          fy: node.id === centerId ? 0 : undefined,
        }));

        setData({ nodes: nodesWithVal, links: graphData.links });
        setError(null);
      })
      .catch((err) => {
        console.error("Graph data fetch failed", err);
        if (!isMounted) return;
        setError("Failed to load graph data.");
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [hideLonelyKeywords]);

  useEffect(() => {
    if (!containerRef.current) return;
    const updateDimensions = () => {
      if (!containerRef.current) return;
      setDimensions({
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight,
      });
    };
    updateDimensions();
    const observer = new ResizeObserver(updateDimensions);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!fgRef.current) return;
    const linkForce = fgRef.current.d3Force?.("link");
    if (linkForce) {
      linkForce.distance(linkDistance);
    }
    const chargeForce = fgRef.current.d3Force?.("charge");
    if (chargeForce) {
      chargeForce.strength(chargeStrength);
    }
    fgRef.current.d3ReheatSimulation?.();
  }, [linkDistance, chargeStrength, data]);

  useEffect(() => {
    if (data.nodes.length > 0 && fgRef.current) {
      setTimeout(() => {
        fgRef.current.zoomToFit(1000, 50);
      }, 200);
    }
  }, [data]);

  return (
    <div
      ref={containerRef}
      className="relative flex-1 h-full bg-background overflow-hidden border-l border-white/5"
    >
      <ForceGraph2D
        ref={fgRef}
        width={dimensions.width}
        height={dimensions.height}
        graphData={data}
        nodeLabel={(node: any) =>
          node.kind === "keyword" ? `Keyword: ${node.name}` : node.name
        }
        nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D) => {
          const label = node.name;
          const fontSize = 3.5;
          const r = Math.sqrt(node.val || 1) * 4;

          const isKeyword = node.kind === "keyword";

          ctx.beginPath();
          ctx.arc(node.x, node.y, r, 0, 2 * Math.PI, false);
          ctx.fillStyle = isKeyword ? "rgba(74, 222, 128, 0.9)" : "rgba(124, 58, 237, 0.9)"; // Tailwind color variables approx
          ctx.shadowBlur = 10;
          ctx.shadowColor = isKeyword ? "rgba(74, 222, 128, 0.4)" : "rgba(124, 58, 237, 0.4)";
          ctx.fill();
          ctx.shadowBlur = 0; // Reset shadow

          // Draw Label
          ctx.font = `${fontSize}px Inter, sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "top";
          ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
          ctx.fillText(label, node.x, node.y + r + 2);
        }}
        linkColor={() => "rgba(255,255,255,0.15)"}
        linkWidth={1}
        linkDirectionalParticles={showLinkParticles ? 2 : 0}
        linkDirectionalParticleSpeed={showLinkParticles ? 0.005 : 0}
        backgroundColor="#09090b" // bg-zinc-950 approx
        onNodeClick={(node: any) => onNodeClick(node.id)}
        cooldownTicks={100}
        onEngineStop={() => fgRef.current?.zoomToFit(400)}
      />

      <div className="absolute top-4 right-4 z-10 w-64 flex flex-col gap-2 pointer-events-none">
        <div className="pointer-events-auto rounded-xl bg-card/80 shadow-xl border border-white/5 backdrop-blur-md overflow-hidden transition-all duration-300">
          <div
            className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
            onClick={() => setIsControlsOpen(!isControlsOpen)}
          >
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <Settings size={12} />
              <span>Graph Controls</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-1.5 w-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse" />
              <div className="text-muted-foreground">
                {isControlsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </div>
            </div>
          </div>

          <div className={cn(
            "px-4 transition-all duration-300 ease-in-out overflow-hidden",
            isControlsOpen ? "max-h-[500px] opacity-100 pb-4" : "max-h-0 opacity-0"
          )}>
            <button
              onClick={() => fgRef.current?.zoomToFit(400)}
              className="mb-4 w-full rounded-lg bg-secondary/50 hover:bg-secondary border border-white/5 px-3 py-2 text-xs font-medium text-secondary-foreground transition-all flex items-center justify-center gap-2 group"
            >
              <Maximize size={12} className="group-hover:scale-110 transition-transform" />
              Fit to Screen
            </button>

            <div className="space-y-4">

              <div className="space-y-2">
                <div className="flex items-center justify-between text-[10px] uppercase font-bold text-muted-foreground">
                  <span className="flex items-center gap-1"><Filter size={10} /> Filters</span>
                </div>
                <label className="flex items-center justify-between text-xs text-foreground cursor-pointer group">
                  <span>Hide lonely keywords</span>
                  <input
                    type="checkbox"
                    className="accent-primary h-3.5 w-3.5 rounded"
                    checked={hideLonelyKeywords}
                    onChange={handleLonelyCheckboxChange}
                  />
                </label>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-[10px] uppercase font-bold text-muted-foreground">
                  <span className="flex items-center gap-1"><Sliders size={10} /> Simulations</span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Link Distance</span>
                    <span className="font-mono text-[10px] bg-secondary/50 px-1 rounded">{linkDistance}</span>
                  </div>
                  <input
                    type="range"
                    min={50}
                    max={300}
                    value={linkDistance}
                    onChange={(event) => setLinkDistance(Number(event.target.value))}
                    className="w-full h-1 bg-secondary rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:scale-110 transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Repel Force</span>
                    <span className="font-mono text-[10px] bg-secondary/50 px-1 rounded">{Math.abs(chargeStrength)}</span>
                  </div>
                  <input
                    type="range"
                    min={100}
                    max={1000}
                    value={Math.abs(chargeStrength)}
                    onChange={(event) =>
                      setChargeStrength(-Number(event.target.value))
                    }
                    className="w-full h-1 bg-secondary rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:scale-110 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-[10px] uppercase font-bold text-muted-foreground">
                  <span className="flex items-center gap-1"><Zap size={10} /> Effects</span>
                </div>
                <label className="flex items-center justify-between text-xs text-foreground cursor-pointer">
                  <span>Particle flow</span>
                  <input
                    type="checkbox"
                    className="accent-primary h-3.5 w-3.5 rounded"
                    checked={showLinkParticles}
                    onChange={(event) => setShowLinkParticles(event.target.checked)}
                  />
                </label>
              </div>
            </div>

            {isLoading && (
              <div className="mt-4 pt-3 border-t border-white/5 text-[10px] text-primary flex items-center gap-2 animate-pulse">
                <div className="h-2 w-2 bg-primary rounded-full" />
                Updating graph...
              </div>
            )}
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-[1px]">
          <div className="flex items-center gap-2 rounded-full bg-secondary/80 px-4 py-2 text-xs font-bold uppercase tracking-wide text-foreground shadow-lg backdrop-blur">
            <div className="h-2 w-2 bg-primary rounded-full animate-bounce" />
            Loading Graph
          </div>
        </div>
      )}

      {error && (
        <div className="pointer-events-none absolute bottom-4 right-4 rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-xs font-medium text-destructive shadow-lg backdrop-blur-md">
          {error}
        </div>
      )}
    </div>
  );
}
