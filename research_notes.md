# Hallazgos técnicos iniciales

## Bluetooth Classic en Expo/React Native

Se confirmó que una aplicación basada en Expo puede trabajar con **Bluetooth Classic** mediante un módulo nativo adicional, en lugar de depender exclusivamente de Expo Go. La guía consultada indica el uso de `react-native-bluetooth-classic` junto con el plugin `with-rn-bluetooth-classic` para configurar permisos y protocolos en el proyecto.

## Implicación para este proyecto

La miniaplicación para abrir el cajón por Bluetooth es técnicamente viable, pero **no funcionará en Expo Go**. Requerirá una compilación Android o un development build con el módulo nativo integrado.

## Enfoque previsto

La implementación usará Android, una impresora Bluetooth previamente emparejada y el envío del comando ESC/POS `1B,70,00,19,FA` al dispositivo seleccionado.

## Referencia consultada

- https://kenjdavidson.com/react-native-bluetooth-classic/guides/using-with-expo/
