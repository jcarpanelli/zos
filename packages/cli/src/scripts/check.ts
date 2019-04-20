import { Logger } from 'zos-lib';

import LocalController from '../models/local/LocalController';
import { CheckParams } from './interfaces';

Logger.register('Check');

export default function check({ contractAlias, packageFile }: CheckParams): void {
  const controller = new LocalController(packageFile);
  const success = contractAlias ? controller.validate(contractAlias) : controller.validateAll();
  if (success) Logger.info('No issues were found');
}
