import React, { useEffect, useState, useRef } from "react";
import {
  useLocation,
  useNavigate,
  useOutletContext,
  useParams,
} from "react-router";
import {
  getProject,
  createProject,
  getProjectById,
} from "../../lib/puter.action";
import { generate3DView } from "../../lib/ai.action";
import { shareProject, unshareProject } from "../../lib/share";
import { SHARE_STATUS_RESET_DELAY_MS } from "../../lib/constants";
import { Box, X, Download, Share2, Check, Link2Off, RefreshCcw } from "lucide-react";
import { Button } from "../../components/ui/Button";
import {
  ReactCompareSlider,
  ReactCompareSliderImage,
} from "react-compare-slider";

const VisualizerId = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userId, userName } = useOutletContext<AuthContext>();

  const hasInitialGenerated = useRef(false);
  const activeIdRef = useRef(id);

  const [project, setProject] = useState<DesignItem | null>(null);
  const [isProjectLoading, setIsProjectLoading] = useState(true);

  const [isProcessing, setIsProcessing] = useState(false);
  const [currentImage, setCurrentImage] = useState<string | null>(null);

  const [shareStatus, setShareStatus] = useState<ShareStatus>("idle");
  const [isUnsharing, setIsUnsharing] = useState(false);

  useEffect(() => {
    activeIdRef.current = id;
  }, [id]);

  const handleBack = () => navigate("/");

  const handleExport = () => {
    if (!currentImage) return;
    const link = document.createElement("a");
    link.href = currentImage;
    link.download = `${project?.name || "roomify-render"}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleShare = async () => {
    if (!project || !currentImage || shareStatus === "saving") return;

    try {
      setShareStatus("saving");

      const itemToShare = { ...project, renderedImage: currentImage };
      const saved = await shareProject(itemToShare, userName);
      if (!saved) {
        setShareStatus("idle");
        return;
      }
      setProject(saved);
      const shareUrl = saved.publicPath ?? null;

      if (shareUrl && navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
      }

      setShareStatus("done");
      window.setTimeout(() => setShareStatus("idle"), SHARE_STATUS_RESET_DELAY_MS);
    } catch (error) {
      console.error("Share failed:", error);
      setShareStatus("idle");
    }
  };

  const handleUnshare = async () => {
    if (!project || isUnsharing) return;

    try {
      setIsUnsharing(true);
      const updated = await unshareProject(project);
      if (updated) setProject(updated);
    } catch (error) {
      console.error("Unshare failed:", error);
    } finally {
      setIsUnsharing(false);
    }
  };

  const runGeneration = async (item: DesignItem) => {
    if (!id || !item.sourceImage) return;
    const requestId = id;
    try {
      setIsProcessing(true);
      const result = await generate3DView({ sourceImage: item.sourceImage });
      if (activeIdRef.current !== requestId) return;

      if (result.renderedImage) {
        setCurrentImage(result.renderedImage);
        const updatedItem = {
          ...item,
          renderedImage: result.renderedImage,
          renderedPath: result.renderedPath,
          timestamp: Date.now(),
          ownerId: item.ownerId ?? userId ?? null,
          isPublic: item.isPublic ?? false,
        };

        const saved = await createProject({
          item: updatedItem,
          visibility: "private",
        });
        if (activeIdRef.current !== requestId) return;

        if (saved) {
          setProject(saved);
          setCurrentImage(saved.renderedImage || result.renderedImage);
        }
      }
    } catch (error) {
      console.error("Generation failed: ", error);
    } finally {
      if (activeIdRef.current === requestId) {
        setIsProcessing(false);
      }
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadProject = async () => {
      if (!id) {
        setIsProjectLoading(false);
        return;
      }

      setIsProjectLoading(true);

      const fetchedProject = await getProjectById({ id });

      if (!isMounted) return;

      setProject(fetchedProject);
      setCurrentImage(fetchedProject?.renderedImage || null);
      setIsProjectLoading(false);
      hasInitialGenerated.current = false;
    };

    loadProject();

    return () => {
      isMounted = false;
    };
  }, [id]);

  useEffect(() => {
    if (
      isProjectLoading ||
      hasInitialGenerated.current ||
      !project?.sourceImage
    )
      return;

    if (project.renderedImage) {
      setCurrentImage(project.renderedImage);
      hasInitialGenerated.current = true;
      return;
    }

    hasInitialGenerated.current = true;
    void runGeneration(project);
  }, [project, isProjectLoading]);
  return (
    <div className="visualizer">
      <nav className="topbar">
        <div className="brand" onClick={() => navigate("/")}>
          <Box className="logo" />
          <span className="name">Roomify</span>
        </div>
        <Button variant="ghost" size="sm" onClick={handleBack} className="exit">
          <X className="icon" /> Exit Editor
        </Button>
      </nav>
      <section className="content">
        <div className="panel">
          <div className="panel-header">
            <div className="panel-meta">
              <p>Project</p>
              <h2>{project?.name || "Untitled Project"}</h2>
              <p className="note">Created by You</p>
            </div>
            <div className="panel-actions">
              <Button
                size="sm"
                onClick={handleExport}
                className="export"
                disabled={!currentImage}
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Button
                size="sm"
                onClick={handleShare}
                className="share"
                disabled={!currentImage || shareStatus === "saving"}
              >
                {shareStatus === "done" ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Link Copied
                  </>
                ) : shareStatus === "saving" ? (
                  <>
                    <RefreshCcw className="w-4 h-4 mr-2 animate-spin" />
                    Sharing...
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4 mr-2" />
                    {project?.isPublic ? "Copy Link" : "Share"}
                  </>
                )}
              </Button>
              {project?.isPublic && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleUnshare}
                  className="unshare"
                  disabled={isUnsharing}
                  title="Stop sharing this project"
                >
                  <Link2Off className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
          <div className={`render-area ${isProcessing ? "is-processing" : ""}`}>
            {currentImage ? (
              <img src={currentImage} alt="AI Render" className="render-img" />
            ) : (
              <div className="render-placeholder">
                {project?.sourceImage && (
                  <img
                    src={project.sourceImage}
                    alt="Original"
                    className="render-fallback"
                  />
                )}
              </div>
            )}
            {isProcessing && (
              <div className="render-overlay">
                <div className="rendering-card">
                  <RefreshCcw className="spinner" />
                  <span className="title">Rendering...</span>
                  <span className="subtitle">
                    Generating your 3D visualisation
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="panel-compare">
          <div className="panel-header">
            <div className="panel-meta">
              <p>Comparison</p>
              <h3>Before and After</h3>
            </div>
            <div className="hint">Drag to compare</div>
          </div>
          <div className="compare-stage">
            {project?.sourceImage && currentImage ? (
              <ReactCompareSlider
                defaultValue={50}
                style={{ width: "100%", height: "auto" }}
                itemOne={
                  <ReactCompareSliderImage
                    src={project?.sourceImage}
                    alt="Before"
                    className="compare-img"
                  />
                }
                itemTwo={
                  <ReactCompareSliderImage
                    src={currentImage || project?.renderedImage}
                    alt="After"
                    className="compare-img"
                  />
                }
              />
            ) : (
              <div className="compare-fallback">
                {project?.sourceImage && (
                  <img
                    src={project.sourceImage}
                    alt="Before"
                    className="compare-img"
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default VisualizerId;
