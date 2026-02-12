import Pedido from "../models/pedidosModel";
import Usuario from "../models/usuarioModel";

export async function assignPedidoUsuarioDefault(): Promise<void> {
  const defaultUsuarioId = process.env.DEFAULT_PEDIDOS_USUARIO_ID;
  if (!defaultUsuarioId) {
    console.warn("DEFAULT_PEDIDOS_USUARIO_ID no está definido; se omite backfill de pedidos");
    return;
  }

  const usuario = await Usuario.findById(defaultUsuarioId);
  if (!usuario || !usuario.isActive) {
    console.warn("DEFAULT_PEDIDOS_USUARIO_ID no corresponde a un usuario activo; se omite backfill de pedidos");
    return;
  }

  const result = await Pedido.updateMany(
    { $or: [{ usuarioId: { $exists: false } }, { usuarioId: null }] },
    { $set: { usuarioId: defaultUsuarioId } }
  );

  if (result.modifiedCount > 0) {
    console.log(`Se asignó usuarioId por defecto a ${result.modifiedCount} pedidos sin usuario.`);
  }
}
