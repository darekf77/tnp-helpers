import { Taon } from 'taon/src';
import { BaseCliWorkerController } from '../classes/base-cli-worker-controller';
import { Port } from './ports.entity';
import { NotAssignablePort } from './not-assignable-port.entity';

@Taon.Controller({
  className: 'PortsController',
})
export class PortsController extends BaseCliWorkerController {
  public START_PORT = 3000;
  public END_PORT = 6000;
  public takenByOsPorts = new Map<number, NotAssignablePort>();
  public portsCacheByServiceId = new Map<string, Port>();

  get firstFreePort() {
    if (!this.portsCacheByServiceId) {
      return null;
    }
    return Array.from(this.portsCacheByServiceId.values()).find(
      p => !p.assigned,
    );
  }

  //#region public methods / get all assigned ports
  @Taon.Http.GET()
  getAllAssignedPorts(): Taon.Response<NotAssignablePort[]> {
    return async () => {
      return Array.from(this.takenByOsPorts.values());
    };
  }
  //#endregion

  //#region public methods / register and assign port
  /**
   * @param uniqueServiceName unique service name
   * @param startFrom start searching for free port from this number
   * @returns
   */
  @Taon.Http.PUT()
  registerAndAssignPort(
    @Taon.Http.Param.Query('uniqueServiceName') uniqueServiceName: string,
    @Taon.Http.Param.Query('startFrom') startFrom?: number,
  ): Taon.Response<Port> {
    //#region @backendFunc
    return async () => {
      uniqueServiceName = decodeURIComponent(uniqueServiceName);
      if (this.portsCacheByServiceId.has(uniqueServiceName)) {
        return this.portsCacheByServiceId.get(uniqueServiceName);
      }
      const repo = this.ctx.connection.getRepository(Port);
      startFrom = Number.isInteger(startFrom) ? startFrom : 3000;
      while (true) {
        const firstFreePort = this.firstFreePort;
        if (!firstFreePort) {
          throw new Error('[taon] No free ports available');
        }
        if (this.takenByOsPorts.has(firstFreePort.port)) {
          this.portsCacheByServiceId.delete(firstFreePort.serviceId);
          continue;
        }
        firstFreePort.assigned = true;
        const oldServiceId = firstFreePort.serviceId;
        firstFreePort.serviceId = uniqueServiceName;
        this.portsCacheByServiceId.set(uniqueServiceName, firstFreePort);
        this.portsCacheByServiceId.delete(oldServiceId);
        await repo.update(firstFreePort.port, firstFreePort);
        return firstFreePort;
      }
    };
    //#endregion
  }
  //#endregion
}
