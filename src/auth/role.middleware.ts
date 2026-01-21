import { Request, Response, NextFunction } from 'express';
import { Rol } from '../models/rolModel';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    rolId: string;
  };
}

// Middleware para requerir roles específicos
export const requireRole = (requiredRoles: string[]) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ message: 'Usuario no autenticado' });
        return;
      }

      const rol = await Rol.findById(req.user.rolId);
      if (!rol) {
        res.status(403).json({ message: 'Rol no encontrado' });
        return;
      }

      if (!requiredRoles.includes(rol.nombre)) {
        res.status(403).json({ message: 'No tienes permisos para acceder a este recurso' });
        return;
      }

      next();
    } catch (error) {
      res.status(403).json({ message: 'Error verificando permisos' });
    }
  };
};

// Helpers para roles específicos
export const requireSuperadmin = requireRole(['Superadmin']);
export const requireAdmin = requireRole(['Superadmin', 'Admin']);
export const requireAdminOrVendedor = requireRole(['Superadmin', 'Admin', 'Vendedor']);
export const onlyVendedor = requireRole(['Vendedor']);
export const notVendedor = requireRole(['Superadmin', 'Admin']);
