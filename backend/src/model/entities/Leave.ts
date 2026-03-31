import { Entity, ManyToOne, PrimaryKey, Property } from '@mikro-orm/core';
import { Professional } from './Professional';

@Entity()
export class Leave {
  @PrimaryKey()
  id!: number;

  @Property()
  isActive: boolean;

  @Property({ columnType: 'date' })
  startDate!: Date;

  @Property({ columnType: 'date' })
  endDate!: Date;

  @ManyToOne(() => Professional)
  professional: Professional;

  constructor(startDate: Date, endDate: Date, professional: Professional) {
    this.isActive = true;
    this.startDate = startDate;
    this.endDate = endDate;
    this.professional = professional;
  }

}