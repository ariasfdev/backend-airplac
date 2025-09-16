import mongoose, { Schema, Document } from 'mongoose';

export interface IPrueba extends Document {
  prueba: string;
}

const PruebaSchema: Schema = new Schema({
  prueba: { type: String, required: true },
});

export default mongoose.model<IPrueba>('Prueba', PruebaSchema);