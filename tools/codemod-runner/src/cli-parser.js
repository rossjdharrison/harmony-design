/**
 * CLI Argument Parser
 * 
 * Parses command-line arguments for codemod runner.
 * 
 * @module tools/codemod-runner/cli-parser
 */

/**
 * Parse command-line arguments
 * 
 * @param {string[]} argv - Command-line arguments
 * @returns {Object} Parsed arguments
 */
export function parseArgs(argv) {
  const args = {
    transform: null,
    path: null,
    dryRun: false,
    verbose: false,
    help: false,
    extensions: null,
    exclude: null
  };

  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') {
      args.help = true;
    } else if (arg === '--dry-run') {
      args.dryRun = true;
    } else if (arg === '--verbose' || arg === '-v') {
      args.verbose = true;
    } else if (arg.startsWith('--transform=')) {
      args.transform = arg.split('=')[1];
    } else if (arg.startsWith('--path=')) {
      args.path = arg.split('=')[1];
    } else if (arg.startsWith('--extensions=')) {
      args.extensions = arg.split('=')[1].split(',');
    } else if (arg.startsWith('--exclude=')) {
      args.exclude = arg.split('=')[1].split(',');
    }
  }

  return args;
}