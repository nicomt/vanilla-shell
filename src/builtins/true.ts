import { defineCommand, z } from '../shell/commands';

export const trueCmd = defineCommand({
  name: 'true',
  description: 'Return true (exit code 0)',
  category: 'control',
  examples: [['Return success', 'true']],
  parameters: z.object({}),
  execute: async () => 0,
});
