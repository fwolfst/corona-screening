export interface Student {
  firstname: string;
  lastname: string;
  email: string;
  verified: boolean;
  subjects: string;
  phone: string;
  birthday: Date;
  msg: string;
  feedback?: string;
}

export interface IRawStudent {
  firstName: string;
  lastName: string;
  email: string;
  subjects: string;
  msg?: string;
  verified: boolean;
  alreadyScreened: boolean;
  phone?: string;
  birthday?: Date;
}
