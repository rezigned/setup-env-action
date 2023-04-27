import os from 'os'
import {expect, describe, it, afterEach, beforeEach} from '@jest/globals'
import {
  DEFAULT_SHELL,
  dot,
  evaluate,
  execute,
  getCurrentShell,
  getEnvInput,
  getInputs,
  isPlainValue,
  transform
} from '../src/env'
import {getInput} from '@actions/core'

afterEach(() => {
  // Clean up all INPUT_* keys
  Object.keys(process.env).map((k: string) => {
    if (k.startsWith('INPUT_')) {
      delete process.env[k]
    }
  })
})

describe(getInputs, () => {
  it('returns all key/val pairs from ENV variable', () => {
    process.env['INPUT_FIRST_NAME'] = 'Alice'
    process.env['INPUT_FIRST-NAME'] = 'Bob'

    expect(getInputs(process.env)).toEqual([
      ['INPUT_FIRST_NAME', 'Alice'],
      ['INPUT_FIRST-NAME', 'Bob']
    ])
  })
})

describe(getEnvInput, () => {
  it('returns key/val pairs from INPUT_ENV', () => {
    process.env['INPUT_ENV'] = 'A: echo 1\nB: echo 2\nC:'

    expect(getEnvInput()).toEqual([
      ['A', 'echo 1'],
      ['B', 'echo 2']
    ])
  })
})

describe(getCurrentShell, () => {
  beforeEach(() => {
    process.env['PREV_SHELL'] = process.env['SHELL'] || ''
  })

  afterEach(() => {
    process.env['SHELL'] = process.env['PREV_SHELL']
  })

  it('returns shell from INPUT_SHELL first', () => {
    process.env['INPUT_SHELL'] = 'zsh'
    process.env['SHELL'] = 'bash'

    expect(getCurrentShell()).toBe('zsh')
  })

  it('returns shell from $SHELL variable if INPUT_SHELL is not set', () => {
    process.env['INPUT_SHELL'] = ''
    process.env['SHELL'] = 'fish'

    expect(getCurrentShell()).toBe('fish')
  })

  it('returns default shell if both INPUT_SHELL and $SHELL variable are not set', () => {
    process.env['INPUT_SHELL'] = ''
    process.env['SHELL'] = ''

    expect(getCurrentShell()).toBe(DEFAULT_SHELL)
  })
})

describe(transform, () => {
  it('prepends "echo" to the value', () => {
    ;[
      ['$NAME', 'echo $NAME'],
      ['NAME', 'echo NAME'],
      ['user', 'echo user'],
      ['echo user', 'echo user'],
      [' echo user', 'echo user'],
      ['  print user', 'print user']
    ].forEach(([v, expected]) => {
      expect(transform(v)).toBe(expected)
    })
  })
})

describe(evaluate, () => {
  it('evals value and returns output', async () => {
    ;['$USER', 'echo $USER'].map(
      dot(evaluate, async (result: string) => {
        await expect(result).resolves.toBe(process.env.USER + os.EOL)
      })
    )
  })
})

describe(isPlainValue, () => {
  it('checks whether variable name is a regular value or not', () => {
    const cases: [string, boolean][] = [
      ['NAME', true],
      ['NAME DOE', true],
      ['NAME-DOE', true],
      ['01234', true],
      ['$NAME', false],
      ['$FIRST_NAME', false],
      ['$FIRST-NAME', false],
      ['echo NAME', false],
      ['echo $NAME', false],
      [' print $NAME', false]
    ]

    cases.map(([input, expected]) => {
      expect(isPlainValue(input)).toBe(expected)
    })
  })
})

describe(execute, () => {
  it('executes all inputs and stores them in GITHUB_ENV', async () => {
    process.env['INPUT_NAME'] = '$USER'

    await execute(process.env)

    expect(process.env.NAME).toBe(process.env.USER + os.EOL)
  })
})
