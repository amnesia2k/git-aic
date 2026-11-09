// Single source for the Commands section. Keep in sync with bin/cli.ts and the
// "Command Reference" section of the root README.

export interface ReferenceItem {
  /** What the user types. */
  usage: string
  description: string
  /** Optional extra detail shown under the description. */
  note?: string
}

export const options: ReferenceItem[] = [
  {
    usage: 'git aic',
    description:
      'Pick files, let Gemini write the message, review it, and commit.',
    note: 'Review: Commit · Edit in your editor · Regenerate · Cancel',
  },
  {
    usage: '-p, --push',
    description: 'Push after committing.',
    note: 'Sets up origin, the upstream and sign-in when needed. With nothing new, pushes your unpushed commits.',
  },
  {
    usage: '-d, --diff',
    description:
      'Write an AI-explained markdown report to git-diffs/ instead of committing.',
    note: 'Never stages or unstages anything.',
  },
  {
    usage: '-a, --all',
    description: 'Use every changed file and skip the file selector.',
  },
  {
    usage: '-y, --yes',
    description: 'Skip confirmations.',
    note: 'Commits without review, sets the upstream, pulls before pushing, and leaves out secret-looking files and un-ignored build folders.',
  },
  {
    usage: '--dry-run',
    description: 'Print the generated message without committing.',
    note: 'Your staging area is restored.',
  },
  { usage: '-V, --version', description: 'Print the installed version.' },
  {
    usage: '-h, --help',
    description: 'Print help.',
    note: 'Use git aic -h or git aic help: Git reserves git aic --help for its manual pages.',
  },
]

export const commands: ReferenceItem[] = [
  {
    usage: 'git-aic set-key [key]',
    description: 'Save your Gemini API key.',
    note: 'Leave out the key to be prompted, which keeps it out of your shell history.',
  },
  {
    usage: 'git-aic set-model <model>',
    description: 'Use another Gemini model, e.g. gemini-2.5-pro.',
    note: '"default" goes back to gemini-2.5-flash.',
  },
  {
    usage: 'git-aic set-branch-prompt <on|off>',
    description:
      'Offer to create a new branch before committing on main or master.',
    note: 'Off by default.',
  },
  {
    usage: 'git-aic show',
    description:
      'Show the masked key and its source, the model, settings, and the config path.',
  },
  {
    usage: 'git-aic alias',
    description: 'Set up the global git aic alias.',
  },
  {
    usage: 'git-aic help [command]',
    description: 'Help for git-aic or one command.',
  },
]

export const environment: ReferenceItem[] = [
  {
    usage: 'GEMINI_COMMIT_MESSAGE_API_KEY',
    description: 'Gemini API key. Takes precedence over set-key.',
  },
  {
    usage: 'GIT_AIC_MODEL',
    description:
      'Gemini model for this shell. Takes precedence over set-model.',
  },
  {
    usage: 'GIT_AIC_DEBUG=1',
    description: 'Print full error details.',
  },
]

export const recipes: ReferenceItem[] = [
  { usage: 'git aic', description: 'Pick files, review, commit' },
  { usage: 'git aic -p', description: 'Commit, then push' },
  { usage: 'git aic -a', description: 'Commit every changed file' },
  { usage: 'git aic --dry-run', description: 'Preview the message only' },
  { usage: 'git aic -d', description: 'Diff report for files you pick' },
  { usage: 'git aic -d -a', description: 'Diff report for every change' },
  {
    usage: 'git aic -a -y -p',
    description: 'No prompts: commit everything and push (CI)',
  },
  {
    usage: 'git-aic set-model gemini-2.5-pro',
    description: 'Switch the Gemini model',
  },
]

export const rules = [
  '--push and --dry-run cannot be combined with --diff.',
  'Everything else combines freely, e.g. git aic -a -y -p.',
  '--yes never answers questions only you can: API key, Git name/email, remote URL, or credentials.',
]
