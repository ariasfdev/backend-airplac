import { Router } from 'express';
import { createVendedor,deleteVendedor } from '../controller/vendedoresController';
import { requireSuperadmin } from "../auth/role.middleware";

const router = Router();

router.post('/', requireSuperadmin, createVendedor);
router.delete('/:id', requireSuperadmin, deleteVendedor);

export default router;
