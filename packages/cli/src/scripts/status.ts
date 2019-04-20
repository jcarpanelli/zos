import forEach from 'lodash.foreach';
import { Logger } from 'zos-lib';

import ZosNetworkFile from '../models/files/ZosNetworkFile';
import { StatusParams } from './interfaces';
import NetworkController from '../models/network/NetworkController';

Logger.register('scripts/status');

export default async function status({ network, txParams = {}, networkFile }: StatusParams): Promise<void> {
  const controller = new NetworkController(network, txParams, networkFile);
  Logger.info(`Project status for network ${network}`);

  if (!(await appInfo(controller))) return;
  if (!(await versionInfo(controller.networkFile))) return;
  await dependenciesInfo(controller.networkFile);
  await contractsInfo(controller);
  await proxiesInfo(controller.networkFile);
}

// TODO: Find a nice home for all these functions :)
async function appInfo(controller: NetworkController): Promise<boolean> {
  if (!controller.isPublished) return true;

  if (!controller.appAddress) {
    Logger.warn(`Application is not yet deployed to the network`);
    return false;
  }

  await controller.fetchOrDeploy(controller.currentVersion);
  Logger.info(`Application is deployed at ${controller.appAddress}`);
  Logger.info(`- Package ${controller.packageFile.name} is at ${controller.networkFile.packageAddress}`);
  return true;
}

async function versionInfo(networkFile: ZosNetworkFile): Promise<boolean> {
  if (!networkFile.isPublished) return true;
  if (networkFile.hasMatchingVersion()) {
    Logger.info(`- Deployed version ${networkFile.version} matches the latest one defined`);
    return true;
  } else {
    Logger.info(`- Deployed version ${networkFile.version} is out of date (latest is ${networkFile.packageFile.version})`);
    return false;
  }
}

async function contractsInfo(controller: NetworkController): Promise<void> {
  Logger.info('Application contracts:');

  // Bail if there are no contracts at all
  if (!controller.packageFile.hasContracts() && !controller.networkFile.hasContracts()) {
    Logger.info(`- No contracts registered`);
    return;
  }

  // Log status for each contract in package file
  forEach(controller.packageFile.contracts, function(contractName, contractAlias) {
    const isDeployed = controller.isContractDeployed(contractAlias);
    const hasChanged = controller.hasContractChanged(contractAlias);
    const fullName = contractName === contractAlias ? contractAlias : `${contractAlias} (implemented by ${contractName})`;
    if (!isDeployed) {
      Logger.warn(`- ${fullName} is not deployed`);
    } else if (hasChanged) {
      Logger.error(`- ${fullName} is out of date with respect to the local version`);
    } else {
      Logger.info(`- ${fullName} is deployed and up to date`);
    }
  });

  // Log contracts in network file missing from package file
  controller.networkFile.contractAliasesMissingFromPackage()
    .forEach((contractAlias) => Logger.warn(`- ${contractAlias} will be removed on next push`));
}

async function dependenciesInfo(networkFile: ZosNetworkFile): Promise<void> {
  if (!networkFile.isPublished) return;
  const packageFile = networkFile.packageFile;
  if (!packageFile.hasDependencies() && !networkFile.hasDependencies()) return;
  Logger.info('Application dependencies:');

  forEach(packageFile.dependencies, (requiredVersion, dependencyName) => {
    const msgHead = `- ${dependencyName}@${requiredVersion}`;
    if (!networkFile.hasDependency(dependencyName)) {
      Logger.info(`${msgHead} is required but is not linked`);
    } else if (networkFile.dependencyHasMatchingCustomDeploy(dependencyName)) {
      Logger.info(`${msgHead} is linked to a custom deployment`);
    } else if (networkFile.dependencyHasCustomDeploy(dependencyName)) {
      Logger.info(`${msgHead} is linked to a custom deployment of a different version (${networkFile.getDependency(dependencyName).version})`);
    } else if (networkFile.dependencySatisfiesVersionRequirement(dependencyName)) {
      const actualVersion = networkFile.getDependency(dependencyName).version;
      if (actualVersion === requiredVersion) {
        Logger.info(`${msgHead} is linked`);
      } else {
        Logger.info(`${msgHead} is linked to version ${actualVersion}`);
      }
    } else {
      Logger.info(`${msgHead} is linked to a different version (${networkFile.getDependency(dependencyName).version})`);
    }
  });

  forEach(networkFile.dependenciesNamesMissingFromPackage, (dependencyName) => {
    Logger.info(`- ${dependencyName} will be unlinked on next push`);
  });
}

async function proxiesInfo(networkFile: ZosNetworkFile): Promise<void> {
  Logger.info('Deployed proxies:');
  if (!networkFile.hasProxies()) {
    Logger.info('- No proxies created');
    return;
  }

  networkFile.getProxies().forEach((proxy) =>
    Logger.info(`- ${proxy.package}/${proxy.contract} at ${proxy.address} version ${proxy.version}`)
  );
}
