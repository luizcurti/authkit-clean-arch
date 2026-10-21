import { MigrationInterface, QueryRunner } from "typeorm";

// Picture URL column becomes the storage key, taken from the URL's last path segment
export class StorePictureKey1789200000001 implements MigrationInterface {
    name = 'StorePictureKey1789200000001'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" RENAME COLUMN "picture_url" TO "picture_key"`);
        await queryRunner.query(`UPDATE "users" SET "picture_key" = regexp_replace("picture_key", '^.*/', '') WHERE "picture_key" LIKE 'http%'`);
    }

    // Lossy: only the column name is restored; the values stay keys
    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" RENAME COLUMN "picture_key" TO "picture_url"`);
    }

}
