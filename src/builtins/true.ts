import { VirtualCommand, defineCommand } from '../shell/commands';

// true - return success
export const trueCmd: VirtualCommand = defineCommand(
  'true',
  'Return success',
  async () => 0
);
