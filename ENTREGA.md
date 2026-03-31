# Abrir Cajón Bluetooth

## Resumen

Esta miniaplicación Android está pensada para una tablet de mostrador y permite **abrir el cajón portamonedas sin entrar en el POS principal**. El funcionamiento consiste en conectarse por **Bluetooth Classic** a la impresora térmica emparejada y enviar el comando **ESC/POS** configurado para el cajón.

En esta versión, la aplicación queda preparada para trabajar con el comando que ya aparecía en tu configuración anterior:

> **`1B,70,00,19,FA`**

## Qué incluye la aplicación

La solución se ha organizado en tres áreas principales. La pantalla **Inicio** concentra la acción rápida con un botón grande para abrir el cajón. La pantalla **Ajustes** permite elegir la impresora Bluetooth emparejada y modificar el comando ESC/POS o el tiempo de espera si en el futuro cambias de hardware. La pantalla **Diagnóstico** sirve para revisar el estado de Bluetooth y lanzar una prueba manual sin abrir el POS.

| Pantalla | Función principal |
|---|---|
| **Inicio** | Abrir el cajón con un solo toque y ver el estado actual de la impresora. |
| **Ajustes** | Seleccionar la impresora emparejada, editar el comando y guardar configuración. |
| **Diagnóstico** | Revisar Bluetooth, confirmar impresora guardada y enviar una prueba. |

## Requisitos de uso

Para que la utilidad funcione correctamente, la impresora debe estar **ya emparejada por Bluetooth** con la tablet Android. Además, como se utiliza un módulo nativo de Bluetooth Classic, esta app debe ejecutarse como **compilación Android propia**, no dentro de Expo Go.

## Instalación y prueba

El flujo recomendado de puesta en marcha es el siguiente.

Primero, instala la aplicación Android generada desde la interfaz del proyecto. Después, abre la app en la tablet y entra en **Ajustes**. Allí debes seleccionar la impresora Bluetooth que ya esté emparejada en Android. A continuación, verifica que el comando siga siendo **`1B,70,00,19,FA`** y guarda la configuración. Después puedes volver a la pantalla principal y pulsar **Abrir cajón**.

Si prefieres validar antes la conectividad, entra en **Diagnóstico** y usa el botón **Enviar prueba**.

## Observaciones técnicas

La app intenta conectarse a la impresora guardada, enviar el comando binario de apertura y desconectarse después. Ese comportamiento reduce la necesidad de mantener una conexión abierta permanente. También se han añadido mensajes de estado para distinguir entre los casos más comunes, como Bluetooth apagado, impresora no seleccionada o fallo de conexión.

## Validación realizada

Se ha comprobado que el proyecto no presenta errores de TypeScript en el estado actual y se han ejecutado pruebas unitarias sobre la conversión del comando ESC/POS a bytes. La validación física final, sin embargo, debe hacerse en la tablet real con la impresora real, porque la apertura del cajón depende del hardware Bluetooth concreto y del comportamiento de la impresora instalada en tu negocio.

## Siguiente paso recomendado

El siguiente paso práctico es generar la compilación Android desde la interfaz del proyecto, instalarla en la tablet y hacer una prueba real con la impresora emparejada. Si al probarla quieres, en el siguiente ajuste puedo dejar una versión todavía más directa, por ejemplo con **arranque automático**, **modo kiosk**, **botón único sin pestañas** o incluso **apertura desde un acceso directo en pantalla**.
