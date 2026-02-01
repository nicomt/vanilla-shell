import { defineCommand, z, getRegistry } from '../shell/commands';

export const help = defineCommand({
  name: 'help',
  description: 'Display help for commands',
  category: 'shell',
  examples: [
    ['List all commands', 'help'],
    ['Get help for a command', 'help ls'],
  ],
  parameters: z.object({
    _: z.array(z.string()).default([]).describe('Command to get help for'),
  }),
  execute: async ({ _ }, ctx) => {
    const registry = getRegistry();

    if (_.length === 0) {
      // List all commands grouped by category
      const byCategory = new Map<string, string[]>();

      for (const cmd of registry.values()) {
        const cat = cmd.category || 'other';
        if (!byCategory.has(cat)) {
          byCategory.set(cat, []);
        }
        byCategory.get(cat)!.push(cmd.name);
      }

      ctx.stdout('Available commands:\n\n');
      for (const [category, commands] of byCategory) {
        ctx.stdout(`${category}:\n`);
        ctx.stdout(`  ${commands.sort().join(', ')}\n\n`);
      }
      ctx.stdout('Type "help <command>" for more information.\n');
      return 0;
    }

    const cmdName = _[0];
    const cmd = registry.get(cmdName);

    if (!cmd) {
      ctx.stderr(`help: no help topics match '${cmdName}'\n`);
      return 1;
    }

    ctx.stdout(`${cmd.name} - ${cmd.description}\n\n`);

    if (cmd.examples && cmd.examples.length > 0) {
      ctx.stdout('Examples:\n');
      for (const [desc, example] of cmd.examples) {
        ctx.stdout(`  ${example}\n    ${desc}\n`);
      }
      ctx.stdout('\n');
    }

    // Show parameters from definition
    const def = cmd.getDefinition();
    const paramOptions = def.options.filter((o) => o.name !== '_');

    if (paramOptions.length > 0) {
      ctx.stdout('Options:\n');
      for (const opt of paramOptions) {
        const prefix = opt.name.length === 1 ? '-' : '--';
        ctx.stdout(`  ${prefix}${opt.name}\n    ${opt.description}\n`);
      }
    }

    return 0;
  },
});
