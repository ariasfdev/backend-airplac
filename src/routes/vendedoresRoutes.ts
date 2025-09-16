import { Router } from 'express';
import { createVendedor,deleteVendedor } from '../controller/vendedoresController';

const router = Router();

router.post('/', createVendedor);
router.delete('/:id', deleteVendedor);

export default router;
