import puter from "@heyputer/puter.js";
import {
  getOrCreateHostingConfig,
  uploadImageToHosting,
} from "./puter.hosting";
import { getProjectKey, isHostedUrl } from "./utils";
import { PUTER_WORKER_URL } from "./constants";

// Local fallback cache so previously loaded projects stay visible if a
// live fetch fails (e.g. out of Puter credits, offline, rate-limited).
const PROJECTS_LIST_CACHE_KEY = "roomify_cache_projects_list";
const projectCacheKey = (id: string) => `roomify_cache_project_${id}`;

const readCache = <T>(key: string): T | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
};

const writeCache = (key: string, value: unknown) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full/unavailable - safe to ignore, cache is best-effort
  }
};

const cacheProject = (project: DesignItem) => {
  writeCache(projectCacheKey(project.id), project);

  const projects = readCache<DesignItem[]>(PROJECTS_LIST_CACHE_KEY) ?? [];
  const next = [project, ...projects.filter((p) => p.id !== project.id)];
  writeCache(PROJECTS_LIST_CACHE_KEY, next);
};

export const signIn = async () => await puter.auth.signIn();
export const signOut = () => puter.auth.signOut();
export const getCurrentUser = async () => {
  try {
    return await puter.auth.getUser();
  } catch (error) {
    return null;
  }
};

export const getProject = async (id: string): Promise<DesignItem | null> => {
  try {
    return ((await puter.kv.get(getProjectKey(id))) as DesignItem) || null;
  } catch (error) {
    console.warn(`Failed to load project ${id}`, error);
    return null;
  }
};

export const createProject = async ({
  item,
  visibility = "private",
}: CreateProjectParams): Promise<DesignItem | null | undefined> => {
  if (!PUTER_WORKER_URL) {
    console.warn("Missing VITE_PUTER_WORKER_URL; skip history fetch;");
    return null;
  }
  const projectId = item.id;
  const hosting = await getOrCreateHostingConfig();
  const hostedSource = projectId
    ? await uploadImageToHosting({
        hosting,
        url: item.sourceImage,
        projectId,
        label: "source",
      })
    : null;

  const hostedRender =
    projectId && item.renderedImage
      ? await uploadImageToHosting({
          hosting,
          url: item.renderedImage,
          projectId,
          label: "rendered",
        }).catch((error) => {
          // Distinguish this from a "no render yet" no-op: a render was
          // generated but couldn't be persisted, so the caller needs to
          // know the save didn't fully succeed rather than silently
          // getting back a project with no renderedImage.
          throw new Error(
            `Render was generated but failed to save: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        })
      : null;

  const resolvedSource =
    hostedSource?.url ||
    (isHostedUrl(item.sourceImage) ? item.sourceImage : "");

  if (!resolvedSource) {
    console.warn("Failed to host source image, skipping save.");
    return null;
  }

  const resolvedRender = hostedRender?.url
    ? hostedRender?.url
    : item.renderedImage && isHostedUrl(item.renderedImage)
      ? item.renderedImage
      : undefined;

  const {
    sourcePath: _sourcePath,
    renderedPath: _renderedPath,
    publicPath: _publicPath,
    ...rest
  } = item;

  const payload: DesignItem = {
    ...rest,
    sourceImage: resolvedSource,
    renderedImage: resolvedRender,
    isPublic: visibility === "public",
  };

  try {
    const response = await puter.workers.exec(
      `${PUTER_WORKER_URL}/api/projects/save`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ project: payload, visibility }),
      },
    );

    if (!response.ok) {
      console.error("Failed to save the project", await response.text());
      return null;
    }

    const data = (await response.json()) as { project?: DesignItem | null };
    if (data?.project) cacheProject(data.project);
    return data?.project ?? null;
  } catch (error) {
    console.log("Failed to save project", error);
  }
};

export const getProjects = async (): Promise<DesignItem[]> => {
  const cached = readCache<DesignItem[]>(PROJECTS_LIST_CACHE_KEY) ?? [];

  if (!PUTER_WORKER_URL) {
    console.warn("Missing VITE_PUTER_WORKER_URL; skip history fetch;");
    return cached;
  }

  // Skip the remote fetch when signed out. puter.workers.exec forces its
  // own sign-in popup the moment it's called with no auth token, which
  // would otherwise hijack the page on load before the user does anything.
  if (!puter.auth.isSignedIn()) return cached;

  try {
    const response = await puter.workers.exec(
      `${PUTER_WORKER_URL}/api/projects/list`,
      {
        method: "GET",
      },
    );

    if (!response.ok) {
      // Fetch failed (e.g. out of credits, auth expired) - keep showing
      // whatever was last successfully loaded instead of an empty gallery.
      console.error("Failed to fetch history: ", await response.text());
      return cached;
    }
    const data = (await response.json()) as { projects?: DesignItem[] | null };
    const projects = Array.isArray(data?.projects) ? data.projects : [];

    writeCache(PROJECTS_LIST_CACHE_KEY, projects);
    return projects;
  } catch (error) {
    console.error("Failed to get projects, showing cached results: ", error);
    return cached;
  }
};


export const getProjectById = async ({ id }: { id: string }) => {
  const cached = readCache<DesignItem>(projectCacheKey(id));

  if (!PUTER_WORKER_URL) {
    console.warn("Missing VITE_PUTER_WORKER_URL; skipping project fetch.");
    return cached ?? null;
  }

  // Skip the remote fetch when signed out - see getProjects() for why.
  if (!puter.auth.isSignedIn()) return cached ?? null;

  try {
    const response = await puter.workers.exec(
      `${PUTER_WORKER_URL}/api/projects/get?id=${encodeURIComponent(id)}`,
      { method: "GET" },
    );

    if (!response.ok) {
      // A real 404 means the project genuinely doesn't exist - trust it.
      // Any other failure (e.g. out of credits, auth hiccup) should keep
      // showing the last rendered image for this project instead of
      // clearing it.
      if (response.status === 404) return null;
      console.error("Failed to fetch project, showing cached copy:", await response.text());
      return cached ?? null;
    }

    const data = (await response.json()) as {
      project?: DesignItem | null;
    };

    if (data?.project) cacheProject(data.project);
    return data?.project ?? cached ?? null;
  } catch (error) {
    console.error("Failed to fetch project, showing cached copy:", error);
    return cached ?? null;
  }
};