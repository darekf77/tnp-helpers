//#region imports
import { DELETE, GET, POST, PUT, Query, Taon, TaonController } from 'taon/src';
import { _, UtilsOs } from 'tnp-core/src';

import { TaonBaseCliWorkerController } from '../classes/base-cli-worker';

import { Port, PortStatus } from './ports.entity';
//#endregion

@TaonController({
  className: 'TaonPortsController',
})
export class TaonPortsController extends TaonBaseCliWorkerController {

  //#region fields
  public START_PORT = 3000;

  public END_PORT = 20000;

  public readonly portsCache = new Map<string, Port>();
  //#endregion

  //#region methods

  //#region methods / first free port
  protected get firstFreePort(): Port | null | undefined {

    //#region  @backendFunc
    if (!this.portsCache) {
      return null;
    }
    return Array.from(this.portsCache.values()).find(
      p => p.status === 'unassigned',
    );
    //#endregion

  }
  //#endregion

  //#region methods / get first unassigned port more than
  protected firstUnassignedPortMoreThan(port: number) {

    //#region   @backendFunc
    if (!this.portsCache) {
      return null;
    }
    return Array.from(this.portsCache.values()).find(
      p => p.status === 'unassigned' && p.port > port,
    );
    //#endregion

  }
  //#endregion

  //#endregion

  //#region public methods

  //#region public methods / get

  //#region public methods / get / first free port
  @GET()
  getFirstFreePort(): Taon.Response<Port> {
    return async () => {
      return this.firstFreePort;
    };
  }
  //#endregion

  //#region public methods / get / port by number
  @GET()
  getPortByNumber(
    @Query('portNumber') portNumber: number,
  ): Taon.Response<Port> {
    return async () => {
      portNumber = Number(portNumber);
      return Array.from(this.portsCache.values()).find(
        f => f.port === portNumber,
      );
    };
  }
  //#endregion

  //#region public methods / get / ports by status
  @GET()
  getPortsByStatus(@Query('status') status: PortStatus): Taon.Response<Port[]> {
    return async () => {
      return Array.from(this.portsCache.values())
        .filter(f => f.status === status)
        .sort(
          // sort by port number
          (a, b) => {
            if (a.port < b.port) {
              return -1;
            }
            if (a.port > b.port) {
              return 1;
            }
            return 0;
          },
        );
    };
  }
  //#endregion

  //#endregion

  //#region public methods / ports take by os

  //#region public methods / ports take by os / DELETE port (make it unassigned)
  /**
   * make it unassigned
   */
  @DELETE()
  deletePort(@Query('portNumber') portNumber: number): Taon.Response<Port> {

    //#region @backendFunc
    return async () => {
      portNumber = Number(portNumber);
      const repoPort = this.ctx.connection.getRepository(Port);
      let port = await repoPort.findOneBy({
        port: portNumber,
      });
      const oldServiceId = port.serviceId;
      port.status = 'unassigned';
      port.serviceId = Port.getTitleForFreePort(port.port);

      await repoPort.update(
        {
          port: portNumber,
        },
        port,
      );
      port = await repoPort.findOneBy({
        port: portNumber,
      });
      this.portsCache.delete(oldServiceId);
      this.portsCache.set(port.serviceId, port);
      return port;
    };
    //#endregion

  }
  //#endregion

  //#region public methods / ports take by os / UPDATE port unique id
  /**
   * make it unassigned
   */
  @PUT()
  updatePortUniqueId(
    @Query('portNumber') portNumber: number,
    @Query('serviceId') serviceId: string,
  ): Taon.Response<Port> {

    //#region @backendFunc
    return async () => {
      portNumber = Number(portNumber);
      serviceId = decodeURIComponent(serviceId);

      const repoPort = this.ctx.connection.getRepository(Port);
      let port = await repoPort.findOneBy({
        port: portNumber,
      });
      const oldServiceId = port.serviceId;
      port.serviceId = serviceId;
      await repoPort.update(
        {
          port: portNumber,
        },
        port,
      );
      port = await repoPort.findOneBy({
        port: portNumber,
      });
      this.portsCache.delete(oldServiceId);
      this.portsCache.set(port.serviceId, port);
      return port;
    };
    //#endregion

  }
  //#endregion

  //#region public methods / ports take by os / ADD port take by os
  @POST()
  addTakeByOsPort(
    @Query('portNumber') portNumber: number,
    @Query('uniqueId') uniqueId: string,
  ): Taon.Response<Port> {

    //#region @backendFunc
    return async () => {
      portNumber = Number(portNumber);
      uniqueId = decodeURIComponent(uniqueId);
      const repoPort = this.ctx.connection.getRepository(Port);
      let port = await repoPort.findOneBy({
        port: portNumber,
      });
      const oldServiceId = port.serviceId;
      port.serviceId = uniqueId;
      port.status = 'assigned-taken-by-os';

      await repoPort.update(
        {
          port: portNumber,
        },
        port,
      );

      port = await repoPort.findOneBy({
        port: portNumber,
      });
      this.portsCache.delete(oldServiceId);
      this.portsCache.set(port.serviceId, port);
      return port;
    };
    //#endregion

  }
  //#endregion

  //#endregion

  //#region public methods / register and assign port
  /**
   * @param uniqueServiceName unique service name
   * @param startFrom start searching for free port from this number
   * @returns
   */
  @PUT()
  registerAndAssignPort(
    @Query('uniqueServiceName') uniqueServiceName: string,
    @Query('startFrom') startFrom?: number,
  ): Taon.Response<Port> {

    //#region @backendFunc
    return async () => {
      uniqueServiceName = decodeURIComponent(uniqueServiceName);
      if (this.portsCache.has(uniqueServiceName)) {
        return this.portsCache.get(uniqueServiceName);
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

        const takenByOsPorts = Array.from(this.portsCache.values())
          .filter(f => f.status === 'assigned-taken-by-os')
          .map(f => f.port);
        if (takenByOsPorts.includes(firstFreePort.port)) {
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
        this.portsCache.set(uniqueServiceName, firstFreePort);
        this.portsCache.delete(oldServiceId);
        await repo.update(firstFreePort.port, firstFreePort);
        return firstFreePort;
      }
    };
    //#endregion

  }
  //#endregion

  //#endregion

}