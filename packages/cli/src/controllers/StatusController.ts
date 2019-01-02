
import NetworkController from '../models/network/NetworkController';
import StatusChecker from '../models/status/StatusChecker';

export default class StatusController extends NetworkController {
  // StatusController
  public async compareCurrentStatus(): Promise<void | never> {
    if (this.isLightweight) throw Error('Command status-pull is not supported for unpublished projects');
    const statusComparator = StatusChecker.compare(this.networkFile, this.txParams);
    await statusComparator.call();
  }

  // StatusController
  public async pullRemoteStatus(): Promise<void | never> {
    if (this.isLightweight) throw Error('Command status-fix is not supported for unpublished projects');
    const statusFetcher = StatusChecker.fetch(this.networkFile, this.txParams);
    await statusFetcher.call();
  }
}
