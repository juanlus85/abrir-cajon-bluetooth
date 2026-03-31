# Nota técnica: ocultar visualmente la app tras abrir el cajón

Tras revisar la documentación oficial de React Native sobre `Linking`, el método `Linking.sendIntent(action, extras)` en Android permite lanzar intents por acción y extras, pero la API documentada no muestra soporte directo para categorías como `android.intent.category.HOME`.

Conclusión provisional: con la capa JavaScript estándar de React Native no hay una vía documentada y fiable para mandar la app a Home sin terminar el proceso. Si se quiere una desaparición visual real manteniendo el puente vivo, probablemente hará falta una integración Android nativa específica o un módulo adicional que haga `moveTaskToBack()` o lance explícitamente la pantalla Home.
