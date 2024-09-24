import argparse
import json
import os

_parser = argparse.ArgumentParser()
_parser.add_argument("archivePath", type=str, help="The path to the measure archive")

_args = _parser.parse_args()

with open(os.path.join(_args.archivePath, "logfile.json"), "r") as file:
    logfile = json.load(file)


syntax_report = logfile["syntaxReport"]

tool_reports = logfile["toolReport"]
