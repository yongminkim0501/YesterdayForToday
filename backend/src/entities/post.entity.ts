import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum Company {
  META = 'META',
  NETFLIX = 'NETFLIX',
  AMAZON = 'AMAZON',
}

export enum PostStatus {
  DRAFT = 'DRAFT',
  SUMMARIZED = 'SUMMARIZED',
  PUBLISHED = 'PUBLISHED',
}

@Entity('posts')
export class Post {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column({ type: 'varchar' })
  company: Company;

  @Column()
  sourceUrl: string;

  @Column({ type: 'text' })
  problem: string;

  @Column({ type: 'text' })
  summary: string;

  @Column({ type: 'varchar', default: PostStatus.DRAFT })
  status: PostStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
