import mongoose from 'mongoose';

interface AuditLogEntry {
  usuarioId?: string;
  accion: string;
  descripcion: string;
  detalles?: any;
  timestamp: Date;
  ip?: string;
  userAgent?: string;
}

const auditLogSchema = new mongoose.Schema<AuditLogEntry>({
  usuarioId: { type: String, default: null },
  accion: { type: String, required: true },
  descripcion: { type: String, required: true },
  detalles: { type: mongoose.Schema.Types.Mixed, default: null },
  timestamp: { type: Date, default: Date.now },
  ip: { type: String, default: null },
  userAgent: { type: String, default: null },
});

const AuditLog = mongoose.model<AuditLogEntry>('AuditLog', auditLogSchema);

export class AuditService {
  async registrar(
    log: Omit<AuditLogEntry, 'timestamp' | 'ip' | 'userAgent'>,
    headers: any
  ): Promise<void> {
    try {
      const ip = headers['x-forwarded-for']?.split(',')[0] || headers['x-real-ip'] || '127.0.0.1';
      const userAgent = headers['user-agent'] || 'Unknown';

      await AuditLog.create({
        ...log,
        timestamp: new Date(),
        ip,
        userAgent,
      });
    } catch (error) {
      console.error('Error registrando auditoría:', error);
    }
  }

  async obtenerLogs(usuarioId?: string, limite: number = 100): Promise<AuditLogEntry[]> {
    const query = usuarioId ? { usuarioId } : {};
    return AuditLog.find(query).sort({ timestamp: -1 }).limit(limite).exec();
  }
}
