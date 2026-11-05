export class BadRequest extends Error {}

export class Unavailable extends Error {}

export class UpstreamError extends Error {}

export async function binding<T>(call: () => Promise<T>): Promise<T> {
  try {
    return await call();
  } catch (error) {
    throw new Unavailable(error instanceof Error ? error.message : String(error));
  }
}
