import mongoose, { Schema, Document } from "mongoose";

export interface IProduccion extends Document {
  idStock: mongoose.Types.ObjectId;
  fecha: Date;
  cantidad: number;
  responsable: string;
}

const ProduccionSchema: Schema = new Schema({
  idStock: { type: mongoose.Types.ObjectId, ref: "Stock", required: true },
  fecha: { type: Date, required: true },
  cantidad: { type: Number, required: true },
  responsable: { type: String, required: true },
});

export default mongoose.model<IProduccion>(
  "Produccion",
  ProduccionSchema,
  "Produccion"
);
