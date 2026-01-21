import mongoose, { Schema, Document } from 'mongoose';

interface IUsuario extends Document {
  nombreUsuario: string;
  razonSocial: string;
  domicilio: string;
  telefono: string;
  mail: string;
  contrasena: string;
  rolId: mongoose.Types.ObjectId;
  sucursalId: mongoose.Types.ObjectId;
  codigoRecuperacion?: string;
  codigoExpira?: Date;
  isActive: boolean;
  passwordChangedAt?: Date;
  lastLogin?: Date;
  deletedAt?: Date;
}

const usuarioSchema = new Schema<IUsuario>(
  {
    nombreUsuario: { type: String, required: true, unique: true },
    razonSocial: { type: String, required: true, unique: true },
    domicilio: { type: String, required: true },
    telefono: { type: String, required: true, unique: true },
    mail: { type: String, required: true, unique: true },
    contrasena: { type: String, required: true },
    rolId: { type: Schema.Types.ObjectId, required: true, ref: 'Rol' },
    sucursalId: { type: Schema.Types.ObjectId, required: true, ref: 'Sucursal' },
    codigoRecuperacion: { type: String, default: null },
    codigoExpira: { type: Date, default: null },
    isActive: { type: Boolean, default: true },
    passwordChangedAt: { type: Date, default: null },
    lastLogin: { type: Date, default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

const Usuario = mongoose.model<IUsuario>('Usuario', usuarioSchema);

export { Usuario, IUsuario };
