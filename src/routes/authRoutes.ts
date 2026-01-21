import { Router, Response } from 'express';
import { AuthService } from '../auth/auth.service';
import { AuthRequest, publicRoute, authMiddleware } from '../auth/auth.middleware';
import { requireSuperadmin, requireAdmin } from '../auth/role.middleware';

const router = Router();
const authService = new AuthService();

// Registrar usuario (solo superadmin)
router.post('/registrar', authMiddleware, requireSuperadmin, async (req: AuthRequest, res: Response) => {
  try {
    const result = await authService.registrarUsuario(req.body);
    res.status(201).json(result);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

// Login
router.post('/login', publicRoute, async (req: AuthRequest, res: Response) => {
  try {
    const tokens = await authService.login(req.body, req);
    const cookieOptions = authService.getCookieOptions();

    res.cookie('access_token', tokens.accessToken, cookieOptions);
    res.cookie('refresh_token', tokens.refreshToken, {
      ...cookieOptions,
      maxAge: Number(process.env.JWT_EXPIRATION_REFRESH || '604800') * 1000,
    });

    res.json({
      message: 'Login exitoso',
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  } catch (error: any) {
    res.status(401).json({ message: error.message });
  }
});

// Refresh token
router.post('/refresh', publicRoute, async (req: AuthRequest, res: Response) => {
  try {
    const refreshToken = req.cookies?.['refresh_token'];
    if (!refreshToken) {
      res.status(401).json({ message: 'No refresh token' });
      return;
    }

    const tokens = await authService.refreshTokens(refreshToken);
    const cookieOptions = authService.getCookieOptions();

    res.cookie('access_token', tokens.accessToken, cookieOptions);

    res.json({
      message: 'Token renovado',
      accessToken: tokens.accessToken,
    });
  } catch (error: any) {
    res.status(401).json({ message: error.message });
  }
});

// Logout
router.post('/logout', authMiddleware, (req: AuthRequest, res: Response) => {
  res.clearCookie('access_token');
  res.clearCookie('refresh_token');
  res.json({ message: 'Logout exitoso' });
});

// Recuperar contraseña
router.post('/recuperar', publicRoute, async (req: AuthRequest, res: Response) => {
  try {
    const result = await authService.enviarCodigoRecuperacion(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

// Verificar código
router.post('/verificar-codigo', publicRoute, async (req: AuthRequest, res: Response) => {
  try {
    const result = await authService.verificarCodigo(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

// Cambiar contraseña
router.post('/cambiar-contrasena', publicRoute, async (req: AuthRequest, res: Response) => {
  try {
    const { mail, ...dto } = req.body;
    const result = await authService.cambiarContrasena(mail, dto);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

// Reset password (admin/superadmin)
router.post('/reset-password/:usuarioId', authMiddleware, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const result = await authService.resetearContrasena(
      req.params.usuarioId,
      req.body,
      req.user?.id || 'unknown',
      req
    );
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

// Toggle user status (admin/superadmin)
router.post('/toggle-status/:usuarioId', authMiddleware, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const result = await authService.toggleUserStatus(
      req.params.usuarioId,
      req.body,
      req.user?.id || 'unknown',
      req
    );
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

// Obtener usuarios (admin/superadmin)
router.get('/usuarios', authMiddleware, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const usuarios = await authService.obtenerUsuarios();
    res.json(usuarios);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

// Actualizar usuario (solo superadmin)
router.put('/usuarios/:usuarioId', authMiddleware, requireSuperadmin, async (req: AuthRequest, res: Response) => {
  try {
    const result = await authService.actualizarUsuario(
      req.params.usuarioId,
      req.body,
      req.user?.id || 'unknown',
      req
    );
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

// Obtener roles (cualquier usuario autenticado)
router.get('/roles', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const roles = await authService.obtenerRoles();
    res.json(roles);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

// Obtener logs de auditoría (admin/superadmin)
router.get('/audit-logs', authMiddleware, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const usuarioId = req.query.usuarioId as string | undefined;
    const limite = req.query.limite ? parseInt(req.query.limite as string) : 100;
    const logs = await authService.obtenerLogsAuditoria(usuarioId, limite);
    res.json(logs);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

export default router;
