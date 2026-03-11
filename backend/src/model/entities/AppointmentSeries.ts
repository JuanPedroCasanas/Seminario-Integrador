import { Collection, Entity, OneToMany, PrimaryKey, Property } from "@mikro-orm/core";
import { Appointment } from "./Appointment";

@Entity()
export class AppointmentSeries {

  @PrimaryKey()
  id!: number;

  @Property()
  validMonth!: number;

  @Property()
  validYear!: number;

  @OneToMany(() => Appointment, a => a.series)
  appointments = new Collection<Appointment>(this);

}