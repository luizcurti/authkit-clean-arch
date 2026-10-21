import { MigrationInterface, QueryRunner } from "typeorm";

// One account per email and per Facebook identity. Fails on existing duplicates
export class AddUniqueUserIdentity1789200000000 implements MigrationInterface {
    name = 'AddUniqueUserIdentity1789200000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_users_email" ON "users" ("email") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_users_facebook_id" ON "users" ("facebook_id") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."UQ_users_facebook_id"`);
        await queryRunner.query(`DROP INDEX "public"."UQ_users_email"`);
    }

}
