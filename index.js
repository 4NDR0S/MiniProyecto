import mysql2 from 'mysql2/promise';
import http from 'node:http';
import fs from 'fs';
import path from 'node:path';

// Configuracion de la conexion
const pool = mysql2.createPool({
    host: 'localhost',
    database: 'miniproyecto',
    user: 'root',
    password: ''
});

const server = http.createServer(async (request, response) => {
    const url = request.url;
    const method = request.method;

    if (method === 'GET') {
        switch (url) {
            case '/':
                // lee el archivo html
                fs.readFile('index.html', (error, data) => {
                    if (error) {
                        response.writeHead(500, {'Content-Type': 'text/plain'});
                        response.end('Error interno del servidor');
                    } else {
                        response.writeHead(200, {'Content-Type': 'text/html'});
                        response.end(data);
                    }
                });
                break;

            //solo muestra y escribe los datos al escribir la ruta http://localhost:3420/datos
            case '/api/usuarios':
                try {
                    const resultado = await pool.query('SELECT * FROM usuarios');
                    const data = resultado[0];
                    const string = JSON.stringify(data);

                    response.writeHead(200, { 'content-Type': 'application/json' });
                    response.end(string);

                } catch (error) {
                    console.error('Error al consultar la base de datos:', error);
                    response.writeHead(500, { 'content-Type': 'text/plain' });
                    response.end('Error interno del servidor');
                }
                break;

            case '/api/usuarios/export':
                    const resultado1 = await pool.query('SELECT * FROM usuarios');
                    const usuarios = resultado1[0]

                    //crear la cabecera, formato: (id,nombre,apellido,direccion,correo,dni,edad,fecha_creacion,telefono)
                    const cabecera = Object.keys(usuarios[0])
                    const stringCabecera = cabecera.join(',')
    
                    //crea el contenido del texto, separandolo con el formato de la cabecera
                    const string1 = usuarios.reduce((acumulador, usuario) => acumulador + `\n${usuario.id},${usuario.nombre},${usuario.apellido},${usuario.direccion},${usuario.correo},${usuario.dni},${usuario.edad},${usuario.fecha_creacion},${usuario.telefono}`, '')
                    console.log(string1);

                    //escribe la cadena de texto de la cabecera y luego el contenido de (string1) en el archivo de texto
                    fs.writeFile('usuarios.csv', stringCabecera + string1, (err) => {
                        if (err) {
                            console.error('Error al escribir en el archivo:', err);
                        } else {
                            console.log('¡Archivo "usuarios.txt" guardado con éxito!');
                            response.writeHead(200, {'Content-type': 'application/json'})
                            response.end(JSON.stringify({ message : 'Usuarios exportados'}))
                        }
                    });
                break;

            case '/api/usuarios/import':
                
                const ruta = path.resolve('usuarios.csv')

                //try para validar que el archivo a leer sea correcto
                try {
                    //lee el contenido del archivo en la constate ruta
                    const contenido = await fs.promises.readFile(ruta, 'utf-8')

                    const filas = contenido.split('\n')
                    const filasFiltradas = filas.filter(fila => fila != '')
                    filasFiltradas.shift()

                    filasFiltradas.forEach(async fila => {
                        const columnas = fila.split(',')
                        const correo = columnas[4]

                        //valida que el correo tenga un @
                        if (!correo.includes('@')) {
                            console.log('Correo no valido, la fila no se inserto');
                            return;
                        }

                        try {
                            await pool.execute(
                                'INSERT INTO usuarios(id, nombre, apellido, direccion, correo, dni, edad, fecha_creacion, telefono) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', 
                                columnas
                            );
                        } catch (error) {
                            console.log('No se inserto la fila: ', columnas[0]);
                        }
                    })
                    

                    response.writeHead(200, {'Content-type': 'application/json'})
                    response.end(JSON.stringify({ message : 'Usuarios insertados'}))

                } catch (error) {  //error al leer el archivo 
                    console.error(`Error al leer el archivo: ${ruta}`, error);
                    response.writeHead(500, {'Content-type': 'application/json'});
                    response.end(JSON.stringify({ error: `Error al leer el archivo ${ruta}`}));
                }
                break;

            default:
                response.end('No encontro la ruta');
                break;
        }
    }
});

server.listen(3420, () => console.log('Servidor ejecutandose en http://localhost:3420'));