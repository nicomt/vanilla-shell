import { defineCommand, z } from '../shell/commands';

export const falseCmd = defineCommand({
  name: 'false',
  description: 'Return false (exit code 1)',
  category: 'control',
  examples: [['Return failure', 'false']],
  parameters: z.object({}),
  execute: async () => 1,
});
