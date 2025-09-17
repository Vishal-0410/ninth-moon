interface MetaData {
  [key: string]: any;
}

class ApiResponse<T> {
  public statusCode: number;
  public data: T;
  public message: string;
  public success: boolean;
  public meta: MetaData;

  constructor(
    statusCode: number,
    data: T,
    message = 'Success',
    meta: MetaData = {}
  ) {
    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
    this.success = statusCode < 400;
    this.meta = meta;
  }
}

export { ApiResponse };
