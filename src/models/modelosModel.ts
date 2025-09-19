// models/modelosModel.ts

// models/modelosModel.ts
import mongoose, { Schema, Document } from "mongoose";

export interface IModelo extends Document {
  producto: string;
  modelo: string;
  ancho: string;
  alto: string;
  tipo: string;
  fecha_creacion: Date;
  fecha_baja?: Date;
  placas_por_metro: number;
}

const ModeloSchema: Schema = new Schema({
  producto: { type: String, required: true, trim: true, uppercase: true },
  modelo:   { type: String, required: true, trim: true, uppercase: true },
  ancho:    { type: String, required: true, trim: true },
  alto:     { type: String, required: true, trim: true },
  tipo:     { type: String, required: true, trim: true },
  fecha_creacion: { type: Date, default: Date.now },
  fecha_baja: { type: Date },
  placas_por_metro: { type: Number, required: true },

});

// Unicidad por (producto, modelo)
ModeloSchema.index({ producto: 1, modelo: 1 }, { unique: true });

export default mongoose.model<IModelo>("Modelos", ModeloSchema, "Modelos");


  