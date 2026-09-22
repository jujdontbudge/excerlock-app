"""Adaptive driver for the real (release-build) onboarding walk.

The plan's N1/V1 scenarios must walk production onboarding on a release-style
build with live services: no `excerlock://dev` scenarios, no fake prompt host.
This driver reads the accessibility tree at every step, identifies the step from
the app's own copy (so the walk is *observed*, not assumed) and advances it,
choosing the same branch the plan's walking path uses.

Step ids and titles come from `app-next/src/content/onboarding.ts`,
`content/rules.ts`, `content/plan.ts` and `content/subscription.ts`.
"""
from __future__ import annotations

import re
import time
from typing import Any, Sequence

# (step, title, body-fragment) in flow order for the walking branch
SCREENS: list[tuple[str, str, str]] = [
    ('O01', 'Block apps. Exercise more.', ''),
    ('O02', 'Block apps. Exercise more.', 'Reduce your screen time'),
    ('O03', 'Block apps. Exercise more.', 'Exercise more each week'),
    ('O07', 'What is your gender?', ''),
    ('O04', 'What should we call you?', 'personal'),
    ('O05', 'How did you hear about us?', ''),
    ('O06', 'How old are you?', 'tailor your plan'),
    ('O08', 'What is your goal?', 'change it later'),
    ('O22', 'What is your body goal?', ''),
    ('O21', 'What exercise would you like to do more of?', 'most interested in'),
    ('O09', 'How many hours of walking do you do per week?', ''),
    ('O10', 'How many hours do you currently spend scrolling each day?', 'best guess'),
    ('O11', 'Here’s some quick math', 'add up over time'),
    ('O12', 'This is a year in your life', 'Each dot'),
    ('O13', 'This is the free time left', 'After sleep and work'),
    ('O14', 'This is how much time you spend scrolling', 'make room'),
    ('O15', 'We’ll trick your brain into craving exercise instead.', ''),
    ('O16', 'You’re stuck in a loop', ''),
    ('O17', 'We’ll change the loop', 'between the urge and the app'),
    ('O18', 'You become', 'ADDICTED'),
    ('O20', 'What exercise should unlock your apps?', 'really do'),
    ('G0F', 'How many times per week do you go to the gym?', ''),
    ('G0H', 'How many hours per session?', ''),
    ('G1', 'What unlocks your screen time?', ''),
    ('W0', 'How many steps do you walk per day currently?', ''),
    ('W1', 'Where do you walk?', 'every place that fits'),
    ('W2', 'How should walking unlock your apps?', 'kind of nudge'),
    ('W3', 'Set your walking goal', 'movement into every day'),
    ('S1', 'When should blocking be active?', 'days and times'),
    ('S3', 'Your plan is ready', 'A little movement'),
    ('S3b', 'Once you', ''),
    ('S3c', 'We want you to try ExcerLock Premium for free', ''),
    ('T1', 'Try ExcerLock free', 'things that matter'),
    ('T2', "We'll remind you before it ends", 'A heads-up'),
    ('T3', 'Want a trial reminder?', 'before your free trial ends'),
    ('T4', 'How your free trial works', ''),
    ('P', 'Choose your plan', ''),
]

#: Paywall headlines the app can legitimately render. The online placement and
#: the bundled fallback (B3) both carry the dashboard's remote config copy, so
#: the offline paywall says "Unlock ExcerLock Premium" instead of the generic
#: content-default headline. Identification must accept either.
PAYWALL_TITLES = ('Choose your plan', 'Unlock ExcerLock Premium')

#: Steps whose title is one of several legitimate headlines.
TITLE_ALIASES: dict[str, tuple[str, ...]] = {'P': PAYWALL_TITLES}

#: Preferred choice per step (plan's walking path).
PREFERRED_CHOICE = {
    'O05': 'Friend',
    'O06': '25–34',
    'O08': 'More exercise',
    'O21': 'Walking',
    'O07': 'Prefer not to say',
    'O22': 'Maintain',
    'O09': '1–2 hours',
    'O20': 'Walking',
    'G0F': '3 times',
    'G0H': '1 hour',
    'G1': 'Arrive at the gym',
    'W0': '5,000–10,000 steps',
    'W1': 'Outside',
    'W2': 'Reach a step goal',
}

