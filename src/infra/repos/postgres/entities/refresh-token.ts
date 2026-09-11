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

  @Column({ name: 'expires_at' })
  expiresAt!: Date

  @Column({ name: 'revoked_at', nullable: true })
  revokedAt?: Date

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date
}
