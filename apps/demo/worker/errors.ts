/** A malformed request: answered with 400. */
export class BadRequest extends Error {}

/** A binding that can't be reached here (local dev without remote bindings), or an empty index. Answered with 503. */
export class Unavailable extends Error {}

/** The model answered with something unusable. Answered with 502. */
export class UpstreamError extends Error {}

/** Runs a binding call; its failure means the service isn't available, not a bad request. */
export async function binding<T>(call: () => Promise<T>): Promise<T> {
  try {
    return await call();
  } catch (error) {
    throw new Unavailable(error instanceof Error ? error.message : String(error));
  }
}
