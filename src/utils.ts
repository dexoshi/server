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
const ERR = Symbol('ERR')
type Err = {
  [ERR]: true
  error: Error
}

export function isErr(x: unknown): x is Err {
  return typeof x === 'object' && x != null && ERR in x
}

export async function tryFail<T>(f: (() => Promise<T>) | (() => T)) {
  try {
    return [null, await f()] as const
  } catch (e) {
    // @ts-expect-error
    const error = e instanceof Error ? e : new Error(e)
    return [{ [ERR]: true, error }, null] as const
  }
}

export function getErrorMessage(error: unknown) {
  if (typeof error === 'string') return error
  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message
  }
  console.error('Unable to get error message for error', error)
  return 'Unknown Error'
}

export function getHashTags(content: string | undefined | null) {
  return content?.match(/(?<=#)\w+/g) ?? []
}
