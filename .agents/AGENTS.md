# Auto Commit & Push Rule
When the user asks to commit, push, or "đẩy code", you must use the Git executable bundled with GitHub Desktop instead of the system 'git'.
The exact path is: `"C:\Users\admin\AppData\Local\GitHubDesktop\app-3.6.1\resources\app\git\cmd\git.exe"`

Example usage in PowerShell:
`& "C:\Users\admin\AppData\Local\GitHubDesktop\app-3.6.1\resources\app\git\cmd\git.exe" add .`
`& "C:\Users\admin\AppData\Local\GitHubDesktop\app-3.6.1\resources\app\git\cmd\git.exe" commit -m "Your message"`
`& "C:\Users\admin\AppData\Local\GitHubDesktop\app-3.6.1\resources\app\git\cmd\git.exe" push origin main`

You MUST execute these commands using your `run_command` tool automatically without asking the user to open the terminal or GitHub Desktop.
