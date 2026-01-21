import * as bcrypt from 'bcrypt';
import { Usuario } from '../../models/usuarioModel';
import { Rol } from '../../models/rolModel';

export class SuperadminInitService {
  /**
   * Inicializa un usuario superadmin desde variables de entorno
   * Solo ejecuta si no existe un superadmin ya
   */
  static async initialize(): Promise<void> {
    const superadminEmail = process.env.SUPERADMIN_EMAIL;
    const superadminUsername = process.env.SUPERADMIN_USERNAME;
    const superadminPassword = process.env.SUPERADMIN_PASSWORD;
    const sucursalId = process.env.DEFAULT_SUCURSAL_ID;

    // Si no están definidas las variables, omitir inicialización
    if (!superadminEmail || !superadminUsername || !superadminPassword || !sucursalId) {
      console.warn(
        '⚠️  Superadmin initialization skipped: Missing environment variables. ' +
        'Set SUPERADMIN_EMAIL, SUPERADMIN_USERNAME, SUPERADMIN_PASSWORD, DEFAULT_SUCURSAL_ID'
      );
      return;
    }

    try {
      // Verificar si ya existe un superadmin
      const existingSuperadmin = await Usuario.findOne({ mail: superadminEmail });
      if (existingSuperadmin) {
        console.log('✓ Superadmin already exists');
        return;
      }

      // Obtener rol de Superadmin
      const superadminRol = await Rol.findOne({ nombre: 'Superadmin' });
      if (!superadminRol) {
        console.error('✗ Superadmin role not found. Please create it first.');
        return;
      }

      // Hash la contraseña
      const hashedPassword = await bcrypt.hash(superadminPassword, 10);

      // Crear usuario superadmin
      const superadmin = await Usuario.create({
        mail: superadminEmail,
        nombreUsuario: superadminUsername,
        contrasena: hashedPassword,
        rolId: superadminRol._id,
        sucursalId: sucursalId,
        razonSocial: 'Superadministrador',
        telefono: '0000000000',
        domicilio: 'Sistema',
        isActive: true,
        passwordChangedAt: new Date(),
        lastLogin: null,
      });

      console.log(`✓ Superadmin initialized successfully: ${superadminEmail}`);
    } catch (error: any) {
      console.error(`✗ Error initializing superadmin: ${error.message}`);
      throw error;
    }
  }
}
