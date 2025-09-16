import { Request, Response } from 'express';
import Vendedor from '../models/vendedoresModel';

export const createVendedor = async (req: Request, res: Response): Promise<void> => {
  try {
    const { nombre, usuario, rango,email } = req.body;

    const nuevoVendedor = new Vendedor({
      nombre,
      usuario,
      email,
      rango,
      pedidos_realizados: []
    });

    const vendedorGuardado = await nuevoVendedor.save();
    res.status(201).json(vendedorGuardado);
  } catch (error) {
    console.error('Error al crear el vendedor:', error);
    res.status(500).json({ message: 'Error al crear el vendedor', error });
  }
};
export const deleteVendedor = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const vendedorEliminado = await Vendedor.findByIdAndDelete(id);
    if (!vendedorEliminado) {
      res.status(404).json({ message: 'Vendedor no encontrado' });
      return;
    }

    res.status(200).json({ message: 'Vendedor eliminado exitosamente', vendedorEliminado });
  } catch (error) {
    console.error('Error al eliminar el vendedor:', error);
    res.status(500).json({ message: 'Error al eliminar el vendedor', error });
  }
};
