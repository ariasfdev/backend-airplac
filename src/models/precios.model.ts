import mongoose, { Schema, Document } from "mongoose";

export interface IPrecio extends Document {
    id_modelo: mongoose.Types.ObjectId;
    nombre_precio: string;          // "Precio normal", "Promo X"
    es_base: boolean;               // true = obligatorio
    activo: boolean;                // permitir desactivar
    costo: number;                  // o Decimal128 si querés máxima precisión
    porcentaje_ganancia: number;    // ej: 100
    porcentaje_tarjeta: number;     // ej: 15
    total_redondeo: number;         // ej: 0..n
    fecha: Date;                    // alta del registro
    precio: number;
    precioTarjeta: number;                 // calculado
}

const precioSchema = new Schema<IPrecio>({
    id_modelo: { type: Schema.Types.ObjectId, ref: "Modelos", required: true, index: true },
    nombre_precio: { type: String, required: true, trim: true },
    es_base: { type: Boolean, default: false },
    activo: { type: Boolean, default: true },
    costo: { type: Number, required: true, min: 0 },
    porcentaje_ganancia: { type: Number, required: true, min: 0 },
    porcentaje_tarjeta: { type: Number, required: true, min: 0 },
    total_redondeo: { type: Number, required: true, min: 0, default: 0 },
    fecha: { type: Date, default: Date.now },
    precio: { type: Number, required: true, min: 0 },
    precioTarjeta: { type: Number, required: true, min: 0 },
}, { versionKey: false });

// Calcular precio de forma consistente antes de guardar
precioSchema.pre("validate", function (next) {
    const base = this.costo * (1 + this.porcentaje_ganancia / 100) + (this.total_redondeo ?? 0);
    const conTarjeta = base * (1 + this.porcentaje_tarjeta / 100);
    this.precio = Number(base.toFixed(2));
    this.precioTarjeta = Number(conTarjeta.toFixed(2));
    next();
});

// Calcular precio también antes de actualizar
precioSchema.pre("findOneAndUpdate", function (next) {
    const update = this.getUpdate() as any;
    if (update && (update.costo !== undefined || update.porcentaje_ganancia !== undefined ||
        update.porcentaje_tarjeta !== undefined || update.total_redondeo !== undefined)) {

        // Obtener los valores actuales o los nuevos
        const costo = update.costo;
        const porcentaje_ganancia = update.porcentaje_ganancia;
        const porcentaje_tarjeta = update.porcentaje_tarjeta;
        const total_redondeo = update.total_redondeo ?? 0;

        // Calcular nuevos precios
        const base = costo * (1 + porcentaje_ganancia / 100) + total_redondeo;
        const conTarjeta = base * (1 + porcentaje_tarjeta / 100);

        // Actualizar los campos calculados
        update.precio = Number(base.toFixed(2));
        update.precioTarjeta = Number(conTarjeta.toFixed(2));
    }
    next();
});

// Máximo 1 precio base ACTIVO por modelo
precioSchema.index(
    { id_modelo: 1, es_base: 1, activo: 1 },
    { unique: true, partialFilterExpression: { es_base: true, activo: true } }
);


export default mongoose.model<IPrecio>("Precios", precioSchema, "Precios");
