// @ts-nocheck
import { Taon } from 'taon/src';
import { QueryRunner } from 'taon-typeorm/src';

@Taon.Migration({
  className: 'MainContext_1736198527297_init',
})
export class MainContext_1736198527297_init extends Taon.Base.Migration {
  /**
   * remove this method if you are ready to run this migration
   */
  public isReadyToRun(): boolean {
    return false;
  }

  async up(queryRunner: QueryRunner): Promise<any> {
    // do "something" in db
  }

  async down(queryRunner: QueryRunner): Promise<any> {
    // revert this "something" in db
  }
}

@Taon.Migration({
  className: 'PortsContext_1736198527297_init',
})
export class PortsContext_1736198527297_init extends Taon.Base.Migration {
  /**
   * remove this method if you are ready to run this migration
   */
  public isReadyToRun(): boolean {
    return true;
  }

  async up(queryRunner: QueryRunner): Promise<any> {
    // do "something" in db
    // console.log('Hello from migration UP!')
  }

  async down(queryRunner: QueryRunner): Promise<any> {
    // revert this "something" in db
    // console.log('Hello from migration DOWN!')
  }
}
