// Conditional import keeps Node-only code out of the Edge runtime bundle.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./instrumentation-node");
  }
}
