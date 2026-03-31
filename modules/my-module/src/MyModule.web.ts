import { NativeModule, registerWebModule } from 'expo';

import { MyModuleEvents } from './MyModule.types';

class MyModule extends NativeModule<MyModuleEvents> {
  async moveTaskToBackAsync(): Promise<boolean> {
    return false;
  }
}

export default registerWebModule(MyModule, 'MyModule');
