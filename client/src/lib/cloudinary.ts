/**
 * Cloudinary image upload helper
 * Uses unsigned upload preset for direct browser-to-Cloudinary uploads.
 *
 * Setup:
 * 1. Create a free account at https://cloudinary.com
 * 2. Go to Settings → Upload → Upload Presets → Add Upload Preset
 * 3. Set "Signing Mode" to "Unsigned"
 * 4. Copy your Cloud Name (from Dashboard) and Preset Name
 * 5. Add them to .env as VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET
 */

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

export async function uploadImage(file: File): Promise<string> {
  if (!isCloudinaryConfigured()) {
    throw new Error("Cloudinary is not configured. Set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET in .env");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: "POST", body: formData }
  );

  if (!res.ok) {
    const err = await res.text();
    console.error("[Cloudinary] Upload failed:", err);
    throw new Error("Image upload failed");
  }

  const data = await res.json();
  return data.secure_url;
}

export function isCloudinaryConfigured(): boolean {
  return !!(
    CLOUD_NAME &&
    UPLOAD_PRESET &&
    CLOUD_NAME !== "your_cloud_name" &&
    UPLOAD_PRESET !== "your_upload_preset"
  );
}
