package expo.modules.mymodule

import android.app.Activity
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class MyModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("MyModule")

    AsyncFunction("moveTaskToBackAsync") { promise: Promise ->
      val activity: Activity? = appContext.currentActivity

      if (activity == null) {
        promise.reject("ERR_ACTIVITY_UNAVAILABLE", "No hay una actividad Android activa para enviar la app a segundo plano.")
        return@AsyncFunction
      }

      val movedToBack = activity.moveTaskToBack(true)
      promise.resolve(movedToBack)
    }
  }
}
