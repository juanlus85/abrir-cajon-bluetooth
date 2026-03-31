package expo.modules.mymodule

import android.app.Activity
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class MyModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("MyModule")

    AsyncFunction("moveTaskToBackAsync") {
      val activity: Activity? = appContext.currentActivity
        ?: throw CodedException("ERR_ACTIVITY_UNAVAILABLE", "No hay una actividad Android activa para enviar la app a segundo plano.")

      activity.moveTaskToBack(true)
    }
  }
}
