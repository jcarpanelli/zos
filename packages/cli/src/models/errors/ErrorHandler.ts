import { Command } from 'commander';
import { Logger } from 'zos-lib';
import ScriptError from './ScriptError';

Logger.register('Error');
const GENERIC_ERROR_MESSAGE = 'There was an undefined error. Please execute the same command again in verbose mode if necessary.';

export default class ErrorHandler {
  public error: ScriptError | any;
  public verbose: boolean;

  constructor(error: ScriptError | any, { verbose }: Command) {
    this.error = error;
    this.verbose = verbose;
  }

  public call(): void {
    if (!this.verbose) {
      const errorMessage = this.error.message || GENERIC_ERROR_MESSAGE;
      Logger.error(errorMessage);
    }
    else Logger.error(this.error.stack);
    if (this.error.cb) this.error.cb();

    process.exit(1);
  }
}
