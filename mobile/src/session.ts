import * as SecureStore from "expo-secure-store";

import type { TokenPair } from "./types";

const ACCESS = "movau.access";
const REFRESH = "movau.refresh";

export async function loadTokens(): Promise<TokenPair | null> {
  const access = await SecureStore.getItemAsync(ACCESS);
  const refresh = await SecureStore.getItemAsync(REFRESH);
  if (!access || !refresh) {
    return null;
  }
  return { access_token: access, refresh_token: refresh };
}

export async function saveTokens(tokens: TokenPair) {
  await SecureStore.setItemAsync(ACCESS, tokens.access_token);
  await SecureStore.setItemAsync(REFRESH, tokens.refresh_token);
}

export async function clearTokens() {
  await SecureStore.deleteItemAsync(ACCESS);
  await SecureStore.deleteItemAsync(REFRESH);
}
