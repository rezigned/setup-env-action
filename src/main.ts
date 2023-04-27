import * as core from '@actions/core'
import {execute} from './env'

async function run(): Promise<void> {
  try {
    execute(process.env)
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

run()