#: Steps whose advance control is not the standard Continue button.
ADVANCE_LABEL = {
    'O01': 'Get started',
    'S3': 'Use this plan',
    'S3c': 'Next',
    'T3': 'Enable reminders',
}

DEFAULT_ADVANCE = ('Continue', 'Get started', 'Use this plan', 'Next', 'Enable reminders')

#: Explainer screens advance themselves through useImpactPlayback; the shell
#: renders a spacer instead of a continue button for these steps.
AUTO_ADVANCE = ('O11', 'O12', 'O13', 'O14')


def _step_titles(step: str, title: str) -> list[str]:
    """Every headline this step may render, normalised for label matching."""
    return [normalise(alias).replace('’', "'") for alias in TITLE_ALIASES.get(step, (title,))]


def normalise(text: str) -> str:
    return (text or '').replace('\u00a0', ' ').replace('’', "'").strip()


def identify(labels: list[str], seen: Sequence[str] = ()) -> tuple[str, str]:
    """Map the current screen's labels to a (step, title) pair.

    Titles are unique per step except for the three welcome pages (O01–O03) and
    some steps render no body copy, so matching is: title+body, then title-only
    in flow order skipping steps already visited in this walk.
    """
    haystack = [normalise(label).replace('’', "'") for label in labels]
    for step, title, body in SCREENS:
        if not any(title_n in label for title_n in _step_titles(step, title) for label in haystack):
            continue
        if body and any(normalise(body).replace('’', "'") in label for label in haystack):
            return step, title
    for step, title, body in SCREENS:
        if step in seen:
            continue
        if any(title_n in label for title_n in _step_titles(step, title) for label in haystack):
            return step, title
    return '', ''


