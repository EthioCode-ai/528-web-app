import { describe, expect, it, vi, beforeEach } from "vitest";
import { track } from "../analytics";

describe("528 conversion analytics", () => {
  beforeEach(() => {
    window.posthog = { capture: vi.fn() };
    window.gtag = vi.fn();
  });

  it("dual-writes the privacy-safe registration outcome", () => {
    track("mcat_528_registration_completed", {
      auth_method: "email",
      plan: "free",
      product: "528_ai",
      email: "must-not-leave@example.com",
    });

    expect(window.posthog.capture).toHaveBeenCalledWith(
      "mcat_528_registration_completed",
      {
        platform: "web",
        auth_method: "email",
        plan: "free",
        product: "528_ai",
      }
    );
    expect(window.posthog.capture).toHaveBeenCalledWith(
      "signup_completed",
      expect.any(Object)
    );
    expect(window.gtag).toHaveBeenCalledWith(
      "event",
      "mcat_528_registration_completed",
      expect.objectContaining({
        auth_method: "email",
        plan: "free",
        product: "528_ai",
      })
    );
  });

  it("emits subscription outcomes with categorical properties only", () => {
    track("mcat_528_subscription_completed", {
      product: "528_ai",
      plan: "elite",
      billing_interval: "annual",
      price_id: "price_secret",
    });

    expect(window.posthog.capture).toHaveBeenCalledWith(
      "mcat_528_subscription_completed",
      {
        platform: "web",
        product: "528_ai",
        plan: "elite",
        billing_interval: "annual",
      }
    );
    expect(window.gtag).toHaveBeenCalledWith(
      "event",
      "mcat_528_subscription_completed",
      expect.objectContaining({
        product: "528_ai",
        plan: "elite",
        billing_interval: "annual",
      })
    );
  });

  it("drops unsupported conversion properties and category values", () => {
    track("mcat_528_login_completed", {
      auth_method: "magic_link",
      product: "528_ai",
      email: "must-not-leave@example.com",
      target_score: 528,
    });

    expect(window.posthog.capture).toHaveBeenCalledWith(
      "mcat_528_login_completed",
      {
        platform: "web",
        product: "528_ai",
      }
    );
  });
});