import "server-only";
import { cookies } from "next/headers";
import {
  DEVICE_COOKIE_MAX_AGE,
  DEVICE_COOKIE_NAME,
  decodeDeviceCookie,
  encodeDeviceCookie,
  shortDisplayName,
  type DeviceIdentity,
} from "@/lib/auth/device-cookie";
import { deviceCookieSecret } from "@/lib/server-env";
import { isSyntheticEmail, maskEmail } from "@/lib/text";

export async function rememberDevice(params: { uid: string; firstName: string; lastName: string; email: string | null | undefined }) {
  const store = await cookies();
  const value = encodeDeviceCookie(
    {
      uid: params.uid,
      name: shortDisplayName(params.firstName, params.lastName),
      hint: params.email && !isSyntheticEmail(params.email) ? maskEmail(params.email) : null,
    },
    deviceCookieSecret(),
  );
  store.set(DEVICE_COOKIE_NAME, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DEVICE_COOKIE_MAX_AGE,
  });
}

export async function readRememberedDevice(): Promise<DeviceIdentity | null> {
  const store = await cookies();
  try {
    return decodeDeviceCookie(store.get(DEVICE_COOKIE_NAME)?.value, deviceCookieSecret());
  } catch {
    return null;
  }
}

export async function forgetDevice() {
  const store = await cookies();
  store.delete(DEVICE_COOKIE_NAME);
}
