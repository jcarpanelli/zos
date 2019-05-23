import { execFile, ExecException } from 'child_process';
import { FileSystem, Logger } from 'zos-lib';

Logger.register('Compiler');

const state = { alreadyCompiled: false };

const Compiler = {
  async call(force: boolean = false): Promise<{ stdout: string, stderr: string }> {
    if (force || !state.alreadyCompiled) {
      Logger.info('Compiling contracts with Truffle...', 'compilation');
      let truffleBin = `${process.cwd()}/node_modules/.bin/truffle`;
      if (!FileSystem.exists(truffleBin)) truffleBin = 'truffle'; // Attempt to load global truffle if local was not found

      return new Promise((resolve, reject) => {
        const args: object = { shell: true };

        execFile(truffleBin, ['compile', '--all'], args, (error: ExecException, stdout, stderr) => {

          if (error) {
            if (error.code === 127) console.error('Could not find truffle executable. Please install it by running: npm install truffle');
            reject(error);
          } else {
            state.alreadyCompiled = true;
            Logger.success('compilation', 'Contracts successfully compiled. Compilation logs:');
            resolve({ stdout, stderr });
          }
          if (stdout) console.log(stdout);
          if (stderr) console.error(stderr);
        });
      });
    }
  }
};

export default Compiler;
