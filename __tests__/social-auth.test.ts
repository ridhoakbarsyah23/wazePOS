import { describe, expect, it } from "vitest";
import { getGoogleAuthRedirects } from "@/lib/social-auth";

describe("redirect autentikasi Google", () => {
  it("mengarahkan akun lama ke dashboard dan akun baru dari login ke onboarding Tumbuh", () => {
    expect(getGoogleAuthRedirects("login")).toEqual({
      callbackURL: "/dashboard",
      newUserCallbackURL: "/onboarding?plan=tumbuh",
      errorCallbackURL: "/login?oauth=error",
    });
  });

  it("mempertahankan paket yang dipilih pada registrasi Google", () => {
    expect(getGoogleAuthRedirects("register", "bisnis")).toEqual({
      callbackURL: "/dashboard",
      newUserCallbackURL: "/onboarding?plan=bisnis",
      errorCallbackURL: "/register?plan=bisnis&oauth=error",
    });
  });
});
