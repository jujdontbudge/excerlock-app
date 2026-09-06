# demo

Local scenarios and fake ports. Never imported by features.

`contextPersistence` stores adapter metadata (scenario id, clock, step override and prompt controls) independently of the eight product stores. Cold launch restores those signals without resetting edited rules. Loading holds progress and navigation until all scenario facts have been replaced. Health/step signals are scoped to their calendar day. Clock persistence observes ticks without starting a background timer.
