import { checkCommand, help as checkHelp } from './commands/check.ts';
import { featureCommand, help as featureHelp } from './commands/feature.ts';
import { doctorCommand, doctorHelp, newCommand, newHelp, serverCommand, serverHelp } from './commands/misc.ts';
import { moveCommand, moveHelp } from './commands/move.ts';
import { help as proveHelp, proveCommand } from './commands/prove.ts';
import { demoCommand, demoHelp, simCommand, simHelp } from './commands/sim.ts';
import { otaLabCommand, otaLabHelp } from './commands/otaLab.ts';
import { UsageError } from './lib/shell.ts';

const usage = `excer: control and verification for ExcerLock

  excer doctor                      is this machine ready?
  excer check [--full]              static verification (typecheck, lint, invariants, ratchets)
  excer feature list|show|graph|check|routes
                                    the feature map
  excer demo <scenario> | list      start the app in a scripted scenario
  excer sim <command>               drive the owned simulator (status, start, open, tap, shot, tree)
  excer prove <feature>             run a feature's proofs on the simulator and save evidence
  excer ota-lab <command>           local Release OTA lab
  excer server health|ready [--prod]
  excer server smoke                real API + Postgres, one account from sign-up to erasure
  excer new package <name>
  excer move <source...> <destination>
                                    move app or server files and rewrite their imports

Run excer <command> --help for details. Words: CONTEXT.md. Shape: ARCHITECTURE.md.`;

const helps: Record<string, string> = {
  check: checkHelp,
  "ota-lab": otaLabHelp,
  feature: featureHelp,
  demo: demoHelp,
  sim: simHelp,
  prove: proveHelp,
  server: serverHelp,
  doctor: doctorHelp,
  new: newHelp,
  move: moveHelp,
};

async function main(argv: string[]): Promise<number> {
  const [command, ...args] = argv;
  if (!command || command === 'help' || command === '--help' || command === '-h') {
    console.log(usage);
    return 0;
  }
  if (args.includes('--help') || args.includes('-h')) {
    console.log(helps[command] ?? usage);
    return 0;
  }
  switch (command) {
    case 'ota-lab':
      return otaLabCommand(args);
    case 'check':
      return checkCommand(args);
    case 'feature':
      return featureCommand(args);
    case 'demo':
      return demoCommand(args);
    case 'sim':
      return simCommand(args);
    case 'prove':
      return proveCommand(args);
    case 'server':
      return serverCommand(args);
    case 'doctor':
      return doctorCommand();
    case 'new':
      return newCommand(args);
    case 'move':
      return moveCommand(args);
    default:
      throw new UsageError(`unknown command "${command}"\n\n${usage}`);
  }
}

main(process.argv.slice(2)).then(
  (code) => process.exit(code),
  (error: unknown) => {
    if (error instanceof UsageError) {
      console.error(error.message);
      process.exit(2);
    }
    console.error(`excer: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  },
);
