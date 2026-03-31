import { NativeModule, requireNativeModule } from 'expo';

import { MyModuleEvents } from './MyModule.types';

declare class MyModule extends NativeModule<MyModuleEvents> {
  moveTaskToBackAsync(): Promise<boolean>;
}

export default requireNativeModule<MyModule>('MyModule');
