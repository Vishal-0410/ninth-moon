export interface Authenticated {
  uid: string;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: Authenticated;
      file?: Express.Multer.File;
    }
  }
}
