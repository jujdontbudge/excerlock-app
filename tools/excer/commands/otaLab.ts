import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { onboardingFlowFingerprint } from '../checks/onboardingFlow.ts';
import { cases } from '../ota-lab/cases.ts';
import { exportVariants, labApp, labEnv, labRoot } from '../ota-lab/prepare.ts';
import { runLabCase } from '../ota-lab/run.ts';
import { startLabServer } from '../ota-lab/server.ts';
import { reviewVideo } from '../ota-lab/review.ts';
import { must, run, UsageError } from '../lib/shell.ts';
import { ownedDevice } from '../lib/sim.ts';
import { repoRoot } from '../lib/paths.ts';

export const otaLabHelp = `excer ota-lab fingerprint | prepare | native | build | serve | list | run <case> [case...] | review <evidence-dir>

Local only. prepare exports the isolated lab and seven updates. native generates its iOS
project and installs cached Pods. build runs a tracked local Release simulator build.
serve listens on 127.0.0.1:8098. run records one case with a five-minute deadline.
EXCER_SIM must name an owned worker simulator. Never use EAS for this lab.`;

export async function otaLabCommand(args: string[]): Promise<number> {
  const [command, name] = args;
  switch (command) {
    case 'fingerprint': console.log(onboardingFlowFingerprint()); return 0;
    case 'prepare': exportVariants(name); return 0;
    case 'native': {
      ownedDevice();
      if (!existsSync(join(labApp(), 'index.js'))) throw new Error('Run ota-lab prepare first');
      console.log('Generating the isolated local simulator project');
      console.log(must('npx', ['expo', 'prebuild', '--platform', 'ios', '--no-install'], { cwd: labApp(), env: labEnv() }));
      console.log(must('pod', ['install'], { cwd: join(labApp(), 'ios'), env: labEnv(), timeout: 600000 }));
      writeFileSync(join(labApp(), 'ios/.xcode.env.local'), [
        `export NODE_BINARY=${JSON.stringify(process.execPath)}`,
        'export EXCERLOCK_ENV=dev', 'export EXCER_OTA_LAB_URL=http://127.0.0.1:8098/manifest',
        'export NODE_ENV=production', 'export SENTRY_DISABLE_AUTO_UPLOAD=true', 'export EXPO_NO_TELEMETRY=1', '',
      ].join('\n'));
      return 0;
    }
    case 'build': {
      const device = ownedDevice();
      if (!existsSync(join(labApp(), 'ios/ExcerLock.xcworkspace'))) throw new Error('Run ota-lab native first');
      const result = run('bb', ['xcode', 'run', '--wait', '--', 'xcodebuild', '-workspace', join(labApp(), 'ios/ExcerLock.xcworkspace'),
        '-scheme', 'ExcerLock', '-configuration', 'Release', '-sdk', 'iphonesimulator', '-destination', 'generic/platform=iOS Simulator',
        '-derivedDataPath', join(labRoot(), 'derived'), `ARCHS=${process.arch === 'arm64' ? 'arm64' : 'x86_64'}`, '-jobs', '4', 'ONLY_ACTIVE_ARCH=YES', 'CODE_SIGNING_ALLOWED=NO', 'build'], { cwd: repoRoot, env: { ...labEnv(), EXCER_SIM: device.udid }, timeout: 1800000 });
      console.log(result.stdout); console.error(result.stderr);
      if (result.code === 0 && !existsSync(join(labRoot(), 'derived/Build/Products/Release-iphonesimulator/ExcerLock.app/ExcerLock'))) throw new Error('Build reported success without a Release executable');
      return result.code;
    }
    case 'serve': {
      startLabServer();
      await new Promise<void>(() => {}); return 0;
    }
    case 'list': cases.forEach((entry) => console.log(`${entry.name}\t${entry.title}`)); return 0;
    case 'review': {
      if (!name) throw new UsageError('ota-lab review needs an evidence directory');
      const result = JSON.parse(readFileSync(join(name, 'result.json'), 'utf8'));
      const review = reviewVideo(name, result.videoStartedAtMs, result.launchedAtMs, result.launchToInteractiveMs, result.events);
      console.log(JSON.stringify(review, null, 2));
      return review.status === 'pass' ? 0 : 1;
    }
    case 'run': {
      if (!name) throw new UsageError('ota-lab run needs a case from ota-lab list');
      let failed = 0;
      for (const selected of args.slice(1)) failed += await runLabCase(selected);
      return failed ? 1 : 0;
    }
    default: throw new UsageError(otaLabHelp);
  }
}
