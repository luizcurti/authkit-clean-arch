import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn } from 'typeorm'

// Transactional outbox (ADR-0016)
@Entity({ name: 'outbox_events' })
export class PgOutboxEvent {
  @PrimaryGeneratedColumn()
  id!: number

  @Column({ name: 'type', type: 'varchar' })
  type!: string

  @Column({ name: 'payload', type: 'jsonb' })
  payload!: Record<string, unknown>

  // Incremented on each claim, so a crashing worker still counts towards maxAttempts
  @Column({ name: 'attempts', type: 'int', default: 0 })
  attempts!: number

  // While in the future, the event is leased to a worker
  @Column({ name: 'locked_until', type: 'timestamptz', nullable: true })
  lockedUntil?: Date | null

  @Column({ name: 'last_error', type: 'varchar', nullable: true })
  lastError?: string | null

  @Index('IDX_outbox_events_processed_at')
  @Column({ name: 'processed_at', type: 'timestamptz', nullable: true })
  processedAt?: Date | null

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date
}
