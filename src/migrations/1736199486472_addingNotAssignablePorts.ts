import { Taon } from 'taon/src';
import { QueryRunner } from 'taon-typeorm/src';
import { NotAssignablePort, Port, PortsController } from 'tnp-helpers/src';

@Taon.Migration({
  className: 'PortsContext_1736199486472_addingNotAssignablePorts',
})
export class PortsContext_1736199486472_addingNotAssignablePorts extends Taon
  .Base.Migration {
  portsController: PortsController = this.injectController(PortsController);
  /**
   * IMPORTANT !!!
   * remove this method if you are ready to run this migration
   */
  public isReadyToRun(): boolean {
    return true;
  }

  private readonly commonPortsFrom3000to6000: number[] = [
    3000, // Commonly used for development servers (e.g., React, Node.js)
    3001, // Alternate development server port
    3306, // MySQL
    3389, // Remote Desktop Protocol (RDP)
    3478, // STUN (Session Traversal Utilities for NAT)
    4000, // Alternative development server port
    4200, // Angular CLI Development Server
    4500, // IPSec NAT traversal
    4567, // Sinatra Default Port
    5000, // Flask, Python development server, or Node.js apps
    5432, // PostgreSQL
    5500, // Live Server (VS Code Extension)
    5672, // RabbitMQ
    5800, // VNC Remote Desktop
    5900, // VNC Remote Desktop
    5984, // CouchDB
    6000, // in use by something in macos
  ];

  async up(queryRunner: QueryRunner): Promise<any> {
    console.log('is controller accessible ', !!this.portsController);

    const db = await queryRunner.manager.getRepository(NotAssignablePort);

    for (const commonPort of this.commonPortsFrom3000to6000) {
      const portObj = NotAssignablePort.from({
        port: commonPort,
        serviceId: 'not-assignable-used-by-os-or-other-apps' + commonPort,
      });
      portObj;
      await db.save(portObj);
      this.portsController.assignedPorts.set(commonPort, portObj);
    }
  }

  async down(queryRunner: QueryRunner): Promise<any> {
    const db = await queryRunner.manager.getRepository(NotAssignablePort);
    for (const commonPort of this.commonPortsFrom3000to6000) {
      const portObj = await db.findOne({
        where: {
          port: commonPort,
        },
      });
      if (portObj) {
        await db.remove(portObj);
        this.portsController.assignedPorts.delete(commonPort);
      }
    }
  }
}
