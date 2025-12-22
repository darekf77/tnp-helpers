// @ts-nocheck
import { Taon,TaonMigration, TaonBaseMigration } from 'taon/src';
import { QueryRunner } from 'taon-typeorm/src';
import { _ } from 'tnp-core/src';
import { Port, TaonPortsController } from '../lib';

@TaonMigration({
  className: 'TaonPortsContext_1736454437350_addFreePorts',
})
export class TaonPortsContext_1736454437350_addFreePorts extends TaonBaseMigration {
  protected portsController: TaonPortsController =
    this.injectController(TaonPortsController);

  async up(queryRunner: QueryRunner): Promise<any> {
    const portsTableRepo = await queryRunner.manager.getRepository(Port);
    const addFreePortsInRange = _.range(
      this.portsController.START_PORT,
      this.portsController.END_PORT + 1,
    );

    const allTakeByOsPort = (
      await portsTableRepo.find({
        where: {
          status: 'assigned-taken-by-os',
        },
      })
    ).map(f => f.port);

    const freePortsInRange = addFreePortsInRange.map(port =>
      Port.from({
        port: port,
        serviceId: Port.getTitleForFreePort(port),
        status: 'unassigned',
      }),
    ).filter(f => !allTakeByOsPort.includes(f.port));

    await portsTableRepo.save(freePortsInRange);

    for (const port of freePortsInRange) {
      this.portsController.portsCache.set(port.serviceId, port);
    }
  }

  async down(queryRunner: QueryRunner): Promise<any> {
    // revert this "something" in db
    const db = await queryRunner.manager.getRepository(Port);
    await db.remove(
      await db.find({
        where: {
          status: 'unassigned',
        },
      }),
    );
    const allPorts = Array.from(
      this.portsController.portsCache.values(),
    ).filter(f => f.status === 'unassigned');
    for (const port of allPorts) {
      this.portsController.portsCache.delete(port.serviceId);
    }
  }
}