class OnboardingWalk:
    def __init__(self, ctx: Any, *, name: str = 'Alex', screenshot_every_step: bool = True, activity: str = 'Walking') -> None:
        self.ctx = ctx
        self.activity = activity
        self.name = name
        self.screenshot_every_step = screenshot_every_step
        self.visited: list[dict[str, Any]] = []
        self.stuck: list[str] = []

    def observe(self) -> dict[str, Any]:
        nodes = self.ctx.tree()
        labels = [normalise(node.get('AXLabel') or '') for node in nodes]
        seen = [item['step'] for item in self.visited]
        step, title = identify(labels, seen)
        return {
            'step': step,
            'title': title,
            'labels': labels,
            'nodes': nodes,
            'fields': [n for n in nodes if n.get('type') in {'TextField', 'TextArea', 'SecureTextField'}],
            'buttons': {normalise(n.get('AXLabel') or ''): bool(n.get('enabled', True))
                        for n in nodes if n.get('type') == 'Button'},
            # Some design-system buttons surface as GenericElement rather than
            # Button (e.g. the impact screens' Continue), so advance decisions
            # read every labelled control.
            'controls': {normalise(n.get('AXLabel') or ''): bool(n.get('enabled', True))
                         for n in nodes if n.get('AXLabel')},
            'choices': [normalise(n.get('AXLabel') or '') for n in self.ctx.choices()],
            'prices': sorted({match for label in labels for match in re.findall(r'\$\s?\d+(?:\.\d{2})?', label)}),
        }

    def advance(self, observation: dict[str, Any]) -> bool:
        step = observation['step']
        ctx = self.ctx
        # 1. text entry steps
        if observation['fields'] and step == 'O04':
            node = observation['fields'][0]
            ctx.tap_node(node)
            ctx.type_text(self.name)
            ctx.log(f'typed the first name at {step}')
        # 2. selection steps: the preferred option, else the first unchecked row
        preferred = self.activity if step == 'O20' else PREFERRED_CHOICE.get(step)
        if preferred and preferred in observation['choices']:
            ctx.tap(preferred)
        elif observation['choices'] and self._advance_disabled(observation):
            first = observation['choices'][0]
            ctx.tap(first)
        # 3. advance control
        label = ADVANCE_LABEL.get(step)
        if label and label in observation['controls']:
            return ctx.tap(label)
        for candidate in DEFAULT_ADVANCE:
            if candidate in observation['controls']:
                return ctx.tap(candidate)
        ctx.log(f'no advance control found at {step or "unknown step"}: {sorted(observation["controls"])}')
        return False

    def _advance_disabled(self, observation: dict[str, Any]) -> bool:
        for candidate in DEFAULT_ADVANCE:
            if candidate in observation['controls']:
                return not observation['controls'][candidate]
        return True

    def observe_settled(self, *, attempts: int = 6, delay: float = 1.5) -> dict[str, Any]:
        """Observe, retrying while no catalog screen is visible.

        A mid-transition frame or a restarted idb companion reports a tree with
        no recognisable step; that is a harness hiccup, not an unknown app
        screen, so give the surface a moment before calling it stuck.
        """
        observation = self.observe()
        for _ in range(attempts - 1):
            if observation['step']:
                return observation
            time.sleep(delay)
            observation = self.observe()
        return observation

    def run(self, *, max_steps: int = 40, stop_at: str = 'P') -> dict[str, Any]:
        ctx = self.ctx
        for index in range(1, max_steps + 1):
            if self.ctx.answer_system_prompt():
                time.sleep(1.5)
            observation = self.observe_settled()
            if not observation['step']:
                if observation['prices'] or any(title in label for title in PAYWALL_TITLES
                                                for label in observation['labels']):
                    observation['step'] = 'P'
                    observation['title'] = 'Choose your plan'
                else:
                    self.stuck.append(' | '.join(sorted(set(observation['labels']))[:6]))
                    ctx.log(f'step {index}: unrecognised screen, stopping: '
                            f'{self.stuck[-1] or "(no accessibility labels)"}')
                    ctx.screenshot(f'{index:02d}-unrecognised', shrink=True)
                    break
            record = {'index': index, 'step': observation['step'], 'title': observation['title'],
                      'choices': observation['choices'], 'prices': observation['prices']}
            self.visited.append(record)
            ctx.log(f'step {index}: {observation["step"]} — {observation["title"]}')
            if self.screenshot_every_step:
                ctx.screenshot(f'{index:02d}-{observation["step"]}', shrink=True)
            if observation['step'] == stop_at:
                break
            if observation['step'] in AUTO_ADVANCE:
                # O11/O14 reveal their Continue control after the impact timing;
                # O12/O13 advance themselves (useImpactPlayback). Poll for either.
                ctx.log(f'{observation["step"]} is an impact explainer; waiting for its control or the next screen')
                deadline = time.monotonic() + 30
                advanced = False
                while time.monotonic() < deadline:
                    time.sleep(0.35)
                    nxt = self.observe()
                    if self.ctx.answer_system_prompt():
                        continue
                    if nxt['step'] and nxt['step'] != observation['step']:
                        advanced = True
                        break
                    if any(button in nxt['controls'] for button in ('Continue', 'Get started')):
                        advanced = self.advance(nxt)
                        break
                if not advanced:
                    self.stuck.append(f'{observation["step"]}: explainer never advanced')
                    break
                continue
            if not self.advance(observation):
                # Animated explainer screens (O11-O15, O16-O18) reveal their
                # control after the motion finishes; re-observe before giving up.
                advanced = False
                for _ in range(6):
                    time.sleep(2.0)
                    retry = self.observe()
                    if retry['controls'] and self.advance(retry):
                        advanced = True
                        break
                if not advanced:
                    self.stuck.append(f'{observation["step"]}: no advance control')
                    break
            ctx.wait_for_any([title for _, title, _ in SCREENS], timeout=12)
        return {'visited': self.visited, 'stuck': self.stuck,
                'steps': [item['step'] for item in self.visited]}
