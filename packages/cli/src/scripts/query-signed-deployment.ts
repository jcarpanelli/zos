import stdout from '../utils/stdout';
import NetworkController from '../models/network/NetworkController';
import ScriptError from '../models/errors/ScriptError';
import { CreateParams } from './interfaces';
import { Contract, encodeParams, Logger } from 'zos-lib';
import { validateSalt } from '../utils/input';

Logger.register('QueryDeployment');

export default async function querySignedDeployment({ packageName, contractAlias, methodName, methodArgs, network, txParams = {}, salt = null, signature = null, admin = null, networkFile }: CreateParams): Promise<string | never> {
  validateSalt(salt, true);
  const controller = new NetworkController(network, txParams, networkFile);

  try {
    const { signer, address } = await controller.getProxySignedDeployment(salt, signature, packageName, contractAlias, methodName, methodArgs, admin);
    stdout(address);
    controller.writeNetworkPackageIfNeeded();

    return address;
  } catch(error) {
    const cb = () => controller.writeNetworkPackageIfNeeded();
    throw new ScriptError(error, cb);
  }
}
