import { VirtualCommand, defineCommand } from '../shell/commands';

// false - return failure
export const falseCmd: VirtualCommand = defineCommand(
  'false',
  'Return failure',
  async () => 1
);
