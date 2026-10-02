import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRefreshTokenFamily1789168585000 implements MigrationInterface {
    name = 'AddRefreshTokenFamily1789168585000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "refresh_tokens" ADD "family_id" character varying`);
        await queryRunner.query(`UPDATE "refresh_tokens" SET "family_id" = "id"::text WHERE "family_id" IS NULL`);
        await queryRunner.query(`ALTER TABLE "refresh_tokens" ALTER COLUMN "family_id" SET NOT NULL`);
        await queryRunner.query(`CREATE INDEX "IDX_refresh_tokens_family_id" ON "refresh_tokens" ("family_id")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_refresh_tokens_family_id"`);
        await queryRunner.query(`ALTER TABLE "refresh_tokens" DROP COLUMN "family_id"`);
    }

}
