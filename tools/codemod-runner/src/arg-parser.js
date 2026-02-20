/**
 * Command line argument parser
 * Parses CLI arguments without external dependencies
 * 
 * @see harmony-design/DESIGN_SYSTEM.md#codemod-runner
 */

/**
 * Parse command line arguments
 * @param {string[]} argv - Process argv array
 * @returns {Object} Parsed arguments
 */
export function parseArgs(argv) {
  const args = {
    transform: null,
    path: null,
    dryRun: false,
    verbose: false,
    help: false
  };
  
  for (const arg of argv) {
    if (arg.startsWith('--transform=')) {
      args.transform = arg.split('=')[1];
    } else if (arg.startsWith('--path=')) {
      args.path = arg.split('=')[1];
    } else if (arg === '--dry-run') {
      args.dryRun = true;
    } else if (arg === '--verbose') {
      args.verbose = true;
    } else if (arg === '--help' || arg === '-h') {
      args.help = true;
    }
  }
  
  return args;
}