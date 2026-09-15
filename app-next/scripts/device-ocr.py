#!/usr/bin/env python3
"""Print macOS Vision OCR text for one or more device screenshots.

Used by scripts/prove-linked-recorder-on-phone.sh to prove the installed Trace
Lab binary renders its real research screen with no Metro server available.
Requires the system Python (pyobjc Quartz/Vision). Run it with /usr/bin/python3.
"""
import sys

import Quartz
import Vision
from Foundation import NSURL


def ocr(path):
    url = NSURL.fileURLWithPath_(path)
    source = Quartz.CGImageSourceCreateWithURL(url, None)
    if source is None:
        raise SystemExit(f"cannot read image: {path}")
    image = Quartz.CGImageSourceCreateImageAtIndex(source, 0, None)
    request = Vision.VNRecognizeTextRequest.alloc().init()
    request.setRecognitionLevel_(1)  # accurate
    request.setUsesLanguageCorrection_(False)
    handler = Vision.VNImageRequestHandler.alloc().initWithCGImage_options_(image, None)
    handler.performRequests_error_([request], None)
    lines = []
    for observation in request.results() or []:
        candidates = observation.topCandidates_(1)
        if candidates:
            lines.append(str(candidates[0].string()))
    return lines


def main():
    for path in sys.argv[1:]:
        print(f"===== {path}")
        for line in ocr(path):
            print(line)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
