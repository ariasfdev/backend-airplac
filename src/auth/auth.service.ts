import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import * as nodemailer from 'nodemailer';
import { Usuario, IUsuario } from '../models/usuarioModel';
import { Rol, IRol } from '../models/rolModel';
import { LoginDto } from './dto/login.dto';
import { RegistrarUsuarioDto } from './dto/register.dto';
import { AuthTokens } from './dto/auth-tokens.dto';
import { RecuperarContrasenaDto } from './dto/recuperar-contrasena.dto';
import { VerificarCodigoDto } from './dto/verificar-codigo.dto';
import { CambiarContrasenaDto } from './dto/cambiar-contrasena.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ToggleUserStatusDto } from './dto/toggle-user-status.dto';
import { PasswordValidatorService } from './services/password-validator.service';
import { AuditService } from './services/audit.service';
import { CookieOptions } from 'express';

export class AuthService {
  private passwordValidator: PasswordValidatorService;
  private auditService: AuditService;

  constructor() {
    this.passwordValidator = new PasswordValidatorService();
    this.auditService = new AuditService();
  }

  async registrarUsuario(dto: RegistrarUsuarioDto): Promise<any> {
    const usuarioExiste = await Usuario.findOne({ mail: dto.mail });
    if (usuarioExiste) {
      throw new Error('El usuario ya existe');
    }

    // Validar rol existente
    const rolExiste = await Rol.findById(dto.rolId);
    if (!rolExiste) {
      throw new Error('El rol seleccionado no existe');
    }

    // Validar complejidad de contraseña
    this.passwordValidator.validate(dto.contrasena);

    const hashedPassword = await bcrypt.hash(dto.contrasena, 10);
    
    const nuevoUsuario = await Usuario.create({
      ...dto,
      contrasena: hashedPassword,
      isActive: true,
      passwordChangedAt: new Date(),
    });

    // Registrar auditoría
    await this.auditService.registrar(
      { 
        usuarioId: (nuevoUsuario._id as any).toString(), 
        accion: 'USER_CREATED', 
        descripcion: 'Usuario registrado en el sistema' 
      },
      { ip: '127.0.0.1', 'user-agent': 'internal' }
    );

    return { message: 'Usuario registrado correctamente', usuario: nuevoUsuario };
  }

  async login(loginDto: LoginDto, req?: any): Promise<AuthTokens> {
    // Buscar por email o usuario
    let usuario = await Usuario.findOne({ mail: loginDto.usuario });
    if (!usuario) {
      usuario = await Usuario.findOne({ nombreUsuario: loginDto.usuario });
    }
    if (!usuario) {
      await this.auditService.registrar(
        { accion: 'LOGIN_FAILED', descripcion: `Intento de login fallido: usuario no encontrado - ${loginDto.usuario}` },
        req?.headers || {}
      );
      throw new Error('Usuario no encontrado');
    }

    // Verificar que el usuario esté activo
    if (!usuario.isActive) {
      await this.auditService.registrar(
        { usuarioId: (usuario._id as any).toString(), accion: 'LOGIN_FAILED', descripcion: 'Usuario deshabilitado' },
        req?.headers || {}
      );
      throw new Error('Usuario deshabilitado');
    }

    const passwordOk = await bcrypt.compare(loginDto.contrasena, usuario.contrasena);
    if (!passwordOk) {
      await this.auditService.registrar(
        { usuarioId: (usuario._id as any).toString(), accion: 'LOGIN_FAILED', descripcion: 'Contraseña incorrecta' },
        req?.headers || {}
      );
      throw new Error('Contraseña incorrecta');
    }

    // Actualizar lastLogin
    await Usuario.findByIdAndUpdate(usuario._id, { lastLogin: new Date() });

    // Registrar login exitoso
    await this.auditService.registrar(
      { usuarioId: (usuario._id as any).toString(), accion: 'LOGIN_SUCCESS', descripcion: 'Login exitoso' },
      req?.headers || {}
    );

    const payload = { id: (usuario._id as any).toString(), rolId: (usuario.rolId as any).toString() };
    return this.generateTokens(payload);
  }

