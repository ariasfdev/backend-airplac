import mongoose, { Schema, Document, ObjectId } from "mongoose";

export interface IPedido extends Document {
  remito: string;
  vendedor_id: ObjectId;
  cliente: {
    nombre: string;
    direccion: string;
    contacto: string;
  };
  comentario_cliente: string;
  productos: {
    idStock: ObjectId; // Relación con la tabla Stock
    idModelo: ObjectId; // Relación con la tabla Modelos
    cantidad: number;
    comentario_producto: string;
    unidad: string;
    materiales_sueltos: number;
    materiales: string; // Nueva propiedad, específica para cada producto
    estado_stock: string;
    id_precio: ObjectId;
  }[];
  estado: string;
  fecha_pedido: Date;
  fecha_entrega_estimada: Date;
  demora_calculada: number;
  metodo_pago: string;
  procedencia: string;
  flete: number;
  descuento: number;
  adelanto: number;
  adicional: number;
  total: number;
  total_pendiente: number;
  valor_instalacion: number;
  tipo: string; // "pedido" o "presupuesto"
}

const PedidoSchema: Schema = new Schema({
  remito: { type: String },
  vendedor_id: {
    type: Schema.Types.ObjectId,
    ref: "Vendedores",
    required: true,
  },
  cliente: {
    nombre: { type: String },
    direccion: { type: String },
    contacto: { type: String },
  },
  comentario_cliente: { type: String },
  productos: [
    {
      idStock: { type: Schema.Types.ObjectId, ref: "Stock", required: true },
      idModelo: { type: Schema.Types.ObjectId, ref: "Modelos", required: true },
      cantidad: { type: Number, required: true },
      unidad: { type: String },
      estado_stock: { type: String },
      comentario_producto: { type: String },
      materiales_sueltos: { type: Number },
      materiales: { type: String },
      id_precio: { type: Schema.Types.ObjectId, ref: "Precios", required: true },
    },
  ],
  estado: {
    type: String,
    required: true,
    enum: [
      "pendiente",
      "entregado",
      "instalacion",
      "disponible",
      "retira",
      "enviar",
      "remitado",
    ], // Estados permitidos
  },
  fecha_pedido: { type: Date, required: true },
  fecha_entrega_estimada: { type: Date, required: true },
  demora_calculada: { type: Number, required: true },
  metodo_pago: {
    type: String,
    required: true,
    enum: ["efectivo", "transferencia", "debito", "credito"], // Métodos de pago permitidos
  },
  procedencia: {
    type: String,
    required: true,
    enum: [
      "tiktok",
      "facebook",
      "instagram",
      "recomendado",
      "local",
      "anuncio",
    ], // Procedencias permitidas
  },
  flete: { type: Number },
  descuento: { type: Number },
  adelanto: { type: Number },
  adicional: { type: Number, default: 0 }, // Nueva propiedad para costos adicionales
  valor_instalacion: { type: Number, default: 0 },
  total: { type: Number, required: true },
  total_pendiente: { type: Number },
  remitos: [
    {
      url: { type: String },
      fecha: { type: Date, default: Date.now },
    },
  ],
  tipo: { type: String, enum: ["pedido", "presupuesto"], default: "pedido" }, // Nuevo campo
});

// Forzar el uso de la colección "Pedidos"
export default mongoose.model<IPedido>("Pedido", PedidoSchema, "Pedidos");
