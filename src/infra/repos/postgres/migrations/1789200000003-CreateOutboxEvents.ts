import { MigrationInterface, QueryRunner } from "typeorm";

// Transactional outbox (ADR-0016)
export class CreateOutboxEvents1789200000003 implements MigrationInterface {
    name = 'CreateOutboxEvents1789200000003'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "outbox_events" ("id" SERIAL NOT NULL, "type" character varying NOT NULL, "payload" jsonb NOT NULL, "attempts" integer NOT NULL DEFAULT 0, "locked_until" TIMESTAMP WITH TIME ZONE, "last_error" character varying, "processed_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_outbox_events" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_outbox_events_processed_at" ON "outbox_events" ("processed_at") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_outbox_events_processed_at"`);
        await queryRunner.query(`DROP TABLE "outbox_events"`);
    }

}