  async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    try {
      const secret = process.env.JWT_SECRET || 'defaultSecret';
      const payload = jwt.verify(refreshToken, secret) as any;

      // Asegurar que el rol siga existiendo
      const rolExiste = await Rol.findById(payload.rolId);
      if (!rolExiste) {
        throw new Error('El rol asociado ya no existe');
      }

      return this.generateTokens({ id: payload.id, rolId: payload.rolId });
    } catch (error) {
      throw new Error('Refresh token inválido');
    }
  }

  generateTokens(payload: { id: string; rolId: string }): AuthTokens {
    const secret = process.env.JWT_SECRET || 'defaultSecret';
    const accessExpire = parseInt(process.env.JWT_EXPIRATION_ACCESS || '3600');
    const refreshExpire = parseInt(process.env.JWT_EXPIRATION_REFRESH || '604800');

    return {
      accessToken: jwt.sign(payload, secret, { expiresIn: accessExpire }),
      refreshToken: jwt.sign(payload, secret, { expiresIn: refreshExpire }),
    };
  }

  getCookieOptions(): CookieOptions {
    // secure solo si FRONTEND_ORIGIN usa HTTPS
    const isSecure = process.env.FRONTEND_ORIGIN?.startsWith('https://') || false;
    // sameSite: 'lax' funciona mejor para HTTP, 'none' requiere secure: true (HTTPS)
    const sameSiteValue = isSecure ? 'none' : 'lax';
    
    return {
      httpOnly: true,
      secure: isSecure,
      sameSite: sameSiteValue as 'strict' | 'lax' | 'none',
      maxAge: Number(process.env.JWT_EXPIRATION_ACCESS || '3600') * 1000,
    };
  }

  async enviarCodigoRecuperacion(dto: RecuperarContrasenaDto): Promise<any> {
    const usuario = await Usuario.findOne({ mail: dto.mail });
    if (!usuario) throw new Error('Usuario no encontrado');

    const codigo = Math.floor(100000 + Math.random() * 900000).toString();
    usuario.codigoRecuperacion = codigo;
    usuario.codigoExpira = new Date(Date.now() + 10 * 60000);
    await usuario.save();

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: dto.mail,
      subject: 'Código de recuperación de contraseña',
      text: `Tu código es: ${codigo}. Expira en 10 minutos.`,
    });

    return { message: 'Código enviado al correo' };
  }

  async verificarCodigo(dto: VerificarCodigoDto): Promise<any> {
    const usuario = await Usuario.findOne({ mail: dto.mail });
    if (!usuario) throw new Error('Usuario no encontrado');
    if (usuario.codigoRecuperacion !== dto.codigo) throw new Error('Código incorrecto');
    if (!usuario.codigoExpira || usuario.codigoExpira < new Date()) throw new Error('Código expirado');
    return { message: 'Código verificado correctamente' };
  }

  async cambiarContrasena(mail: string, dto: CambiarContrasenaDto): Promise<any> {
    const usuario = await Usuario.findOne({ mail });
    if (!usuario) throw new Error('Usuario no encontrado');

    // Validar complejidad de contraseña
    this.passwordValidator.validate(dto.nuevaContrasena);

    const hashedPassword = await bcrypt.hash(dto.nuevaContrasena, 10);
    usuario.contrasena = hashedPassword;
    usuario.codigoRecuperacion = undefined;
    usuario.codigoExpira = undefined;
    usuario.passwordChangedAt = new Date();
    await usuario.save();

    // Registrar auditoría
    await this.auditService.registrar(
      { 
        usuarioId: (usuario._id as any).toString(), 
        accion: 'PASSWORD_CHANGED', 
        descripcion: 'Contraseña cambiada por el usuario' 
      },
      { ip: '127.0.0.1', 'user-agent': 'internal' }
    );

    return { message: 'Contraseña cambiada correctamente' };
  }

  async resetearContrasena(
    usuarioId: string,
    dto: ResetPasswordDto,
    adminId: string,
    req?: any
  ): Promise<any> {
    const usuario = await Usuario.findById(usuarioId);
    if (!usuario) throw new Error('Usuario no encontrado');

    // Validar complejidad de nueva contraseña
    this.passwordValidator.validate(dto.nuevaContrasena);

    const hashedPassword = await bcrypt.hash(dto.nuevaContrasena, 10);
    await Usuario.findByIdAndUpdate(usuarioId, {
      contrasena: hashedPassword,
      passwordChangedAt: new Date(),
    });

    // Registrar auditoría
    await this.auditService.registrar(
      {
        usuarioId,
        accion: 'PASSWORD_RESET',
        descripcion: `Contraseña reseteada por admin ${adminId}`,
        detalles: { adminId },
      },
      req?.headers || {}
    );

    return { message: 'Contraseña reseteada correctamente' };
  }

  async toggleUserStatus(
    usuarioId: string,
    dto: ToggleUserStatusDto,
    adminId: string,
    req?: any
  ): Promise<any> {
    const usuario = await Usuario.findById(usuarioId);
    if (!usuario) throw new Error('Usuario no encontrado');

    const nuevoEstado = dto.isActive;
    await Usuario.findByIdAndUpdate(usuarioId, { isActive: nuevoEstado });

    // Registrar auditoría
    const accion = nuevoEstado ? 'USER_ENABLED' : 'USER_DISABLED';
    const descripcion = nuevoEstado
      ? `Usuario habilitado por admin ${adminId}. Razón: ${dto.razon || 'Sin razón especificada'}`
      : `Usuario deshabilitado por admin ${adminId}. Razón: ${dto.razon || 'Sin razón especificada'}`;

    await this.auditService.registrar(
      {
        usuarioId,
        accion,
        descripcion,
        detalles: { adminId, razon: dto.razon },
      },
      req?.headers || {}
    );

    return {
      message: `Usuario ${nuevoEstado ? 'habilitado' : 'deshabilitado'} correctamente`,
      isActive: nuevoEstado,
    };
  }

  async obtenerLogsAuditoria(usuarioId?: string, limite: number = 100): Promise<any> {
    return this.auditService.obtenerLogs(usuarioId, limite);
  }

  async obtenerUsuarios(): Promise<any[]> {
    const usuarios = await Usuario.find()
      .select('-contrasena')
      .populate('rolId', 'nombre')
      .lean();
    
    // Transformar para incluir el nombre del rol directamente
    return usuarios.map((usuario: any) => ({
      ...usuario,
      rolNombre: usuario.rolId?.nombre || null,
      rolId: usuario.rolId?._id || usuario.rolId
    }));
  }

  async obtenerRoles(): Promise<IRol[]> {
    return Rol.find().lean();
  }

  async actualizarUsuario(usuarioId: string, dto: any, adminId: string, req?: any): Promise<any> {
    const usuario = await Usuario.findById(usuarioId);
    if (!usuario) throw new Error('Usuario no encontrado');

    // Campos permitidos para actualizar
    const camposActualizables = ['nombreUsuario', 'razonSocial', 'domicilio', 'telefono', 'mail', 'rolId'];
    const actualizaciones: any = {};

    for (const campo of camposActualizables) {
      if (dto[campo] !== undefined) {
        actualizaciones[campo] = dto[campo];
      }
    }

    // Si se intenta cambiar el email, verificar que no exista
    if (dto.mail && dto.mail !== usuario.mail) {
      const mailExiste = await Usuario.findOne({ mail: dto.mail });
      if (mailExiste) throw new Error('El correo ya está en uso');
    }

    // Validar rol si se envía rolId
    if (dto.rolId !== undefined) {
      const rolExiste = await Rol.findById(dto.rolId);
      if (!rolExiste) {
        throw new Error('El rol seleccionado no existe');
      }
      actualizaciones.rolId = dto.rolId;
    }

    const usuarioActualizado = await Usuario.findByIdAndUpdate(usuarioId, actualizaciones, { new: true }).select('-contrasena');

    // Registrar auditoría
    await this.auditService.registrar(
      {
        usuarioId,
        accion: 'USER_UPDATED',
        descripcion: `Usuario actualizado por admin ${adminId}`,
        detalles: { adminId, camposActualizados: Object.keys(actualizaciones) },
      },
      req?.headers || {}
    );

    return usuarioActualizado;
  }

  async findRolById(rolId: string): Promise<IRol | null> {
    return Rol.findById(rolId);
  }
}
