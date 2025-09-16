import { Request, Response } from "express";
import Modelo from "../models/modelosModel";
import Stock from "../models/stockModel";

// Lista de modelos iniciales
const modelosIniciales = [
  { producto: "Placa de yeso", modelo: "MAYA" },
  { producto: "Placa de yeso", modelo: "TRAVERTINO" },
  { producto: "Placa de yeso", modelo: "PANAL" },
  { producto: "Placa de yeso", modelo: "LORETO" },
  { producto: "Placa de yeso", modelo: "TECNO" },
  { producto: "Placa de yeso", modelo: "BURBUJA" },
  { producto: "Placa de yeso", modelo: "BARILOCHE" },
  { producto: "Placa de yeso", modelo: "FLOR" },
  { producto: "Placa de yeso", modelo: "LAJA" },
  { producto: "Placa de yeso", modelo: "PIZARRA" },
  { producto: "Placa de yeso", modelo: "ONDAS" },
  { producto: "Placa de yeso", modelo: "QUEBRACHO" },
  { producto: "Placa de telgopor", modelo: "VALENCI" },
  { producto: "Placa de telgopor", modelo: "QATAR" },
  { producto: "Placa de telgopor", modelo: "SOL" },
  { producto: "Placa de telgopor", modelo: "TELGO 35mm" },
  { producto: "Placa de telgopor", modelo: "TELGO 40mm" },
  { producto: "Placa de telgopor", modelo: "VIRGINIA" },
  { producto: "Placa de telgopor", modelo: "QUEBRACHO" },
  { producto: "Placa de telgopor", modelo: "MOLDURAS" },
];

// Agregar modelos iniciales a la base de datos
export const inicializarModelos = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    console.log("hola bro");
    // Mapear los modelos con los campos adicionales
    const modelosConDetalles = modelosIniciales.map((modelo) => ({
      ...modelo,
      ancho: "30cm",
      alto: "30cm",
      tipo: "3D",
    }));

    // Insertar los modelos en la base de datos
    await Modelo.insertMany(modelosConDetalles);
    res.status(201).json({ message: "Modelos inicializados correctamente" });
  } catch (error) {
    console.error("Error al inicializar los modelos:", error);
    res
      .status(500)
      .json({ message: "Error al inicializar los modelos", error });
  }
};
export const obtenerModelos = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Obtener todos los modelos
    const modelos = await Modelo.find().lean();

    // Obtener todos los stocks para hacer el mapeo
    const stocks = await Stock.find({}, { idModelo: 1, _id: 1 }).lean();

    // Crear un mapa para acceso rápido: idModelo -> idStock
    const stockMap = new Map();
    stocks.forEach(stock => {
      stockMap.set(stock.idModelo.toString(), stock._id);
    });

    // Añadir el idStock a cada modelo
    const modelosConStock = modelos.map(modelo => ({
      ...modelo,
      idStock: stockMap.get(modelo._id.toString()) || null
    }));

    res.status(200).json(modelosConStock);
  } catch (error) {
    console.error("Error al obtener los modelos:", error);
    res.status(500).json({ message: "Error al obtener los modelos", error });
  }
};
export const editarModelo = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params; // Obtener el ID del modelo a editar
    const updateData = req.body; // Datos actualizados

    // Actualizar el modelo en la base de datos
    const modeloActualizado = await Modelo.findByIdAndUpdate(id, updateData, {
      new: true,
    });

    if (!modeloActualizado) {
      res.status(404).json({ message: "Modelo no encontrado" });
      return;
    }

    res.status(200).json(modeloActualizado);
  } catch (error) {
    console.error("Error al editar el modelo:", error);
    res.status(500).json({ message: "Error al editar el modelo", error });
  }
};
export const nuevoModelo = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { _id, ...data } = req.body; // Excluye el campo _id si está presente
    const nuevoModelo = await Modelo.create(data); // Crea el modelo sin _id
    res.status(201).json({
      message: "Modelo creado correctamente",
      modelo: nuevoModelo,
    });
  } catch (error) {
    console.error("Error al crear el modelo:", error);
    res.status(500).json({
      message: "Error al crear el modelo",
      error,
    });
  }
};
