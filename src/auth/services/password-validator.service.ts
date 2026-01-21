export class PasswordValidatorService {
  validate(password: string): void {
    // Al menos 8 caracteres
    if (password.length < 8) {
      throw new Error('La contraseña debe tener al menos 8 caracteres');
    }

    // Al menos una mayúscula
    if (!/[A-Z]/.test(password)) {
      throw new Error('La contraseña debe tener al menos una mayúscula');
    }

    // Al menos una minúscula
    if (!/[a-z]/.test(password)) {
      throw new Error('La contraseña debe tener al menos una minúscula');
    }

    // Al menos un número
    if (!/[0-9]/.test(password)) {
      throw new Error('La contraseña debe tener al menos un número');
    }

    // Al menos un carácter especial
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      throw new Error('La contraseña debe tener al menos un carácter especial (!@#$%^&*)');
    }
  }
}
