import multer from "multer";
import path from "path";
import fs from "fs";

// Verifica si la carpeta existe; si no, la crea
const dir = path.join(__dirname, "../../uploads/remitos");
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, dir); // Ruta correcta para guardar el archivo
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + file.originalname;
    cb(null, uniqueSuffix);
  },
});

const upload = multer({ storage });

export default upload;
