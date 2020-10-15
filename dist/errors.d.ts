export declare class InvalidXapiFormatError extends Error {
  status: number;
  constructor(message?: string, status?: number);
}
export declare class XapiObjectNotFound extends Error {
  status: number;
  constructor(message?: string, status?: number);
}
export declare class XapiWrongUser extends Error {
  status: number;
  constructor(message?: string, status?: number);
}
