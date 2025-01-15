import { Taon } from 'taon/src';
import { QueryRunner } from 'taon-typeorm/src';
import { _ } from 'tnp-core/src';
import { NotAssignablePort, Port, PortsController } from '../lib';

@Taon.Migration({
  className: 'PortsContext_1736454437350_addFreePorts',
})
export class PortsContext_1736454437350_addFreePorts extends Taon.Base
  .Migration {
  protected portsController: PortsController =
    this.injectController(PortsController);


  async up(queryRunner: QueryRunner): Promise<any> {
    const portsTableRepo = await queryRunner.manager.getRepository(Port);
    const addFreePortsInRange = _.range(
      this.portsController.START_PORT,
      this.portsController.END_PORT + 1,
    );
    const freePortsInRange = addFreePortsInRange.map(port =>
      Port.from({
        port: port,
        serviceId: `free port ${port}`,
      }),
    );

    await portsTableRepo.save(freePortsInRange);

    for (const port of freePortsInRange) {
      this.portsController.assignedPorts.set(port.serviceId, port);
    }
  }

  async down(queryRunner: QueryRunner): Promise<any> {
    // revert this "something" in db
    this.portsController.assignedPorts.clear();
    const portsTableRepo = await queryRunner.manager.getRepository(Port);
    portsTableRepo.clear();
  }
}
