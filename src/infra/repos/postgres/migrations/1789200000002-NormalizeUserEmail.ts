import { MigrationInterface, QueryRunner } from "typeorm";

// Emails trimmed and lowercase, enforced by a CHECK. Fails on emails differing only by case or spaces
export class NormalizeUserEmail1789200000002 implements MigrationInterface {
    name = 'NormalizeUserEmail1789200000002'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`UPDATE "users" SET "email" = lower(trim("email")) WHERE "email" <> lower(trim("email"))`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "CHK_users_email_lowercase" CHECK ("email" = lower("email"))`);
    }

    // Only drops the constraint; the original casing is lost
    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "CHK_users_email_lowercase"`);
    }

}
