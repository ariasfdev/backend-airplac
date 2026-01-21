import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { Rol } from '../models/rolModel';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    rolId: string;
  };
  requiredRoles?: string[];
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction): void => {
  try {
    // Saltar si es ruta pública
    if ((req as any).isPublic) {
      next();
      return;
    }

    // Extraer token de cookies o header Authorization
    let token = req.cookies?.['access_token'];

    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      res.status(401).json({ message: 'Token no encontrado' });
      return;
    }

    try {
      const secret = process.env.JWT_SECRET || 'defaultSecret';
      const payload = jwt.verify(token, secret) as any;
      req.user = payload;
      next();
    } catch (error) {
      res.status(401).json({ message: 'Token inválido o expirado' });
    }
  } catch (error) {
    res.status(401).json({ message: 'Error en autenticación' });
  }
};

export const requireRole = (roles: string[]) => {
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

      if (!roles.includes(rol.nombre)) {
        res.status(403).json({ message: 'No tienes permisos para acceder' });
        return;
      }

      next();
    } catch (error) {
      res.status(403).json({ message: 'Error verificando permisos' });
    }
  };
};

export const publicRoute = (req: Request, res: Response, next: NextFunction): void => {
  (req as any).isPublic = true;
  next();
};
