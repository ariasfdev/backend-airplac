import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Rol } from '../models/rolModel';

dotenv.config();

const DEFAULT_ROLES = ['Superadmin', 'Admin', 'Vendedor'];

/**
 * Inicializa los roles por defecto en la base de datos.
 * Solo crea roles que no existen (idempotente).
 * 
 * @param shouldDisconnect - Si es true, desconecta MongoDB al finalizar (para uso standalone)
 */
export const initializeRoles = async (shouldDisconnect = false) => {
  try {
    // Solo conectar si no estamos ya conectados (para uso standalone)
    if (mongoose.connection.readyState === 0) {
      const mongoUri = process.env.MONGO_URI || '';
      await mongoose.connect(mongoUri);
      console.log('📡 Conectado a MongoDB');
    }

    console.log('🔄 Verificando roles por defecto...');

    for (const roleName of DEFAULT_ROLES) {
      const exists = await Rol.findOne({ nombre: roleName });
      if (!exists) {
        await Rol.create({
          nombre: roleName,
          observacion: `Rol de ${roleName}`,
        });
        console.log(`✓ Rol "${roleName}" creado`);
      } else {
        console.log(`✓ Rol "${roleName}" ya existe`);
      }
    }

    console.log('✓ Inicialización de roles completada');

    // Solo desconectar si se solicita explícitamente (uso standalone)
    if (shouldDisconnect) {
      await mongoose.disconnect();
      console.log('✅ Desconectado de MongoDB');
      process.exit(0);
    }
  } catch (error) {
    console.error('✗ Error al inicializar roles:', error);
    if (shouldDisconnect) {
      process.exit(1);
    } else {
      throw error; // Re-lanzar para que el servidor lo maneje
    }
  }
};

// Ejecutar si se llama directamente como script standalone
if (require.main === module) {
  initializeRoles(true); // Con desconexión
}
