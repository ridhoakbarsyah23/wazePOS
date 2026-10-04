import { describe, expect, it } from "vitest";
import { getGoogleAuthRedirects } from "@/shared/auth/social-auth";

describe("redirect autentikasi Google", () => {
  it("meneruskan akun lama ke server dan akun baru dari login ke paket default", () => {
    expect(getGoogleAuthRedirects("login")).toEqual({
      callbackURL: "/auth/continue",
      newUserCallbackURL: "/onboarding?plan=tumbuh",
      errorCallbackURL: "/login?oauth=error",
    });
  });

  it("mempertahankan paket eksplisit untuk akun Google baru dari halaman login", () => {
    expect(getGoogleAuthRedirects("login", "bisnis")).toEqual({
      callbackURL: "/auth/continue",
      newUserCallbackURL: "/onboarding?plan=bisnis",
      errorCallbackURL: "/login?oauth=error",
    });
  });

  it("mempertahankan paket yang dipilih pada registrasi Google", () => {
    expect(getGoogleAuthRedirects("register", "bisnis")).toEqual({
      callbackURL: "/auth/continue",
      newUserCallbackURL: "/onboarding?plan=bisnis",
      errorCallbackURL: "/register?plan=bisnis&oauth=error",
    });
  });
});
