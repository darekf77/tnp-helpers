import { Taon } from 'taon/src';
import { _, UtilsOs } from 'tnp-core/src';
import { BaseCliWorkerController } from '../classes/base-cli-worker-controller';
import { Port, PortStatus } from './ports.entity';
import { NotAssignablePort } from './not-assignable-port.entity';

@Taon.Controller({
  className: 'PortsController',
})
export class PortsController extends BaseCliWorkerController {
  public START_PORT = 3000;
  public END_PORT = 6000;
  public readonly takenByOsPorts = new Map<number, NotAssignablePort>();
  public readonly assignedPorts = new Map<string, Port>();

  get firstFreePort() {
    if (!this.assignedPorts) {
      return null;
    }
    return Array.from(this.assignedPorts.values()).find(
      p => p.status === 'unassigned',
    );
  }

  protected firstUnassignedPortMoreThan(port: number) {
    if (!this.assignedPorts) {
      return null;
    }
    return Array.from(this.assignedPorts.values()).find(
      p => p.status === 'unassigned' && p.port > port,
    );
  }

  //#region public methods / get all assigned ports
  @Taon.Http.GET()
  getPortByStatus(
    @Taon.Http.Param.Query('status') status: PortStatus,
  ): Taon.Response<Port[]> {
    return async () => {
      if (status === 'assigned-taken-by-os') {
        return Array.from(this.takenByOsPorts.values());
      }
      return Array.from(this.assignedPorts.values()).filter(
        f => f.status === status,
      );
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
      if (this.assignedPorts.has(uniqueServiceName)) {
        return this.assignedPorts.get(uniqueServiceName);
      }
      const repo = this.ctx.connection.getRepository(Port);
      startFrom = Number(startFrom);
      const searchingWithStartPort =
        _.isInteger(startFrom) &&
        startFrom >= this.START_PORT &&
        startFrom <= this.END_PORT;

      while (true) {
        const firstFreePort =
          (searchingWithStartPort &&
            this.firstUnassignedPortMoreThan(startFrom)) ||
          this.firstFreePort;

        if (!firstFreePort) {
          // TODO wait and free up some ports
          throw new Error('[taon] No free ports available');
        }
        if (this.takenByOsPorts.has(firstFreePort.port)) {
          this.assignedPorts.delete(firstFreePort.serviceId);
          continue;
        }
        if (await UtilsOs.isPortInUse(firstFreePort.port)) {
          firstFreePort.status = 'assigned-not-registered';
          firstFreePort.serviceId = `taken by unregistered process (port: ${firstFreePort.port})`;
          await repo.update(firstFreePort.port, firstFreePort);
          continue;
        }

        firstFreePort.status = 'assigned';
        const oldServiceId = firstFreePort.serviceId;
        firstFreePort.serviceId = uniqueServiceName;
        firstFreePort.whenAssignedTimestamp = Date.now();
        this.assignedPorts.set(uniqueServiceName, firstFreePort);
        this.assignedPorts.delete(oldServiceId);
        await repo.update(firstFreePort.port, firstFreePort);
        return firstFreePort;
      }
    };
    //#endregion
  }
  //#endregion
}
