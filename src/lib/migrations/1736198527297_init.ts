import { Taon, TaonMigration, TaonBaseMigration } from 'taon/src';
import { QueryRunner } from 'taon-typeorm/src';

@TaonMigration({
  className: 'MainContext_1736198527297_init',
})
export class MainContext_1736198527297_init extends TaonBaseMigration {
  /**
   * remove this method if you are ready to run this migration
   */
  public isReadyToRun(): boolean {
    return false;
  }

  // @ts-ignore
  async up(queryRunner: QueryRunner): Promise<any> {
    // do "something" in db
  }

  // @ts-ignore
  async down(queryRunner: QueryRunner): Promise<any> {
    // revert this "something" in db
  }
}

@TaonMigration({
  className: 'TaonPortsContext_1736198527297_init',
})
export class TaonPortsContext_1736198527297_init extends TaonBaseMigration {
  /**
   * remove this method if you are ready to run this migration
   */
  public isReadyToRun(): boolean {
    return true;
  }

  // @ts-ignore
  async up(queryRunner: QueryRunner): Promise<any> {
    // do "something" in db
    // console.log('Hello from migration UP!')
  }

  // @ts-ignore
  async down(queryRunner: QueryRunner): Promise<any> {
    // revert this "something" in db
    // console.log('Hello from migration DOWN!')
  }
}
