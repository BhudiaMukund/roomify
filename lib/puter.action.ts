import puter from "@heyputer/puter.js";
import {
  getOrCreateHostingConfig,
  uploadImageToHosting,
} from "./puter.hosting";
import { getProjectKey, isHostedUrl } from "./utils";

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
  visibility,
}: CreateProjectParams): Promise<DesignItem | null | undefined> => {
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
    await puter.kv.set(getProjectKey(payload.id), payload);
    return payload;
  } catch (error) {
    console.log("Failed to save project", error);
  }
};
