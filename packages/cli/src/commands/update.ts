import pickBy from 'lodash.pickby';

import update from '../scripts/update';
import Session from '../models/network/Session';
import { parseInit } from '../utils/input';
import { fromContractFullName } from '../utils/naming';
import { hasToMigrateProject } from '../utils/prompt-migration';
import ConfigVariablesInitializer from '../models/initializer/ConfigVariablesInitializer';
import { promptIfNeeded, networksList, methodsList, argsList, initArgsForPrompt, proxiesList } from '../utils/prompt';

const name: string = 'update';
const signature: string = `${name} [alias-or-address]`;
const description: string = 'update contract to a new logic. Provide the [alias] or [package]/[alias] you added your contract with, its [address], or use --all flag to update all contracts in your project.';

const networkProps = {
  ...networksList('list'),
};

const proxiesProps = (network) => {
  return {
    pickProxyBy: {
      message: 'Which proxies would you like to upgrade?',
      type: 'list',
      choices: [{
        name: 'All proxies',
        value: 'all'
      }, {
        name: 'Let me choose by name or alias',
        value: 'byName'
      }, {
        name: 'Let me choose by address',
        value: 'byAddress'
      }]

    },
    proxy: {
      message: 'Choose a proxy',
      type: 'list',
      choices: proxiesList(network),
      when: (({ pickProxyBy }) => pickProxyBy !== 'all')
    }
  };
};

const initProps = (contractFullName?: string, initMethod?: string) => {
  const args = initMethod ? argsList(contractFullName, initMethod) : {};
  return {
    ...methodsList(contractFullName),
    ...args
  };
};

const register: (program: any) => any = (program) => program
  .command(signature, undefined, { noHelp: true })
  .usage('[alias-or-address] --network <network> [options]')
  .description(description)
  .option('--init [function]', `call function after upgrading contract. If no name is given, 'initialize' will be used`)
  .option('--args <arg1, arg2, ...>', 'provide initialization arguments for your contract if required')
  .option('--all', 'update all contracts in the application')
  .option('--force', 'force creation even if contracts have local modifications')
  .withNetworkOptions()
  .action(action);

async function action(contractFullNameOrAddress: string, options: any): Promise<void> {
  const { force } = options;
  const networkOpts = await promptForNetwork(options);
  const { network, txParams } = await ConfigVariablesInitializer.initNetworkConfiguration({ ...options, ...networkOpts });
  let { all } = options;
  if (!await hasToMigrateProject(network)) process.exit(0);

  const { pickProxyBy, proxy } = await promptForProxies(contractFullNameOrAddress, network, all);
  if (pickProxyBy === 'all') all = true;
  const initParams = await promptForInitParams(proxy.contractFullName, options);
  const args = pickBy({ all, force, ...parse(proxy.contractFullName), ...initParams });

  await update({ ...args, network, txParams });
  if (!options.dontExitProcess && process.env.NODE_ENV !== 'test') process.exit(0);
}

async function promptForProxies(proxy: string, network: string, all: boolean): Promise<any> {
  const pickProxyBy = all ? 'all' : undefined;
  const args = { pickProxyBy, proxy };
  return promptIfNeeded({ args, props: proxiesProps(network) });
}

async function promptForNetwork(options: any): Promise<any> {
  const { network: networkInOpts } = options;
  const { network: networkInSession, expired } = Session.getNetwork();
  const defaultOpts = { network: networkInSession };
  const opts = { network: networkInOpts || !expired ? networkInSession : undefined };

  return promptIfNeeded({ opts, defaults: defaultOpts, props: networkProps });
}

async function promptForInitParams(contractFullName: string, options: any) {
  const initMethodProps = initProps(contractFullName);
  const initParams = parseInit(options, 'initialize');
  const { initMethod } = initParams;
  let { initArgs } = initParams;

  // prompt for init method
  let { initMethod: promptedMethod } = await promptIfNeeded({ opts: { initMethod }, props: initMethodProps });
  // if promptedMethod is a string, set an object
  if (typeof promptedMethod === 'string') promptedMethod = { name: promptedMethod, selector: promptedMethod };

  // if no initial arguments provided, prompt for them
  if (!initArgs) {
    const initArgsKeys = initArgsForPrompt(contractFullName, promptedMethod.selector);
    const initArgsProps = initProps(contractFullName, promptedMethod.selector);
    const promptedArgs = await promptIfNeeded({ opts: initArgsKeys, props: initArgsProps });
    initArgs = Object.values(promptedArgs);
  }

  return { initMethod: promptedMethod.name, initArgs };
}

function parse(contractFullNameOrAddress: string) {
  let proxyAddress;
  let contractAlias;
  let packageName;

  if (contractFullNameOrAddress && contractFullNameOrAddress.startsWith('0x')) {
    proxyAddress = contractFullNameOrAddress;
  } else if (contractFullNameOrAddress) {
    ({ contract: contractAlias, package: packageName } = fromContractFullName(contractFullNameOrAddress));
  }

  return { proxyAddress, contractAlias, packageName };
}

export default { name, signature, description, register, action };
