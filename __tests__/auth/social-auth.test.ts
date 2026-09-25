import { describe, expect, it } from "vitest";
import { getGoogleAuthRedirects } from "@/lib/auth/social-auth";

describe("redirect autentikasi Google", () => {
  it("meneruskan akun lama ke server dan akun baru dari login ke onboarding Tumbuh", () => {
    expect(getGoogleAuthRedirects("login")).toEqual({
      callbackURL: "/auth/continue",
      newUserCallbackURL: "/onboarding?plan=tumbuh",
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
