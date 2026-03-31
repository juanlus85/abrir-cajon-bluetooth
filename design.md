# Diseño de interfaz y flujo de la miniaplicación

## Objetivo del producto

La aplicación **Abrir Cajón Bluetooth** será una utilidad Android de uso inmediato, pensada para una tablet en orientación vertical **9:16**, con interacción cómoda con una sola mano. Su propósito es permitir la apertura del cajón de efectivo sin entrar al sistema POS principal, enviando a la impresora térmica Bluetooth el comando ESC/POS configurado para el cajón: `1B,70,00,19,FA`.

La interfaz debe sentirse cercana a una utilidad nativa de iOS en claridad visual y jerarquía, aunque su destino operativo sea Android. Por ello, se priorizarán superficies limpias, tipografía legible, acciones primarias claramente separadas, estados visibles y una navegación mínima.

## Pantallas necesarias

| Pantalla | Propósito principal | Contenido principal | Acciones disponibles |
|---|---|---|---|
| Inicio | Permitir apertura rápida del cajón | Estado de conexión, nombre del dispositivo guardado, botón principal de apertura, mensajes de resultado | Abrir cajón, probar conexión, ir a ajustes |
| Selección de impresora | Elegir la impresora Bluetooth emparejada | Lista de dispositivos Bluetooth disponibles o emparejados, indicador de selección actual | Seleccionar impresora, volver |
| Ajustes | Configurar comportamiento técnico básico | Comando ESC/POS visible y editable, tiempo de espera, reconexión, versión y fecha de compilación | Guardar ajustes, restablecer valores por defecto, volver |
| Diagnóstico | Ayudar a resolver incidencias de conexión | Último error, pasos sugeridos, estado Bluetooth, confirmación del comando enviado | Reintentar conexión, reenviar comando de prueba |

## Contenido y funcionalidad por pantalla

### Inicio

La pantalla de inicio será la pantalla principal y deberá concentrar la mayor parte del uso diario. En el centro visual estará el botón **Abrir cajón**, con tamaño amplio, alto contraste y respuesta háptica. Encima del botón se mostrará la impresora seleccionada y un indicador textual de disponibilidad, para que el usuario sepa si la app intentará enviar el comando al destino correcto.

Debajo de la acción principal aparecerá una tarjeta de estado con el último resultado, por ejemplo: apertura realizada, error de conexión, Bluetooth desactivado o impresora no encontrada. El objetivo es que el operario no tenga que interpretar mensajes técnicos complejos.

### Selección de impresora

Esta pantalla mostrará la lista de impresoras o dispositivos Bluetooth relevantes, priorizando los ya emparejados con la tablet. La impresora elegida quedará guardada localmente para evitar configuraciones repetitivas. La lista debe ser táctil, simple y con confirmación visual clara de la opción activa.

### Ajustes

La pantalla de ajustes servirá para revisar y modificar parámetros mínimos, sin convertir la utilidad en una consola técnica. Se mostrará el comando de apertura en hexadecimal separado por comas, con valor inicial `1B,70,00,19,FA`. También podrá incluir una opción de tiempo de espera de conexión y una preferencia de reconexión automática.

En la parte inferior derecha se mostrará una indicación pequeña de versión y fecha de despliegue con el formato preferido por el usuario.

### Diagnóstico

Esta pantalla ofrecerá soporte operativo cuando el cajón no responda. Debe explicar si el problema parece deberse a Bluetooth apagado, impresora no emparejada, fallo de socket o rechazo del dispositivo. La intención es reducir dependencia técnica externa y facilitar pruebas rápidas en el mostrador.

## Flujos principales de usuario

| Flujo | Secuencia |
|---|---|
| Apertura rápida | Usuario abre la miniapp → verifica la impresora guardada → pulsa **Abrir cajón** → la app envía el comando ESC/POS → se muestra confirmación o error |
| Primera configuración | Usuario abre la app → entra en **Seleccionar impresora** → elige la impresora Bluetooth correcta → vuelve a Inicio → pulsa **Abrir cajón** |
| Ajuste del comando | Usuario abre **Ajustes** → revisa o modifica el comando ESC/POS → guarda cambios → vuelve a Inicio → prueba apertura |
| Resolución de incidencias | Usuario intenta abrir → aparece error → entra en **Diagnóstico** → revisa causa y sugerencia → reintenta conexión o vuelve a seleccionar impresora |

## Decisiones de diseño visual

La interfaz adoptará una estética sobria, confiable y funcional, apropiada para caja y mostrador. El énfasis estará en la rapidez de uso y en la reducción de errores de pulsación.

| Elemento | Decisión |
|---|---|
| Color primario | **#0F9D58**, verde operativo para transmitir acción confirmada y disponibilidad |
| Color de fondo | **#F4F7F5**, tono claro neutro para legibilidad continua |
| Superficie | **#FFFFFF**, tarjetas limpias con borde suave |
| Texto principal | **#142018**, casi negro con tinte verde para mantener contraste elevado |
| Texto secundario | **#5F6E64**, gris verdoso para estados auxiliares |
| Error | **#C62828**, rojo de alerta reconocible |
| Advertencia | **#D97706**, ámbar para incidencias no críticas |
| Éxito | **#1B8F4D**, verde de confirmación |

## Principios de interacción

La app debe poder usarse con una sola mano, con objetivos táctiles grandes y separación suficiente entre acciones. El botón principal tendrá prioridad absoluta en tamaño y posición. Las acciones secundarias, como cambiar impresora o abrir diagnóstico, se ubicarán por debajo o en una sección separada para evitar aperturas accidentales del cajón.

Se empleará retroalimentación háptica ligera en la pulsación del botón principal, siempre que el entorno técnico lo permita. También se usarán mensajes de estado inmediatos, ya que en este contexto operativo la confirmación visual es esencial.

## Consideraciones técnicas y operativas

La app dependerá de **Bluetooth Classic** y de un módulo nativo compatible con React Native/Expo fuera de Expo Go. Por esa razón, el uso final requerirá una compilación Android o un development build. La configuración local almacenará el identificador de la impresora seleccionada y el comando ESC/POS, de manera que el operario no deba repetir el emparejamiento en cada uso.
