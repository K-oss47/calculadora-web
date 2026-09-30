(function () {
  'use strict';

  /* ---------- Constantes y elementos de la página ---------- */
  var CLAVE_HISTORIAL = 'historialCalculadora';
  var MAX_DIGITOS = 15;
  var SIMBOLOS = { '+': '+', '-': '−', '*': '×', '/': '÷' };

  var pantallaExpresion = document.getElementById('expresion');
  var pantallaNumero = document.getElementById('numero');
  var teclas = document.querySelector('.teclas');
  var lista = document.getElementById('lista');
  var mensajeVacio = document.getElementById('vacio');
  var contador = document.getElementById('contador');
  var botonBorrarTodo = document.getElementById('borrar-todo');

  /* ---------- Estado de la calculadora ---------- */
  var actual = '0';          // número que se está escribiendo
  var anterior = null;       // primer número de la operación
  var operador = null;       // + - * /
  var esperando = false;     // true justo después de elegir un operador
  var reiniciar = false;     // true justo después de pulsar =
  var hayError = false;
  var mensajeError = '';
  var ultimaExpresion = '';  // texto tipo "12 + 3 =" que se muestra tras un resultado
  var historial = [];

  /* ---------- localStorage ---------- */
  function cargarHistorial() {
    var guardado;
    var datos;
    var i;
    historial = [];
    try {
      guardado = window.localStorage.getItem(CLAVE_HISTORIAL);
      datos = guardado ? JSON.parse(guardado) : [];
      if (Array.isArray(datos)) {
        for (i = 0; i < datos.length; i++) {
          if (datos[i] && typeof datos[i].operacion === 'string' && typeof datos[i].resultado === 'string') {
            historial.push(datos[i]);
          }
        }
      }
    } catch (error) {
      historial = [];
    }
  }

  function guardarHistorial() {
    try {
      window.localStorage.setItem(CLAVE_HISTORIAL, JSON.stringify(historial));
    } catch (error) {
      // Si el navegador no permite guardar, la calculadora sigue funcionando.
    }
  }

  /* ---------- Utilidades ---------- */
  function dosDigitos(n) {
    return n < 10 ? '0' + n : String(n);
  }

  function fechaActual() {
    var d = new Date();
    return dosDigitos(d.getDate()) + '/' + dosDigitos(d.getMonth() + 1) + '/' + d.getFullYear() +
      ' ' + dosDigitos(d.getHours()) + ':' + dosDigitos(d.getMinutes());
  }

  // Quita errores de decimales como 0.1 + 0.2 = 0.30000000000000004
  function formatear(numero) {
    return String(parseFloat(numero.toFixed(10)));
  }

  // Devuelve el resultado, o null si no se puede calcular
  function calcular(a, b, op) {
    var x = parseFloat(a);
    var y = parseFloat(b);
    var resultado;
    if (op === '+') { resultado = x + y; }
    else if (op === '-') { resultado = x - y; }
    else if (op === '*') { resultado = x * y; }
    else if (op === '/') {
      if (y === 0) { return null; }
      resultado = x / y;
    } else {
      resultado = y;
    }
    return isFinite(resultado) ? resultado : null;
  }

  /* ---------- Pantalla ---------- */
  function mostrar() {
    var texto;
    if (hayError) {
      texto = mensajeError;
      pantallaNumero.textContent = 'Error';
    } else {
      texto = operador !== null ? anterior + ' ' + SIMBOLOS[operador] : ultimaExpresion;
      pantallaNumero.textContent = actual;
    }
    pantallaExpresion.textContent = texto;
    pantallaNumero.className = actual.length > 10 && !hayError ? 'numero largo' : 'numero';
  }

  function limpiar() {
    actual = '0';
    anterior = null;
    operador = null;
    esperando = false;
    reiniciar = false;
    hayError = false;
    mensajeError = '';
    ultimaExpresion = '';
    mostrar();
  }

  function fallar(mensaje) {
    actual = '0';
    anterior = null;
    operador = null;
    esperando = false;
    reiniciar = false;
    ultimaExpresion = '';
    hayError = true;
    mensajeError = mensaje;
    mostrar();
  }

  /* ---------- Historial ---------- */
  function usarResultado(entrada) {
    if (hayError) { limpiar(); }
    actual = entrada.resultado;
    anterior = null;
    operador = null;
    esperando = false;
    reiniciar = true;
    ultimaExpresion = entrada.operacion + ' =';
    mostrar();
  }

  function eliminarEntrada(indice) {
    historial.splice(indice, 1);
    guardarHistorial();
    dibujarHistorial();
  }

  function borrarTodo() {
    if (historial.length === 0) { return; }
    if (window.confirm('¿Seguro que quieres borrar todo el historial?')) {
      historial = [];
      guardarHistorial();
      dibujarHistorial();
    }
  }

  function crearItem(entrada, indice) {
    var li = document.createElement('li');
    var usar = document.createElement('button');
    var operacion = document.createElement('span');
    var resultado = document.createElement('span');
    var fecha = document.createElement('span');
    var quitar = document.createElement('button');

    li.className = 'item';

    usar.type = 'button';
    usar.className = 'item-datos';
    usar.title = 'Usar este resultado';
    operacion.className = 'item-operacion';
    operacion.textContent = entrada.operacion + ' =';
    resultado.className = 'item-resultado';
    resultado.textContent = entrada.resultado;
    fecha.className = 'item-fecha';
    fecha.textContent = entrada.fecha || '';
    usar.appendChild(operacion);
    usar.appendChild(resultado);
    usar.appendChild(fecha);
    usar.addEventListener('click', function () {
      usarResultado(entrada);
    });

    quitar.type = 'button';
    quitar.className = 'item-borrar';
    quitar.textContent = '✕';
    quitar.setAttribute('aria-label', 'Eliminar este cálculo');
    quitar.title = 'Eliminar este cálculo';
    quitar.addEventListener('click', function () {
      eliminarEntrada(indice);
    });

    li.appendChild(usar);
    li.appendChild(quitar);
    return li;
  }

  function dibujarHistorial() {
    var total = historial.length;
    var i;
    lista.innerHTML = '';
    for (i = total - 1; i >= 0; i--) {   // lo más nuevo arriba
      lista.appendChild(crearItem(historial[i], i));
    }
    contador.textContent = total === 1 ? '1 cálculo' : total + ' cálculos';
    mensajeVacio.hidden = total > 0;
    botonBorrarTodo.disabled = total === 0;
  }

  function agregarAlHistorial(operacion, resultado) {
    historial.push({ operacion: operacion, resultado: resultado, fecha: fechaActual() });
    guardarHistorial();
    dibujarHistorial();
  }

  /* ---------- Operaciones ---------- */
  // Resuelve "anterior operador actual". Devuelve true si salió bien.
  function resolver() {
    var a = anterior;
    var b = actual;
    var op = operador;
    var resultado = calcular(a, b, op);
    var texto;
    var operacion;

    if (resultado === null) {
      fallar(op === '/' && parseFloat(b) === 0 ? 'No se puede dividir entre 0' : 'Resultado demasiado grande');
      return false;
    }
    texto = formatear(resultado);
    operacion = a + ' ' + SIMBOLOS[op] + ' ' + b;
    agregarAlHistorial(operacion, texto);
    ultimaExpresion = operacion + ' =';
    actual = texto;
    return true;
  }

  function ponerDigito(digito) {
    if (hayError) { limpiar(); }
    if (esperando) {
      actual = '0';
      esperando = false;
    } else if (reiniciar) {
      actual = '0';
      reiniciar = false;
      ultimaExpresion = '';
    }
    if (actual === '0') {
      actual = digito;
    } else if (actual.length < MAX_DIGITOS) {
      actual += digito;
    }
    mostrar();
  }

  function ponerPunto() {
    if (hayError) { limpiar(); }
    if (esperando) {
      actual = '0';
      esperando = false;
    } else if (reiniciar) {
      actual = '0';
      reiniciar = false;
      ultimaExpresion = '';
    }
    if (actual.indexOf('.') === -1) {
      actual += '.';
    }
    mostrar();
  }

  function elegirOperador(op) {
    if (hayError) { limpiar(); }
    if (operador !== null && !esperando) {
      // Operación encadenada: 2 + 3 + ... calcula primero 2 + 3
      if (!resolver()) { return; }
      anterior = actual;
    } else if (operador === null) {
      anterior = actual;
    }
    operador = op;
    esperando = true;
    reiniciar = false;
    ultimaExpresion = '';
    mostrar();
  }

  function igual() {
    if (hayError || operador === null || esperando) { return; }
    if (!resolver()) { return; }
    anterior = null;
    operador = null;
    esperando = false;
    reiniciar = true;
    mostrar();
  }

  function borrarUno() {
    if (hayError) { limpiar(); return; }
    if (esperando || reiniciar) { return; }
    if (actual.length === 1 || (actual.length === 2 && actual.charAt(0) === '-')) {
      actual = '0';
    } else {
      actual = actual.slice(0, -1);
    }
    mostrar();
  }

  /* ---------- Eventos ---------- */
  teclas.addEventListener('click', function (evento) {
    var boton = evento.target;
    var accion;
    while (boton && boton !== teclas && boton.nodeName !== 'BUTTON') {
      boton = boton.parentNode;
    }
    if (!boton || boton.nodeName !== 'BUTTON') { return; }

    if (boton.getAttribute('data-num') !== null) {
      ponerDigito(boton.getAttribute('data-num'));
    } else if (boton.getAttribute('data-op') !== null) {
      elegirOperador(boton.getAttribute('data-op'));
    } else {
      accion = boton.getAttribute('data-accion');
      if (accion === 'punto') { ponerPunto(); }
      else if (accion === 'igual') { igual(); }
      else if (accion === 'borrar') { borrarUno(); }
      else if (accion === 'limpiar') { limpiar(); }
    }
  });

  botonBorrarTodo.addEventListener('click', borrarTodo);

  // Teclado: números, + - * /, Enter o =, Backspace, Escape
  document.addEventListener('keydown', function (evento) {
    var tecla = evento.key;
    if (evento.ctrlKey || evento.metaKey || evento.altKey) { return; }

    if (tecla >= '0' && tecla <= '9' && tecla.length === 1) {
      ponerDigito(tecla);
    } else if (tecla === '.' || tecla === ',') {
      ponerPunto();
    } else if (tecla === '+' || tecla === '-') {
      elegirOperador(tecla);
    } else if (tecla === '*' || tecla === 'x' || tecla === 'X') {
      elegirOperador('*');
    } else if (tecla === '/') {
      evento.preventDefault();
      elegirOperador('/');
    } else if (tecla === 'Enter' || tecla === '=') {
      evento.preventDefault();
      igual();
    } else if (tecla === 'Backspace') {
      borrarUno();
    } else if (tecla === 'Escape' || tecla === 'Delete') {
      limpiar();
    }
  });

  /* ---------- Inicio ---------- */
  cargarHistorial();
  dibujarHistorial();
  mostrar();
})();
