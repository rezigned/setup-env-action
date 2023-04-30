import * as core from '@actions/core'
import {getExecOutput} from '@actions/exec'

type Pair = [string, string]
type Inputs = Pair[]

const INPUT_PREFIX = 'INPUT_'
const INPUT_SHELL = 'shell'
const INPUT_ENV = 'env'
export const DEFAULT_SHELL = 'sh'

/**
 * Find all INPUT_* from ENV and return the key-value pairs in tuple form.
 *
 * @param envs
 * @returns Inputs
 */
export function getRawInputs(envs: {}): Inputs {
  return Object.keys(envs)
    .filter(key => key.startsWith(INPUT_PREFIX) && key !== `${INPUT_PREFIX}ENV`)
    .reduce((env, key) => {
      return env.concat([[key, process.env[key] || '']])
    }, [] as Inputs)
}

/**
 * Read input from `env` and return the key-value pairs in tuple form.
 *
 * @returns Inputs
 */
export function getEnvInputs(): Inputs {
  return core
    .getMultilineInput(INPUT_ENV)
    .map((val: string) => val.split(/:\s*/) as Pair)
    .filter(pair => pair.length === 2 && pair[1] !== '')
}

/**
 * Find the current shell by looking up in the following orders:
 *
 * 1) `env` input
 * 2) $SHELL
 * 3) Default shell value
 *
 * @returns string
 */
export function getCurrentShell(): string {
  return (
    core.getInput(INPUT_SHELL) ||
    process.env[INPUT_SHELL.toUpperCase()] ||
    DEFAULT_SHELL
  )
}

/**
 * Evaluate the given input string and return the result.
 *
 * @param s string
 * @returns Promise<string>
 */
export async function evaluate(s: string): Promise<string> {
  if (isPlainValue(s)) {
    return Promise.resolve(s)
  }

  const shell = getCurrentShell()
  const result = await getExecOutput(`${shell} -c`, [transform(s)])

  return result.stdout
}

/**
 * Execute the whole pipeline (i.e. combine inputs, evaulate, export, etc.)
 *
 * @param env
 * @returns
 */
export async function execute(env: {
  [key: string]: string | undefined
}): Promise<{}> {
  return pipe(env)(
    getRawInputs,
    concat(getEnvInputs()),
    map(async ([k, v]: Pair) => [k, await evaluate(v)]),
    Promise.all.bind(Promise),
    async (r: Promise<Pair[]>) => (await r).map(exportEnv)
  )
}

/**
 * Export environment variable and remove `INPUT_` prefix from the name.
 *
 * @param param Pair
 */
export function exportEnv([k, v]: Pair): void {
  const key = k.replace(INPUT_PREFIX, '')

  // Warn if it overrides existing env
  if (process.env[key]) {
    core.warning(`Override existing $${key}`)
  }

  core.exportVariable(key, v)
}

const ENV_VAR_REGEX = new RegExp(/^[\w\s-]+$/)
const ENV_NAME_REGEX = new RegExp(`^${ENV_VAR_REGEX.source}`)
const ECHO_REGEX = new RegExp(/^\s*(echo|print|cat)/)

/**
 * Prepend `echo` to the value if it doesn't have one.
 *
 * @param s string
 * @returns string
 * @example
 * // transform('user') => 'echo user'
 */
export function transform(s: string): string {
  s = s.trimStart()

  if (ECHO_REGEX.test(s)) {
    return s
  }

  return `echo ${s}`
}

/**
 * Check whether the given string is a regular value or not e.g. 'Hello' not '$HELLO
 *
 * @param s string
 * @returns boolean
 */
export function isPlainValue(s: string): boolean {
  return ENV_NAME_REGEX.test(s) && !ECHO_REGEX.test(s)
}

export function pipe<T>(input: T) {
  return (...fs: Function[]) => {
    return fs.reduce((v, f) => f(v), input)
  }
}

type Fn<T, U> = (x: T) => U

export function map<T, U>(f: Fn<T, U>) {
  return (x: T[]) => x.map(f)
}

export function dot(...fs: Function[]) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (x: any) => fs.reduce((v, f) => f(v), x)
}

export function concat<T>(xs: T[]) {
  return (ys: T[]) => xs.concat(ys)
}
