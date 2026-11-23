import { test, before, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  agente,
  prepararBase,
  postConToken,
  patchConToken,
  productoPorNombre,
  crearUsuarioDePrueba,
  borrarUsuarioDePrueba,
  login,
} from './helpers';

describe('Pedidos', () => {
  const nombrePersonal = 'func_pedidos_barista';
  const clavePersonal = 'Clave_funcional_pedidos_2026!';
  const personal = agente();

  before(async () => {
    await prepararBase();
    await crearUsuarioDePrueba(nombrePersonal, clavePersonal, 'barista');
    const sesion = await login(personal, nombrePersonal, clavePersonal);
    assert.equal(sesion.status, 200);
  });

  after(async () => {
    await borrarUsuarioDePrueba(nombrePersonal);
    await borrarUsuarioDePrueba('func_pedidos_cliente');
  });

  test('POST /api/pedidos calcula el total del pedido', async () => {
    const espresso = await productoPorNombre('Espresso Pocillo Colombia'); // $5740
    const muffin = await productoPorNombre('Muffin de chocolate'); // $2500

    const res = await postConToken(agente(), '/api/pedidos', {
      mesa: '3',
      cliente: 'Ana',
      items: [
        { productoId: espresso.id, cantidad: 2 },
        { productoId: muffin.id, cantidad: 1 },
      ],
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.mesa, '3');
    assert.equal(res.body.cliente, 'Ana');
    assert.equal(res.body.estado, 'abierto');
    // 5740 x 2 + 2500 x 1 = 13980
    assert.equal(Number(res.body.total), 13980);
    assert.equal(res.body.items.length, 2);
  });

  test('rechaza una mesa que no es un número positivo', async () => {
    const producto = await productoPorNombre('Espresso Pocillo Colombia');
    const res = await postConToken(agente(), '/api/pedidos', {
      mesa: 'mesa falsa',
      cliente: 'Ana',
      items: [{ productoId: producto.id, cantidad: 1 }],
    });

    assert.equal(res.status, 400);
  });

  test('el total es la suma de calcularPrecio() por cantidad', async () => {
    const filtrado = await productoPorNombre('Filtrado Taza grande Brasil'); // $6700

    const res = await postConToken(agente(), '/api/pedidos', {
      mesa: '1',
      cliente: 'Beto',
      items: [{ productoId: filtrado.id, cantidad: 3 }],
    });

    assert.equal(res.status, 201);
    assert.equal(Number(res.body.total), 6700 * 3);
  });

  test('GET /api/pedidos lista los pedidos de todas las mesas', async () => {
    const res = await personal.get('/api/pedidos');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.pedidos));
    assert.ok(res.body.pedidos.length >= 2);
  });

  test('GET /api/pedidos/:id devuelve el pedido con sus items', async () => {
    const etiopia = await productoPorNombre('Espresso Taza grande Etiopía'); // $11140

    const creado = await postConToken(agente(), '/api/pedidos', {
      mesa: '7',
      cliente: 'Caro',
      items: [{ productoId: etiopia.id, cantidad: 1 }],
    });

    const res = await personal.get(`/api/pedidos/${creado.body.id}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.cliente, 'Caro');
    assert.equal(res.body.items.length, 1);
    assert.equal(Number(res.body.total), 11140);
  });

  test('el estado de un pedido se puede actualizar', async () => {
    const colombia = await productoPorNombre('Espresso Pocillo Colombia');

    const creado = await postConToken(agente(), '/api/pedidos', {
      mesa: '2',
      cliente: 'Dani',
      items: [{ productoId: colombia.id, cantidad: 1 }],
    });

    const res = await patchConToken(personal, `/api/pedidos/${creado.body.id}/estado`, {
      estado: 'preparando',
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.estado, 'preparando');
  });

  test('la lectura de pedidos requiere una sesión de personal', async () => {
    const res = await agente().get('/api/pedidos');
    assert.equal(res.status, 401);
  });

  test('un cliente autenticado no puede consultar pedidos', async () => {
    const usuario = 'func_pedidos_cliente';
    const clave = 'Clave_cliente_pedidos_2026!';
    await crearUsuarioDePrueba(usuario, clave, 'cliente');
    const cliente = agente();
    await login(cliente, usuario, clave);

    const res = await cliente.get('/api/pedidos');
    assert.equal(res.status, 403);
  });
});
