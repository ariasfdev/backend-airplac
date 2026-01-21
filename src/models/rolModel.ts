import mongoose, { Schema, Document } from 'mongoose';

interface IRol extends Document {
  nombre: string;
  observacion?: string;
  usuarioCreatedId?: string;
  usuarioDeletedId?: string;
  usuarioUpdatedId?: string;
  deletedAt?: Date;
}

const rolSchema = new Schema<IRol>(
  {
    nombre: { type: String, required: true, unique: true },
    observacion: { type: String, default: null },
    usuarioCreatedId: { type: String, default: null },
    usuarioDeletedId: { type: String, default: null },
    usuarioUpdatedId: { type: String, default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

const Rol = mongoose.model<IRol>('Rol', rolSchema);

export { Rol, IRol };
