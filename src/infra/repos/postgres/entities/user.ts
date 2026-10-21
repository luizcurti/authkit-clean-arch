import { Entity, PrimaryGeneratedColumn, Column, Index, Check } from 'typeorm'

// Emails are stored lowercase, so UNIQUE(email) is case-insensitive on a plain index
@Entity({ name: 'users' })
@Check('CHK_users_email_lowercase', '"email" = lower("email")')
export class PgUser {
  @PrimaryGeneratedColumn()
  id!: number

  @Column({ name: 'name', type: 'varchar', nullable: true })
  name?: string | null

  @Index('UQ_users_email', { unique: true })
  @Column()
  email!: string

  @Index('UQ_users_facebook_id', { unique: true })
  @Column({ name: 'facebook_id', type: 'varchar', nullable: true })
  facebookId?: string | null

  // Storage key, not a URL: the file storage resolves the URL per request
  @Column({ name: 'picture_key', type: 'varchar', nullable: true })
  pictureKey?: string | null

  @Column({ name: 'initials', type: 'varchar', nullable: true })
  initials?: string | null
}
