export interface AddNote {
  id?: string;
  uid:string;
  date:string;
  note:string;
  createdAt:string;
  updatedAt:string;
}

export interface ProcessedNote extends AddNote {
  localDate:Date;
}