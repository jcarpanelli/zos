import pickBy from 'lodash.pickby';

import create from '../scripts/create';
import Session from '../models/network/Session';
import { parseInit } from '../utils/input';
import { fromContractFullName } from '../utils/naming';
import { hasToMigrateProject } from '../utils/prompt-migration';
import ConfigVariablesInitializer from '../models/initializer/ConfigVariablesInitializer';
import { promptIfNeeded, networksList, contractsList, methodsList, argsList, initArgsForPrompt, contractMethods } from '../utils/prompt';

const name: string = 'create';
const signature: string = `${name} [alias]`;
const description: string = 'deploys a new upgradeable contract instance. Provide the <alias> you added your contract with, or <package>/<alias> to create a contract from a linked package.';

const baseProps = {
  ...networksList('list'),
  ...contractsList('contractFullName', 'Choose a contract', 'list', 'all'),
};

const initProps = (contractFullName?: string, initMethod?: string) => {
  const initArgs = initMethod ? argsList(contractFullName, initMethod) : {};

  return {
    askForInitParams: {
      type: 'confirm',
      message: 'Do you want to run a function after creating the instance?'
    },
    initMethod: {
      type: 'list',
      message: 'Select a method',
      choices: methodsList(contractFullName),
      when: (({ askForInitParams }) => askForInitParams)
    },
    ...initArgs
  };
};

const register: (program: any) => any = (program) => program
  .command(signature, undefined, { noHelp: true })
  .usage('[alias] --network <network> [options]')
  .description(description)
  .option('--init [function]', `call function after creating contract. If none is given, 'initialize' will be used`)
  .option('--args <arg1, arg2, ...>', 'provide initialization arguments for your contract if required')
  .option('--force', 'force creation even if contracts have local modifications')
  .withNetworkOptions()
  .action(action);

async function action(contractFullName: string, options: any): Promise<void> {
  const { force } = options;
  const createParams = await promptForCreate(contractFullName, options);

  // get network and prompt for initialize method and arguments
  const { network, txParams } = await ConfigVariablesInitializer.initNetworkConfiguration({ ...options, ...createParams });
  if (!await hasToMigrateProject(network)) process.exit(0);
  const initParams = await promptForInitParams(createParams.contractFullName, options);
  const { contract: contractAlias, package: packageName } = fromContractFullName(createParams.contractFullName);
  const args = pickBy({ packageName, contractAlias, ...initParams, force });

  await create({ ...args, network, txParams });
  Session.setDefaultNetworkIfNeeded(createParams.network);
  if (!options.dontExitProcess && process.env.NODE_ENV !== 'test') process.exit(0);
}

async function promptForCreate(contractFullName: string, options: any): Promise<any> {
  const { force, network: networkInOpts } = options;
  const { network: networkInSession, expired } = Session.getNetwork();
  const defaultOpts = { network: networkInSession };
  const args = { contractFullName };
  const opts = { network: networkInOpts || !expired ? networkInSession : undefined };

  return promptIfNeeded({ args, opts, defaults: defaultOpts, props: baseProps });
}

// TODO: see if I can unify both prompts
async function promptForInitParams(contractFullName: string, options: any) {
  const initMethodProps = initProps(contractFullName);
  const initParams = parseInit(options, 'initialize');
  const { init: rawInitMethod } = options;
  const { initMethod } = initParams;
  const opts = { askForInitParams: rawInitMethod || undefined, initMethod };
  let { initArgs } = initParams;

  // prompt for init method
  let { initMethod: promptedMethod } = await promptIfNeeded({ opts, props: initMethodProps });
  // if promptedMethod is a string, set an object
  if (typeof promptedMethod === 'string' || !promptedMethod) promptedMethod = { name: promptedMethod, selector: promptedMethod };

  // if no initial arguments are provided, prompt for them
  if (!initArgs || initArgs.length === 0) {
    const initArgsKeys = initArgsForPrompt(contractFullName, promptedMethod.selector);
    const initArgsProps = initProps(contractFullName, promptedMethod.selector);
    const promptedArgs = await promptIfNeeded({ opts: initArgsKeys, props: initArgsProps });
    initArgs = Object.values(promptedArgs);
  }

  return { initMethod: promptedMethod.name, initArgs };
}

export default { name, signature, description, register, action };
