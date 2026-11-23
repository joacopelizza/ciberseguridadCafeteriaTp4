/**
 * =============================================================================
 * BATERÍA DE TESTS DE SEGURIDAD — login (archivo aislado)
 * =============================================================================
 *
 * Estos tests provocan LOGINS FALLIDOS a propósito (para intentar el bypass
 * por SQL y para comparar los mensajes de error). Por eso van en su propio
 * archivo: el rate limiting cuenta los intentos fallidos y, si compartieran
 * proceso con el resto de la suite, el bloqueo terminaría impediendo los
 * logins de los demás tests y los resultados serían inconsistentes.
 *
 * node --test ejecuta cada archivo en un proceso separado, así que este
 * archivo tiene su propio estado de rate limiting.
 * =============================================================================
 */

import { test, before, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

import {
  app,
  agente,
  prepararBase,
  login,
  crearUsuarioDePrueba,
  limpiarDatosDePrueba,
} from './helpers';

describe('Seguridad · Login', () => {
  before(async () => {
    await prepararBase();
  });

  after(async () => {
    // Borra los usuarios de prueba para no dejar basura en la base.
    await limpiarDatosDePrueba();
  });

  test('los mensajes de login son genéricos (sin enumeración de usuarios)', async () => {
    await crearUsuarioDePrueba('sec_enum', 'Sec_Clave_2024!', 'barista');

    const inexistente = await login(agente(), 'usuario-que-no-existe-xyz', 'x');
    const contraseñaIncorrecta = await login(agente(), 'sec_enum', 'contraseña-equivocada');

    assert.equal(
      inexistente.body.error,
      contraseñaIncorrecta.body.error,
      `Los mensajes distinguen entre "usuario inexistente" (${inexistente.body.error}) y ` +
        `"contraseña incorrecta" (${contraseñaIncorrecta.body.error}): permite enumerar usuarios.`
    );
  });

  test('el login NO acepta el bypass con payload SQL', async () => {
    const http = agente();
    const res = await login(http, "' OR 1=1 --", 'cualquiera');

    assert.notEqual(
      res.status,
      200,
      'El login devolvió 200 con el payload "\' OR 1=1 --": la inyección SQL del login sigue abierta (servicios/usuarios.service.ts).'
    );

    const yo = await http.get('/api/auth/yo');
    assert.notEqual(yo.status, 200, 'Quedó una sesión abierta tras un login inyectado.');
  });

  test('el login NO acepta el payload que comenta la contraseña', async () => {
    const res = await login(agente(), "admin'--", 'cualquiera');
    assert.notEqual(res.status, 200, 'El login aceptó "admin\'--" sin contraseña válida.');
  });
});

describe('Seguridad · CSRF en login', () => {
  test('el inicio de sesión requiere token anti-CSRF', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'cualquiera' });

    assert.equal(res.status, 403, 'El endpoint de login aceptó una petición sin token anti-CSRF.');
  });
});

describe('Seguridad · respuestas de usuarios', () => {
  after(async () => {
    await limpiarDatosDePrueba();
  });

  test('la API administrativa no devuelve hashes de contraseñas', async () => {
    await crearUsuarioDePrueba('sec_hash_api', 'Sec_Clave_2026!', 'admin');
    const http = agente();
    const sesion = await login(http, 'sec_hash_api', 'Sec_Clave_2026!');
    assert.equal(sesion.status, 200);

    const res = await http.get('/api/admin/usuarios');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.usuarios));
    assert.ok(res.body.usuarios.length > 0);
    assert.ok(res.body.usuarios.every((usuario: Record<string, unknown>) => !('password' in usuario)));
  });
});
