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
from typing import Any

# (step, title, body-fragment) in flow order for the walking branch
SCREENS: list[tuple[str, str, str]] = [
    ('O01', 'Block apps. Exercise more.', 'Less scrolling'),
    ('O02', 'Block apps. Exercise more.', 'Reduce your screen time'),
    ('O03', 'Block apps. Exercise more.', 'Exercise more each week'),
    ('O04', 'What should we call you?', 'personal'),
    ('O05', 'How did you hear about us?', ''),
    ('O06', 'How old are you?', 'tailor your plan'),
    ('O08', 'What is your goal?', 'change it later'),
    ('O09', 'What’s the main reason you want to make a change?', 'what matters to you'),
    ('O10', 'How many hours do you currently spend scrolling each day?', 'best guess'),
    ('O11', 'Here’s some quick math', 'add up over time'),
    ('O12', 'This is a year in your life', 'Each dot'),
    ('O13', 'This is the free time left', 'After sleep and work'),
    ('O14', 'This is how much time you spend scrolling', 'make room'),
    ('O15', 'This is good.', 'fuel exercise'),
    ('O16', 'You’re stuck in a loop', ''),
    ('O17', 'We’ll change the loop', 'between the urge and the app'),
    ('O18', 'You become', 'ADDICTED'),
    ('O20', 'What exercise should unlock your apps?', 'really do'),
    ('W1', 'Where do you walk?', 'every place that fits'),
    ('W2', 'How should walking unlock your apps?', 'kind of nudge'),
    ('W3', 'Set your walking goal', 'movement into every day'),
    ('S1', 'When should blocking be active?', 'days and times'),
    ('S3', 'Your plan is ready', 'A little movement'),
    ('S4', 'Help us make ExcerLock better', 'How does your plan feel'),
    ('T1', 'Try ExcerLock free', 'things that matter'),
    ('T2', "We'll remind you before it ends", 'A heads-up'),
    ('T3', 'Want a trial reminder?', 'before your free trial ends'),
    ('T4', 'How your free trial works', ''),
    ('P', 'Choose your plan', ''),
]

#: Preferred choice per step (plan's walking path).
PREFERRED_CHOICE = {
    'O05': 'Friend',
    'O06': '25–34',
    'O08': 'More exercise',
    'O09': 'Focus on what matters',
    'O20': 'Walking',
    'W1': 'Outside',
    'W2': 'Reach a step goal',
}

#: Steps whose advance control is not the standard Continue button.
ADVANCE_LABEL = {
    'O01': 'Get started',
    'S3': 'Use this plan',
    'S4': 'Not now',
    'T3': 'Enable reminders',
}

DEFAULT_ADVANCE = ('Continue', 'Get started', 'Use this plan', 'Not now', 'Enable reminders')


def normalise(text: str) -> str:
    return (text or '').replace('\u00a0', ' ').replace('’', "'").strip()


def identify(labels: list[str]) -> tuple[str, str]:
    """Map the current screen's labels to a (step, title) pair."""
    haystack = [normalise(label) for label in labels]
    for step, title, body in SCREENS:
        title_n = normalise(title).replace('’', "'")
        if not any(title_n in label for label in haystack):
            continue
        if body and not any(normalise(body).replace('’', "'") in label for label in haystack):
            continue
        return step, title
    return '', ''


class OnboardingWalk:
    def __init__(self, ctx: Any, *, name: str = 'Alex', screenshot_every_step: bool = True) -> None:
        self.ctx = ctx
        self.name = name
        self.screenshot_every_step = screenshot_every_step
        self.visited: list[dict[str, Any]] = []
        self.stuck: list[str] = []

    def observe(self) -> dict[str, Any]:
        nodes = self.ctx.tree()
        labels = [normalise(node.get('AXLabel') or '') for node in nodes]
        step, title = identify(labels)
        return {
            'step': step,
            'title': title,
            'labels': labels,
            'nodes': nodes,
            'fields': [n for n in nodes if n.get('type') in {'TextField', 'TextArea', 'SecureTextField'}],
            'buttons': {normalise(n.get('AXLabel') or ''): bool(n.get('enabled', True))
                        for n in nodes if n.get('type') == 'Button'},
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
        preferred = PREFERRED_CHOICE.get(step)
        if preferred and preferred in observation['choices']:
            ctx.tap(preferred)
        elif observation['choices'] and self._advance_disabled(observation):
            first = observation['choices'][0]
            ctx.tap(first)
        # 3. advance control
        label = ADVANCE_LABEL.get(step)
        if label and label in observation['buttons']:
            return ctx.tap(label)
        for candidate in DEFAULT_ADVANCE:
            if candidate in observation['buttons']:
                return ctx.tap(candidate)
        ctx.log(f'no advance control found at {step or "unknown step"}: {sorted(observation["buttons"])}')
        return False

    def _advance_disabled(self, observation: dict[str, Any]) -> bool:
        for candidate in DEFAULT_ADVANCE:
            if candidate in observation['buttons']:
                return not observation['buttons'][candidate]
        return True

    def run(self, *, max_steps: int = 40, stop_at: str = 'P') -> dict[str, Any]:
        ctx = self.ctx
        for index in range(1, max_steps + 1):
            observation = self.observe()
            if not observation['step']:
                if observation['prices'] or any('Choose your plan' in label for label in observation['labels']):
                    observation['step'] = 'P'
                    observation['title'] = 'Choose your plan'
                else:
                    self.stuck.append(' | '.join(sorted(set(observation['labels']))[:6]))
                    ctx.log(f'step {index}: unrecognised screen, stopping')
                    break
            record = {'index': index, 'step': observation['step'], 'title': observation['title'],
                      'choices': observation['choices'], 'prices': observation['prices']}
            self.visited.append(record)
            ctx.log(f'step {index}: {observation["step"]} — {observation["title"]}')
            if self.screenshot_every_step:
                ctx.screenshot(f'{index:02d}-{observation["step"]}', shrink=True)
            if observation['step'] == stop_at:
                break
            if not self.advance(observation):
                self.stuck.append(f'{observation["step"]}: no advance control')
                break
            ctx.wait_for_any([title for _, title, _ in SCREENS], timeout=12)
        return {'visited': self.visited, 'stuck': self.stuck,
                'steps': [item['step'] for item in self.visited]}
