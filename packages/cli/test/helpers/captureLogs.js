import { Logger } from 'zos-lib';

export default class CaptureLogs {
  constructor() {
    this.clear()
    this.originalInfo = Logger.info
    this.originalWarn = Logger.warn
    this.originalError = Logger.error
    Logger.info = msg => this.infos.push(msg)
    Logger.warn = msg => this.warns.push(msg)
    Logger.error = (msg, ex) => this.errors.push(ex ? `${msg} ${ex.message}` : msg)
  }

  get text() {
    return this.toString();
  }

  get logs() {
    return this.infos.concat(this.warns, this.errors)
  }

  clear() {
    this.infos = []
    this.warns = []
    this.errors = []
  }

  restore() {
    Logger.info = this.originalInfo
    Logger.warn = this.originalWarn
    Logger.error = this.originalError
  }

  match(re) {
    return this.logs.some(log => log.match(re))
  }

  toString() {
    return this.logs.join('\n')
  }
}
