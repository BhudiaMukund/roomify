import puter from "@heyputer/puter.js";
import {
  HOSTING_CONFIG_KEY,
  createHostingSlug,
  fetchBlobFromUrl,
  getHostedUrl,
  getImageExtension,
  imageUrlToPngBlob,
  isHostedUrl,
} from "./utils";

type HostingConfig = { subdomain: string };
type HostedAsset = { url: string };

export const getOrCreateHostingConfig =
  async (): Promise<HostingConfig> => {
    const existing = (await puter.kv.get(
      HOSTING_CONFIG_KEY,
    )) as HostingConfig | null;

    if (existing?.subdomain)
      return {
        subdomain: existing.subdomain,
      };

    const subdomain = createHostingSlug();

    try {
      const created = await puter.hosting.create(subdomain, ".");
      const record = { subdomain: created.subdomain };

      await puter.kv.set(HOSTING_CONFIG_KEY, record);
      return record;
    } catch (error) {
      console.error(`Failed to create hosting subdomain: ${error}`);
      throw error;
    }
  };

export const uploadImageToHosting = async ({
  hosting,
  url,
  projectId,
  label,
}: StoreHostedImageParams): Promise<HostedAsset | null> => {
  // Nothing to upload - not a failure, just a no-op.
  if (!hosting || !url) return null;

  if (isHostedUrl(url)) return { url };

  try {
    const resolved =
      label === "rendered"
        ? await imageUrlToPngBlob(url).then((blob) =>
            blob ? { blob, contentType: "image/png" } : null,
          )
        : await fetchBlobFromUrl(url);

    if (!resolved) {
      throw new Error(
        `Could not resolve image data for "${label}" (projectId=${projectId})`,
      );
    }

    const contentType = resolved.contentType || resolved.blob.type || "";
    const ext = getImageExtension(contentType, url);

    const dir = `projects/${projectId}`;
    const filePath = `${dir}/${label}.${ext}`;

    const uploadFile = new File([resolved.blob], `${label}.${ext}`, {
      type: contentType,
    });

    await puter.fs.mkdir(dir, { createMissingParents: true });
    await puter.fs.write(filePath, uploadFile);
    const hostedUrl = getHostedUrl({ subdomain: hosting.subdomain }, filePath);

    if (!hostedUrl) {
      throw new Error(
        `Failed to build hosted URL for "${label}" (projectId=${projectId})`,
      );
    }

    return { url: hostedUrl };
  } catch (error) {
    console.error(`Failed to store hosted "${label}" image: ${error}`);
    throw error;
  }
};
