export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { initLocalCronRunner } = await import("@/lib/local-cron-runner");
    initLocalCronRunner();
  }
}
