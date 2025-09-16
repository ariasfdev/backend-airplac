import mongoose, { Schema, Document } from 'mongoose';

export interface IVendedor extends Document {
  nombre: string;
  usuario: string;
  rango: string;
  pedidos_realizados: string[]; // Array de IDs de pedidos
}

const VendedorSchema: Schema = new Schema({
  nombre: { type: String, required: true },
  usuario: { type: String, required: true },
  email: { type: String },
  rango: { type: String, required: true },
  pedidos_realizados: { type: [String], default: [] },
});

// Forzar el uso de la colección "Vendedores"
export default mongoose.model<IVendedor>('Vendedor', VendedorSchema, 'Vendedores');
