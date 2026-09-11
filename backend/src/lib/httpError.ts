export class HttpError extends Error {
  statusCode: number

  constructor(statusCode: number, message: string) {
    super(message)
    this.name = 'HttpError'
    this.statusCode = statusCode
  }
}

export function badRequest(message: string): HttpError {
  return new HttpError(400, message)
}

export function notFound(message: string): HttpError {
  return new HttpError(404, message)
}
