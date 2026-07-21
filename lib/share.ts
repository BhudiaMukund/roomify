import {
  getOrCreateHostingConfig,
  uploadTextToHosting,
  deleteHostedFile,
} from "./puter.hosting";
import { createProject } from "./puter.action";
import { SHARE_FILE_NAME } from "./constants";

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&#39;";
    }
  });

const buildSharePageHtml = ({
  name,
  sourceImage,
  renderedImage,
}: {
  name: string;
  sourceImage: string;
  renderedImage: string;
}) => {
  const title = escapeHtml(name);
  const safeSource = escapeHtml(sourceImage);
  const safeRender = escapeHtml(renderedImage);

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title} · Roomify</title>
<meta name="description" content="AI-rendered 3D visualisation created with Roomify." />
<meta property="og:title" content="${title} · Roomify" />
<meta property="og:description" content="AI-rendered 3D visualisation created with Roomify." />
<meta property="og:image" content="${safeRender}" />
<meta property="og:type" content="website" />
<meta name="twitter:card" content="summary_large_image" />
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif;
    background: #fdfbf7;
    color: #1a1a1a;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 32px 16px 56px;
  }
  header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 28px;
  }
  header .logo {
    width: 26px;
    height: 26px;
    border-radius: 7px;
    background: #f97316;
  }
  header span {
    font-weight: 700;
    font-size: 18px;
    letter-spacing: -0.02em;
  }
  main { width: 100%; max-width: 880px; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  p.subtitle { color: #71717a; font-size: 13px; margin: 0 0 20px; }
  .stage {
    position: relative;
    width: 100%;
    border-radius: 16px;
    overflow: hidden;
    border: 1px solid #e4e4e7;
    box-shadow: 0 20px 50px -20px rgba(0, 0, 0, 0.25);
    background: #f4f4f5;
    touch-action: none;
    cursor: ew-resize;
  }
  .stage img { display: block; width: 100%; height: auto; pointer-events: none; user-select: none; }
  .stage .after {
    position: absolute;
    inset: 0;
    overflow: hidden;
    clip-path: inset(0 50% 0 0);
  }
  .stage .after img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
  .handle {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 50%;
    width: 2px;
    background: #ffffff;
    box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.15);
    transform: translateX(-1px);
    pointer-events: none;
  }
  .handle::after {
    content: "";
    position: absolute;
    top: 50%;
    left: 50%;
    width: 32px;
    height: 32px;
    border-radius: 999px;
    background: #ffffff;
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
    transform: translate(-50%, -50%);
  }
  .labels {
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #a1a1aa;
    margin-top: 12px;
  }
  footer {
    margin-top: 32px;
    font-size: 12px;
    color: #a1a1aa;
  }
</style>
</head>
<body>
  <header>
    <div class="logo"></div>
    <span>Roomify</span>
  </header>
  <main>
    <h1>${title}</h1>
    <p class="subtitle">Drag to compare the original floor plan against the AI render.</p>
    <div class="stage" id="stage">
      <img src="${safeSource}" alt="Before" />
      <div class="after" id="after">
        <img src="${safeRender}" alt="After" />
      </div>
      <div class="handle" id="handle"></div>
    </div>
    <div class="labels">
      <span>Before</span>
      <span>After</span>
    </div>
  </main>
  <footer>Rendered with Roomify</footer>
  <script>
    (function () {
      var stage = document.getElementById("stage");
      var after = document.getElementById("after");
      var handle = document.getElementById("handle");
      var dragging = false;

      function setPosition(pct) {
        pct = Math.min(100, Math.max(0, pct));
        after.style.clipPath = "inset(0 " + (100 - pct) + "% 0 0)";
        handle.style.left = pct + "%";
      }

      function updateFromEvent(event) {
        var rect = stage.getBoundingClientRect();
        var clientX = event.touches ? event.touches[0].clientX : event.clientX;
        setPosition(((clientX - rect.left) / rect.width) * 100);
      }

      stage.addEventListener("pointerdown", function (event) {
        dragging = true;
        updateFromEvent(event);
      });
      window.addEventListener("pointermove", function (event) {
        if (dragging) updateFromEvent(event);
      });
      window.addEventListener("pointerup", function () {
        dragging = false;
      });

      setPosition(50);
    })();
  </script>
</body>
</html>
`;
};

export const shareProject = async (
  item: DesignItem,
  sharedBy?: string | null,
): Promise<DesignItem | null> => {
  if (!item?.id || !item.sourceImage || !item.renderedImage) return null;

  const hosting = await getOrCreateHostingConfig();
  if (!hosting) return null;

  const html = buildSharePageHtml({
    name: item.name || "Untitled Project",
    sourceImage: item.sourceImage,
    renderedImage: item.renderedImage,
  });

  const hostedShare = await uploadTextToHosting({
    hosting,
    projectId: item.id,
    fileName: SHARE_FILE_NAME,
    content: html,
    contentType: "text/html",
  });

  if (!hostedShare?.url) return null;

  const updatedItem: DesignItem = {
    ...item,
    isPublic: true,
    publicPath: hostedShare.url,
    sharedBy: sharedBy ?? item.sharedBy ?? null,
    sharedAt: new Date().toISOString(),
  };

  return await createProject({ item: updatedItem, visibility: "public" });
};

export const unshareProject = async (
  item: DesignItem,
): Promise<DesignItem | null> => {
  if (!item?.id) return null;

  await deleteHostedFile({ projectId: item.id, fileName: SHARE_FILE_NAME });

  const updatedItem: DesignItem = {
    ...item,
    isPublic: false,
    publicPath: null,
    sharedBy: null,
    sharedAt: null,
  };

  return await createProject({ item: updatedItem, visibility: "private" });
};
