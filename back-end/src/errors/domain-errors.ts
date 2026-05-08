export class AuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AuthError'
  }
}

export class UserPasswordError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'UserPasswordError'
  }
}

export class CreateUserError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CreateUserError'
  }
}
