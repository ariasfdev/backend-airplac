import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Rol } from '../models/rolModel';

dotenv.config();

const DEFAULT_ROLES = ['Superadmin', 'Admin', 'Vendedor'];

const initializeRoles = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || '');
    console.log('📡 Conectado a MongoDB');

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

    console.log('\n✓ Inicialización de roles completada');
    process.exit(0);
  } catch (error) {
    console.error('✗ Error:', error);
    process.exit(1);
  }
};

initializeRoles();
