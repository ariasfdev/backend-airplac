import dotenv from 'dotenv';
import path from 'path';

// Cargar .env ANTES de importar cualquier módulo que use process.env
// Especificar ruta explícita para que funcione desde dist/ en producción
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import app from './app';
import connectDB from './config/database';
import { SuperadminInitService } from './auth/services/superadmin-init.service';

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    // Conectar a MongoDB
    await connectDB();

    // Inicializar superadmin
    await SuperadminInitService.initialize();

    // Iniciar servidor
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT} VERSION NUEVA`);
    });
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
};

startServer();


