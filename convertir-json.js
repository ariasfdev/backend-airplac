const fs = require('fs');

// Leer el archivo original
const contenidoOriginal = fs.readFileSync('s.json', 'utf8');

// Dividir por líneas y procesar cada una
const lineas = contenidoOriginal.trim().split('\n');
const productos = [];

lineas.forEach((linea, index) => {
    try {
        // Parsear cada línea como JSON
        const producto = JSON.parse(linea);
        
        // Corregir problemas:
        // 1. Cambiar comas por puntos en placas_por_metro
        if (typeof producto.placas_por_metro === 'string') {
            producto.placas_por_metro = parseFloat(producto.placas_por_metro.replace(',', '.'));
        }
        
        // 2. Cambiar null por 0 en costo
        if (producto.costo === null || producto.costo === undefined) {
            producto.costo = 0;
        }
        
        // 3. Asegurar que todos los campos numéricos sean números
        producto.stock = parseInt(producto.stock) || 0;
        producto.costo = parseFloat(producto.costo) || 0;
        producto.porcentaje_ganancia = parseInt(producto.porcentaje_ganancia) || 100;
        producto.porcentaje_tarjeta = parseInt(producto.porcentaje_tarjeta) || 15;
        producto.total_redondeo = parseInt(producto.total_redondeo) || 0;
        
        productos.push(producto);
        
    } catch (error) {
        console.error(`Error en línea ${index + 1}:`, error.message);
        console.error('Línea problemática:', linea);
    }
});

// Crear el JSON final con la estructura correcta
const jsonFinal = {
    productos: productos
};

// Escribir el archivo corregido
fs.writeFileSync('s-corregido.json', JSON.stringify(jsonFinal, null, 2));

console.log(`✅ Archivo convertido exitosamente!`);
console.log(`📊 Total de productos procesados: ${productos.length}`);
console.log(`📁 Archivo guardado como: s-corregido.json`);

// Mostrar estadísticas
const conCosto = productos.filter(p => p.costo > 0).length;
const sinCosto = productos.filter(p => p.costo === 0).length;

console.log(`💰 Productos con costo: ${conCosto}`);
console.log(`❌ Productos sin costo (costo = 0): ${sinCosto}`);

