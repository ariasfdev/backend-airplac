import mongoose, { Schema, Document, ObjectId } from "mongoose";

export interface IMovimientoStock extends Document {
    // Identificadores
    idStock: ObjectId;           // Referencia al stock afectado
    idModelo: ObjectId;          // Referencia al modelo
    idPedido?: ObjectId;         // Referencia al pedido (opcional para movimientos de producción)

    // Información del producto
    producto: string;            // Nombre del producto
    modelo: string;              // Nombre del modelo

    // Información del movimiento
    tipo_movimiento: string;     // "produccion", "reserva", "liberacion", "entrega", "eliminacion"
    cantidad: number;            // Cantidad afectada (positiva o negativa)
    stock_anterior: number;      // Stock antes del movimiento
    stock_posterior: number;     // Stock después del movimiento
    reservado_anterior: number;  // Reservado antes del movimiento
    reservado_posterior: number; // Reservado después del movimiento
    pendiente_anterior: number;  // Pendiente antes del movimiento
    pendiente_posterior: number; // Pendiente después del movimiento

    // Información del pedido (si aplica)
    remito?: string;             // Número de remito
    cliente_nombre?: string;     // Nombre del cliente
    vendedor_id?: ObjectId;      // ID del vendedor

    // Información del responsable
    responsable: string;         // Quien realizó el movimiento
    motivo?: string;             // Motivo del movimiento

    // Metadatos
    fecha: Date;                // Fecha del movimiento
    ip?: string;                // IP desde donde se realizó
    user_agent?: string;        // User agent del navegador

    // Campos adicionales para trazabilidad
    estado_pedido?: string;     // Estado del pedido en el momento del movimiento
    precio_unitario?: number;   // Precio por unidad (si aplica)
    total_movimiento?: number;  // Total del movimiento (cantidad * precio)
}

const MovimientoStockSchema: Schema = new Schema({
    // Identificadores
    idStock: {
        type: Schema.Types.ObjectId,
        ref: "Stock",
        required: true,
        index: true
    },
    idModelo: {
        type: Schema.Types.ObjectId,
        ref: "Modelos",
        required: true,
        index: true
    },
    idPedido: {
        type: Schema.Types.ObjectId,
        ref: "Pedidos",
        index: true
    },

    // Información del producto
    producto: {
        type: String,
        required: true,
        index: true
    },
    modelo: {
        type: String,
        required: true,
        index: true
    },

    // Información del movimiento
    tipo_movimiento: {
        type: String,
        required: true,
        enum: ["produccion", "reserva", "liberacion", "entrega", "eliminacion", "ajuste"],
        index: true
    },
    cantidad: {
        type: Number,
        required: true
    },
    stock_anterior: {
        type: Number,
        required: true
    },
    stock_posterior: {
        type: Number,
        required: true
    },
    reservado_anterior: {
        type: Number,
        required: true
    },
    reservado_posterior: {
        type: Number,
        required: true
    },
    pendiente_anterior: {
        type: Number,
        required: true
    },
    pendiente_posterior: {
        type: Number,
        required: true
    },

    // Información del pedido
    remito: {
        type: String,
        index: true
    },
    cliente_nombre: {
        type: String,
        index: true
    },
    vendedor_id: {
        type: Schema.Types.ObjectId,
        ref: "Vendedores",
        index: true
    },

    // Información del responsable
    responsable: {
        type: String,
        required: true,
        default: "Sistema"
    },
    motivo: {
        type: String
    },

    // Metadatos
    fecha: {
        type: Date,
        default: Date.now,
        index: true
    },
    ip: {
        type: String
    },
    user_agent: {
        type: String
    },

    // Campos adicionales
    estado_pedido: {
        type: String,
        index: true
    },
    precio_unitario: {
        type: Number
    },
    total_movimiento: {
        type: Number
    }
}, {
    timestamps: true, // Agrega createdAt y updatedAt automáticamente
    versionKey: false
});

// Índices compuestos para consultas eficientes
MovimientoStockSchema.index({ idStock: 1, fecha: -1 });
MovimientoStockSchema.index({ idModelo: 1, fecha: -1 });
MovimientoStockSchema.index({ idPedido: 1, fecha: -1 });
MovimientoStockSchema.index({ remito: 1, fecha: -1 });
MovimientoStockSchema.index({ cliente_nombre: 1, fecha: -1 });
MovimientoStockSchema.index({ tipo_movimiento: 1, fecha: -1 });
MovimientoStockSchema.index({ producto: 1, modelo: 1, fecha: -1 });

// Índice de texto para búsquedas
MovimientoStockSchema.index({
    producto: 'text',
    modelo: 'text',
    cliente_nombre: 'text',
    remito: 'text'
});

export default mongoose.model<IMovimientoStock>("MovimientoStock", MovimientoStockSchema, "MovimientosStock");
