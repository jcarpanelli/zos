import chalk from 'chalk';

interface LoggerOptions {
  verbose: boolean;
  silent: boolean;
}

const Logger = {

  initialize(defaults) {
    this.defaults = defaults || { verbose: false, silent: true };
  },

  register(prefix: string, opts?: LoggerOptions) {
    this._opts =  opts ? opts : { verbose: false, silent: false };
  },

  silent(value): void {
    this.defaults.silent = value;
  },

  verbose(value): void {
    this.defaults.verbose = value;
  },

  info(msg: string): void {
    this.log(msg, 'green');
  },

  warn(msg: string) {
    this.log(msg, 'yellow');
  },

  error(msg: string, ex?: Error): void {
    if (ex && ex.message && !this._opts.verbose) {
      this.log(`${msg}: ${ex.message}`, 'red');
    } else {
      this.log(msg, 'red');
    }

    if (ex && this._opts.verbose) {
      this.error(ex.stack);
    }
  },

  log(msg: string, color: string = ''): void {
    if (this._opts.silent) return;
    if (this._opts.verbose) msg = `[${this._prefix}] ${msg}`;
    console.error(chalk.keyword(color)(msg));
  },

  opts(): LoggerOptions {
    return {...this._opts, ...this.defaults};
  }
};

export default Logger;
