import { ZWeb3, Contracts, TxParams } from 'zos-lib';
import Truffle from './truffle/Truffle';
import Session from '../network/Session';
import ZosConfig from './ZosConfig';

export interface NetworkConfig {
  network: string;
  txParams: TxParams;
}

const ConfigVariablesInitializer  = {
  initStaticConfiguration(): void {
    const buildDir = ZosConfig.exists() ? ZosConfig.getBuildDir() : Truffle.getBuildDir();
    Contracts.setLocalBuildDir(buildDir);
  },

  async initNetworkConfiguration(options: any, silent?: boolean): Promise<NetworkConfig> {
    this.initStaticConfiguration();
    const { network, from, timeout } = Session.getOptions(options, silent);
    Session.setDefaultNetworkIfNeeded(options.network);
    if (!network) throw Error('A network name must be provided to execute the requested action.');
    let config;

    if (ZosConfig.exists()) {
      config  = ZosConfig.load(network);
    } else if (Truffle.existsTruffleConfig()) {
      Truffle.validateAndLoadNetworkConfig(network);
      config = await Truffle.getProviderAndDefaults();
    } else {
      throw Error('Could not find networks.js file, please remember to initialize your project.');
    }

    const { provider, artifactDefaults } = config;

    ZWeb3.initialize(provider);
    Contracts.setSyncTimeout(timeout * 1000);
    Contracts.setArtifactsDefaults(artifactDefaults);

    const txParams = { from: ZWeb3.toChecksumAddress(from || artifactDefaults.from || await ZWeb3.defaultAccount()) };
    return { network: await ZWeb3.getNetworkName(), txParams };
  }
};

export default ConfigVariablesInitializer;
