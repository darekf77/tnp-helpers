import { Taon } from "taon/src";
import { BaseCliWorkerController } from "../classes/base-cli-worker-controller";
import { Port } from "./ports.entity";
import { NotAssignablePort } from "./not-assignable-port.entity";

@Taon.Controller({
  className: 'PortsController',
})
export class PortsController extends BaseCliWorkerController<Port> {
  public assignedPorts = new Map<number, NotAssignablePort>();
  entityClassResolveFn = () => Port;
  private portsCacheByServiceId = new Map<string, Port>();

  //#region public methods / get all asigned ports
  @Taon.Http.GET()
  getAllAssignedPorts(): Taon.Response<NotAssignablePort[]> {
    return async () => {
      return Array.from(this.assignedPorts.values());
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
    @Taon.Http.Param.Query('startFrom') startFrom?: string,
  ): Taon.Response<Port> {
    //#region @backendFunc
    return async () => {
      if (this.portsCacheByServiceId.has(uniqueServiceName)) {
        return this.portsCacheByServiceId.get(uniqueServiceName);
      }
      // TODO
      return void 0;
      // this.portsCacheByServiceId.set(uniqueServiceName, portObj);
      // return portObj.port;
    };
    //#endregion
  }
  //#endregion
}
