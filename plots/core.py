import argparse
import json
import os

_parser = argparse.ArgumentParser()
_parser.add_argument("archive_path", type=str, help="The path to the measure archive")
_parser.add_argument("--out", type=str, help="The path to the output figure")

args = _parser.parse_args()

with open(os.path.join(args.archive_path, "logfile.json"), "r") as file:
    logfile = json.load(file)


syntax_report = logfile["syntaxReport"]

tool_reports = logfile["toolReport"]


def output(plt):
    if args.out is None:
        plt.show()
    else:
        plt.savefig(args.out)
