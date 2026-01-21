import mongoose from 'mongoose';
import Pedido from '../models/pedidosModel';
import { Usuario } from '../models/usuarioModel';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Script de migración para asociar usuarioId a pedidos existentes.
 * Solo actualiza pedidos que NO tienen usuarioId.
 * Usa DEFAULT_PEDIDOS_USUARIO_ID de .env
 * 
 * @param shouldDisconnect - Si es true, desconecta MongoDB al finalizar (para uso standalone)
 */
async function migratePedidosUsuarios(shouldDisconnect = false) {
  try {
    // Solo conectar si no estamos ya conectados (para uso standalone)
    if (mongoose.connection.readyState === 0) {
      const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/airplac';
      await mongoose.connect(mongoUri);
      console.log('✅ Conectado a MongoDB');
    }

    // Obtener el DEFAULT_PEDIDOS_USUARIO_ID del .env
    const defaultUsuarioId = process.env.DEFAULT_PEDIDOS_USUARIO_ID;
    if (!defaultUsuarioId) {
      console.warn('⚠️ DEFAULT_PEDIDOS_USUARIO_ID no está definido en .env');
      if (shouldDisconnect) await mongoose.disconnect();
      return;
    }

    // Validar que el usuario existe
    const usuarioExiste = await Usuario.findById(defaultUsuarioId);
    if (!usuarioExiste) {
      console.error(`❌ Usuario con ID ${defaultUsuarioId} no existe en la base de datos`);
      await mongoose.disconnect();
      process.exit(1);
    }

    console.log(`📋 Usuario encontrado: ${usuarioExiste.nombreUsuario} (${usuarioExiste.mail})`);

    // Migrar pedidos sin usuarioId
    const result = await Pedido.updateMany(
      { usuarioId: { $exists: false } },
      { $set: { usuarioId: new mongoose.Types.ObjectId(defaultUsuarioId) } }
    );

    console.log(`✅ Migración completada:`);
    console.log(`   - ${result.matchedCount} pedidos encontrados sin usuarioId`);
    console.log(`   - ${result.modifiedCount} pedidos actualizados`);

    // Solo desconectar si se solicita explícitamente (uso standalone)
    if (shouldDisconnect) {
      await mongoose.disconnect();
      console.log('✅ Desconectado de MongoDB');
    }
  } catch (error) {
    console.error('❌ Error en migración:', error);
    if (shouldDisconnect) {
      process.exit(1);
    } else {
      throw error; // Re-lanzar para que el servidor lo maneje
    }
  }
}

// Ejecutar si se llama directamente como script standalone
if (require.main === module) {
  migratePedidosUsuarios(true); // Con desconexión
}

export { migratePedidosUsuarios };
