const tokenStorageKey = "whatsappai.accessToken";

let accessToken: string | null =
  typeof window !== "undefined" ? window.localStorage.getItem(tokenStorageKey) : null;

export function setAccessToken(token: string | null) {
  accessToken = token;
  if (typeof window === "undefined") return;
  if (token) {
    window.localStorage.setItem(tokenStorageKey, token);
  } else {
    window.localStorage.removeItem(tokenStorageKey);
  }
}

export function getAccessToken() {
  return accessToken;
}
