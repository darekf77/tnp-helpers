// @ts-nocheck
import { Taon, TaonMigration, TaonBaseMigration } from 'taon/src';
import { _ } from 'tnp-core/src';
import { QueryRunner } from 'taon-typeorm/src';
import { Port, TaonPortsController } from '../base/tcp-udp-ports';

const portsWithDescription = {
  3000: 'Commonly used for development servers',
  3001: 'Alternate development server port',
  3306: 'MySQL',
  3389: 'Remote Desktop Protocol (RDP)',
  3478: 'STUN (Session Traversal Utilities for NAT)',
  4000: 'Alternative development server port',
  4200: 'Angular CLI Development Server',
  4500: 'IPSec NAT traversal',
  4567: 'Sinatra Default Port',
  5000: 'Flask, Python development server, or Node.js apps',
  5432: 'PostgreSQL',
  5500: 'Live Server (VS Code Extension)',
  5672: 'RabbitMQ',
  5800: 'VNC Remote Desktop (HTTP)',
  5900: 'VNC Remote Desktop',
  5984: 'CouchDB',
  6000: 'in use by something in macos',
};

@TaonMigration({
  className: 'TaonPortsContext_1736199486472_addingNotAssignablePorts',
})
export class TaonPortsContext_1736199486472_addingNotAssignablePorts extends TaonBaseMigration {
  protected portsController: TaonPortsController =
    this.injectController(TaonPortsController);

  private readonly commonPortsFrom3000to6000: number[] =
    Object.keys(portsWithDescription).map(Number);

  async up(queryRunner: QueryRunner): Promise<any> {
    const db = await queryRunner.manager.getRepository(Port);

    const allPorts = this.commonPortsFrom3000to6000.map(port =>
      Port.from({
        port,
        serviceId: `not assignable (${portsWithDescription[port]})`,
        status: 'assigned-taken-by-os',
      }),
    );
    await db.save(allPorts);
    for (const commonPortObj of allPorts) {
      this.portsController.portsCache.set(
        commonPortObj.serviceId,
        commonPortObj,
      );
    }
  }

  async down(queryRunner: QueryRunner): Promise<any> {
    const db = await queryRunner.manager.getRepository(Port);
    await db.remove(
      await db.find({
        where: {
          status: 'assigned-taken-by-os',
        },
      }),
    );
    const allPorts = Array.from(
      this.portsController.portsCache.values(),
    ).filter(f => f.status === 'assigned-taken-by-os');
    for (const port of allPorts) {
      this.portsController.portsCache.delete(port.serviceId);
    }
  }
}
