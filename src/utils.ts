// since the dev server re-requires the bundle, do some shenanigans to make
// certain things persist across that 😆
// Borrowed/modified from https://github.com/jenseng/abuse-the-platform/blob/2993a7e846c95ace693ce61626fa072174c8d9c7/app/utils/singleton.ts
export function singleton<Value>(name: string, value: () => Value): Value {
  const yolo = globalThis as any
  yolo.__singletons ??= {}
  yolo.__singletons[name] ??= value()
  return yolo.__singletons[name]
}

// I do like that the error is logged and returned first in an array,
// so its easy to check for errors from the return value.
const ERR = Symbol("ERR")
type Err = {
  [ERR]: true
  error: Error
}

export function isErr(x: unknown): x is Err {
  return typeof x === "object" && x != null && ERR in x
}

export async function tryFail<T>(
  f: (() => Promise<T>) | (() => T)
): Promise<[Err, null] | [null, Awaited<T>]> {
  try {
    return [null, await f()]
  } catch (e) {
    // ts-expect-error
    const error = e instanceof Error ? e : new Error(e)
    console.error(error)
    return [{ [ERR]: true, error }, null]
  }
}
