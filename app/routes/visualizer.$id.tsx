import React, { useEffect, useState } from "react";
import { useLocation, useParams } from "react-router";
import { getProject } from "../../lib/puter.action";

const VisualizerId = () => {
  const { id } = useParams();
  const location = useLocation();
  const fallback = (location.state || {}) as VisualizerLocationState;
  const [project, setProject] = useState<DesignItem | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    getProject(id).then((loaded) => {
      if (!cancelled) setProject(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const initialImage = project?.sourceImage ?? fallback.initialImage;
  const name = project?.name ?? fallback.name;

  return (
    <section>
      <h1>{name || "Untitled Project"}</h1>
      <div className="visualizer">
        {initialImage && (
          <div className="image-container">
            <h2>Source Image</h2>
            <img src={initialImage} alt="source" />
          </div>
        )}
      </div>
    </section>
  );
};

export default VisualizerId;
