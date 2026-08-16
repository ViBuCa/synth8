import { existsSync } from "node:fs";
import { defineConfig } from "vitest/config";
import { playwright } from "@vitest/browser-playwright";

export default defineConfig({
    test: {
        include: ["browser-tests/**/*.test.ts"],
        browser: {
            enabled: true,
            provider: playwright({
                launchOptions: {
                    ...(existsSync("/usr/bin/google-chrome") ? { executablePath: "/usr/bin/google-chrome" } : {}),
                    args: ["--no-sandbox"],
                },
            }),
            instances: [{ browser: "chromium" }],
        },
    },
});
