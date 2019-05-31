import { ZWeb3, Contracts, TxParams } from 'zos-lib';
import TruffleConfig from './Truffle';
import Session from '../network/Session';
import ZosConfig from './ZosConfig';

export interface NetworkConfig {
  network: string;
  txParams: TxParams;
}

const ConfigManager = {
  initStaticConfiguration(root: string = process.cwd()): void {
    this.setBaseConfig(root);
    const buildDir = this.config.getBuildDir();
    Contracts.setLocalBuildDir(buildDir);
  },

  async initNetworkConfiguration(options: any = {}, silent?: boolean, root: string = process.cwd()): Promise<NetworkConfig> {
    this.initStaticConfiguration(root);
    const { network, from, timeout } = Session.getOptions(options, silent);
    Session.setDefaultNetworkIfNeeded(options.network);
    if (!network) throw Error('A network name must be provided to execute the requested action.');

    const { provider, artifactDefaults } = await this.config.loadNetworkConfig(network, root);

    Contracts.setSyncTimeout(timeout * 1000);
    Contracts.setArtifactsDefaults(artifactDefaults);

    try {
      ZWeb3.initialize(provider);
      const txParams = { from: ZWeb3.toChecksumAddress(from || artifactDefaults.from || await ZWeb3.defaultAccount()) };
      return { network: await ZWeb3.getNetworkName(), txParams };
    } catch(error) {
      if (this.config.constructor.name === 'ZosConfig') {
        const message = `Could not connect to ${network}. Please check that your Ethereum client:\n - is running\n - is accepting RPC connections (i.e., "--rpc" option is used in geth)\n - is accessible over the network\n - is properly configured in your networks.js file`;
        error.message = `${message}\n${error.message}`;
        throw error;
      } else throw error;
    }

  },

  getBuildDir(root: string = process.cwd()) {
    this.setBaseConfig(root);
    return this.config.getBuildDir();
  },

  getCompilerInfo(root: string = process.cwd()): { version?: string, optimizer?: boolean, optimizerRuns?: number } {
    this.setBaseConfig(root);
    const { compilers: { solc: { version, settings } } } = this.config.getConfig();
    const { enabled: optimizer, runs: optimizerRuns } = settings.optimizer;
    return { version, optimizer, optimizerRuns };
  },

  getNetworkNamesFromConfig(root: string = process.cwd()): string[] | null {
    this.setBaseConfig(root);
    const config = this.config.getConfig();
    return config && config.networks ? Object.keys(config.networks) : undefined;
  },

  setBaseConfig(root: string = process.cwd()): void | never {
    if (this.config) return;

    // these lines could be expanded to support different libraries like embark, ethjs, buidler, etc
    const zosConfig = new ZosConfig();
    const truffleConfig = new TruffleConfig();
    if (zosConfig.exists(root)) {
      this.config = zosConfig;
    } else if (truffleConfig.existsTruffleConfig(root)) {
      this.config = truffleConfig;
    } else {
      throw Error('Could not find networks.js file, please remember to initialize your project.');
    }
  },
};

export default ConfigManager;
