import mongoose, { Schema, Document } from "mongoose";

export interface IModelo extends Document {
  producto: string;
  modelo: string;
  ancho: string;
  alto: string;
  tipo: string;
  fecha_creacion: Date;
  fecha_baja?: Date;
  placas_por_metro: number; // <-- Nueva propiedad
}

const ModeloSchema: Schema = new Schema({
  producto: { type: String, required: true },
  modelo: { type: String, required: true },
  ancho: { type: String, required: true },
  alto: { type: String, required: true },
  tipo: { type: String, required: true },
  fecha_creacion: { type: Date, default: Date.now },
  fecha_baja: { type: Date },
  placas_por_metro: { type: Number, required: true }, // <-- Campo obligatorio
});

export default mongoose.model<IModelo>("Modelos", ModeloSchema, "Modelos");
