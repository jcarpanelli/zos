import util from 'util';
import cp from 'child_process';

const exec = util.promisify(cp.exec);

export default {
  exec,
}
