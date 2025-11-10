import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm'

@Entity({ name: 'users' })
export class PgUser {
  @PrimaryGeneratedColumn()
  id!: number

  @Column({ name: 'name', nullable: true })
  name?: string

  @Column()
  email!: string

  @Column({ name: 'facebook_id', nullable: true })
  facebookId?: string

  @Column({ name: 'picture_url', nullable: true })
  pictureUrl?: string

  @Column({ name: 'initials', nullable: true })
  initials?: string

  toPlain () {
    return {
      id: this.id,
      name: this.name,
      email: this.email,
      facebookId: this.facebookId,
      pictureUrl: this.pictureUrl,
      initials: this.initials
    }
  }
}
