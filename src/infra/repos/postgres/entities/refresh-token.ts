import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn } from 'typeorm'

@Entity({ name: 'refresh_tokens' })
export class PgRefreshToken {
  @PrimaryGeneratedColumn()
  id!: number

  @Column({ name: 'user_id' })
  userId!: number

  @Index({ unique: true })
  @Column({ name: 'token_hash' })
  tokenHash!: string

  @Index('IDX_refresh_tokens_family_id')
  @Column({ name: 'family_id' })
  familyId!: string

  @Column({ name: 'expires_at' })
  expiresAt!: Date

  @Column({ name: 'revoked_at', nullable: true })
  revokedAt?: Date

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date
}
