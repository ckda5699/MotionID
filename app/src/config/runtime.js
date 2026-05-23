const stripTrailingSlash = (value) => value.replace(/\/+$/, "");
const stripLeadingSlash = (value) => value.replace(/^\/+/, "");

export const runtimeConfig = {
  dataBaseUrl: stripTrailingSlash(import.meta.env.VITE_DATA_BASE_URL || "/data"),
  mediaBaseUrl: stripTrailingSlash(import.meta.env.VITE_MEDIA_BASE_URL || "/media"),
  appEnv: import.meta.env.VITE_APP_ENV || "local",
};

export function resolveDataUrl(path) {
  return `${runtimeConfig.dataBaseUrl}/${stripLeadingSlash(path)}`;
}

export function resolveMediaUrl(path) {
  if (/^https?:\/\//i.test(path)) return path;
  return `${runtimeConfig.mediaBaseUrl}/${stripLeadingSlash(path)}`;
}
