import { execFile, ExecException } from 'child_process';
import { FileSystem, Contracts, Logger } from 'zos-lib';
import { promisify } from 'util';
const execFileAsync = promisify(execFile);

const log = new Logger('Compiler');

const Compiler = {
  async call(): Promise<void | ExecException> {
    let truffleBin = `${process.cwd()}/node_modules/.bin/truffle`;
    log.info('Compiling contracts with Truffle...');
    if (!FileSystem.exists(truffleBin)) truffleBin = 'truffle'; // Attempt to load global truffle if local was not found
    try {
      const { stdout } = await execFileAsync(truffleBin, ['compile', '--all']);
      log.warn(stdout);
    } catch(error) {
      throw Error(error.stdout);
    }
  }
};

export default Compiler;
